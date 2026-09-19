# Élan Contact/Reservation API — SMTP Integration

**Week 3, Task 1 — SMTP Contact Form Integration**

A small Node.js + Express backend that receives the Élan reservation form's
submission, validates it server-side, and sends it by email over SMTP
(via Nodemailer) straight to the company's inbox. Deployable on Vercel as
a Serverless Function, or on any traditional Node host.

## Architecture

```
Frontend (reservation form)
      │  fetch() POST JSON
      ▼
API endpoint  ──  POST /api/contact
      │
      ▼
Backend validation (Express)
      │  rejects bad input before anything touches email
      ▼
Nodemailer  ──  SMTP transport
      │
      ▼
Company inbox (MAIL_TO)
```

Frontend → API → Backend → SMTP → Company Email — every arrow above is a
real network hop, not a simulation.

## Project structure

```
elan-contact-api/
├── app.js            # the actual Express app: CORS, validation, Nodemailer, routes
├── server.js         # entry point for local dev / traditional hosting (node server.js)
├── api/
│   ├── contact.js    # Vercel Serverless Function → GET/POST /api/contact
│   └── health.js     # Vercel Serverless Function → GET /api/health
├── package.json
├── .env.example        # template for the environment variables below
└── .gitignore
```

`app.js` is the single source of truth for every route and its logic.
`server.js` (traditional hosting) and the two files under `api/` (Vercel)
all just re-export that same app, so the validation and mail-sending logic
never has to be kept in sync by hand across deploy targets.

No `vercel.json` is needed — Vercel's file-based routing maps
`api/contact.js` → `/api/contact` and `api/health.js` → `/api/health`
automatically, just from the filenames.

## Endpoints

| Method | Path           | Purpose                                    |
|--------|----------------|---------------------------------------------|
| GET    | `/api/health`  | Liveness check — returns `{ ok: true }`    |
| POST   | `/api/contact` | Validates the form, sends the email        |

### `POST /api/contact` request body

```json
{
  "fullName": "Jane Doe",
  "emailAddr": "jane@example.com",
  "fparty": 4,
  "message": "Window seat if possible"
}
```

| Field       | Type   | Rules                                              |
|-------------|--------|-----------------------------------------------------|
| `fullName`  | string | required, 1–100 characters                          |
| `emailAddr` | string | required, valid email format, ≤200 characters       |
| `fparty`    | number | required, whole number, 1–14                        |
| `message`   | string | optional, ≤2000 characters                          |
| `company`   | string | **honeypot** — leave this field hidden on the frontend; if it's non-empty, the request is silently treated as spam |

### Responses

- `200 { "success": true, "message": "Reservation request sent." }`
- `400 { "success": false, "errors": { "<field>": "<message>" } }` — validation failed
- `500 { "success": false, "error": "..." }` — SMTP/server error (message is generic on purpose — no internals are leaked)

## Environment variables

Copy `.env.example` to `.env` for local development and fill in real values.
On Vercel, set these under **Project Settings → Environment Variables** instead
(never commit a real `.env` file).

| Variable         | Example                                      | Notes |
|------------------|-----------------------------------------------|-------|
| `SMTP_HOST`      | `smtp.gmail.com`                              | Your SMTP provider's host |
| `SMTP_PORT`      | `587`                                         | 587 (STARTTLS) or 465 (implicit TLS) |
| `SMTP_SECURE`    | `false`                                       | `true` only for port 465 |
| `SMTP_USER`      | `you@yourdomain.com`                          | SMTP username |
| `SMTP_PASS`      | `••••••••••••`                                | SMTP password — for Gmail, use an **App Password**, not your login password |
| `MAIL_FROM`      | `"Élan Reservations <no-reply@yourdomain.com>"` | Must usually be on a domain your SMTP provider allows you to send as |
| `MAIL_TO`        | `concierge@yourdomain.com`                    | Where reservation requests land |
| `ALLOWED_ORIGIN` | `https://elan.luxury,https://www.elan.luxury` | Comma-separated list of origins allowed to call this API. Use `*` only in local dev |
| `PORT`           | `4000`                                        | Local dev only — Vercel ignores this |

