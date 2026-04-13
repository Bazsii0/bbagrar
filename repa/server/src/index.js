import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

import { query } from './db.js';
import { signToken, requireAuth, requireRole } from './auth.js';

// ES modules __dirname megoldás
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const {
  PORT = '4000',
  CORS_ORIGIN = 'http://localhost:5173',
  SMTP_HOST = '',
  SMTP_PORT = '587',
  SMTP_USER = '',
  SMTP_PASS = '',
  SMTP_FROM_EMAIL = '',
  SMTP_FROM_NAME = 'BB Agrár',
} = process.env;

// ==================== NODEMAILER SMTP SETUP ====================
let mailTransporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  mailTransporter.verify()
    .then(() => console.log('✅ SMTP email konfigurálva (' + SMTP_HOST + ')'))
    .catch((err) => console.error('❌ SMTP kapcsolat hiba:', err.message));
} else {
  console.log('⚠️  SMTP nincs konfigurálva (SMTP_HOST, SMTP_USER, SMTP_PASS szükséges)');
}

app.use(cors({ origin: CORS_ORIGIN, credentials: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true, parameterLimit: 50000 }));

// Statikus fájlok kiszolgálása az uploads mappából
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// --- Uploads mappa létrehozása, ha nem létezik ---
const avatarsPath = path.join(uploadsPath, 'avatars');
const documentsPath = path.join(uploadsPath, 'documents');
const marketplacePath = path.join(uploadsPath, 'marketplace');

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('✅ Uploads mappa létrehozva:', uploadsPath);
}
if (!fs.existsSync(avatarsPath)) {
  fs.mkdirSync(avatarsPath, { recursive: true });
  console.log('✅ Avatars mappa létrehozva:', avatarsPath);
}
if (!fs.existsSync(documentsPath)) {
  fs.mkdirSync(documentsPath, { recursive: true });
  console.log('✅ Documents mappa létrehozva:', documentsPath);
}
if (!fs.existsSync(marketplacePath)) {
  fs.mkdirSync(marketplacePath, { recursive: true });
  console.log('✅ Marketplace mappa létrehozva:', marketplacePath);
}

// --- Multer konfiguráció ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = uploadsPath;
    
    if (file.fieldname === 'avatar') {
      uploadDir = avatarsPath;
    } else if (file.fieldname === 'file') {
      uploadDir = documentsPath;
    } else if (file.fieldname === 'image') {
      uploadDir = marketplacePath;
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    let prefix = 'file';
    
    if (file.fieldname === 'avatar') {
      prefix = 'avatar';
    } else if (file.fieldname === 'image') {
      prefix = 'marketplace';
    }
    
    const filename = prefix + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/xml',
    'text/xml',
    'text/csv',
    'text/plain',
    'application/json',
    'application/rtf',
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
  ];

  // Elfogadjuk a fájlkiterjesztés alapján is
  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.xml', '.json', '.rtf',
    '.zip', '.rar', '.7z',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff',
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    console.log(`⚠️ Elutasított fájl: ${file.originalname}, MIME: ${file.mimetype}, ext: ${ext}`);
    cb(new Error(`Nem támogatott fájlformátum: ${ext} (${file.mimetype})`), false);
  }
};

// Marketplace upload - handle MULTIPLE image files + all text fields
const uploadMarketplace = multer({
  storage: multer.diskStorage({
    destination: marketplacePath,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const filename = 'marketplace-' + uniqueSuffix + ext;
      cb(null, filename);
    }
  }),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false });
  }
});

// Database table initialization
async function initializeDatabase() {
  try {
    // Just verify database connection works
    const result = await query('SELECT 1');
    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ Error verifying database:', error);
    throw error;
  }
}

// Initialize database on startup with retry logic
async function initializeWithRetry(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await initializeDatabase();
      console.log('✅ Database initialized successfully');
      return;
    } catch (error) {
      console.log(`⏳ Retry ${i + 1}/${retries} - Waiting for database...`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error('❌ Failed to initialize database after retries');
}

initializeWithRetry();

// ==================== AUTH ENDPOINTS ====================

app.post('/api/auth/register', upload.single('avatar'), async (req, res) => {
  const { username, email, password, phone, location } = req.body || {};
  if (!username || !email || !password) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: 'username, email, password required' });
  }
  if (String(password).length < 6) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }

  const existing = await query('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1', [username, email]);
  if (existing.length) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(409).json({ error: 'User already exists' });
  }

  const password_hash = await bcrypt.hash(String(password), 10);
  const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : null;
  
  const result = await query(
    'INSERT INTO users (username, email, password_hash, phone, location, avatar) VALUES (?, ?, ?, ?, ?, ?)',
    [username, email, password_hash, phone || null, location || null, avatarPath]
  );
  
  const user = { id: result.insertId, username, email, phone: phone || null, location: location || null, avatar: avatarPath };
  const token = signToken({
    userId: user.id,
    username: user.username,
    role: 'owner'
  });
  return res.status(201).json({ token, user });
});

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) {
    return res.status(400).json({ error: 'identifier, password required' });
  }

  const users = await query('SELECT id, username, email, password_hash, role FROM users WHERE username = ? OR email = ? LIMIT 1', [identifier, identifier]);
  const u = users[0];
  if (!u) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(String(password), String(u.password_hash));
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({
    userId: u.id,
    username: u.username,
    role: u.role
  });
  return res.json({ token, user: { id: u.id, username: u.username, email: u.email, role: u.role } });
});

app.get('/api/me', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const rows = await query('SELECT id, username, email, created_at, role FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: rows[0] });
});

// ==================== PROFILE MANAGEMENT ====================

