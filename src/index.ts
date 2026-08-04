import { createApp } from './server';

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`✓ Server fut: http://localhost:${PORT}`);
});
