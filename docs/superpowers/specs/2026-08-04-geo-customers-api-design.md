# Geo-Customers REST API — Design Spec

**Dátum:** 2026-08-04  
**Tárgy:** Önálló PostgreSQL-alapú geo-távolság szolgáltatás ügyféladatokkal  
**Cél:** Offline működő REST API, amely távolsági sorrendbe rendezi az ügyféleket a Budapesttől mért távolság alapján.

---

## 1. Áttekintés

Egy kis, fókuszált Node.js + Express + TypeScript REST szolgáltatás, amely:
- 15 seed ügyfelet tölt be egy PostgreSQL adatbázisba
- Minden ügyfélhez rendelkezik lat/lon koordinátákat egy lokális város-referenciából
- Nincsenek külső API-hívások (offline működés)
- Két végpont: ügyfélszám lekérdezés és távolság szerinti rendezés

---

## 2. Technológiai Stack

| Komponens | Választás | Indoklás |
|-----------|-----------|----------|
| Runtime | Node.js 18+ | Gyors, jól dokumentált |
| Framework | Express | Minimális, tiszta routing |
| Nyelv | TypeScript | Típusbiztonság, haversine-számítások |
| Adatbázis | PostgreSQL 12+ | Megbízható, éles minőségű |
| Kliens | `pg` (node-postgres) | Direct SQL, nincs ORM-függőség |
| Migrációk | Raw SQL + egyszerű Node runner | Függőség-mentes, átlátható |
| Tesztelés | Jest | Standard, TypeScript-barát |
| Postgres MCP | `postgres-mcp` (Python, uvx-vel) | Ajánlott community implementáció, biztonságos |
| Dev adatbázis | Docker Compose (elsődleges) | Könnyű, reprodukálható Postgres setup |

---

## 3. Adatmodell

### 3.1 Customers Tábla

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

**Megjegyzések:**
- `id`: Autoincrement elsődleges kulcs
- `name`, `telepules`: Composite UNIQUE constraint — egy ügyfélnek lehet azonos neve másik városban
- `lat`, `lon`: NULL-lehetőek, ha a város nincs a referenciában
- `budget` (INTEGER): Opcionális, az seed adatból származnak. Típusa INTEGER — a valós seed adatban az értékek 300–1500 közötti egészek
- `note` (TEXT): Opcionális, az seed adatból származnak
- Timestamp mezők: audit trail

### 3.2 Város-Referencia (JSON)

`src/data/cities.json` — bundled a repóban, nem külső API. A város-lista a `seed-customers.json` seed adatból lett kiolvasva (15 ügyfél, 15 város):

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

**Keresés logika:**
1. A seed adatból az ügyfél `location.city` értékét vesszük
2. Normalizálás: lowercase, trim whitespace, diakritikus jelek eltávolítása (`ő→o`, `á→a`, stb.)
3. Normalizált név alapján keresés a JSON-ban
4. Ha talál: lat/lon másolása; ha nem: `null`

**Megjegyzés — Budapest kerületek:**
A seed adatban csak "Budapest" szerepel, kerületek nélkül (pl. nincs "Budapest II. kerület"). Ezért a normalizálási logika **nem támogat** kerület-lecsupaszítást (pl. "Budapest II. kerület" → "budapest" mapping). Ha később szükség lenne rá, ez egy egyszerű regex-hozzáadás, de jelenleg YAGNI.

---

## 4. Seeding Stratégia

### 4.1 Idempotencia

A seed minden futtatáskor:
1. Beolvassa `seed-customers.json`
2. Normalizálja a város neveket (kisbetű, trim, ékezet-eltávolítás)
3. Felkeresi a város-referenciában a koordinátákat
4. **UPSERT via (name, telepules) kulcs:**
   ```sql
   INSERT INTO customers (name, telepules, lat, lon, budget, note)
   VALUES ($1, $2, $3, $4, $5, $6)
   ON CONFLICT (name, telepules) DO UPDATE SET
     lat = EXCLUDED.lat,
     lon = EXCLUDED.lon,
     budget = EXCLUDED.budget,
     note = EXCLUDED.note;
   ```