// Profil adatok lekérése
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const rows = await query(
      'SELECT id, username, email, phone, location, bio, avatar, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({ profile: rows[0] });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Profil adatok frissítése
app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, email, phone, location, bio, avatar } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }
    
    // Ellenőrizzük, hogy az email nem foglalt-e más felhasználó által
    const existingEmail = await query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );
    
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Email already in use by another user' });
    }
    
    // Profil frissítése
    await query(
      `UPDATE users 
       SET username = ?, email = ?, phone = ?, location = ?, bio = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [username, email, phone || null, location || null, bio || null, avatar || null, userId]
    );
    
    // Frissített adatok lekérése
    const [updatedProfile] = await query(
      'SELECT id, username, email, phone, location, bio, avatar, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    return res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: updatedProfile 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Profilkép feltöltése
app.post('/api/profile/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }
    
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size must be less than 5MB' });
    }
    
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    await query(
      'UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [avatarUrl, userId]
    );
    
    return res.json({ 
      success: true, 
      avatarUrl: avatarUrl,
      message: 'Avatar uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Jelszó módosítás
app.put('/api/profile/password', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    const [user] = await query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    await query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, userId]
    );
    
    return res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

// ==================== DASHBOARD ====================

app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const animalCountRows = await query('SELECT COUNT(*) AS count FROM animals WHERE user_id = ?', [userId]);
  const incomeRows = await query('SELECT COALESCE(SUM(amount), 0) AS total FROM incomes WHERE user_id = ?', [userId]);
  const expenseRows = await query('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ?', [userId]);

  const animalCount = Number(animalCountRows[0]?.count || 0);
  const balance = Number(incomeRows[0]?.total || 0) - Number(expenseRows[0]?.total || 0);

  return res.json({ animalCount, balance });
});

// ==================== ANIMALS ====================

app.get('/api/animals', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const rows = await query(
      'SELECT id, name, species, breed, identifier, birth_date, stable, gender, purpose, notes, dam_id, sire_id, created_at FROM animals WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    return res.json({ items: rows });
  } catch (error) {
    console.error('Error fetching animals:', error);
    return res.status(500).json({ error: 'Failed to fetch animals' });
  }
});

app.post('/api/animals', requireAuth, requireRole(['owner','admin','worker']), async (req, res) => {
  try {
    const { name, species, breed, identifier, birth_date, stable, gender, purpose, notes, dam_id, sire_id } = req.body;
    const userId = req.user.userId;
    
    if (!species || !identifier) {
      return res.status(400).json({ error: 'Species and identifier are required' });
    }
    
    // Biztonságos string feldolgozás
    const trimValue = (val) => {
      if (typeof val !== 'string') return null;
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : null;
    };
    
    const nameValue = trimValue(name);
    const breedValue = trimValue(breed);
    const birth_dateValue = trimValue(birth_date);
    const stableValue = trimValue(stable);
    const genderValue = trimValue(gender) || 'ismeretlen';
    const purposeValue = trimValue(purpose);
    const notesValue = trimValue(notes);
    
    const result = await query(
      'INSERT INTO animals (user_id, name, species, breed, identifier, birth_date, stable, gender, purpose, notes, dam_id, sire_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, nameValue, species, breedValue, identifier, birth_dateValue, stableValue, genderValue, purposeValue, notesValue, dam_id || null, sire_id || null]
    );
    
    return res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error adding animal:', error);
    return res.status(500).json({ error: 'Failed to add animal' });
  }
});

// Update animal
app.put('/api/animals/:id', requireAuth, requireRole(['owner','admin','worker']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { name, species, breed, identifier, birth_date, stable, gender, purpose, notes, dam_id, sire_id } = req.body;

    // Biztonságos string feldolgozás
    const trimValue = (val) => {
      if (typeof val !== 'string') return null;
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const nameValue = trimValue(name);
    const breedValue = trimValue(breed);
    const birth_dateValue = trimValue(birth_date);
    const stableValue = trimValue(stable);
    const genderValue = trimValue(gender) || 'ismeretlen';
    const purposeValue = trimValue(purpose);
    const notesValue = trimValue(notes);

    const result = await query(
      `UPDATE animals SET 
       name = ?, species = ?, breed = ?, identifier = ?, birth_date = ?, 
       stable = ?, gender = ?, purpose = ?, notes = ?, dam_id = ?, sire_id = ?
       WHERE id = ? AND user_id = ?`,
      [
        nameValue, species, breedValue, identifier, birth_dateValue,
        stableValue, genderValue, purposeValue, notesValue, dam_id || null, sire_id || null,
        id, userId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Animal not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating animal:', error);
    return res.status(500).json({ error: 'Failed to update animal' });
  }
});

app.delete('/api/animals/:id', requireAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const result = await query(
      'DELETE FROM animals WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Animal not found' });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting animal:', error);
    return res.status(500).json({ error: 'Failed to delete animal' });
  }
});

// ==================== LANDS ====================

app.get('/api/lands', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const rows = await query('SELECT * FROM lands WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return res.json({ items: rows });
});

app.post('/api/lands', requireAuth, requireRole(['owner','admin','worker']), async (req, res) => {
  const userId = req.user.userId;
  const { name, plot_number, area, city, location, ownership_type, status, notes } = req.body || {};
  
  if (!name || area === undefined) return res.status(400).json({ error: 'name and area required' });
  
  const trimValue = (val) => {
    if (typeof val !== 'string') return null;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const result = await query(
    'INSERT INTO lands (user_id, name, plot_number, area, city, location, ownership_type, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, trimValue(name) || name, trimValue(plot_number), area, trimValue(city), trimValue(location), ownership_type || 'owned', trimValue(status), trimValue(notes)]
  );
  
  const rows = await query('SELECT * FROM lands WHERE id = ?', [result.insertId]);
  return res.status(201).json({ item: rows[0] });
});

app.delete('/api/lands/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await query(
      'DELETE FROM lands WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Land not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting land:', error);
    return res.status(500).json({ error: 'Failed to delete land' });
  }
});

// ==================== BUDGET ====================

app.get('/api/expenses', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const rows = await query('SELECT id, user_id, amount, category, description, expense_date AS date, created_at FROM expenses WHERE user_id = ? ORDER BY expense_date DESC', [userId]);
  return res.json({ items: rows });
});

app.post('/api/expenses', requireAuth, requireRole(['owner','admin','accountant']), async (req, res) => {
  const userId = req.user.userId;
  const { amount, category, description = null, date } = req.body || {};
  if (amount === undefined || !category || !date) return res.status(400).json({ error: 'amount, category, date required' });
  const result = await query('INSERT INTO expenses (user_id, amount, category, description, expense_date) VALUES (?, ?, ?, ?, ?)', [userId, amount, category, description, date]);
  const rows = await query('SELECT id, user_id, amount, category, description, expense_date AS date, created_at FROM expenses WHERE id = ?', [result.insertId]);
  return res.status(201).json({ item: rows[0] });
});

app.put('/api/expenses/:id', requireAuth, requireRole(['owner','admin','accountant']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { amount, category, description = null, date } = req.body || {};
    if (amount === undefined || !category || !date) return res.status(400).json({ error: 'amount, category, date required' });
    const result = await query('UPDATE expenses SET amount = ?, category = ?, description = ?, expense_date = ? WHERE id = ? AND user_id = ?', [amount, category, description, date, id, userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found' });
    const rows = await query('SELECT id, user_id, amount, category, description, expense_date AS date, created_at FROM expenses WHERE id = ?', [id]);
    return res.json({ item: rows[0] });
  } catch (error) {
    console.error('Error updating expense:', error);
    return res.status(500).json({ error: 'Failed to update expense' });
  }
});

app.delete('/api/expenses/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const result = await query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return res.status(500).json({ error: 'Failed to delete expense' });
  }
});

app.get('/api/incomes', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const rows = await query('SELECT id, user_id, amount, category, description, income_date AS date, created_at FROM incomes WHERE user_id = ? ORDER BY income_date DESC', [userId]);
  return res.json({ items: rows });
});

app.post('/api/incomes', requireAuth, requireRole(['owner','admin','accountant']), async (req, res) => {
  const userId = req.user.userId;
  const { amount, category, description = null, date } = req.body || {};
  if (amount === undefined || !category || !date) return res.status(400).json({ error: 'amount, category, date required' });
  const result = await query('INSERT INTO incomes (user_id, amount, category, description, income_date) VALUES (?, ?, ?, ?, ?)', [userId, amount, category, description, date]);
  const rows = await query('SELECT id, user_id, amount, category, description, income_date AS date, created_at FROM incomes WHERE id = ?', [result.insertId]);
  return res.status(201).json({ item: rows[0] });
});

app.put('/api/incomes/:id', requireAuth, requireRole(['owner','admin','accountant']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { amount, category, description = null, date } = req.body || {};
    if (amount === undefined || !category || !date) return res.status(400).json({ error: 'amount, category, date required' });
    const result = await query('UPDATE incomes SET amount = ?, category = ?, description = ?, income_date = ? WHERE id = ? AND user_id = ?', [amount, category, description, date, id, userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Income not found' });
    const rows = await query('SELECT id, user_id, amount, category, description, income_date AS date, created_at FROM incomes WHERE id = ?', [id]);
    return res.json({ item: rows[0] });
  } catch (error) {
    console.error('Error updating income:', error);
    return res.status(500).json({ error: 'Failed to update income' });
  }
});

app.delete('/api/incomes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const result = await query('DELETE FROM incomes WHERE id = ? AND user_id = ?', [id, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Income not found' });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting income:', error);
    return res.status(500).json({ error: 'Failed to delete income' });
  }
});

// ==================== CLIENTS ====================

app.get('/api/clients', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const rows = await query(
    'SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC', 
    [userId]
  );
  return res.json({ items: rows });
});

app.post('/api/clients', requireAuth, requireRole(['owner','admin','worker']), async (req, res) => {
  const userId = req.user.userId;
  const { 
    name, company_name, tax_number, email, phone, address, city, 
    postal_code, country, contact_person, website, type, payment_terms, 
    status, notes, last_contact 
  } = req.body || {};
  
  console.log('👤 POST /api/clients received:', { name, company_name, email, phone, type });
  
  if (!name) return res.status(400).json({ error: 'name required' });
  
  const trimValue = (val) => {
    if (typeof val !== 'string') return null;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  };
  
  const result = await query(
    `INSERT INTO clients (
      user_id, name, company_name, tax_number, email, phone, address, 
      city, postal_code, country, contact_person, website, type, 
      payment_terms, status, notes, last_contact
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, trimValue(name) || name, trimValue(company_name), trimValue(tax_number), 
      trimValue(email), trimValue(phone), trimValue(address), trimValue(city), 
      trimValue(postal_code), trimValue(country) || 'Magyarország', trimValue(contact_person), 
      trimValue(website), trimValue(type), trimValue(payment_terms), 
      status || 'active', trimValue(notes), last_contact || null
    ]
  );
  
  console.log('✅ Client saved with ID:', result.insertId);
  
  const rows = await query('SELECT * FROM clients WHERE id = ?', [result.insertId]);
  return res.status(201).json({ item: rows[0] });
});

