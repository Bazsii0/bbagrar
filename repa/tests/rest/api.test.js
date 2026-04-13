/**
 * REST API Tesztek - BB Agrár
 * 
 * Ezek a tesztek a backend API végpontokat tesztelik HTTP kérésekkel.
 * A tesztek futtatásához a szerver és az adatbázis futnia kell (docker compose up -d).
 * 
 * Futtatás: npm run test:rest
 */

const axios = require('axios');

const API_URL = 'http://localhost:4001';

// Teszt felhasználó adatai (mindegyik futtatásnál egyedi)
const testUser = {
  username: `tesztuser_${Date.now()}`,
  email: `teszt_${Date.now()}@example.com`,
  password: 'TesztJelszo123',
};

let authToken = null;
let userId = null;

// Axios instance az API hívásokhoz
const api = axios.create({
  baseURL: API_URL,
  validateStatus: () => true, // Ne dobjon hibát HTTP error kódoknál
});

// Helper: authentikált kérés küldése
const authApi = () => {
  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${authToken}` },
    validateStatus: () => true,
  });
};

// ==================== 1. HEALTH CHECK ====================

describe('Health Check', () => {
  test('GET /health - Szerver és adatbázis elérhető', async () => {
    const res = await api.get('/health');
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
  });
});

// ==================== 2. AUTENTIKÁCIÓ ====================

describe('Autentikáció', () => {
  
  test('POST /api/auth/register - Sikeres regisztráció', async () => {
    const res = await api.post('/api/auth/register', testUser);
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('token');
    expect(res.data).toHaveProperty('user');
    expect(res.data.user.username).toBe(testUser.username);
    expect(res.data.user.email).toBe(testUser.email);
    
    // Token mentése a további tesztekhez
    authToken = res.data.token;
    userId = res.data.user.id;
  });

  test('POST /api/auth/register - Duplikált felhasználó (409)', async () => {
    const res = await api.post('/api/auth/register', testUser);
    expect(res.status).toBe(409);
    expect(res.data).toHaveProperty('error');
  });

  test('POST /api/auth/register - Hiányzó mezők (400)', async () => {
    const res = await api.post('/api/auth/register', { username: 'valami' });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });

  test('POST /api/auth/register - Rövid jelszó (400)', async () => {
    const res = await api.post('/api/auth/register', {
      username: 'short_pw_user',
      email: 'short@test.com',
      password: '12345',
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('6');
  });

  test('POST /api/auth/login - Sikeres bejelentkezés', async () => {
    const res = await api.post('/api/auth/login', {
      identifier: testUser.username,
      password: testUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('token');
    expect(res.data).toHaveProperty('user');
    expect(res.data.user.username).toBe(testUser.username);
    
    authToken = res.data.token;
  });

  test('POST /api/auth/login - Hibás jelszó (401)', async () => {
    const res = await api.post('/api/auth/login', {
      identifier: testUser.username,
      password: 'rosszjelszo',
    });
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/login - Nem létező felhasználó (401)', async () => {
    const res = await api.post('/api/auth/login', {
      identifier: 'nemletezo_user',
      password: 'valami',
    });
    expect(res.status).toBe(401);
  });

  test('GET /api/me - Bejelentkezett felhasználó adatai', async () => {
    const res = await authApi().get('/api/me');
    expect(res.status).toBe(200);
    expect(res.data.user.username).toBe(testUser.username);
  });

  test('GET /api/me - Token nélkül (401)', async () => {
    const res = await api.get('/api/me');
    expect(res.status).toBe(401);
  });
});

// ==================== 3. PROFIL ====================

describe('Profil kezelés', () => {

  test('GET /api/profile - Profil lekérése', async () => {
    const res = await authApi().get('/api/profile');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('profile');
    expect(res.data.profile.username).toBe(testUser.username);
  });

  test('PUT /api/profile - Profil frissítése', async () => {
    const res = await authApi().put('/api/profile', {
      username: testUser.username,
      email: testUser.email,
      phone: '+36301234567',
      location: 'Budapest',
      bio: 'Teszt bio leírás',
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.profile.phone).toBe('+36301234567');
  });

  test('PUT /api/profile/password - Jelszó módosítás', async () => {
    const res = await authApi().put('/api/profile/password', {
      currentPassword: testUser.password,
      newPassword: 'UjJelszo456',
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);

    // Visszaállítjuk az eredeti jelszót
    await authApi().put('/api/profile/password', {
      currentPassword: 'UjJelszo456',
      newPassword: testUser.password,
    });
  });

  test('PUT /api/profile/password - Hibás jelenlegi jelszó (401)', async () => {
    const res = await authApi().put('/api/profile/password', {
      currentPassword: 'rosszjelszo',
      newPassword: 'UjJelszo456',
    });
    expect(res.status).toBe(401);
  });
});

// ==================== 4. ÁLLATOK (ANIMALS) ====================

describe('Állatok CRUD', () => {
  let animalId = null;

  test('POST /api/animals - Új állat hozzáadása', async () => {
    const res = await authApi().post('/api/animals', {
      name: 'Teszt Bocika',
      species: 'szarvasmarha',
      breed: 'Magyar szürke',
      identifier: `TESZT-${Date.now()}`,
      birth_date: '2024-01-15',
      gender: 'nőstény',
      stable: 'A-istálló',
      purpose: 'tenyésztés',
      notes: 'Teszt állat a REST tesztekhez',
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data).toHaveProperty('id');
    animalId = res.data.id;
  });

  test('POST /api/animals - Hiányzó kötelező mezők (400)', async () => {
    const res = await authApi().post('/api/animals', {
      name: 'Hiányos Állat',
    });
    expect(res.status).toBe(400);
  });

  test('GET /api/animals - Állatok listázása', async () => {
    const res = await authApi().get('/api/animals');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('items');
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(res.data.items.length).toBeGreaterThan(0);
    
    const found = res.data.items.find(a => a.id === animalId);
    expect(found).toBeTruthy();
    expect(found.name).toBe('Teszt Bocika');
  });

  test('PUT /api/animals/:id - Állat módosítása', async () => {
    const res = await authApi().put(`/api/animals/${animalId}`, {
      name: 'Teszt Bocika Módosított',
      species: 'szarvasmarha',
      breed: 'Magyar szürke',
      identifier: `TESZT-MOD-${Date.now()}`,
      gender: 'nőstény',
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  test('DELETE /api/animals/:id - Állat törlése', async () => {
    const res = await authApi().delete(`/api/animals/${animalId}`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  test('DELETE /api/animals/99999 - Nem létező állat törlése (404)', async () => {
    const res = await authApi().delete('/api/animals/99999');
    expect(res.status).toBe(404);
  });

  test('GET /api/animals - Token nélkül (401)', async () => {
    const res = await api.get('/api/animals');
    expect(res.status).toBe(401);
  });
});

// ==================== 5. FÖLDTERÜLETEK (LANDS) ====================

describe('Földterületek CRUD', () => {
  let landId = null;

  test('POST /api/lands - Új földterület rögzítése', async () => {
    const res = await authApi().post('/api/lands', {
      name: 'Teszt Szántóföld',
      plot_number: '1234/5',
      area: 25.5,
      city: 'Debrecen',
      location: 'Északi határrész',
      ownership_type: 'owned',
      status: 'active',
      notes: 'Teszt föld a REST tesztekhez',
    });
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('item');
    expect(res.data.item.name).toBe('Teszt Szántóföld');
    landId = res.data.item.id;
  });

  test('POST /api/lands - Hiányzó kötelező mezők (400)', async () => {
    const res = await authApi().post('/api/lands', {
      notes: 'hiányos',
    });
    expect(res.status).toBe(400);
  });

  test('GET /api/lands - Földterületek listázása', async () => {
    const res = await authApi().get('/api/lands');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('items');
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  test('DELETE /api/lands/:id - Földterület törlése', async () => {
    const res = await authApi().delete(`/api/lands/${landId}`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });
});

// ==================== 6. KÖLTSÉGVETÉS (BUDGET) ====================

describe('Költségvetés - Kiadások', () => {
  let expenseId = null;

  test('POST /api/expenses - Új kiadás rögzítése', async () => {
    const res = await authApi().post('/api/expenses', {
      amount: 15000,
      category: 'Takarmány',
      description: 'Teszt kiadás',
      date: '2025-01-15',
    });
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('item');
    expect(Number(res.data.item.amount)).toBe(15000);
    expenseId = res.data.item.id;
  });

  test('POST /api/expenses - Hiányzó mezők (400)', async () => {
    const res = await authApi().post('/api/expenses', {
      amount: 5000,
    });
    expect(res.status).toBe(400);
  });

  test('GET /api/expenses - Kiadások listázása', async () => {
    const res = await authApi().get('/api/expenses');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('items');
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  test('PUT /api/expenses/:id - Kiadás módosítása', async () => {
    const res = await authApi().put(`/api/expenses/${expenseId}`, {
      amount: 20000,
      category: 'Takarmány',
      description: 'Módosított kiadás',
      date: '2025-01-16',
    });
    expect(res.status).toBe(200);
    expect(Number(res.data.item.amount)).toBe(20000);
  });

  test('DELETE /api/expenses/:id - Kiadás törlése', async () => {
    const res = await authApi().delete(`/api/expenses/${expenseId}`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });
});

describe('Költségvetés - Bevételek', () => {
  let incomeId = null;

  test('POST /api/incomes - Új bevétel rögzítése', async () => {
    const res = await authApi().post('/api/incomes', {
      amount: 50000,
      category: 'Tejeladás',
      description: 'Teszt bevétel',
      date: '2025-01-15',
    });
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('item');
    expect(Number(res.data.item.amount)).toBe(50000);
    incomeId = res.data.item.id;
  });

  test('GET /api/incomes - Bevételek listázása', async () => {
    const res = await authApi().get('/api/incomes');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('items');
  });

  test('PUT /api/incomes/:id - Bevétel módosítása', async () => {
    const res = await authApi().put(`/api/incomes/${incomeId}`, {
      amount: 60000,
      category: 'Tejeladás',
      description: 'Módosított bevétel',
      date: '2025-01-16',
    });
    expect(res.status).toBe(200);
    expect(Number(res.data.item.amount)).toBe(60000);
  });

  test('DELETE /api/incomes/:id - Bevétel törlése', async () => {
    const res = await authApi().delete(`/api/incomes/${incomeId}`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });
});

// ==================== 7. ÜGYFELEK (CLIENTS) ====================

describe('Ügyfelek CRUD', () => {
  let clientId = null;

  test('POST /api/clients - Új ügyfél hozzáadása', async () => {
    const res = await authApi().post('/api/clients', {
      name: 'Teszt Ügyfél Kft.',
      company_name: 'Teszt Kft.',
      email: 'ugyfel@teszt.hu',
      phone: '+36201234567',
      city: 'Budapest',
      type: 'buyer',
      status: 'active',
    });
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('item');
    expect(res.data.item.name).toBe('Teszt Ügyfél Kft.');
    clientId = res.data.item.id;
  });

  test('POST /api/clients - Hiányzó név (400)', async () => {
    const res = await authApi().post('/api/clients', {
      email: 'valami@teszt.hu',
    });
    expect(res.status).toBe(400);
  });

  test('GET /api/clients - Ügyfelek listázása', async () => {
    const res = await authApi().get('/api/clients');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('items');
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  test('PUT /api/clients/:id - Ügyfél módosítása', async () => {
    const res = await authApi().put(`/api/clients/${clientId}`, {
      name: 'Módosított Ügyfél Kft.',
      email: 'modositott@teszt.hu',
    });
    expect(res.status).toBe(200);
    expect(res.data.item.name).toBe('Módosított Ügyfél Kft.');
  });

  test('DELETE /api/clients/:id - Ügyfél törlése', async () => {
    const res = await authApi().delete(`/api/clients/${clientId}`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });
});

// ==================== 8. NAPTÁR (CALENDAR) ====================

describe('Naptár események CRUD', () => {
  let eventId = null;

  test('POST /api/calendar/events - Új esemény létrehozása', async () => {
    const res = await authApi().post('/api/calendar/events', {
      title: 'Teszt Esemény',
      description: 'REST teszt esemény leírása',
      event_date: '2025-06-15',
      start_time: '09:00',
      end_time: '10:30',
      event_type: 'task',
      priority: 'high',
    });
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('id');
    expect(res.data).toHaveProperty('event');
    expect(res.data.event.title).toBe('Teszt Esemény');
    eventId = res.data.id;
  });

  test('POST /api/calendar/events - Hiányzó kötelező mezők (400)', async () => {
    const res = await authApi().post('/api/calendar/events', {
      description: 'nincs title és dátum',
    });
    expect(res.status).toBe(400);
  });

  test('GET /api/calendar/events - Események listázása', async () => {
    const res = await authApi().get('/api/calendar/events');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('items');
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  test('GET /api/calendar/events?date=... - Események dátum szerinti szűrése', async () => {
    const res = await authApi().get('/api/calendar/events?date=2025-06-15');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('items');
    const found = res.data.items.find(e => e.id === eventId);
    expect(found).toBeTruthy();
  });

  test('GET /api/calendar/events/:id - Esemény lekérése ID alapján', async () => {
    const res = await authApi().get(`/api/calendar/events/${eventId}`);
    expect(res.status).toBe(200);
    expect(res.data.title).toBe('Teszt Esemény');
  });

  test('GET /api/calendar/events/upcoming - Közelgő események', async () => {
    const res = await authApi().get('/api/calendar/events/upcoming?days=365');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('items');
  });

  test('PUT /api/calendar/events/:id - Esemény módosítása', async () => {
    const res = await authApi().put(`/api/calendar/events/${eventId}`, {
      title: 'Módosított Esemény',
      priority: 'urgent',
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.event.title).toBe('Módosított Esemény');
  });

  test('PATCH /api/calendar/events/:id/status - Státusz módosítás', async () => {
    const res = await authApi().patch(`/api/calendar/events/${eventId}/status`, {
      status: 'completed',
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  test('PATCH /api/calendar/events/:id/status - Érvénytelen státusz (400)', async () => {
    const res = await authApi().patch(`/api/calendar/events/${eventId}/status`, {
      status: 'invalid_status',
    });
    expect(res.status).toBe(400);
  });

  test('DELETE /api/calendar/events/:id - Esemény törlése', async () => {
    const res = await authApi().delete(`/api/calendar/events/${eventId}`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });
});

// ==================== 9. DASHBOARD ====================

describe('Dashboard statisztikák', () => {

  test('GET /api/dashboard/stats - Dashboard adatok lekérése', async () => {
    const res = await authApi().get('/api/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('animalCount');
    expect(res.data).toHaveProperty('balance');
    expect(typeof res.data.animalCount).toBe('number');
    expect(typeof res.data.balance).toBe('number');
  });
});

// ==================== 10. ÉRTESÍTÉSEK (NOTIFICATIONS) ====================

describe('Értesítések', () => {

  test('GET /api/notifications - Értesítések lekérése', async () => {
    const res = await authApi().get('/api/notifications');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('notifications');
    expect(res.data).toHaveProperty('unreadCount');
    expect(Array.isArray(res.data.notifications)).toBe(true);
  });

  test('PUT /api/notifications/read-all - Összes olvasottnak jelölése', async () => {
    const res = await authApi().put('/api/notifications/read-all');
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  test('GET /api/notification-settings - Értesítési beállítások', async () => {
    const res = await authApi().get('/api/notification-settings');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('user_id');
  });
});

// ==================== 11. PIACTÉR (MARKETPLACE) ====================

describe('Piactér', () => {

  test('GET /api/marketplace - Hirdetések listázása (publikus)', async () => {
    const res = await api.get('/api/marketplace');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('items');
    expect(Array.isArray(res.data.items)).toBe(true);
  });
});

// ==================== 12. DOLGOZÓK (EMPLOYEES) ====================

describe('Dolgozók CRUD', () => {
  let employeeId = null;

  test('POST /api/employees - Új dolgozó hozzáadása', async () => {
    const res = await authApi().post('/api/employees', {
      name: 'Teszt Dolgozó',
      position: 'Állatgondozó',
      hourly_rate: 2500,
      phone: '+36301234567',
      email: 'dolgozo@teszt.hu',
      hire_date: '2024-01-01',
      status: 'active',
    });
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('item');
    expect(res.data.item.name).toBe('Teszt Dolgozó');
    employeeId = res.data.item.id;
  });

  test('POST /api/employees - Hiányzó név (400)', async () => {
    const res = await authApi().post('/api/employees', {
      position: 'Valami',
    });
    expect(res.status).toBe(400);
  });

  test('GET /api/employees - Dolgozók listázása', async () => {
    const res = await authApi().get('/api/employees');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('items');
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  test('PUT /api/employees/:id - Dolgozó módosítása', async () => {
    const res = await authApi().put(`/api/employees/${employeeId}`, {
      name: 'Módosított Dolgozó',
      position: 'Fő Állatgondozó',
      hourly_rate: 3000,
    });
    expect(res.status).toBe(200);
    expect(res.data.item.name).toBe('Módosított Dolgozó');
  });

  test('DELETE /api/employees/:id - Dolgozó törlése', async () => {
    const res = await authApi().delete(`/api/employees/${employeeId}`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });
});

// ==================== TAKARÍTÁS ====================

afterAll(async () => {
  // Teszt felhasználó törlése (admin jogkör kellene, szóval ezt kihagyjuk)
  console.log('\n✅ REST API tesztek befejezve.');
  console.log(`   Teszt felhasználó: ${testUser.username} (${testUser.email})`);
  console.log('   A teszt felhasználót manuálisan kell törölni ha szükséges.');
});
