const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Feltöltési mappa beállítása - ABSZOLÚT ÚTVONAL
const uploadDir = path.join(__dirname, '../../uploads');

// Mappa létrehozása, ha nem létezik
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Uploads mappa létrehozva:', uploadDir);
} else {
  console.log('✅ Uploads mappa létezik:', uploadDir);
}

// Multer storage konfiguráció
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📁 Fájl mentési útvonal:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'file-' + uniqueSuffix + ext;
    console.log('📄 Generált fájlnév:', filename);
    cb(null, filename);
  }
});

// Fájl típus szűrő
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nem támogatott fájlformátum!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Dokumentumok lekérése
router.get('/', async (req, res) => {
  try {
    const [rows] = await req.db.query(`
      SELECT d.*, 
        CASE 
          WHEN d.entity_type = 'animal' THEN a.name
          WHEN d.entity_type = 'land' THEN l.name
          WHEN d.entity_type = 'client' THEN c.name
          ELSE NULL
        END as entity_name
      FROM documents d
      LEFT JOIN animals a ON d.entity_type = 'animal' AND d.entity_id = a.id
      LEFT JOIN lands l ON d.entity_type = 'land' AND d.entity_id = l.id
      LEFT JOIN clients c ON d.entity_type = 'client' AND d.entity_id = c.id
      WHERE d.user_id = ?
      ORDER BY d.upload_date DESC
    `, [req.userId]);
    
    res.json({ items: rows });
  } catch (error) {
    console.error('❌ Error fetching documents:', error);
    res.status(500).json({ error: 'Hiba a dokumentumok lekérése során' });
  }
});

// Dokumentum feltöltése
router.post('/', upload.single('file'), async (req, res) => {
  try {
    console.log('📥 Feltöltési kérés érkezett');
    console.log('📎 File:', req.file);
    console.log('📦 Body:', req.body);

    if (!req.file) {
      return res.status(400).json({ error: 'Nincs fájl kiválasztva' });
    }

    const { 
      title, 
      category, 
      entity_type = 'general', 
      entity_id = null 
    } = req.body;

    // Validáció
    if (!title || !category) {
      return res.status(400).json({ 
        error: 'title és category mezők kötelezőek' 
      });
    }

    // Fájl elérési útja - NE használjunk backslasheket!
    const filepath = `/uploads/${req.file.filename}`;

    console.log('📝 Beszúrás adatai:', {
      userId: req.userId,
      title,
      category,
      filename: req.file.originalname,
      filepath,
      entity_type,
      entity_id: entity_id || null,
      file_size: req.file.size,
      mime_type: req.file.mimetype
    });

    const [result] = await req.db.query(
      `INSERT INTO documents 
       (user_id, title, category, filename, filepath, file_type, file_size, mime_type, entity_type, entity_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId, 
        title, 
        category, 
        req.file.originalname, 
        filepath,
        req.file.mimetype,
        req.file.size,
        req.file.mimetype,
        entity_type,
        entity_id || null
      ]
    );

    console.log('✅ Dokumentum sikeresen feltöltve, ID:', result.insertId);

    res.json({ 
      success: true, 
      id: result.insertId,
      message: 'Dokumentum sikeresen feltöltve' 
    });
  } catch (error) {
    console.error('❌ Error uploading document:', error);
    res.status(500).json({ error: 'Hiba a dokumentum feltöltése során: ' + error.message });
  }
});

// Dokumentum letöltése
router.get('/:id/download', async (req, res) => {
  try {
    const [rows] = await req.db.query(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dokumentum nem található' });
    }

    const doc = rows[0];
    const filepath = path.join(__dirname, '../../', doc.filepath);

    console.log('📥 Letöltés:', {
      id: doc.id,
      filename: doc.filename,
      filepath: filepath
    });

    if (!fs.existsSync(filepath)) {
      console.error('❌ Fájl nem található a szerveren:', filepath);
      return res.status(404).json({ error: 'Fájl nem található a szerveren' });
    }

    res.download(filepath, doc.filename);
  } catch (error) {
    console.error('❌ Error downloading document:', error);
    res.status(500).json({ error: 'Hiba a dokumentum letöltése során' });
  }
});

// Dokumentum törlése
router.delete('/:id', async (req, res) => {
  try {
    // Először lekérdezzük a dokumentumot, hogy töröljük a fájlt is
    const [rows] = await req.db.query(
      'SELECT filepath FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dokumentum nem található' });
    }

    // Fájl törlése a szerverről
    const filepath = path.join(__dirname, '../../', rows[0].filepath);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('🗑️ Fájl törölve:', filepath);
    }

    // Adatbázis rekord törlése
    await req.db.query(
      'DELETE FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    console.log('✅ Dokumentum törölve, ID:', req.params.id);

    res.json({ success: true, message: 'Dokumentum sikeresen törölve' });
  } catch (error) {
    console.error('❌ Error deleting document:', error);
    res.status(500).json({ error: 'Hiba a dokumentum törlése során' });
  }
});

// Állatok lekérése a dropdownhoz
router.get('/entities/animals', async (req, res) => {
  try {
    const [rows] = await req.db.query(
      'SELECT id, name, identifier FROM animals WHERE user_id = ? ORDER BY name',
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching animals:', error);
    res.status(500).json({ error: 'Hiba az állatok lekérése során' });
  }
});

// Földek lekérése a dropdownhoz
router.get('/entities/lands', async (req, res) => {
  try {
    const [rows] = await req.db.query(
      'SELECT id, name, plot_number FROM lands WHERE user_id = ? ORDER BY name',
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching lands:', error);
    res.status(500).json({ error: 'Hiba a földek lekérése során' });
  }
});

// Kliensek lekérése a dropdownhoz
router.get('/entities/clients', async (req, res) => {
  try {
    const [rows] = await req.db.query(
      'SELECT id, name, company_name FROM clients WHERE user_id = ? ORDER BY name',
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching clients:', error);
    res.status(500).json({ error: 'Hiba a kliensek lekérése során' });
  }
});

module.exports = router;