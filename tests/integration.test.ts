import { createApp } from '../src/server';
import request from 'supertest';
import { PgClient } from '../src/db/client';

describe('Integrációs tesztek: Végpontok', () => {
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

    const budapest = res.body.find((c: any) => c.telepules === 'Budapest');
    expect(budapest).toBeDefined();
    expect(budapest.distanceKm).toBe(0.0);

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
