import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import handleRequest from '../web/server.js';
import { validateScrapedJob } from '../tools/autopilot.js';

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(handleRequest);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('Static file serving blocks path traversal outside public/', async () => {
  const res = await fetch(`${baseUrl}/%2e%2e/%2e%2e/package.json`);
  const body = await res.text();
  assert.ok(res.status === 403 || res.status === 404 || !body.includes('"careerpilot-ai"'));
});

test('PDF endpoint blocks path traversal outside workspace', async () => {
  const res = await fetch(`${baseUrl}/api/pdf?file=../../Windows/System32/drivers/etc/hosts`);
  assert.ok(res.status === 403 || res.status === 404);
});

test('Vercel serverless guard prevents EROFS crash on /api/jobs/autofill', async () => {
  const prev = process.env.VERCEL;
  process.env.VERCEL = '1';
  try {
    const res = await fetch(`${baseUrl}/api/jobs/autofill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://jobs.lever.co/Sprinto' })
    });
    assert.equal(res.status, 501);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error, /Vercel serverless/i);
  } finally {
    if (prev === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prev;
  }
});

test('validateScrapedJob rejects non-HTTP URLs and excluded aggregator domains', () => {
  assert.equal(validateScrapedJob({ company: 'Acme', role: 'QA', source: 'javascript:alert(1)' }), false);
  assert.equal(validateScrapedJob({ company: 'Acme', role: 'QA', source: 'https://www.linkedin.com/jobs/view/123' }), false);
  assert.equal(validateScrapedJob({ company: 'Sprinto', role: 'SDET', source: 'https://jobs.lever.co/Sprinto' }), true);
});