app.put('/api/clients/:id', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { 
    name, company_name, tax_number, email, phone, address, city, 
    postal_code, country, contact_person, website, type, payment_terms, 
    status, notes, last_contact 
  } = req.body || {};
  
  if (!name) return res.status(400).json({ error: 'name required' });
  
  const trimValue = (val) => {
    if (typeof val !== 'string') return null;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  };
  
  const result = await query(
    `UPDATE clients SET 
      name = ?, company_name = ?, tax_number = ?, email = ?, phone = ?, 
      address = ?, city = ?, postal_code = ?, country = ?, contact_person = ?, 
      website = ?, type = ?, payment_terms = ?, status = ?, notes = ?, 
      last_contact = ?
    WHERE id = ? AND user_id = ?`,
    [
      trimValue(name) || name, trimValue(company_name), trimValue(tax_number), trimValue(email), 
      trimValue(phone), trimValue(address), trimValue(city), trimValue(postal_code), 
      trimValue(country) || 'Magyarország', trimValue(contact_person), trimValue(website), 
      trimValue(type), trimValue(payment_terms), status || 'active', trimValue(notes), 
      last_contact || null, id, userId
    ]
  );
  
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  const rows = await query('SELECT * FROM clients WHERE id = ?', [id]);
  return res.json({ item: rows[0] });
});

