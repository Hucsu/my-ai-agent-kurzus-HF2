# Geo-Customers REST API Implementációs Terv

> **Szubagensek számára:** KÖTELEZŐ RÉSZSKILL: A superpowers:subagent-driven-development skill-t kell használni a terv feladatonkénti végrehajtásához. A lépések checkbox (`- [ ]`) szintaxissal vannak jelölve.
>
> **NYELVPREFERENCIA: MAGYAR** — Minden kommunikáció (review, feedback, összefoglalók, kérdések) MAGYAR NYELVEN történik. Ne váltson angolra.

**Cél:** Egy kis, offline működő Node.js REST szolgáltatás létrehozása, amely 15 magyar ügyfél-rekordot tölt be PostgreSQL-be, helyi koordinátákat rendel hozzájuk, és távolság szerinti rendezésű végpontokat szolgáltat ki.

**Architektúra:** TypeScript + Express réteggel fogadja az API-kéréseket. Raw SQL migrációk kezelik a sémát. Egy bundled `cities.json` referencia koordinátákat biztosít az ismert városokhoz. A Haversine-távolság-számítások és robusztus város-normalizálás (ékezetek, kis/nagybetű, whitespace) eszközfüggvényben történik, függetlenül tesztelve. Idempotens seeding SQL `UPSERT`-tel: ismételt seed-futtatás nem duplázza az ügyfeleket. Két végpont: ügyfélszám és távolság szerinti rendezett lista (null koordináták végén, név szerinti sorrendben).

**Tech Stack:** Node.js 18+, Express, TypeScript, pg (node-postgres), Jest, PostgreSQL 12+, Docker Compose, crystaldba/postgres-mcp (fejlesztés).

## Globális Korlátozások

- **Node.js:** 18+
- **PostgreSQL:** 12+
- **TypeScript:** Strict mode
- **Migrációk:** Raw SQL fájlok `src/db/migrations/`-ben, runner: `src/db/migrate.ts`
- **Nincsenek külső API-k:** Minden koordináta a bundled `cities.json`-ből
- **Idempotens seed:** Composite UNIQUE (name, telepules), DO UPDATE konfliktus esetén
- **Távolság:** Haversine, 1 tizedesjegy, Budapest referenciapont (47.4979°, 19.0402°)
- **Commitok:** Kicsik, fókuszáltak, feladatonként
- **Kommunikáció:** Szubagensek MAGYAR NYELVEN dolgoznak

---

## Fájl-struktúra

### Adatbázis-réteg
- **`src/db/client.ts`** — PostgreSQL connection pool singleton
- **`src/db/migrate.ts`** — Raw SQL migration runner (szekvenciális futtatás, `_migrations` táblában trackelt)
- **`src/db/seed.ts`** — Idempotent seeder (olvas `seed-customers.json`, normalizálja a városokat, upsert (name, telepules)-vel)
- **`src/db/migrations/001_create_customers_table.sql`** — Customers tábla composite UNIQUE-kal

### Adat & Segédeszközök
- **`src/data/cities.json`** — Bundled város → (lat, lon) referencia (15 város a seed-ből)
- **`src/utils/distance.ts`** — Haversine távolság + normalizálás (ékezet/kis/nagybetű/whitespace), null kezelés
- **`tests/distance.test.ts`** — Unit tesztek: Haversine pontosság, normalizálás robusztussága, null koordináták

### API-réteg
- **`src/routes/customers.ts`** — Express útvonalak: GET /customers/count, GET /customers/by-distance
- **`src/server.ts`** — Express app setup, middleware, error handling
- **`src/index.ts`** — Entry point (3000-es porton indul)

### Konfiguráció & Dokumentáció
- **`package.json`** — Függőségek, scriptok (migrate, seed, start, test)
- **`tsconfig.json`** — TypeScript strict config
- **`jest.config.js`** — Jest config (ts-jest, test patterns)
- **`docker-compose.yml`** — PostgreSQL 15 service
- **`.env.example`** — Environment változók (DATABASE_URL, NODE_ENV)
- **`README.md`** — Telepítés, futtatás, tesztelés, API dokumentáció

---

## Feladatok Lebontása

