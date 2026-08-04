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
