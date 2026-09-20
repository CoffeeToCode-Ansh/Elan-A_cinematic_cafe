/**
 * Élan Contact/Reservation API
 * ------------------------------------------------------------
 * Frontend  →  API (/api/contact)  →  Backend validation  →  SMTP (Nodemailer)  →  Company inbox
 *
 * This single Express app is used two ways:
 *   1. server.js — runs it as a normal Node/Express server (any host)
 *   2. api/*.js  — re-exports it as Vercel Serverless Functions
 *
 * POST /api/contact — status codes
 *   200  request accepted and email sent (also returned for honeypot spam, on purpose)
 *   400  bad request: empty body, body is not a JSON object, malformed JSON,
 *        or one or more fields failed validation (see `errors` in the response)
 *   405  wrong HTTP method for this route (Allow header lists the right one)
 *   413  request body larger than the size limit
 *   415  Content-Type is not application/json
 *   500  server misconfiguration or unexpected error
 *   503  the SMTP mail server could not be reached / refused our login
 *
 * Every response — success or failure — is JSON:
 *   success: { success: true, message }
 *   failure: { success: false, error, errors? }   (`errors` maps field → message)
 */

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.disable('x-powered-by');

// ------------------------------------------------------------------
// Limits — one place to tune every min/max
// ------------------------------------------------------------------
const LIMITS = {
  fullName: { min: 2, max: 100 },
  emailAddr: { min: 5, max: 254 },
  fparty: { min: 1, max: 14 },
  message: { min: 5, max: 2000 }, // optional field: the minimum only applies if something is typed
};
const MAX_BODY_SIZE = '10kb';

// ------------------------------------------------------------------
// CORS — registered BEFORE body parsing so that even error responses
// (e.g. a 400 for malformed JSON) carry the CORS headers and the
// browser can actually read them.
//
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
      // Reject WITHOUT throwing — the CORS headers are simply omitted, so
      // the browser blocks the request client-side instead of Express
      // turning a thrown Error into a raw HTML 500 page.
      return callback(null, false);
    },
    methods: ['POST', 'GET', 'OPTIONS'],
  })
);

// ------------------------------------------------------------------
// Body parsing — small limit, this endpoint only needs a few fields
// ------------------------------------------------------------------
app.use(express.json({ limit: MAX_BODY_SIZE }));

// ------------------------------------------------------------------
// Response helper — every error goes through here so the shape never drifts
// ------------------------------------------------------------------
function sendError(res, status, error, extra = {}) {
  return res.status(status).json({ success: false, error, ...extra });
}

// ------------------------------------------------------------------
// Backend validation
// The frontend already validates for UX, but the server never trusts
// the client — every field is re-checked here before anything is sent.
// ------------------------------------------------------------------
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/; // no control chars at all (names, emails)
const CONTROL_CHARS_EXCEPT_NEWLINE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/; // messages may contain \n and \t

/**
 * Reads one text field. Handles: missing, null, wrong type (numbers, objects,
 * arrays), empty / whitespace-only, min length, max length, control characters.
 * Returns { value } on success or { error } on failure.
 */
function readText(raw, { label, min, max, required, allowNewlines = false }) {
  if (raw === undefined || raw === null) {
    return required ? { error: `${label} is required.` } : { value: '' };
  }
  if (typeof raw !== 'string') {
    return { error: `${label} must be text.` };
  }

  const value = raw.trim();
  if (!value) {
    return required ? { error: `${label} is required.` } : { value: '' };
  }
  if (value.length < min) {
    return { error: `${label} must be at least ${min} characters.` };
  }
  if (value.length > max) {
    return { error: `${label} must be at most ${max} characters.` };
  }
  if ((allowNewlines ? CONTROL_CHARS_EXCEPT_NEWLINE : CONTROL_CHARS).test(value)) {
    return { error: `${label} contains invalid characters.` };
  }
  return { value };
}