app.delete('/api/clients/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    console.log('Törlési kérés:', { id, userId });
    
    const [client] = await query('SELECT id FROM clients WHERE id = ? AND user_id = ?', [id, userId]);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    await query('DELETE FROM clients WHERE id = ? AND user_id = ?', [id, userId]);
    
    console.log('Sikeres törlés');
    return res.json({ success: true });
  } catch (error) {
    console.error('HIBA a törlésben:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ==================== MARKETPLACE ====================

app.get('/api/marketplace', async (req, res) => {
  try {
    console.log('Marketplace GET - összes hirdetés lekérése');
    const rows = await query('SELECT * FROM marketplace ORDER BY created_at DESC');
    
    // Képek lekérése minden hirdetéshez
    for (const row of rows) {
      const images = await query(
        'SELECT id, image_url, sort_order FROM marketplace_images WHERE marketplace_id = ? ORDER BY sort_order ASC',
        [row.id]
      );
      row.images = images.map(img => img.image_url);
      // Backward compatibility: ha nincs image_url de vannak képek
      if (!row.image_url && images.length > 0) {
        row.image_url = images[0].image_url;
      }
    }
    
    return res.json({ items: rows });
  } catch (error) {
    console.error('Hiba a marketplace lekéréskor:', error);
    return res.status(500).json({ error: 'Szerver hiba történt' });
  }
});

app.post('/api/marketplace', requireAuth, uploadMarketplace.array('images', 10), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Debug: Ellenőrizzük mi érkezett
    console.log('🔍 Marketplace POST - Adatok érkeztek:');
    console.log('  req.body:', req.body);
    console.log('  req.files:', req.files ? `${req.files.length} fájl` : 'nincs fájl');
    
    const { title, description = null, type, price, location = null, contact_name = null, contact_phone = null, contact_email = null } = req.body || {};
    
    console.log('  Destruktúrált: title=%s, type=%s, price=%s', title, type, price);
    
    if (!title || !type || !price) {
      console.log('❌ Validációs hiba - hiányzó kötelező mezők');
      return res.status(400).json({ error: 'title, type, price required' });
    }
    
    // Az első kép URL-je a fő image_url mezőbe kerül (backward compatibility)
    let image_url = null;
    if (req.files && req.files.length > 0) {
      image_url = `/uploads/marketplace/${req.files[0].filename}`;
      console.log('📸 Képek feltöltve:', req.files.length, 'db');
    }
    
    console.log('📤 Új hirdetés létrehozása:', { title, type, price, userId, image_url });
    
    const result = await query(
      `INSERT INTO marketplace (user_id, title, description, type, price, image_url, location, contact_name, contact_phone, contact_email, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [userId, title, description, type, price, image_url, location, contact_name, contact_phone, contact_email]
    );
    
    // Képek mentése a marketplace_images táblába
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const imgUrl = `/uploads/marketplace/${req.files[i].filename}`;
        await query(
          'INSERT INTO marketplace_images (marketplace_id, image_url, sort_order) VALUES (?, ?, ?)',
          [result.insertId, imgUrl, i]
        );
      }
    }
    
    // Értesítés küldése MINDEN felhasználónak (kivéve a hirdetőt)
    const users = await query('SELECT id FROM users WHERE id != ?', [userId]);
    
    for (const user of users) {
      const [settings] = await query(
        'SELECT marketplace_alerts FROM notification_settings WHERE user_id = ?',
        [user.id]
      );
      
      if (!settings || settings.marketplace_alerts) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, data) 
           VALUES (?, 'marketplace_new', ?, ?, ?)`,
          [
            user.id,
            'Új hirdetés a piacon',
            `${title} - ${price} Ft`,
            JSON.stringify({ marketplace_id: result.insertId, type, price })
          ]
        );
      }
    }
    
    const rows = await query('SELECT * FROM marketplace WHERE id = ?', [result.insertId]);
    
    // Képek hozzáadása a válaszhoz
    const savedImages = await query(
      'SELECT image_url FROM marketplace_images WHERE marketplace_id = ? ORDER BY sort_order ASC',
      [result.insertId]
    );
    rows[0].images = savedImages.map(img => img.image_url);
    
    console.log('✅ Hirdetés mentve ID:', result.insertId);
    return res.status(201).json({ item: rows[0] });
  } catch (error) {
    console.error('Hiba a marketplace hirdetés létrehozásakor:', error);
    return res.status(500).json({ error: 'Szerver hiba történt' });
  }
});

