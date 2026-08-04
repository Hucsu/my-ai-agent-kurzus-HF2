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