function isValidEmail(email) {
  if (email.length > LIMITS.emailAddr.max) return false;

  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;

  // local part
  if (!local || local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (/[\s<>(),;:"\\\[\]]/.test(local)) return false;

  // domain: at least two labels, each 1–63 chars of letters/digits/hyphens
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  const badLabel = labels.some(
    (l) =>
      !l ||
      l.length > 63 ||
      l.startsWith('-') ||
      l.endsWith('-') ||
      /[^\p{L}\p{N}-]/u.test(l)
  );
  if (badLabel) return false;

  return labels[labels.length - 1].length >= 2; // TLD of at least 2 chars
}

function readPartySize(raw) {
  const { min, max } = LIMITS.fparty;

  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    return { error: 'Party size is required.' };
  }

  let n;
  if (typeof raw === 'number') {
    n = raw;
  } else if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    n = Number(raw.trim());
  } else {
    return { error: 'Party size must be a whole number.' };
  }

  if (!Number.isInteger(n)) return { error: 'Party size must be a whole number.' };
  if (n < min || n > max) return { error: `Party size must be between ${min} and ${max}.` };
  return { value: n };
}

function validateReservation(body) {
  const errors = {};

  const name = readText(body.fullName, { label: 'Full name', required: true, ...LIMITS.fullName });
  if (name.error) errors.fullName = name.error;

  const email = readText(body.emailAddr, { label: 'Email address', required: true, ...LIMITS.emailAddr });
  if (email.error) {
    errors.emailAddr = email.error;
  } else if (!isValidEmail(email.value)) {
    errors.emailAddr = 'Please provide a valid email address.';
  }

  const party = readPartySize(body.fparty);
  if (party.error) errors.fparty = party.error;

  const message = readText(body.message, {
    label: 'Message',
    required: false,
    allowNewlines: true,
    ...LIMITS.message,
  });
  if (message.error) errors.message = message.error;

  return {
    errors,
    data: {
      fullName: name.value,
      emailAddr: email.value,
      fparty: party.value,
      message: message.value,
    },
  };
}

// Honeypot: a real user never fills this field in (it's hidden via CSS on
// the frontend). If it has a value, the request is treated as spam.
function isHoneypotTripped(body) {
  return body.company !== undefined && body.company !== null && String(body.company).trim() !== '';
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
// function instance across invocations. Timeouts make sure a dead
// mail server produces an error instead of a hanging request.
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
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return cachedTransporter;
}

const REQUIRED_ENV = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM', 'MAIL_TO'];

// Nodemailer error codes meaning "the mail server is unreachable / refused us"
// → 503 (temporary, not the client's fault). Anything else is a plain 500.
const SMTP_UNAVAILABLE_CODES = new Set([
  'ECONNECTION',
  'ETIMEDOUT',
  'ESOCKET',
  'ECONNREFUSED',
  'EDNS',
  'EAUTH',
  'ETLS',
]);

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'Élan contact API', time: new Date().toISOString() });
});

app.all('/api/health', (req, res) => {
  res.set('Allow', 'GET, HEAD, OPTIONS');
  return sendError(res, 405, `Method ${req.method} not allowed on this route. Use GET.`);
});

// Rejects anything that isn't declared as JSON before we try to read fields.
function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return sendError(res, 415, 'Content-Type must be application/json.');
  }
  return next();
}

app.post('/api/contact', requireJson, async (req, res) => {
  try {
    const body = req.body;

    // ---- invalid requests ----
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return sendError(res, 400, 'Request body must be a JSON object.');
    }
    if (Object.keys(body).length === 0) {
      return sendError(res, 400, 'Request body is empty.');
    }

    // ---- honeypot: answer exactly like a success so bots learn nothing ----
    if (isHoneypotTripped(body)) {
      return res.status(200).json({ success: true, message: 'Reservation request sent.' });
    }

    // ---- field validation ----
    const { errors, data } = validateReservation(body);
    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, 'Please correct the highlighted fields.', { errors });
    }

    // ---- server configuration ----
    const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      console.error(`Email service is not configured — missing env vars: ${missing.join(', ')}`);
      return sendError(res, 500, 'Email service is not configured yet. Please try again later.');
    }

    // ---- send ----
    const { fullName, emailAddr, fparty, message } = data;

    await getTransporter().sendMail({
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
    // The real reason goes to the server log only — clients get a generic message.
    console.error('Contact form error:', err);

    if (SMTP_UNAVAILABLE_CODES.has(err && err.code)) {
      return sendError(res, 503, 'Our email service is temporarily unavailable. Please try again shortly.');
    }
    return sendError(res, 500, 'Something went wrong while sending your request. Please try again shortly.');
  }
});

// Any other method on /api/contact (GET in a browser, PUT, DELETE…) → 405, not a confusing 404
app.all('/api/contact', (req, res) => {
  res.set('Allow', 'POST, OPTIONS');
  return sendError(res, 405, `Method ${req.method} not allowed on this route. Use POST.`);
});

// ------------------------------------------------------------------
// 404 + error handlers — keep every response JSON, never Express's
// default HTML error page (which can leak stack traces).
// ------------------------------------------------------------------
app.use((req, res) => {
  sendError(res, 404, `Route ${req.method} ${req.path} not found.`);
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Errors raised by express.json() before the route ever runs —
  // these are the client's fault, so they get 4xx codes, not 500.
  switch (err.type) {
    case 'entity.parse.failed':
      return sendError(res, 400, 'Malformed JSON in request body.');
    case 'entity.too.large':
      return sendError(res, 413, 'Request body is too large.');
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return sendError(res, 415, 'Unsupported content encoding or charset.');
    default:
      break;
  }

  if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    return sendError(res, err.status, 'Invalid request.');
  }

  console.error('Unhandled error:', err);
  return sendError(res, 500, 'Internal server error.');
});

module.exports = app;