app.put('/api/marketplace/:id', requireAuth, uploadMarketplace.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, description, type, price, location, contact_name, contact_phone, contact_email, status } = req.body || {};
    
    console.log(`📝 Marketplace PUT - hirdetés frissítése, ID: ${id}`);
    
    const [existing] = await query('SELECT * FROM marketplace WHERE id = ?', [id]);
    
    if (!existing) {
      console.log(`Hirdetés nem található, ID: ${id}`);
      return res.status(404).json({ error: 'Hirdetés nem található' });
    }
    
    if (existing.user_id !== userId && req.user.role !== 'admin') {
      console.log(`Jogosulatlan frissítési kísérlet, UserID: ${userId}, Hirdetés tulaj: ${existing.user_id}`);
      return res.status(403).json({ error: 'Nincs jogosultságod frissíteni ezt a hirdetést' });
    }
    
    // Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];
    
    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    if (price !== undefined) {
      updateFields.push('price = ?');
      updateValues.push(price);
    }
    
    // Ha vannak új feltöltött képek
    if (req.files && req.files.length > 0) {
      // Első kép a fő image_url (backward compatibility)
      updateFields.push('image_url = ?');
      updateValues.push(`/uploads/marketplace/${req.files[0].filename}`);
      console.log('📸 Új képek feltöltve:', req.files.length, 'db');
      
      // Régi képek törlése a marketplace_images táblából
      await query('DELETE FROM marketplace_images WHERE marketplace_id = ?', [id]);
      
      // Új képek mentése
      for (let i = 0; i < req.files.length; i++) {
        const imgUrl = `/uploads/marketplace/${req.files[i].filename}`;
        await query(
          'INSERT INTO marketplace_images (marketplace_id, image_url, sort_order) VALUES (?, ?, ?)',
          [id, imgUrl, i]
        );
      }
    }
    
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location);
    }
    if (contact_name !== undefined) {
      updateFields.push('contact_name = ?');
      updateValues.push(contact_name);
    }
    if (contact_phone !== undefined) {
      updateFields.push('contact_phone = ?');
      updateValues.push(contact_phone);
    }
    if (contact_email !== undefined) {
      updateFields.push('contact_email = ?');
      updateValues.push(contact_email);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nincs frissítendő mező' });
    }
    
    const updateQuery = `UPDATE marketplace SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(id);
    
    await query(updateQuery, updateValues);
    
    // Get updated item
    const [updated] = await query('SELECT * FROM marketplace WHERE id = ?', [id]);
    
    // Képek lekérése
    const images = await query(
      'SELECT image_url FROM marketplace_images WHERE marketplace_id = ? ORDER BY sort_order ASC',
      [id]
    );
    updated.images = images.map(img => img.image_url);
    
    console.log(`Hirdetés sikeresen frissítve, ID: ${id}`);
    res.json({ item: updated });
  } catch (error) {
    console.error('Hiba a marketplace hirdetés frissítésekor:', error);
    return res.status(500).json({ error: 'Szerver hiba történt' });
  }
});

app.delete('/api/marketplace/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    console.log(`Marketplace DELETE - hirdetés törlése, ID: ${id}, UserID: ${userId}`);
    
    const [existing] = await query('SELECT * FROM marketplace WHERE id = ?', [id]);
    
    if (!existing) {
      console.log(`Hirdetés nem található, ID: ${id}`);
      return res.status(404).json({ error: 'Hirdetés nem található' });
    }
    
    if (existing.user_id !== userId && req.user.role !== 'admin') {
      console.log(`Jogosulatlan törlési kísérlet, UserID: ${userId}, Hirdetés tulaj: ${existing.user_id}`);
      return res.status(403).json({ error: 'Nincs jogosultságod törölni ezt a hirdetést' });
    }
    
    await query('DELETE FROM marketplace WHERE id = ?', [id]);
    console.log(`Hirdetés sikeresen törölve, ID: ${id}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Hiba a marketplace hirdetés törlésekor:', error);
    return res.status(500).json({ error: 'Szerver hiba történt' });
  }
});

// ==================== DOCUMENTS ====================

// Entitások lekérése a dropdownokhoz
app.get('/api/documents/entities/animals', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rows = await query(
      'SELECT id, name, identifier FROM animals WHERE user_id = ? ORDER BY name',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching animals:', error);
    res.status(500).json({ error: 'Hiba az állatok lekérése során' });
  }
});

app.get('/api/documents/entities/lands', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rows = await query(
      'SELECT id, name, plot_number FROM lands WHERE user_id = ? ORDER BY name',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching lands:', error);
    res.status(500).json({ error: 'Hiba a földek lekérése során' });
  }
});

app.get('/api/documents/entities/clients', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rows = await query(
      'SELECT id, name, company_name FROM clients WHERE user_id = ? ORDER BY name',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Hiba a kliensek lekérése során' });
  }
});

// Dokumentumok lekérése
app.get('/api/documents', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const rows = await query(`
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
    `, [userId]);
    
    return res.json({ items: rows });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ error: 'Hiba a dokumentumok lekérése során' });
  }
});

