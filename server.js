/**
 * Local / traditional-host entry point.
 * Run with: npm run dev   (or: node server.js)
 *
 * On Vercel, this file is never used — api/index.js exports the same
 * `app` from app.js directly as a Serverless Function instead.
 */
require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Élan contact API listening on http://localhost:${PORT}`);
  console.log(`Health check:      http://localhost:${PORT}/api/health`);
  console.log(`Contact endpoint:  POST http://localhost:${PORT}/api/contact`);
});