**Fontos:** `DO UPDATE` (nem `DO NOTHING`) — ha később kibővítjük a város-referenciát, az ismételt seed-futtatás **frissíti a korábban null koordinátákat**.

### 4.2 Hiba Kezelés

- **Város nincs a referenciában:** `lat = null, lon = null`, log warning, folytatás
- **Seed adatbázis hiba:** Tranzakció rollback, stderr-re log, exit code 1
- **Nem végzetes hibák:** Logolás, de nem crash (pl. egy ügyfél duplikáltsága, amely már létezik)

---

## 5. API Végpontok

### 5.1 GET /customers/count

**Válasz:**
```json
{
  "count": 15
}
```

**Leírás:** Az adatbázisban lévő ügyfelek száma. Pontosan megfelel az igazi számnak (nem cachelve vagy hardkódolva).

### 5.2 GET /customers/by-distance

**Válasz (15 valós ügyfél — mind ismert koordinátákkal):**

Mind a 15 seed-ügyfél városa megtalálható a `cities.json` referenciában, ezért az összes rendelkezik lat/lon-nal. Példa sorrend (Budapest-ből mért távolság szerinti, növekvő):

```json
[
  {
    "id": 1,
    "name": "Anna Kovács",
    "telepules": "Budapest",
    "lat": 47.4979,
    "lon": 19.0402,
    "budget": 850,
    "note": "Loves lush, jungle-style rooms...",
    "distanceKm": 0.0
  },
  {
    "id": 2,
    "name": "Lena Fischer",
    "telepules": "Vienna",
    "lat": 48.2082,
    "lon": 16.3738,
    "budget": 950,
    "note": "Prefers architectural, sculptural plants...",
    "distanceKm": 214.3
  },
  {
    "id": 8,
    "name": "Petra Horáková",
    "telepules": "Prague",
    "lat": 50.0755,
    "lon": 14.4378,
    "budget": 640,
    "note": "Wants an air-purifying focus...",
    "distanceKm": 300.2
  },
  {
    "id": 12,
    "name": "Matej Horvat",
    "telepules": "Ljubljana",
    "lat": 46.0569,
    "lon": 14.5058,
    "budget": 450,
    "note": "Small starter budget for a cozy studio...",
    "distanceKm": 305.0
  },
  {
    "id": 3,
    "name": "Jonas Weber",
    "telepules": "Munich",
    "lat": 48.1351,
    "lon": 11.5820,
    "budget": 300,
    "note": "Beginner with a very small budget...",
    "distanceKm": 350.0
  },
  {
    "id": 14,
    "name": "Niamh O'Brien",
    "telepules": "Dublin",
    "lat": 53.3498,
    "lon": -6.2603,
    "budget": 990,
    "note": "Classic style for a bright bathroom...",
    "distanceKm": 2086.5
  },
  {
    "id": 15,
    "name": "Kristofer Nielsen",
    "telepules": "Copenhagen",
    "lat": 55.6761,
    "lon": 12.5683,
    "budget": 1300,
    "note": "Premium, calm palette for a double-height loft...",
    "distanceKm": 925.0
  }
]
```

**Hipotetikus: Null-Koordináta Kezelés**

Ha a város-referencia hiányos lenne (pl. egyes ügyfelek városai ismeretlenek), az alábbi válaszstruktúra szemlélteti a null-kezelést. Az ismert távolságú ügyfelek növekvő sorrendben, majd a null-koordinátások az utolsó helyeken, **név szerinti ABC-sorrendben**:

