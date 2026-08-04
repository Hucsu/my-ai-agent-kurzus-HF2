import { Router, Request, Response } from 'express';
import { PgClient } from '../db/client';
import { haversineDistance } from '../utils/distance';

export const customersRouter = Router();

const BUDAPEST_LAT = 47.4979;
const BUDAPEST_LON = 19.0402;

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

customersRouter.get('/by-distance', async (req: Request, res: Response) => {
  try {
    const result = await PgClient.query('SELECT * FROM customers');
    const customers = result.rows;

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

    const sorted = withDistances.sort((a: any, b: any) => {
      if (a.distanceKm !== null && b.distanceKm !== null) {
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }
        return a.name.localeCompare(b.name);
      }
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json(sorted);
  } catch (error) {
    console.error('By-distance lekérdezésének hibája:', error);
    res.status(500).json({ error: 'Nem sikerült az ügyfeleket lekérdezni' });
  }
});
