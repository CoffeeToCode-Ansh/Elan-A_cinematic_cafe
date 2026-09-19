/**
 * Élan Contact/Reservation API
 * ------------------------------------------------------------
 * Frontend  →  API (/api/contact)  →  Backend validation  →  SMTP (Nodemailer)  →  Company inbox
 *
 * This single Express app is used two ways:
 *   1. server.js   — runs it as a normal Node/Express server (any host: Render, Railway, a VPS, etc.)
 *   2. api/index.js — re-exports it as a Vercel Serverless Function (see vercel.json)
 *
 * Keeping one app.js as the single source of truth means the routing,
 * validation, and mail-sending logic never drifts between the two deploy targets.
 */

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

// ------------------------------------------------------------------
// Body parsing — small limit, this endpoint only ever needs a few fields
// ------------------------------------------------------------------
app.use(express.json({ limit: '10kb' }));

// ------------------------------------------------------------------
// CORS — restrict to the site(s) allowed to call this API.
// Set ALLOWED_ORIGIN as a comma-separated list in production, e.g.
//   ALLOWED_ORIGIN=https://elan.luxury,https://www.elan.luxury
// Leave unset (defaults to "*") only while developing locally.
// ------------------------------------------------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server / curl requests with no Origin header,
      // and allow everything when ALLOWED_ORIGIN is "*" (dev default).
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Reject WITHOUT throwing — this just omits CORS headers so the
      // browser blocks the request client-side, instead of Express
      // turning a thrown Error into a raw HTML 500 page.
      return callback(null, false);
    },
    methods: ['POST', 'GET', 'OPTIONS'],
  })
);

// ------------------------------------------------------------------
// Backend validation
// The frontend already validates for UX, but the server never trusts
// the client — every field is re-checked here before anything is sent.
// ------------------------------------------------------------------
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateReservation(body) {
  const errors = {};

  const fullName = String(body.fullName || '').trim();
  const emailAddr = String(body.emailAddr || '').trim();
  const fparty = Number(body.fparty);
  const message = String(body.message || '').trim();

  // Honeypot field: a real user never fills this in (it's hidden via CSS
  // on the frontend). If it has a value, silently treat as spam.
  const honeypot = String(body.company || '').trim();
  if (honeypot) {
    errors._spam = true;
  }

  if (!fullName || fullName.length > 100) {
    errors.fullName = 'Please provide your full name (max 100 characters).';
  }

  if (!emailAddr || emailAddr.length > 200 || !isValidEmail(emailAddr)) {
    errors.emailAddr = 'Please provide a valid email address.';
  }

  if (!Number.isInteger(fparty) || fparty < 1 || fparty > 14) {
    errors.fparty = 'Party size must be a whole number between 1 and 14.';
  }

  if (message.length > 2000) {
    errors.message = 'Message is too long (max 2000 characters).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: { fullName, emailAddr, fparty, message },
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ------------------------------------------------------------------
// Nodemailer / SMTP transporter
// Built once and cached — serverless platforms may reuse a warm
// function instance across invocations, so avoid rebuilding it every call.
// ------------------------------------------------------------------
let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587/25
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransporter;
}

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'Élan contact API', time: new Date().toISOString() });
});

app.post('/api/contact', async (req, res) => {
  try {
    const { valid, errors, data } = validateReservation(req.body || {});

    if (errors._spam) {
      // Pretend success so bots don't learn the honeypot was tripped.
      return res.status(200).json({ success: true });
    }

    if (!valid) {
      return res.status(400).json({ success: false, errors });
    }

    const { fullName, emailAddr, fparty, message } = data;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('SMTP is not configured — missing SMTP_HOST/SMTP_USER/SMTP_PASS env vars.');
      return res.status(500).json({
        success: false,
        error: 'Email service is not configured yet. Please try again later.',
      });
    }

    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      replyTo: emailAddr,
      subject: `New Reservation Request — ${fullName}`,
      text: [
        'New reservation request from the Élan website.',
        '',
        `Name: ${fullName}`,
        `Email: ${emailAddr}`,
        `Party size: ${fparty}`,
        'Notes:',
        message || '(none)',
      ].join('\n'),
      html: `
        <h2 style="font-family:sans-serif;">New Reservation Request</h2>
        <p style="font-family:sans-serif;"><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p style="font-family:sans-serif;"><strong>Email:</strong> ${escapeHtml(emailAddr)}</p>
        <p style="font-family:sans-serif;"><strong>Party size:</strong> ${fparty}</p>
        <p style="font-family:sans-serif;"><strong>Notes:</strong><br>${escapeHtml(message || '(none)').replace(/\n/g, '<br>')}</p>
      `,
    });

    return res.status(200).json({ success: true, message: 'Reservation request sent.' });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({
      success: false,
      error: 'Something went wrong while sending your request. Please try again shortly.',
    });
  }
});

// ------------------------------------------------------------------
// 404 + error handlers — keep every response JSON, never Express's
// default HTML error page (which can leak stack traces).
// ------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // express.json() throws a SyntaxError with this shape for malformed JSON —
  // that's a client mistake, not a server fault, so it gets its own status code.
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ success: false, error: 'Malformed JSON in request body.' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

module.exports = app;
