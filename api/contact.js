/**
 * Vercel Serverless Function — handles /api/contact
 *
 * Vercel routes any request to /api/contact straight to this file
 * automatically (file-based routing — the filename IS the path, no
 * vercel.json needed). We just re-export the shared Express app from
 * ../app.js, which still does its own internal routing/validation/
 * mail-sending — this file is only Vercel's entry point into it.
 */
module.exports = require('../app');