// Dokumentum feltöltése
app.post('/api/documents', requireAuth, requireRole(['owner','admin','worker']), (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer hiba:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('📥 POST /api/documents - req.body:', req.body);
    console.log('📎 req.file:', req.file);

    if (!req.file) {
      return res.status(400).json({ error: 'Nincs fájl kiválasztva' });
    }

    const { 
      title, 
      category, 
      entity_type = 'general', 
      entity_id = null 
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({ 
        error: 'title és category mezők kötelezőek' 
      });
    }

    const filepath = `/uploads/documents/${req.file.filename}`;

    const result = await query(
      `INSERT INTO documents 
       (user_id, title, category, filename, filepath, file_size, mime_type, entity_type, entity_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId, 
        title, 
        category, 
        req.file.originalname, 
        filepath,
        req.file.size || null,
        req.file.mimetype || null,
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
app.get('/api/documents/:id/download', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dokumentum nem található' });
    }

    const doc = rows[0];
    const filepath = path.join(__dirname, '../', doc.filepath);

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
app.delete('/api/documents/:id', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT filepath FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dokumentum nem található' });
    }

    const filepath = path.join(__dirname, '../', rows[0].filepath);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('🗑️ Fájl törölve:', filepath);
    }

    await query(
      'DELETE FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    console.log('✅ Dokumentum törölve, ID:', req.params.id);

    res.json({ success: true, message: 'Dokumentum sikeresen törölve' });
  } catch (error) {
    console.error('❌ Error deleting document:', error);
    res.status(500).json({ error: 'Hiba a dokumentum törlése során' });
  }
});

// ==================== CALENDAR ====================

// Események lekérése
app.get('/api/calendar/events', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, date } = req.query;
    
    let queryStr = 'SELECT * FROM calendar_events WHERE user_id = ?';
    const params = [userId];
    
    if (date) {
      queryStr += ' AND event_date = ?';
      params.push(date);
    } else if (startDate && endDate) {
      queryStr += ' AND event_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    queryStr += ' ORDER BY event_date, start_time';
    
    const rows = await query(queryStr, params);
    return res.json({ items: rows });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Közelgő események
app.get('/api/calendar/events/upcoming', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const days = parseInt(req.query.days) || 7;
    
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const endDate = futureDate.toISOString().split('T')[0];
    
    const rows = await query(
      `SELECT * FROM calendar_events 
       WHERE user_id = ? 
       AND event_date BETWEEN ? AND ? 
       ORDER BY event_date, start_time
       LIMIT 20`,
      [userId, today, endDate]
    );
    
    return res.json({ items: rows });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Esemény lekérése ID alapján
app.get('/api/calendar/events/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    const [event] = await query(
      'SELECT * FROM calendar_events WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.animal_id) {
      const [animal] = await query(
        'SELECT name, species FROM animals WHERE id = ? AND user_id = ?',
        [event.animal_id, userId]
      );
      if (animal) {
        event.animal_name = animal.name;
        event.animal_species = animal.species;
      }
    }
    
    return res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Új esemény hozzáadása
app.post('/api/calendar/events', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      title, description, event_date, start_time, end_time, 
      event_type = 'task', priority = 'medium', status = 'pending', 
      location, animal_id, recurring_type = 'none', recurring_interval = 1, 
      recurring_end_date, reminder_before = 60, color, reminder_days = 0 
    } = req.body;
    
    if (!title || !event_date) {
      return res.status(400).json({ error: 'title and event_date required' });
    }
    
    const result = await query(
      `INSERT INTO calendar_events (user_id, title, description, event_date, start_time, end_time, event_type, priority, status, location, animal_id, recurring_type, recurring_interval, recurring_end_date, reminder_before, color, reminder_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, description || null, event_date, start_time || null, end_time || null, event_type, priority, status, location || null, animal_id || null, recurring_type, recurring_interval || 1, recurring_end_date || null, reminder_before || 60, color || null, reminder_days || 0]
    );
    
    const [newEvent] = await query(
      'SELECT * FROM calendar_events WHERE id = ?',
      [result.insertId]
    );

    // Értesítés küldése az esemény létrehozójának
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, 'event_created', ?, ?, ?)`,
      [userId, 'Új esemény létrehozva', `${title} - ${event_date}`, JSON.stringify({ event_id: result.insertId })]
    );
    
    return res.status(201).json({ id: result.insertId, event: newEvent });
  } catch (error) {
    console.error('Error adding calendar event:', error);
    return res.status(500).json({ error: 'Failed to add event' });
  }
});

// Esemény módosítása
app.put('/api/calendar/events/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updateData = req.body;
    
    const [existing] = await query(
      'SELECT id FROM calendar_events WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const allowedFields = ['title', 'description', 'event_date', 'start_time', 'end_time', 'event_type', 'priority', 'status', 'location', 'animal_id', 'recurring_type', 'recurring_interval', 'recurring_end_date', 'reminder_before', 'color', 'reminder_days'];
    
    const updates = [];
    const values = [];
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field] === null ? null : updateData[field]);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, userId);
    
    await query(
      `UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    
    const [updated] = await query(
      'SELECT * FROM calendar_events WHERE id = ?',
      [id]
    );
    
    return res.json({ success: true, event: updated });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return res.status(500).json({ error: 'Failed to update event' });
  }
});

// Esemény státusz módosítása
app.patch('/api/calendar/events/:id/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const result = await query(
      'UPDATE calendar_events SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [status, id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating event status:', error);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// Esemény törlése
app.delete('/api/calendar/events/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM calendar_events WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Események statisztika
app.get('/api/calendar/events/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'year and month required' });
    }
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const stats = await query(
      `SELECT event_type, priority, COUNT(*) as count
       FROM calendar_events
       WHERE user_id = ? AND event_date BETWEEN ? AND ?
       GROUP BY event_type, priority`,
      [userId, startDate, endDate]
    );
    
    return res.json(stats);
  } catch (error) {
    console.error('Error fetching event stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ==================== ADMIN ====================

app.post('/api/admin/users', requireAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const hash = await bcrypt.hash(password, 10);

    await query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, hash, role]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/users', requireAuth, requireRole(['owner','admin']), async (req, res) => {
  try {

    const users = await query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY id DESC'
    );

    res.json(users);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', requireAuth, requireRole(['owner','admin']), async (req, res) => {
  try {

    const { id } = req.params;

    await query(
      'DELETE FROM users WHERE id=?',
      [id]
    );

    res.json({ success: true });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: 'Delete failed' });

  }
});

app.put('/api/admin/users/:id', requireAuth, requireRole(['owner','admin']), async (req, res) => {
  try {

    const { id } = req.params;
    const { username, email, role } = req.body;

    await query(
      'UPDATE users SET username=?, email=?, role=? WHERE id=?',
      [username, email, role, id]
    );

    res.json({ success: true });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: 'Update failed' });

  }
});

// ==================== NOTIFICATIONS ====================