```json
[
  {
    "id": 1,
    "name": "Anna Kovács",
    "telepules": "Budapest",
    "lat": 47.4979,
    "lon": 19.0402,
    "budget": 850,
    "distanceKm": 0.0
  },
  {
    "id": 2,
    "name": "Lena Fischer",
    "telepules": "Vienna",
    "lat": 48.2082,
    "lon": 16.3738,
    "budget": 950,
    "distanceKm": 214.3
  },
  {
    "id": 15,
    "name": "Kristofer Nielsen",
    "telepules": "Copenhagen",
    "lat": 55.6761,
    "lon": 12.5683,
    "budget": 1300,
    "distanceKm": 925.0
  },
  {
    "id": 5,
    "name": "Diego Martín",
    "telepules": "UnknownCity",
    "lat": null,
    "lon": null,
    "budget": 720,
    "distanceKm": null
  },
  {
    "id": 3,
    "name": "Jonas Weber",
    "telepules": "AnotherUnknownCity",
    "lat": null,
    "lon": null,
    "budget": 300,
    "distanceKm": null
  }
]
```

**Megjegyzés:** Az utolsó két bejegyzés csak illusztratív — a valós seed adatban az összes város megtalálható a referenciában, így nincsenek null-koordináták. Az egész 15 ügyfél ismert távolságokkal kerül rendezésre. A null-koordinátások név szerinti sorrendben (Diego < Jonas) kerülnek a lista végére.

**Rendezési szabályok:**
1. **Távolság növekvő sorrendben** (NÖVEKVŐ, nem csökkenő)
2. Budapest ügyfelek elöl (0.0 km)
3. Ismeretlen koordinátájú ügyfelek a végén (`distanceKm: null`)
4. **Holtverseny esetén: név szerinti ABC-sorrend (az EGÉSZ LISTÁRA, beleértve a null-koordinátás csoportot is)**
   - Ismert távolságú ügyfelek közötti holtverseny (azonos távolság) → név szerint
   - Null-koordinátás ügyfelek közötti holtverseny → név szerint

**Távolság számítás (Haversine):**
```
distance(lat1, lon1, lat2, lon2) = 
  2 * R * arcsin(sqrt(sin²((lat2-lat1)/2) + cos(lat1)*cos(lat2)*sin²((lon2-lon1)/2)))
  ahol R = 6371 km (Föld sugara)
```

**Haversine pontosság:**
- 1 tizedesre kerekítve (0.1 km)
- Budapest-Bécs: ~214.3 km (ismert referencia)
- Budapest-Budapest: 0.0 km

---

## 6. Projektstruktúra

```
my-ai-agent-kurzus-HF2/
├── src/
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_create_customers_table.sql
│   │   │   └── 002_create_migrations_table.sql
│   │   ├── client.ts           # PostgreSQL client singleton
│   │   ├── seed.ts             # Idempotent seeding script
│   │   └── migrate.ts          # Migration runner
│   ├── data/
│   │   └── cities.json         # Város referencia (bundled)
│   ├── routes/
│   │   └── customers.ts        # GET /customers endpoints
│   ├── utils/
│   │   └── distance.ts         # Haversine + normalizálás
│   ├── server.ts               # Express app setup
│   └── index.ts                # Entry point
├── tests/
│   ├── distance.test.ts        # Haversine unit tests
│   └── setup.ts                # Test DB setup
├── seed-customers.json         # (Meglévő seed adat)
├── package.json
├── tsconfig.json
├── jest.config.js
├── README.md                   # Futtatási utasítások
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-08-04-geo-customers-api-design.md
```

---

## 7. Tesztelés

### 7.1 Unit Teszt: Haversine Távolság

`tests/distance.test.ts`:

```typescript
describe('distance calculation (haversine)', () => {
  test('Budapest to Vienna is ~214 km', () => {
    const dist = haversineDistance(
      47.4979, 19.0402,  // Budapest
      48.2082, 16.3738   // Vienna
    );
    expect(dist).toBeCloseTo(214.3, 0);
  });

  test('Budapest to Budapest is 0 km', () => {
    const dist = haversineDistance(47.4979, 19.0402, 47.4979, 19.0402);
    expect(dist).toBeCloseTo(0, 1);
  });

  test('null coordinates return null distance', () => {
    const dist = haversineDistance(47.4979, 19.0402, null, null);
    expect(dist).toBeNull();
  });

  test('rounding to 1 decimal place', () => {
    const dist = haversineDistance(47.4979, 19.0402, 48.2082, 16.3738);
    const rounded = dist.toFixed(1);
    expect(rounded).toMatch(/^\d+\.\d$/);
  });
});
```

