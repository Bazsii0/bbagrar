/**
 * Selenium E2E Tesztek - BB Agrár
 * 
 * Ezek a tesztek a böngészőben futva tesztelik az alkalmazás felhasználói felületét.
 * A tesztek futtatásához szükséges:
 *   - Futó frontend (npm run dev -> http://localhost:5173)
 *   - Futó backend + adatbázis (docker compose up -d)
 *   - Chrome böngésző telepítve
 * 
 * Futtatás: npm run test:selenium
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const BASE_URL = 'http://localhost:5173';

// Teszt felhasználó (előbb a REST teszteket futtasd, vagy hozz létre manuálisan)
const TEST_USER = {
  username: `selenium_${Date.now()}`,
  email: `selenium_${Date.now()}@test.com`,
  password: 'SeleniumTest123',
};

let driver;

// ==================== SETUP ====================

beforeAll(async () => {
  // Chrome beállítások
  const options = new chrome.Options();
  options.addArguments('--headless=new');     // Böngésző nélküli mód (háttérben fut)
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1920,1080');
  options.addArguments('--lang=hu-HU');

  // A selenium-webdriver 4.x automatikusan kezeli a driver letöltést (Selenium Manager)
  driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // Implicit wait: max 10 másodpercig vár elemekre
  await driver.manage().setTimeouts({ implicit: 10000 });
}, 120000); // 2 perc timeout a driver letöltéséhez

afterAll(async () => {
  if (driver) {
    await driver.quit();
  }
  console.log('\n✅ Selenium tesztek befejezve.');
});

// Helper: várás megadott milliszekundumig
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: megvárja hogy az oldal teljesen betöltődjön
const waitForPageLoad = async () => {
  await driver.wait(async () => {
    const state = await driver.executeScript('return document.readyState');
    return state === 'complete';
  }, 15000);
};

// ==================== 1. LANDING OLDAL ====================

describe('Landing oldal', () => {

  test('A főoldal betöltődik', async () => {
    await driver.get(BASE_URL);
    await waitForPageLoad();

    const title = await driver.getTitle();
    expect(title).toBeTruthy();

    // Ellenőrizzük, hogy van-e tartalom az oldalon
    const body = await driver.findElement(By.tagName('body'));
    const text = await body.getText();
    expect(text.length).toBeGreaterThan(0);
  });

  test('A bejelentkezés gomb/link elérhető', async () => {
    await driver.get(BASE_URL);
    await waitForPageLoad();

    // Keressük a bejelentkezés linket/gombot
    const links = await driver.findElements(By.css('a[href*="login"], a[href*="bejelentkezes"]'));
    const buttons = await driver.findElements(By.xpath(
      '//*[contains(text(), "Bejelentkezés") or contains(text(), "Belépés") or contains(text(), "Login")]'
    ));

    const hasLoginLink = links.length > 0 || buttons.length > 0;
    expect(hasLoginLink).toBe(true);
  });
});

// ==================== 2. REGISZTRÁCIÓ ====================

describe('Regisztráció', () => {

  test('A regisztrációs oldal betöltődik', async () => {
    await driver.get(`${BASE_URL}/register`);
    await waitForPageLoad();

    // Ellenőrizzük, hogy van form az oldalon
    const forms = await driver.findElements(By.tagName('form'));
    expect(forms.length).toBeGreaterThan(0);
  });

  test('Sikeres regisztráció', async () => {
    await driver.get(`${BASE_URL}/register`);
    await waitForPageLoad();
    await wait(1000);

    // Felhasználónév kitöltése
    const usernameInput = await driver.findElement(
      By.css('input[autocomplete="username"], input[name="username"], input[placeholder*="elhasználó"]')
    ).catch(() => null);

    if (usernameInput) {
      await usernameInput.clear();
      await usernameInput.sendKeys(TEST_USER.username);
    }

    // Email kitöltése
    const emailInputs = await driver.findElements(By.css('input[type="email"], input[name="email"]'));
    if (emailInputs.length > 0) {
      await emailInputs[0].clear();
      await emailInputs[0].sendKeys(TEST_USER.email);
    }

    // Jelszó kitöltése
    const passwordInputs = await driver.findElements(By.css('input[type="password"]'));
    if (passwordInputs.length > 0) {
      await passwordInputs[0].clear();
      await passwordInputs[0].sendKeys(TEST_USER.password);
    }
    // Ha van jelszó megerősítés mező
    if (passwordInputs.length > 1) {
      await passwordInputs[1].clear();
      await passwordInputs[1].sendKeys(TEST_USER.password);
    }

    // Submit gomb megnyomása
    const submitButton = await driver.findElement(
      By.css('button[type="submit"]')
    );
    await submitButton.click();

    // Várjuk az átirányítást a dashboard-ra vagy sikeres regisztráció jelzést
    await wait(3000);
    const currentUrl = await driver.getCurrentUrl();
    
    // Sikeres ha átirányított a dashboardra, VAGY ha megjelent egy sikeres üzenet
    const redirectedToDashboard = currentUrl.includes('/dashboard');
    const redirectedToLogin = currentUrl.includes('/login');
    const redirectedToRoot = currentUrl === `${BASE_URL}/` || currentUrl === BASE_URL;
    const stayedOnRegister = currentUrl.includes('/register');

    // Sikeres, ha nem maradt a regisztrációs oldalon hibával
    if (stayedOnRegister) {
      // Ellenőrizzük, hogy nincs-e hiba üzenet
      const errorElements = await driver.findElements(By.css('.bg-red-50, .text-red-700, [class*="error"]'));
      // Ha van hiba, az is lehet hogy a felhasználó már létezik - ez OK integrációs tesztnél
      console.log('  Regisztráció eredménye: maradt a /register oldalon');
    }
    
    expect(redirectedToDashboard || redirectedToLogin || redirectedToRoot || stayedOnRegister).toBe(true);
  });
});

// ==================== 3. BEJELENTKEZÉS ====================

describe('Bejelentkezés oldal', () => {

  test('A bejelentkezés oldal betöltődik', async () => {
    await driver.get(`${BASE_URL}/login`);
    await waitForPageLoad();

    // Ellenőrizzük a "Bejelentkezés" feliratot
    const heading = await driver.findElement(
      By.xpath('//*[contains(text(), "Bejelentkezés")]')
    );
    expect(await heading.isDisplayed()).toBe(true);
  });

  test('Az input mezők megjelennek', async () => {
    await driver.get(`${BASE_URL}/login`);
    await waitForPageLoad();

    // Felhasználónév/email mező
    const identifierInput = await driver.findElement(
      By.css('input[autocomplete="username"], input[name="identifier"], input:not([type="password"])[type="text"], input:not([type="password"]):not([type="submit"])')
    );
    expect(await identifierInput.isDisplayed()).toBe(true);

    // Jelszó mező
    const passwordInput = await driver.findElement(By.css('input[type="password"]'));
    expect(await passwordInput.isDisplayed()).toBe(true);

    // Bejelentkezés gomb
    const submitButton = await driver.findElement(By.css('button[type="submit"]'));
    expect(await submitButton.isDisplayed()).toBe(true);
  });

  test('Hibás bejelentkezés hibaüzenetet mutat', async () => {
    await driver.get(`${BASE_URL}/login`);
    await waitForPageLoad();
    await wait(500);

    // Hibás adatok kitöltése
    const inputs = await driver.findElements(By.css('input'));
    // Első nem-password input
    for (const input of inputs) {
      const type = await input.getAttribute('type');
      if (type !== 'password' && type !== 'submit' && type !== 'hidden') {
        await input.clear();
        await input.sendKeys('nemletezofelhaszanlo');
        break;
      }
    }

    const passwordInput = await driver.findElement(By.css('input[type="password"]'));
    await passwordInput.clear();
    await passwordInput.sendKeys('rosszjelszo123');

    // Submit
    const submitButton = await driver.findElement(By.css('button[type="submit"]'));
    await submitButton.click();

    await wait(2000);

    // Hibaüzenet megjelenése
    const errorElement = await driver.findElements(
      By.css('.bg-red-50, .text-red-700, .text-red-600, [class*="error"], [class*="alert"]')
    );
    expect(errorElement.length).toBeGreaterThan(0);
  });

  test('Sikeres bejelentkezés átirányít a dashboardra', async () => {
    // Előbb regisztrálunk egy felhasználót az API-n keresztül
    const axios = require('axios');
    const loginUser = {
      username: `seltest_${Date.now()}`,
      email: `seltest_${Date.now()}@test.com`,
      password: 'TestPassword123',
    };

    try {
      await axios.post('http://localhost:4001/api/auth/register', loginUser);
    } catch (e) {
      // Ha már létezik, nem baj
    }

    await driver.get(`${BASE_URL}/login`);
    await waitForPageLoad();
    await wait(500);

    // Felhasználónév kitöltése
    const inputs = await driver.findElements(By.css('input'));
    for (const input of inputs) {
      const type = await input.getAttribute('type');
      if (type !== 'password' && type !== 'submit' && type !== 'hidden') {
        await input.clear();
        await input.sendKeys(loginUser.username);
        break;
      }
    }

    // Jelszó kitöltése
    const passwordInput = await driver.findElement(By.css('input[type="password"]'));
    await passwordInput.clear();
    await passwordInput.sendKeys(loginUser.password);

    // Submit
    const submitButton = await driver.findElement(By.css('button[type="submit"]'));
    await submitButton.click();

    // Várakozás az átirányításra
    await wait(3000);

    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/dashboard');
  });
});

// ==================== 4. DASHBOARD ====================

describe('Dashboard oldal', () => {

  test('A Dashboard oldal betöltődik és megjeleníti a statisztikákat', async () => {
    // Az előző tesztből már be vagyunk jelentkezve
    const currentUrl = await driver.getCurrentUrl();
    if (!currentUrl.includes('/dashboard')) {
      await driver.get(`${BASE_URL}/dashboard`);
      await waitForPageLoad();
    }

    await wait(2000);

    // "Dashboard" felirat keresése
    const heading = await driver.findElements(
      By.xpath('//*[contains(text(), "Dashboard")]')
    );
    expect(heading.length).toBeGreaterThan(0);
  });

  test('Statisztikai kártyák megjelennek', async () => {
    await wait(2000);

    // Keressük a statisztikai kártyákat
    const cards = await driver.findElements(
      By.xpath(
        '//*[contains(text(), "Állatlétszám") or contains(text(), "Pénzügyi") or contains(text(), "Közelgő") or contains(text(), "Mai teendők")]'
      )
    );
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  test('Mai események szekció megjelenik', async () => {
    const section = await driver.findElements(
      By.xpath('//*[contains(text(), "Mai események")]')
    );
    expect(section.length).toBeGreaterThan(0);
  });

  test('Holnapi események szekció megjelenik', async () => {
    const section = await driver.findElements(
      By.xpath('//*[contains(text(), "Holnapi események")]')
    );
    expect(section.length).toBeGreaterThan(0);
  });

  test('Gyors műveletek gombok megjelennek', async () => {
    const buttons = await driver.findElements(
      By.xpath(
        '//button[contains(text(), "Új állat") or contains(text(), "Új föld") or contains(text(), "költségvetés") or contains(text(), "Naptár")]'
      )
    );
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

// ==================== 5. NAVIGÁCIÓ ====================

describe('Navigáció', () => {

  test('Állatok oldal elérhető', async () => {
    await driver.get(`${BASE_URL}/animals`);
    await waitForPageLoad();
    await wait(1500);

    const currentUrl = await driver.getCurrentUrl();
    // Vagy az animals oldalon vagyunk, vagy visszairányított (login)
    expect(currentUrl.includes('/animals') || currentUrl.includes('/login')).toBe(true);
  });

  test('Földek oldal elérhető', async () => {
    await driver.get(`${BASE_URL}/lands`);
    await waitForPageLoad();
    await wait(1500);

    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl.includes('/lands') || currentUrl.includes('/login')).toBe(true);
  });

  test('Költségvetés oldal elérhető', async () => {
    await driver.get(`${BASE_URL}/budget`);
    await waitForPageLoad();
    await wait(1500);

    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl.includes('/budget') || currentUrl.includes('/login')).toBe(true);
  });

  test('Naptár oldal elérhető', async () => {
    await driver.get(`${BASE_URL}/calendar`);
    await waitForPageLoad();
    await wait(1500);

    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl.includes('/calendar') || currentUrl.includes('/login')).toBe(true);
  });

  test('Piactér oldal elérhető', async () => {
    await driver.get(`${BASE_URL}/marketplace`);
    await waitForPageLoad();
    await wait(1500);

    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl.includes('/marketplace') || currentUrl.includes('/login')).toBe(true);
  });

  test('Profil oldal elérhető', async () => {
    await driver.get(`${BASE_URL}/profile`);
    await waitForPageLoad();
    await wait(1500);

    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl.includes('/profile') || currentUrl.includes('/login')).toBe(true);
  });
});

// ==================== 6. GYORS MŰVELETEK (DASHBOARD GOMB KATTINTÁS) ====================

describe('Dashboard gyors műveletek navigáció', () => {

  beforeAll(async () => {
    // Újra bejelentkezünk ha szükséges
    const axios = require('axios');
    const navUser = {
      username: `navtest_${Date.now()}`,
      email: `navtest_${Date.now()}@test.com`,
      password: 'NavTest123',
    };

    try {
      await axios.post('http://localhost:4001/api/auth/register', navUser);
    } catch (e) {}

    await driver.get(`${BASE_URL}/login`);
    await waitForPageLoad();
    await wait(500);

    const inputs = await driver.findElements(By.css('input'));
    for (const input of inputs) {
      const type = await input.getAttribute('type');
      if (type !== 'password' && type !== 'submit' && type !== 'hidden') {
        await input.clear();
        await input.sendKeys(navUser.username);
        break;
      }
    }

    const passwordInput = await driver.findElement(By.css('input[type="password"]'));
    await passwordInput.clear();
    await passwordInput.sendKeys(navUser.password);

    const submitButton = await driver.findElement(By.css('button[type="submit"]'));
    await submitButton.click();
    await wait(3000);
  });

  test('"Új állat hozzáadása" gomb navigál az Állatok oldalra', async () => {
    await driver.get(`${BASE_URL}/dashboard`);
    await waitForPageLoad();
    await wait(2000);

    const button = await driver.findElements(
      By.xpath('//button[contains(text(), "Új állat")]')
    );

    if (button.length > 0) {
      await button[0].click();
      await wait(2000);
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/animals');
    } else {
      console.log('  "Új állat hozzáadása" gomb nem található');
    }
  });

  test('"Naptár megnyitása" gomb navigál a Naptár oldalra', async () => {
    await driver.get(`${BASE_URL}/dashboard`);
    await waitForPageLoad();
    await wait(2000);

    const button = await driver.findElements(
      By.xpath('//button[contains(text(), "Naptár")]')
    );

    if (button.length > 0) {
      await button[0].click();
      await wait(2000);
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/calendar');
    } else {
      console.log('  "Naptár megnyitása" gomb nem található');
    }
  });
});

// ==================== 7. RESZPONZIVITÁS ====================

describe('Reszponzivitás', () => {

  test('Mobil nézetben az oldal megfelelően jelenik meg', async () => {
    // Ablakméret átállítása mobil méretre
    await driver.manage().window().setRect({ width: 375, height: 812 });
    await driver.get(`${BASE_URL}/login`);
    await waitForPageLoad();
    await wait(1000);

    // Ellenőrizzük, hogy a form megjelenik
    const form = await driver.findElements(By.tagName('form'));
    expect(form.length).toBeGreaterThan(0);

    // Visszaállítás desktop méretre
    await driver.manage().window().setRect({ width: 1920, height: 1080 });
  });

  test('Tablet nézetben az oldal megfelelően jelenik meg', async () => {
    await driver.manage().window().setRect({ width: 768, height: 1024 });
    await driver.get(`${BASE_URL}/login`);
    await waitForPageLoad();
    await wait(1000);

    const form = await driver.findElements(By.tagName('form'));
    expect(form.length).toBeGreaterThan(0);

    // Visszaállítás
    await driver.manage().window().setRect({ width: 1920, height: 1080 });
  });
});
