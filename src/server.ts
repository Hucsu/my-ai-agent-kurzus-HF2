import express from 'express';
import { customersRouter } from './routes/customers';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/customers', customersRouter);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Nem található' });
  });

  return app;
}