### 7.2 Normalizálás Teszt

Robusztus város-keresés ellenőrzése:
- `"Budapest"` → `"budapest"` ✓
- `"budapest "` (trailing space) → `"budapest"` ✓
- `"Bécs"` → `"becs"` (ékezet eltávolítva), de ez nem a referenciában keresendő — csak az ismert városok normalizálódnak

---

## 8. Fejlesztési Munkafolyamat

### 8.1 Lokális Postgres Setup

**Elsődleges: Docker Compose** (reprodukálható, függőség-nélküli)

`docker-compose.yml`:
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

volumes:
  postgres_data:
```

**Alternatív: Lokális Postgres telepítés**
Ha már van telepített Postgres: `postgresql://postgres:postgres@localhost:5432/customers_db` kapcsolati string.

### 8.2 Postgres MCP Integráció (postgres-mcp)

Az MCP konfigurációban (`claude_desktop_config.json` vagy `.claude/mcp.json`):
```json
{
  "mcpServers": {
    "postgres": {
      "command": "uvx",
      "args": ["postgres-mcp", "--access-mode=restricted"],
      "env": {
        "DATABASE_URI": "postgresql://postgres:postgres@localhost:5432/customers_db"
      }
    }
  }
}
```

Ez lehetővé teszi az MCP segítségével:
- Séma lekérdezése
- Adatok megtekintése
- Queryók futtatása fejlesztés közben

**Megjegyzés:** A `postgres-mcp` egy Python-alapú MCP szerver, amely az ajánlott community implementáció (az Anthropic referencia deprecated).

### 8.3 Kis, Fókuszált Commitok

Tervezett commit-sorrend:
1. `Setup: TypeScript, Express, package.json`
2. `DB: migrations runner + customers table schema`
3. `Data: cities.json bundled reference`
4. `Utils: haversine distance + city normalization`
5. `Seed: idempotent customer loading`
6. `Routes: GET /customers/count + by-distance`
7. `Tests: haversine unit tests`
8. `Docs: README with setup + run instructions`

---

## 9. README Tartalom (Váz)

### Futtatás

**Előfeltételek:**
- Node.js 18+
- PostgreSQL 12+ (vagy Docker)
- npm

**Lépések:**

```bash
# 1. Postgres indítása (Docker)
docker-compose up -d

# 2. Függőségek telepítése
npm install

# 3. Adatbázis séma inicializálása
npm run migrate

# 4. Seed adatok betöltése
npm run seed

# 5. Szerver indítása
npm start

# 6. Tesztek futtatása
npm test
```

**API Tesztelés:**
```bash
curl http://localhost:3000/customers/count
curl http://localhost:3000/customers/by-distance
```

---

## 10. Sikerességi Kritériumok

- ✅ Mindkét végpont működik és a spec szerinti adatot adja vissza
- ✅ Seed idempotens (kétszeri futtatás nem duplázza az ügyféleket)
- ✅ Város-normalizálás robusztus (ékezet, kis/nagybetű, whitespace)
- ✅ Haversine távolság ±1 km-es pontossággal helyes
- ✅ Null koordináták kezelődnek (nem crasheljen, lista végén kerüljenek)
- ✅ Holtverseny-szabály a null-koordinátás csoportra is vonatkozik (ABC-sorrend)
- ✅ Unit tesztek futnak
- ✅ README használható és teljes
- ✅ Commitok kicsik, érthető üzenetek
- ✅ Postgres MCP (crystaldba/postgres-mcp) integrálható és működik

---

## 11. Függőségek

Az alábbi npm csomagok várhatóak:
- `express`
- `pg` (node-postgres)
- `typescript`
- `ts-node`
- `@types/express`
- `@types/node`
- `jest`
- `@types/jest`
- `ts-jest`

Nincs ORM (Sequelize, Prisma, TypeORM) — raw SQL, clean dependencies.

---

**Jóváhagyásra vár.**
