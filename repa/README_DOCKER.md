# BB Agrár – Docker (adatbázis) + Bejelentkezés

## 1) Mit változtattam a projektben?
- A korábbi **sql.js + localStorage** alapú "lokális adatbázis" helyett létrehoztam egy **Node/Express API-t** (`/server`), ami egy **MySQL adatbázisba** ment.
- Készült **docker-compose.yml**, ami elindítja:
  - `db` (MySQL)
  - `api` (Node/Express backend)
  - `phpmyadmin` (opcionális, böngészőben)
- A frontendbe bekerült **login + register** oldal és védett útvonalak.

## 2) Indítás (fejlesztés)

### A) Backend + MySQL dockerben
1. A projekt gyökér mappájában:
   ```bash
   docker compose up -d --build
   ```
2. Ellenőrzés:
   - API health: `http://localhost:4000/health`
   - phpMyAdmin: `http://localhost:8081` (root/root)

### B) Frontend futtatás lokálisan
1. `.env` a frontend gyökérben (ha nincs, hozd létre):
   ```bash
   VITE_API_URL=http://localhost:4000
   ```
2. Frontend:
   ```bash
   npm install
   npm run dev
   ```

## 3) Használat
- Nyisd meg: `http://localhost:5173`
- Regisztrálj, majd belépés után a mentések már a dockerben futó MySQL-be mennek.

## 4) Megjegyzés
- A dokumentum feltöltés jelenleg csak "meta" (fájlt nem uploadol), mert az eredeti frontend is csak filepath-ot tárolt.
