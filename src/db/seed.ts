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