### 1. Feladat: Projekt Setup

**Fájlok:**
- Létrehozás: `package.json`, `tsconfig.json`
- Módosítás: `.gitignore`

**Függőségek:**
- Felhasznál: semmi
- Függ tőle: minden (1. feladattól függ az összes többi)

- [ ] **1. Lépés: `package.json` létrehozása**

```json
{
  "name": "geo-customers-api",
  "version": "1.0.0",
  "description": "Offline REST API geo-távolság ügyfél-kérdésekhez",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "ts-node src/db/migrate.ts",
    "seed": "ts-node src/db/seed.ts",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.20",
    "@types/jest": "^29.5.8",
    "@types/node": "^20.9.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.1",
    "typescript": "^5.2.2",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12"
  }
}
```

- [ ] **2. Lépés: `tsconfig.json` létrehozása**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **3. Lépés: `.gitignore` módosítása**

```
node_modules/
dist/
.env
.env.local
*.log
coverage/
.DS_Store
```

- [ ] **4. Lépés: `npm install` futtatása**

```bash
npm install
```

Elvárt: `node_modules/` létrehozódik, `package-lock.json` generálódik.

- [ ] **5. Lépés: Commit**

```bash
git add package.json tsconfig.json .gitignore
git commit -m "setup: Node.js + TypeScript + Express + Jest inicializálása"
```

---

### 2. Feladat: Docker Compose & Environment

**Fájlok:**
- Létrehozás: `docker-compose.yml`, `.env.example`

**Függőségek:**
- Felhasznál: semmi
- Függ tőle: 5. feladat (schema létrehozása), 9. feladat (seed tesztelése)

- [ ] **1. Lépés: `docker-compose.yml` létrehozása**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: customers_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

- [ ] **2. Lépés: `.env.example` létrehozása**

```
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/customers_db
PORT=3000
```

- [ ] **3. Lépés: Postgres indítása és ellenőrzése**

```bash
docker-compose up -d
docker-compose logs postgres
```

Elvárt: Postgres fut és "database system is ready" üzenet.

- [ ] **4. Lépés: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "infra: Docker Compose Postgres + .env sablon"
```

---

### 3. Feladat: Adatbázis-kliens

**Fájlok:**
- Létrehozás: `src/db/client.ts`

**Függőségek:**
- Felhasznál: pg kliens (1. feladat: package.json) ✓
- Függ tőle: 4. feladat (migrate.ts), 9. feladat (seed.ts), 10. feladat (routes)

- [ ] **1. Lépés: `src/db/` könyvtár létrehozása**

```bash
mkdir -p src/db
```

- [ ] **2. Lépés: Adatbázis-kliens létrehozása**

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/customers_db',
});

export class PgClient {
  static async query(sql: string, params?: unknown[]) {
    const client = await pool.connect();
    try {
      return await client.query(sql, params);
    } finally {
      client.release();
    }
  }

  static async disconnect() {
    await pool.end();
  }
}
```

- [ ] **3. Lépés: TypeScript fordítás ellenőrzése**

```bash
npx tsc --noEmit
```

Elvárt: Nincsenek hibák.

- [ ] **4. Lépés: Commit**

```bash
git add src/db/client.ts
git commit -m "feat: PostgreSQL connection pool hozzáadása"
```

---

### 4. Feladat: Migration Infrastructure

**Fájlok:**
- Létrehozás: `src/db/migrate.ts`, `src/db/migrations/` könyvtár

**Függőségek:**
- Felhasznál: PgClient (3. feladat) ✓
- Függ tőle: 5. feladat (SQL migrations futtatása)

- [ ] **1. Lépés: `src/db/migrations/` könyvtár létrehozása**

```bash
mkdir -p src/db/migrations
```

- [ ] **2. Lépés: Migráció-futó létrehozása**

