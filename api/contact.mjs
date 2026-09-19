/**
 * Vercel Serverless Function — handles /api/contact (ES Module version)
 *
 * This is the ESM equivalent of contact.js. The .mjs extension forces
 * Node to treat THIS file as an ES module regardless of package.json's
 * "type" field, so it can sit next to the rest of the project's
 * CommonJS files (app.js, server.js) without converting anything else.
 *
 * Node's interop lets an ES module `import` a CommonJS file directly —
 * app.js's `module.exports = app` becomes the default export here.
 *
 * NOTE: if you use this file, remove api/contact.js (or vice versa).
 * Having both would register two Vercel functions for the same
 * /api/contact path, and the build will fail.
 */
import app from '../app.js';

export default app;
