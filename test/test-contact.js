/**
 * Checks how POST /api/contact reacts to good and bad requests.
 * Needs Node 18+ (built-in fetch). No extra packages.
 *
 *   node test-contact.js                          → tests http://localhost:4000
 *   node test-contact.js https://your-site.vercel.app
 *   node test-contact.js http://localhost:4000 --send
 *
 * By default NO email is sent (every case is rejected before the mail step, or is
 * the honeypot case). Add --send to also run one valid request, which sends ONE real email.
 */

const args = process.argv.slice(2);
const BASE = (args.find((a) => !a.startsWith('--')) || 'http://localhost:4000').replace(/\/+$/, '');
const SEND = args.includes('--send');
const URL = `${BASE}/api/contact`;

const valid = {
  fullName: 'Jane Doe',
  emailAddr: 'jane@example.com',
  fparty: 4,
  message: 'Window seat please',
};

const postJson = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// expect = HTTP status; field = a key that must appear in `errors` (optional)
const cases = [
  // ---- invalid requests ----
  { name: 'empty JSON object {}', expect: 400, req: postJson({}) },
  { name: 'body is an array', expect: 400, req: postJson([]) },
  {
    name: 'malformed JSON',
    expect: 400,
    req: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"fullName": ' },
  },
  {
    name: 'wrong Content-Type (text/plain)',
    expect: 415,
    req: { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'hello' },
  },
  { name: 'no body, no Content-Type', expect: 415, req: { method: 'POST' } },
  {
    name: 'body over the 10kb limit',
    expect: 413,
    req: postJson({ ...valid, message: 'x'.repeat(20000) }),
  },
  { name: 'GET instead of POST', expect: 405, req: { method: 'GET' } },
  { name: 'unknown route', expect: 404, url: `${BASE}/api/nope`, req: { method: 'GET' } },

  // ---- required fields / empty values ----
  { name: 'all required fields missing', expect: 400, field: 'fullName', req: postJson({ message: 'hello there' }) },
  { name: 'name is whitespace only', expect: 400, field: 'fullName', req: postJson({ ...valid, fullName: '   ' }) },
  { name: 'email is empty string', expect: 400, field: 'emailAddr', req: postJson({ ...valid, emailAddr: '' }) },
  { name: 'party size missing', expect: 400, field: 'fparty', req: postJson({ ...valid, fparty: undefined }) },
  { name: 'name is null', expect: 400, field: 'fullName', req: postJson({ ...valid, fullName: null }) },

  // ---- wrong types ----
  { name: 'name is a number', expect: 400, field: 'fullName', req: postJson({ ...valid, fullName: 123 }) },
  { name: 'name is an object', expect: 400, field: 'fullName', req: postJson({ ...valid, fullName: { a: 1 } }) },
  { name: 'party size is text', expect: 400, field: 'fparty', req: postJson({ ...valid, fparty: 'four' }) },

  // ---- min / max length ----
  { name: 'name too short (1 char)', expect: 400, field: 'fullName', req: postJson({ ...valid, fullName: 'A' }) },
  { name: 'name too long (101 chars)', expect: 400, field: 'fullName', req: postJson({ ...valid, fullName: 'A'.repeat(101) }) },
  { name: 'name has a newline', expect: 400, field: 'fullName', req: postJson({ ...valid, fullName: 'Jane\nDoe' }) },
  { name: 'message too short (2 chars)', expect: 400, field: 'message', req: postJson({ ...valid, message: 'hi' }) },
  { name: 'message too long (2001 chars)', expect: 400, field: 'message', req: postJson({ ...valid, message: 'm'.repeat(2001) }) },
  { name: 'party size 0', expect: 400, field: 'fparty', req: postJson({ ...valid, fparty: 0 }) },
  { name: 'party size 15', expect: 400, field: 'fparty', req: postJson({ ...valid, fparty: 15 }) },
  { name: 'party size 2.5', expect: 400, field: 'fparty', req: postJson({ ...valid, fparty: 2.5 }) },

  // ---- email validation ----
  { name: 'email without @', expect: 400, field: 'emailAddr', req: postJson({ ...valid, emailAddr: 'not-an-email' }) },
  { name: 'email without domain dot', expect: 400, field: 'emailAddr', req: postJson({ ...valid, emailAddr: 'jane@example' }) },
  { name: 'email with double dots', expect: 400, field: 'emailAddr', req: postJson({ ...valid, emailAddr: 'ja..ne@example.com' }) },
  { name: 'email with spaces', expect: 400, field: 'emailAddr', req: postJson({ ...valid, emailAddr: 'jane doe@example.com' }) },
  { name: 'email too long', expect: 400, field: 'emailAddr', req: postJson({ ...valid, emailAddr: `${'a'.repeat(250)}@example.com` }) },

  // ---- honeypot (answers 200 but sends nothing) ----
  { name: 'honeypot filled in (bot)', expect: 200, req: postJson({ ...valid, company: 'Acme Bots Ltd' }) },
];

if (SEND) {
  cases.push({ name: 'VALID request (sends a real email)', expect: 200, req: postJson(valid) });
}

async function run() {
  console.log(`Testing ${URL}${SEND ? '  (including a real send)' : ''}\n`);
  let failed = 0;

  for (const c of cases) {
    let status;
    let body = null;
    try {
      const res = await fetch(c.url || URL, c.req);
      status = res.status;
      body = await res.json().catch(() => null);
    } catch (err) {
      status = `NETWORK ERROR (${err.cause?.code || err.message})`;
    }

    const isJson = body !== null && typeof body === 'object';
    const statusOk = status === c.expect;
    const fieldOk = !c.field || (isJson && body.errors && c.field in body.errors);
    const pass = statusOk && isJson && fieldOk;
    if (!pass) failed += 1;

    const detail = isJson ? body.error || (body.errors ? Object.keys(body.errors).join(', ') : body.message || '') : 'not JSON';
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${String(status).padEnd(4)} ${c.name}${pass ? '' : `   (expected ${c.expect}${c.field ? ` + error on "${c.field}"` : ''})`}`);
    if (!pass || process.env.VERBOSE) console.log(`      → ${detail}`);
  }

  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
}

run();