```typescript
import fs from 'fs';
import path from 'path';
import { PgClient } from './client';

async function runMigrations() {
  try {
    // Migrációk táblájának létrehozása, ha nem létezik
    await PgClient.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migráció-fájlok olvasása
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Ellenőrzés, már alkalmazva-e
      const result = await PgClient.query(
        'SELECT * FROM _migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`✓ ${file} (már alkalmazva)`);
        continue;
      }

      // Migráció olvasása és futtatása
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await PgClient.query(sql);

      // Migráció rögzítése
      await PgClient.query(
        'INSERT INTO _migrations (name) VALUES ($1)',
        [file]
      );

      console.log(`✓ ${file} alkalmazva`);
    }

    console.log('Minden migráció befejezve.');
  } catch (error) {
    console.error('Migráció hiba:', error);
    process.exit(1);
  } finally {
    await PgClient.disconnect();
  }
}

runMigrations();
```

- [ ] **3. Lépés: TypeScript fordítás ellenőrzése**

```bash
npx tsc --noEmit
```

Elvárt: Nincsenek hibák (PgClient import OK).

- [ ] **4. Lépés: Commit**

```bash
git add src/db/migrate.ts
git commit -m "feat: SQL migráció-futó hozzáadása"
```

---

### 5. Feladat: Adatbázis-séma (Customers Tábla)

**Fájlok:**
- Létrehozás: `src/db/migrations/001_create_customers_table.sql`

**Függőségek:**
- Felhasznál: migrate.ts (4. feladat) ✓
- Függ tőle: 9. feladat (seed.ts) adatok betöltéséhez

- [ ] **1. Lépés: Migráció-fájl létrehozása**

```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  telepules VARCHAR(255) NOT NULL,
  lat DECIMAL(9, 6),
  lon DECIMAL(9, 6),
  budget INTEGER,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, telepules)
);
```

- [ ] **2. Lépés: Migrációk futtatása**

```bash
npm run migrate
```

Elvárt: "001_create_customers_table.sql alkalmazva"

- [ ] **3. Lépés: Tábla séma ellenőrzése**

```bash
psql postgresql://postgres:postgres@localhost:5432/customers_db -c "\d customers"
```

Elvárt: Tábla 9 oszloppal (id, name, telepules, lat, lon, budget, note, created_at, updated_at), UNIQUE constraint (name, telepules) párra.

- [ ] **4. Lépés: Commit**

```bash
git add src/db/migrations/001_create_customers_table.sql
git commit -m "db: customers tábla létrehozása composite unique constraint-tel"
```

---

### 6. Feladat: Város-referencia Adat

**Fájlok:**
- Létrehozás: `src/data/cities.json`

**Függőségek:**
- Felhasznál: semmi
- Függ tőle: 7. feladat (distance.ts lookupCity), 9. feladat (seed.ts)

- [ ] **1. Lépés: `src/data/` könyvtár létrehozása**

```bash
mkdir -p src/data
```

- [ ] **2. Lépés: `cities.json` létrehozása**

```json
{
  "budapest": { "lat": 47.4979, "lon": 19.0402, "name": "Budapest" },
  "vienna": { "lat": 48.2082, "lon": 16.3738, "name": "Vienna" },
  "munich": { "lat": 48.1351, "lon": 11.5820, "name": "Munich" },
  "milan": { "lat": 45.4642, "lon": 9.1900, "name": "Milan" },
  "barcelona": { "lat": 41.3851, "lon": 2.1734, "name": "Barcelona" },
  "lyon": { "lat": 45.7640, "lon": 4.8357, "name": "Lyon" },
  "krakow": { "lat": 50.0647, "lon": 19.9450, "name": "Kraków" },
  "prague": { "lat": 50.0755, "lon": 14.4378, "name": "Prague" },
  "lisbon": { "lat": 38.7223, "lon": -9.1393, "name": "Lisbon" },
  "amsterdam": { "lat": 52.3676, "lon": 4.9041, "name": "Amsterdam" },
  "stockholm": { "lat": 59.3293, "lon": 18.0686, "name": "Stockholm" },
  "ljubljana": { "lat": 46.0569, "lon": 14.5058, "name": "Ljubljana" },
  "bucharest": { "lat": 44.4268, "lon": 26.1025, "name": "Bucharest" },
  "dublin": { "lat": 53.3498, "lon": -6.2603, "name": "Dublin" },
  "copenhagen": { "lat": 55.6761, "lon": 12.5683, "name": "Copenhagen" }
}
```

