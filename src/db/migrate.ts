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