// Értesítések lekérése
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    let { limit = 50, unread_only = false } = req.query;
    limit = parseInt(limit, 10);
    if (isNaN(limit) || limit < 1) limit = 50;
    let queryStr = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];
    if (unread_only === 'true') {
      queryStr += ' AND is_read = FALSE';
    }
    queryStr += ` ORDER BY created_at DESC LIMIT ${limit}`;
    const notifications = await query(queryStr, params);
    // Olvasatlanok száma
    const [unreadCount] = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({ 
      notifications, 
      unreadCount: unreadCount.count 
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Értesítés megjelölése olvasottként
app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Összes értesítés megjelölése olvasottként
app.put('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Értesítés törlése
app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    await query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Értesítési beállítások lekérése
app.get('/api/notification-settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    let [settings] = await query(
      'SELECT * FROM notification_settings WHERE user_id = ?',
      [userId]
    );
    
    if (!settings) {
      // Alapértelmezett beállítások létrehozása
      await query(
        `INSERT INTO notification_settings 
         (user_id, email_notifications, browser_notifications, event_reminders, marketplace_alerts, system_updates) 
         VALUES (?, TRUE, TRUE, TRUE, TRUE, TRUE)`,
        [userId]
      );
      [settings] = await query(
        'SELECT * FROM notification_settings WHERE user_id = ?',
        [userId]
      );
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Értesítési beállítások frissítése
app.put('/api/notification-settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email_notifications, browser_notifications, event_reminders, marketplace_alerts, system_updates } = req.body;
    
    await query(
      `INSERT INTO notification_settings 
       (user_id, email_notifications, browser_notifications, event_reminders, marketplace_alerts, system_updates) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       email_notifications = VALUES(email_notifications),
       browser_notifications = VALUES(browser_notifications),
       event_reminders = VALUES(event_reminders),
       marketplace_alerts = VALUES(marketplace_alerts),
       system_updates = VALUES(system_updates)`,
      [userId, email_notifications, browser_notifications, event_reminders, marketplace_alerts, system_updates]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==================== NOTIFICATION TRIGGERS ====================

// Admin: Értesítés küldése minden felhasználónak
app.post('/api/admin/send-notification', requireAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const { title, message, type = 'system_update' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Cím és üzenet kötelező' });
    }
    const allUsers = await query('SELECT id FROM users');
    let count = 0;
    for (const user of allUsers) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)`,
        [user.id, type, title, message, JSON.stringify({ sent_by: req.user.userId })]
      );
      count++;
    }
    console.log(`📢 Admin értesítés küldve ${count} felhasználónak: "${title}"`);
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error sending admin notification:', error);
    res.status(500).json({ error: 'Hiba az értesítés küldése során' });
  }
});

// Ellenőrző funkció a közelgő eseményekhez (ezt cron jobban vagy időzítetten kell futtatni)
app.get('/api/check-upcoming-events', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Holnapi események
    const tomorrowEvents = await query(
      `SELECT * FROM calendar_events 
       WHERE user_id = ? AND event_date = ?`,
      [userId, tomorrow]
    );
    
    // Következő 3 nap eseményei
    const upcomingEvents = await query(
      `SELECT * FROM calendar_events 
       WHERE user_id = ? AND event_date BETWEEN ? AND ?`,
      [userId, tomorrow, threeDaysLater]
    );
    
    // Értesítések küldése a holnapi eseményekről
    for (const event of tomorrowEvents) {
      // Ellenőrizzük, hogy már küldtünk-e értesítést
      const existingNotification = await query(
        `SELECT id FROM notifications 
         WHERE user_id = ? AND type = 'event_reminder' 
         AND JSON_EXTRACT(data, '$.event_id') = ? 
         AND DATE(created_at) = CURDATE()`,
        [userId, event.id]
      );
      
      if (existingNotification.length === 0) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, data) 
           VALUES (?, 'event_reminder', ?, ?, ?)`,
          [
            userId,
            'Esemény emlékeztető',
            `Holnap: ${event.title}${event.animal_name ? ` (${event.animal_name})` : ''}`,
            JSON.stringify({ event_id: event.id, event_date: event.event_date })
          ]
        );
      }
    }
    
    res.json({ 
      tomorrowEvents: tomorrowEvents.length,
      upcomingEvents: upcomingEvents.length 
    });
  } catch (error) {
    console.error('Error checking upcoming events:', error);
    res.status(500).json({ error: 'Failed to check events' });
  }
});


// ==================== EMAIL ENDPOINT ====================