- [ ] **3. Lépés: Fájl JSON-ként való betöltésének ellenőrzése**

```bash
node -e "console.log(Object.keys(require('./src/data/cities.json')).length)"
```

Elvárt: `15`

- [ ] **4. Lépés: Commit**

```bash
git add src/data/cities.json
git commit -m "data: bundled város-referencia hozzáadása (15 város)"
```

---

### 7. Feladat: Távolság-segédeszközök

**Fájlok:**
- Létrehozás: `src/utils/distance.ts`

**Függőségek:**
- Felhasznál: cities.json (6. feladat) ✓
- Függ tőle: 8. feladat (tesztek), 9. feladat (seed.ts), 11. feladat (by-distance endpoint)

- [ ] **1. Lépés: `src/utils/` könyvtár létrehozása**

```bash
mkdir -p src/utils
```

- [ ] **2. Lépés: Távolság-segédeszközök létrehozása**

```typescript
// Haversine távolság-számítás (km-ben, 1 tizedesjegy)
export function haversineDistance(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number | null {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return null;
  }

  const R = 6371; // Föld sugara km-ben
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // 1 tizedesjegyre kerekítés
}

// Város-név normalizálása: kisbetű, trim, ékezet-eltávolítás
export function normalizeCity(cityName: string): string {
  return cityName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // Diakritikus jelek eltávolítása
}

// Város-referencia betöltése
export function loadCitiesReference(): Record<string, { lat: number; lon: number; name: string }> {
  return require('../data/cities.json');
}

// Város keresése és koordináták lekérése
export function lookupCity(
  cityName: string,
  citiesRef: Record<string, { lat: number; lon: number; name: string }>
): { lat: number | null; lon: number | null } {
  const normalized = normalizeCity(cityName);
  const city = citiesRef[normalized];
  
  if (city) {
    return { lat: city.lat, lon: city.lon };
  }

  return { lat: null, lon: null };
}
```

- [ ] **3. Lépés: TypeScript fordítás ellenőrzése**

```bash
npx tsc --noEmit
```

Elvárt: Nincsenek hibák.

- [ ] **4. Lépés: Commit**

```bash
git add src/utils/distance.ts
git commit -m "feat: Haversine távolság és város-normalizálás segédeszközök"
```

---

### 8. Feladat: Távolság Unit-tesztek

**Fájlok:**
- Létrehozás: `tests/distance.test.ts`, `jest.config.js`

**Függőségek:**
- Felhasznál: haversineDistance(), normalizeCity() (7. feladat) ✓
- Függ tőle: semmi (csak futható)

- [ ] **1. Lépés: `tests/` könyvtár létrehozása**

```bash
mkdir -p tests
```

- [ ] **2. Lépés: `jest.config.js` létrehozása**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
```

- [ ] **3. Lépés: Távolság tesztek létrehozása**

```typescript
import { haversineDistance, normalizeCity } from '../src/utils/distance';