### Getting SMTP credentials quickly

- **Gmail**: enable 2-Step Verification, then create an *App Password* at
  myaccount.google.com/apppasswords. Use `smtp.gmail.com`, port `587`, `SMTP_SECURE=false`.
- **Outlook/Office 365**: `smtp.office365.com`, port `587`, `SMTP_SECURE=false`.
- **A transactional provider** (SendGrid, Mailgun, Postmark, Resend, etc.) generally has
  higher deliverability than a personal inbox and gives you an SMTP username/password
  directly in their dashboard — recommended for anything beyond a class project.

## Running locally

```bash
npm install
cp .env.example .env
# edit .env with real SMTP credentials
npm run dev
```

Then test it:

```bash
curl http://localhost:4000/api/health

curl -X POST http://localhost:4000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Jane Doe","emailAddr":"jane@example.com","fparty":4,"message":"Window seat"}'
```

A real email should land in `MAIL_TO` within a few seconds, with `Reply-To`
set to the guest's own email so the company can just hit reply.

## Deploying to Vercel

```bash
npm install -g vercel   # if you don't have it yet
vercel login
vercel                  # first deploy — follow the prompts
```

Then add the environment variables from the table above:

```bash
vercel env add SMTP_HOST
vercel env add SMTP_PORT
vercel env add SMTP_SECURE
vercel env add SMTP_USER
vercel env add SMTP_PASS
vercel env add MAIL_FROM
vercel env add MAIL_TO
vercel env add ALLOWED_ORIGIN
vercel --prod            # redeploy so the new env vars take effect
```

(Or add them under **Vercel Dashboard → your project → Settings → Environment
Variables** instead of the CLI — same effect.)

Once deployed, your endpoint is:

```
https://<your-project>.vercel.app/api/contact
```

## Wiring up the frontend

The Élan site's reservation form (`main.js`, `#reserveForm`) already does
client-side validation. Point its submit handler at this API — see the
`API_BASE_URL` constant and the updated `reserveForm` submit handler shipped
alongside this deliverable. In short:

```js
const API_BASE_URL = 'https://<your-project>.vercel.app';

const res = await fetch(`${API_BASE_URL}/api/contact`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fullName, emailAddr, fparty, message }),
});
const result = await res.json();
```

Client-side validation stays in place for instant feedback; the backend
re-validates everything regardless, since the client is never trusted.

## Security notes

- **CORS is allow-listed**, not wide open — set `ALLOWED_ORIGIN` to your real
  site domain(s) in production. A rejected origin simply never gets the
  `Access-Control-Allow-Origin` header, so the browser blocks the request;
  the server never throws or leaks a stack trace over it.
- **Every response is JSON**, including 404s and unexpected errors — no
  default Express HTML error pages that could leak internals.
- **Honeypot field** (`company`) added for basic bot filtering. Keep it in
  the form but hide it with CSS (`display:none` or off-screen positioning),
  never `type="hidden"` alone — some bots skip hidden inputs correctly, but
  a CSS-hidden text input catches more of them.
- **Never commit `.env`** — it's already in `.gitignore`.
- For serious production traffic, consider adding rate-limiting (e.g.
  `express-rate-limit`) in front of `/api/contact` — not included here to
  keep the deliverable focused on the assignment's checklist, but it's a
  natural next step.

## Checklist coverage

| Requirement              | Where |
|---------------------------|-------|
| HTTP request/response     | Express routes in `app.js`, JSON in/out |
| Node.js                   | Runtime for the whole project |
| Express                   | `app.js` |
| API endpoint               | `POST /api/contact`, `GET /api/health` |
| Nodemailer                  | `getTransporter()` in `app.js` |
| SMTP                        | `nodemailer.createTransport({ host, port, secure, auth })` |
| Environment variables       | `.env.example`, `process.env.*` throughout `app.js` |
| Backend validation           | `validateReservation()` in `app.js` |
| CORS                          | `cors()` middleware, origin allow-list |
| Vercel deployment              | `api/contact.js`, `api/health.js` (file-based routing, no config needed) |