app.post('/api/send-circular-email', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { emails = [], subject, message } = req.body || {};
    
    console.log('📧 Kör-email küldés:', { userId, recipientCount: emails.length, subject });
    
    if (!emails || emails.length === 0) {
      return res.status(400).json({ error: 'Legalább egy emailcím szükséges' });
    }
    
    if (!subject || !message) {
      return res.status(400).json({ error: 'Tárgy és üzenet kötelezőek' });
    }

    if (!mailTransporter) {
      return res.status(500).json({ error: 'Email küldés nincs konfigurálva. Kérjük állítsa be az SMTP beállításokat a .env fájlban (SMTP_HOST, SMTP_USER, SMTP_PASS).' });
    }
    
    // HTML formázás az üzenethez
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <hr style="border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #999;">
            Ezt az emailt automatikusan generáltuk. Kérjük, ne válaszoljon erre az emailre.
          </p>
        </body>
      </html>
    `;

    const fromAddress = SMTP_FROM_EMAIL || SMTP_USER;

    // Email küldés nodemailer-en keresztül
    const results = [];
    for (const email of emails) {
      try {
        const mailOptions = {
          from: SMTP_FROM_NAME ? `"${SMTP_FROM_NAME}" <${fromAddress}>` : fromAddress,
          to: email,
          subject: subject,
          html: htmlBody,
          text: message,
        };
        
        console.log(`📤 Email küldés: to=${email}, from=${fromAddress}`);
        
        await mailTransporter.sendMail(mailOptions);
        results.push({ email, success: true });
        console.log(`✅ Email küldve: ${email}`);
      } catch (error) {
        console.error(`❌ Hiba az emailben: ${email}`);
        console.error('   Error:', error.message);
        
        results.push({ 
          email, 
          success: false, 
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    console.log(`📊 Email küldés eredménye: ${successCount}/${emails.length} siker`);
    results.forEach(r => {
      if (!r.success) {
        console.log(`   ❌ ${r.email}: ${r.error}`);
      }
    });
    
    return res.json({ 
      success: successCount > 0,
      message: `${successCount}/${emails.length} email sikeresen küldve`,
      details: results,
      failedCount: emails.length - successCount
    });
  } catch (error) {
    console.error('❌ Hiba az email küldésben:', error);
    return res.status(500).json({ error: 'Email küldési hiba: ' + error.message });
  }
});


// ==================== EMPLOYEES ====================

app.get('/api/employees', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rows = await query('SELECT * FROM employees WHERE user_id = ? ORDER BY name ASC', [userId]);
    return res.json({ items: rows });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

app.post('/api/employees', requireAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const { name, position, hourly_rate, phone, email, hire_date, status, notes } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const userId = req.user.userId;
    const result = await query(
      'INSERT INTO employees (user_id, name, position, hourly_rate, phone, email, hire_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, name, position || null, hourly_rate || 0, phone || null, email || null, hire_date || null, status || 'active', notes || null]
    );
    const rows = await query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    return res.status(201).json({ item: rows[0] });
  } catch (error) {
    console.error('Error creating employee:', error);
    return res.status(500).json({ error: 'Failed to create employee' });
  }
});

app.put('/api/employees/:id', requireAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, hourly_rate, phone, email, hire_date, status, notes } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const userId = req.user.userId;
    const result = await query(
      'UPDATE employees SET name = ?, position = ?, hourly_rate = ?, phone = ?, email = ?, hire_date = ?, status = ?, notes = ? WHERE id = ? AND user_id = ?',
      [name, position || null, hourly_rate || 0, phone || null, email || null, hire_date || null, status || 'active', notes || null, id, userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });
    const rows = await query('SELECT * FROM employees WHERE id = ? AND user_id = ?', [id, userId]);
    return res.json({ item: rows[0] });
  } catch (error) {
    console.error('Error updating employee:', error);
    return res.status(500).json({ error: 'Failed to update employee' });
  }
});

app.delete('/api/employees/:id', requireAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const result = await query('DELETE FROM employees WHERE id = ? AND user_id = ?', [id, userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// ==================== TIMESHEETS ====================

app.get('/api/timesheets', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rows = await query(`
      SELECT t.id, t.employee_id, e.name AS employee_name, t.work_date, t.hours_worked, t.hourly_rate, t.total_pay, t.description, t.status, t.created_at
      FROM timesheets t
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE e.user_id = ?
      ORDER BY t.work_date DESC
    `, [userId]);
    return res.json({ items: rows });
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    return res.status(500).json({ error: 'Failed to fetch timesheets' });
  }
});

app.post('/api/timesheets', requireAuth, requireRole(['owner','admin','accountant']), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { employee_id, work_date, hours_worked, hourly_rate, description, status } = req.body || {};
    if (!employee_id || !work_date || !hours_worked || !hourly_rate) {
      return res.status(400).json({ error: 'employee_id, work_date, hours_worked, hourly_rate required' });
    }
    const result = await query(
      'INSERT INTO timesheets (employee_id, work_date, hours_worked, hourly_rate, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [employee_id, work_date, hours_worked, hourly_rate, description || null, status || 'pending', userId]
    );
    const rows = await query(`
      SELECT t.id, t.employee_id, e.name AS employee_name, t.work_date, t.hours_worked, t.hourly_rate, t.total_pay, t.description, t.status, t.created_at
      FROM timesheets t LEFT JOIN employees e ON t.employee_id = e.id WHERE t.id = ?
    `, [result.insertId]);
    return res.status(201).json({ item: rows[0] });
  } catch (error) {
    console.error('Error creating timesheet:', error);
    return res.status(500).json({ error: 'Failed to create timesheet' });
  }
});

app.put('/api/timesheets/:id', requireAuth, requireRole(['owner','admin','accountant']), async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id, work_date, hours_worked, hourly_rate, description, status } = req.body || {};
    if (!employee_id || !work_date || !hours_worked || !hourly_rate) {
      return res.status(400).json({ error: 'employee_id, work_date, hours_worked, hourly_rate required' });
    }
    const userId = req.user.userId;
    const result = await query(
      `UPDATE timesheets SET employee_id = ?, work_date = ?, hours_worked = ?, hourly_rate = ?, description = ?, status = ? 
       WHERE id = ? AND employee_id IN (SELECT id FROM employees WHERE user_id = ?)`,
      [employee_id, work_date, hours_worked, hourly_rate, description || null, status || 'pending', id, userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Timesheet not found' });
    const rows = await query(`
      SELECT t.id, t.employee_id, e.name AS employee_name, t.work_date, t.hours_worked, t.hourly_rate, t.total_pay, t.description, t.status, t.created_at
      FROM timesheets t LEFT JOIN employees e ON t.employee_id = e.id WHERE t.id = ?
    `, [id]);
    return res.json({ item: rows[0] });
  } catch (error) {
    console.error('Error updating timesheet:', error);
    return res.status(500).json({ error: 'Failed to update timesheet' });
  }
});

app.delete('/api/timesheets/:id', requireAuth, requireRole(['owner','admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const result = await query(
      'DELETE FROM timesheets WHERE id = ? AND employee_id IN (SELECT id FROM employees WHERE user_id = ?)',
      [id, userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Timesheet not found' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting timesheet:', error);
    return res.status(500).json({ error: 'Failed to delete timesheet' });
  }
});

// ==================== START SERVER ====================

app.listen(Number(PORT), () => {
  console.log(`API listening on :${PORT}`);
});