describe('távolság segédeszközök', () => {
  describe('haversineDistance', () => {
    test('Budapest-Bécs ~214 km', () => {
      const dist = haversineDistance(47.4979, 19.0402, 48.2082, 16.3738);
      expect(dist).toBeCloseTo(214.3, 0);
    });

    test('Budapest-Budapest 0 km', () => {
      const dist = haversineDistance(47.4979, 19.0402, 47.4979, 19.0402);
      expect(dist).toBeCloseTo(0, 1);
    });

    test('null koordináták null távolságot adnak vissza', () => {
      expect(haversineDistance(47.4979, 19.0402, null, null)).toBeNull();
      expect(haversineDistance(null, null, 48.2082, 16.3738)).toBeNull();
      expect(haversineDistance(null, 19.0402, 48.2082, 16.3738)).toBeNull();
    });

    test('távolság 1 tizedesjegyre kerekített', () => {
      const dist = haversineDistance(47.4979, 19.0402, 48.2082, 16.3738);
      expect(dist).toBeDefined();
      if (dist !== null) {
        const decimals = dist.toString().split('.')[1]?.length || 0;
        expect(decimals).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('normalizeCity', () => {
    test('kisbetűvé alakítja', () => {
      expect(normalizeCity('BUDAPEST')).toBe('budapest');
      expect(normalizeCity('Vienna')).toBe('vienna');
    });

    test('eltávolítja az elöl/végén lévő szóközöket', () => {
      expect(normalizeCity('  budapest  ')).toBe('budapest');
      expect(normalizeCity('\tprague\n')).toBe('prague');
    });

    test('eltávolítja a diakritikus jeleket', () => {
      expect(normalizeCity('Kraków')).toBe('krakow');
      expect(normalizeCity('Bécs')).toBe('becs');
      expect(normalizeCity('Pécs')).toBe('pecs');
    });

    test('kombinált átalakításokat kezel', () => {
      expect(normalizeCity('  KRAKÓW  ')).toBe('krakow');
      expect(normalizeCity('  Pécs  ')).toBe('pecs');
    });
  });
});
```

- [ ] **4. Lépés: Tesztek futtatása**

```bash
npm test -- tests/distance.test.ts
```

Elvárt: Mind a 8 teszt megállja a helyét.

- [ ] **5. Lépés: Commit**

```bash
git add jest.config.js tests/distance.test.ts
git commit -m "test: Haversine és normalizálás unit-tesztek"
```

---

### 9. Feladat: Seed-logika

**Fájlok:**
- Létrehozás: `src/db/seed.ts`

**Függőségek:**
- Felhasznál: PgClient (3. feladat) ✓, normalizeCity/lookupCity/loadCitiesReference (7. feladat) ✓, cities.json (6. feladat) ✓
- Függ tőle: integrációs tesztek, manuális tesztelés

- [ ] **1. Lépés: Seed-script létrehozása**

```typescript
import fs from 'fs';
import path from 'path';
import { PgClient } from './client';
import { normalizeCity, lookupCity, loadCitiesReference } from '../utils/distance';

interface SeedCustomer {
  name: string;
  budget: number;
  location: { city: string; countryCode: string };
  note: string;
}

async function seed() {
  try {
    const citiesRef = loadCitiesReference();
    const seedPath = path.join(__dirname, '../../seed-customers.json');
    const seedData: SeedCustomer[] = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

    let count = 0;
    for (const customer of seedData) {
      const telepules = customer.location.city;
      const { lat, lon } = lookupCity(telepules, citiesRef);

      if (lat === null || lon === null) {
        console.warn(`⚠ Város nem találva: ${telepules} (ügyfél: ${customer.name})`);
      }

      await PgClient.query(
        `INSERT INTO customers (name, telepules, lat, lon, budget, note)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (name, telepules) DO UPDATE SET
           lat = EXCLUDED.lat,
           lon = EXCLUDED.lon,
           budget = EXCLUDED.budget,
           note = EXCLUDED.note`,
        [customer.name, telepules, lat, lon, customer.budget ?? null, customer.note ?? null]
      );

      count++;
    }

    console.log(`✓ ${count} ügyfél betöltve`);
  } catch (error) {
    console.error('Seed hiba:', error);
    process.exit(1);
  } finally {
    await PgClient.disconnect();
  }
}

seed();
```

- [ ] **2. Lépés: Seed-fájl hozzáférhetőségének ellenőrzése**

```bash
ls -la seed-customers.json
```

Elvárt: Fájl létezik a repo gyökerében.

- [ ] **3. Lépés: Seed-tesztelés (működés-próba)**

```bash
npm run seed
```

Elvárt: "✓ 15 ügyfél betöltve"

- [ ] **4. Lépés: Adatok ellenőrzése az adatbázisban**

```bash
psql postgresql://postgres:postgres@localhost:5432/customers_db -c "SELECT COUNT(*) FROM customers;"
```

Elvárt: `15`

- [ ] **5. Lépés: Idempotencia-teszt (seed kétszer futtatása)**

```bash
npm run seed
```

Elvárt: Továbbra is "✓ 15 ügyfél betöltve" (nincsenek duplikátok).

- [ ] **6. Lépés: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: idempotent ügyfél-betöltés composite upsert-tel, fallback-kel"
```

---

### 10. Feladat: GET /customers/count Végpont

**Fájlok:**
- Létrehozás: `src/routes/customers.ts`

**Függőségek:**
- Felhasznál: PgClient (3. feladat) ✓
- Függ tőle: 11. feladat (by-distance), 12. feladat (server setup), 14. feladat (integrációs tesztek)

- [ ] **1. Lépés: `src/routes/` könyvtár létrehozása**

```bash
mkdir -p src/routes
```

- [ ] **2. Lépés: Útvonalak-fájl létrehozása**

```typescript
import { Router, Request, Response } from 'express';
import { PgClient } from '../db/client';

export const customersRouter = Router();

customersRouter.get('/count', async (req: Request, res: Response) => {
  try {
    const result = await PgClient.query('SELECT COUNT(*) as count FROM customers');
    const count = parseInt(result.rows[0].count, 10);
    res.json({ count });
  } catch (error) {
    console.error('Szám lekérdezésének hibája:', error);
    res.status(500).json({ error: 'Nem sikerült a szám lekérdezése' });
  }
});
```

- [ ] **3. Lépés: TypeScript fordítás ellenőrzése**

```bash
npx tsc --noEmit
```

Elvárt: Nincsenek hibák.

- [ ] **4. Lépés: Commit**

```bash
git add src/routes/customers.ts
git commit -m "feat: GET /customers/count végpont hozzáadása"
```

---

### 11. Feladat: GET /customers/by-distance Végpont

**Fájlok:**
- Módosítás: `src/routes/customers.ts`

**Függőségek:**
- Felhasznál: haversineDistance() (7. feladat) ✓, PgClient (3. feladat) ✓
- Függ tőle: 12. feladat (server setup), 14. feladat (integrációs tesztek)

- [ ] **1. Lépés: by-distance végpont hozzáadása customers.ts-hez**

```typescript
import { haversineDistance } from '../utils/distance';

const BUDAPEST_LAT = 47.4979;
const BUDAPEST_LON = 19.0402;

customersRouter.get('/by-distance', async (req: Request, res: Response) => {
  try {
    const result = await PgClient.query('SELECT * FROM customers');
    const customers = result.rows;

    // Távolságok számítása és distanceKm mező hozzáadása
    const withDistances = customers.map((c: any) => {
      const distance = haversineDistance(BUDAPEST_LAT, BUDAPEST_LON, c.lat, c.lon);
      return {
        id: c.id,
        name: c.name,
        telepules: c.telepules,
        lat: c.lat,
        lon: c.lon,
        budget: c.budget,
        note: c.note,
        distanceKm: distance,
      };
    });

    // Rendezés: ismert távolságok (növekvő), majd null távolságok (ábécé szerint)
    const sorted = withDistances.sort((a: any, b: any) => {
      // Ismert távolságok növekvő sorrendben
      if (a.distanceKm !== null && b.distanceKm !== null) {
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }
        // Holtverseny-tiebreak név alapján
        return a.name.localeCompare(b.name);
      }

      // Ismert távolságok null előtt
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;

      // Mindkettő null: név szerinti rendezés
      return a.name.localeCompare(b.name);
    });

    res.json(sorted);
  } catch (error) {
    console.error('By-distance lekérdezésének hibája:', error);
    res.status(500).json({ error: 'Nem sikerült az ügyfeleket lekérdezni' });
  }
});
```

- [ ] **2. Lépés: TypeScript fordítás ellenőrzése**

```bash
npx tsc --noEmit
```

Elvárt: Nincsenek hibák.

- [ ] **3. Lépés: Commit**

```bash
git add src/routes/customers.ts
git commit -m "feat: GET /customers/by-distance végpont Haversine-rendezéssel"
```

---

### 12. Feladat: Express Server Setup

**Fájlok:**
- Létrehozás: `src/server.ts`, `src/index.ts`

**Függőségek:**
- Felhasznál: customersRouter (10–11. feladat) ✓
- Függ tőle: manuális tesztelés, 14. feladat (integrációs tesztek)

- [ ] **1. Lépés: `server.ts` létrehozása**

```typescript
import express from 'express';
import { customersRouter } from './routes/customers';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.use('/customers', customersRouter);

  // Egészség-ellenőrzés
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // 404 kezelő
  app.use((req, res) => {
    res.status(404).json({ error: 'Nem található' });
  });

  return app;
}
```

- [ ] **2. Lépés: `index.ts` létrehozása**

```typescript
import { createApp } from './server';

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`✓ Server fut: http://localhost:${PORT}`);
});
```

- [ ] **3. Lépés: TypeScript fordítás ellenőrzése**

```bash
npx tsc --noEmit
```

Elvárt: Nincsenek hibák.

- [ ] **4. Lépés: Commit**

```bash
git add src/server.ts src/index.ts
git commit -m "feat: Express server és entry point setup"
```

---

### 13. Feladat: README Dokumentáció

**Fájlok:**
- Módosítás: `README.md`

**Függőségek:**
- Felhasznál: semmi
- Függ tőle: semmi (tájékoztatás)

- [ ] **1. Lépés: README megírása**

```markdown
# Geo-Customers REST API

Egy kis, offline működő Node.js + Express REST szolgáltatás ügyfél-geo-lekérdezésekhez.

## Stack

- **Node.js** 18+
- **Express** 4.18+
- **TypeScript** 5.2+
- **PostgreSQL** 15 (Docker Compose)
- **Jest** a teszteléshez

## Gyors Start

### Előfeltételek

- Node.js 18+ és npm
- Docker és Docker Compose

### Setup

1. **Klón és telepítés:**
   ```bash
   npm install
   ```

2. **PostgreSQL indítása:**
   ```bash
   docker-compose up -d
   docker-compose logs postgres  # Várjon a "database system is ready" üzenetre
   ```

3. **Migrációk futtatása:**
   ```bash
   npm run migrate
   ```

4. **Seed adat betöltése:**
   ```bash
   npm run seed
   ```

5. **Server indítása:**
   ```bash
   npm run dev
   ```

   Server fut: `http://localhost:3000`.

## Tesztelés

**Minden teszt futtatása:**
```bash
npm test
```

**Watch mód:**
```bash
npm run test:watch
```

A tesztek tartalmaznak:
- Haversine távolság-számítások (Budapest–Bécs ~214 km)
- Város-normalizálás (ékezetek, kis/nagybetű, whitespace)
- Null-koordináta kezelés

## API Végpontok

### GET /customers/count

Az adatbázisban lévő ügyfelek számát adja vissza.

**Válasz:**
```json
{
  "count": 15
}
```

### GET /customers/by-distance

Összes ügyfél Budapesttől mért távolság szerinti rendezésben (növekvő).

**Válasz (rövidítve):**
```json
[
  {
    "id": 1,
    "name": "Anna Kovács",
    "telepules": "Budapest",
    "distanceKm": 0.0
  },
  {
    "id": 2,
    "name": "Lena Fischer",
    "telepules": "Vienna",
    "distanceKm": 214.3
  },
  ...
]
```

### GET /health

Egészség-ellenőrzés végpont.

**Válasz:**
```json
{
  "status": "ok"
}
```

## Adatbázis-séma

```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  telepules VARCHAR(255) NOT NULL,
  lat DECIMAL(9, 6),
  lon DECIMAL(9, 6),
  budget INTEGER,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, telepules)
);
```

## Seed-betöltés

A seed idempotens. Többszöri futtatás nem hoz létre duplikátumokat.

```bash
npm run seed
```
```

- [ ] **2. Lépés: Commit**

```bash
git add README.md
git commit -m "docs: átfogó setup, API és fejlesztési útmutató"
```

---

### 14. Feladat: Integrációs Teszt — End-to-End

**Fájlok:**
- Létrehozás: `tests/integration.test.ts`

**Függőségek:**
- Felhasznál: createApp() (12. feladat) ✓, PgClient (3. feladat) ✓, futó Postgres + seeded adatok
- Függ tőle: semmi (csak futható)

- [ ] **1. Lépés: Integrációs teszt létrehozása**

```typescript
import { createApp } from '../src/server';
import request from 'supertest';
import { PgClient } from '../src/db/client';

describe('Integráció: Végpontok', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(async () => {
    await PgClient.disconnect();
  });

  test('GET /customers/count 15-öt ad vissza', async () => {
    const res = await request(app).get('/customers/count');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(15);
  });

  test('GET /customers/by-distance távolság szerinti rendezett tömböt ad vissza', async () => {
    const res = await request(app).get('/customers/by-distance');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(15);

    // Első ügyfélnek Budapest kell hogy legyen (0 km)
    const budapest = res.body.find((c: any) => c.telepules === 'Budapest');
    expect(budapest.distanceKm).toBe(0.0);

    // Rendezés-ellenőrzés: távolságok nem csökkenhetnek (null-okat figyelmen kívül hagyva)
    let lastDistance = -1;
    for (const customer of res.body) {
      if (customer.distanceKm !== null) {
        expect(customer.distanceKm).toBeGreaterThanOrEqual(lastDistance);
        lastDistance = customer.distanceKm;
      }
    }
  });

  test('GET /health ok-ot ad vissza', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /nonexistent 404-et ad vissza', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **2. Lépés: Integrációs tesztek futtatása**

```bash
npm run migrate && npm run seed && npm test
```

Elvárt: Minden teszt megállja a helyét.

- [ ] **3. Lépés: Commit**

```bash
git add tests/integration.test.ts
git commit -m "test: end-to-end integrációs tesztek"
```

---

### 15. Feladat: Végső Ellenőrzés & Build

**Fájlok:**
- Semmi (csak ellenőrzés)

**Függőségek:**
- Felhasznál: összes előző feladat (1–14)

- [ ] **1. Lépés: TypeScript fordítása**

```bash
npm run build
```

Elvárt: `dist/` könyvtár létrehozódik, nincsenek hibák.

- [ ] **2. Lépés: Teljes teszt-csomag futtatása**

```bash
npm test
```

Elvárt: Minden teszt megállja a helyét (unit + integrációs).

- [ ] **3. Lépés: Migrációk + seed ellenőrzése**

```bash
npm run migrate && npm run seed
```

Elvárt: Nincsenek hibák, 15 ügyfél betöltve.

- [ ] **4. Lépés: Server indítása és kézi tesztelés**

Egy terminálon:
```bash
npm run dev
```

Másikon:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/customers/count
curl http://localhost:3000/customers/by-distance | head -20
```

Elvárt:
- Health: `{ "status": "ok" }`
- Count: `{ "count": 15 }`
- By-distance: Első bejegyzés Budapest (0.0 km)

- [ ] **5. Lépés: Git log ellenőrzése**

```bash
git log --oneline | head -15
```

Elvárt: ~15 fókuszált commit, mindegyik egyértelmű üzenettel.

---

## Teljes Függőség-Átvilágítás

✅ **1. Projekt Setup** → Függ tőle: 2–15
✅ **2. Docker Compose** → Függ tőle: 5, 9
✅ **3. Adatbázis-kliens** → Felhasznál: 1; Függ tőle: 4, 9, 10, 11
✅ **4. Migration Infrastructure** → Felhasznál: 3; Függ tőle: 5
✅ **5. Adatbázis-séma** → Felhasznál: 4; Függ tőle: 9
✅ **6. Város-referencia** → Függ tőle: 7, 9
✅ **7. Távolság-segédeszközök** → Felhasznál: 6; Függ tőle: 8, 9, 11
✅ **8. Távolság-tesztek** → Felhasznál: 7
✅ **9. Seed-logika** → Felhasznál: 3, 6, 7; Függ tőle: 14, 15
✅ **10. GET /count** → Felhasznál: 3; Függ tőle: 11, 12, 14
✅ **11. GET /by-distance** → Felhasznál: 3, 7; Függ tőle: 12, 14
✅ **12. Express Server** → Felhasznál: 10, 11; Függ tőle: 14
✅ **13. README** → Önálló
✅ **14. Integrációs tesztek** → Felhasznál: 3, 12
✅ **15. Végső ellenőrzés** → Felhasznál: 1–14

**Sorrend validáció:** ✅ MINDEN FÜGGŐSÉG TELJESÜL

---

**Szubagent-vezérelt végrehajtásra kész. Indítsa az 1. feladattal.**
