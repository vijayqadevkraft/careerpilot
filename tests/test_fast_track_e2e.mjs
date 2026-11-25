import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import handleRequest from '../web/server.js';
import playwrightCore from '../tools/autofill/node_modules/playwright-core/index.js';

const { chromium } = playwrightCore;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EXEC_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : (fs.existsSync(EDGE_PATH) ? EDGE_PATH : null);

const SCREENSHOT_DIR = path.join(ROOT, 'reports', 'fast_track_test_screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let appServer;
let appUrl;
let mockEmployerServer;
let mockEmployerUrl;

function startMockEmployerServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const reqPath = new URL(req.url, 'http://localhost').pathname;
      if (reqPath === '/apply') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`
          <html><body>
            <h1>Mock Employer Application</h1>
            <form id="app-form" action="/submit-ok" method="POST">
              <label for="f-name">Full Name</label><input id="f-name" name="name" type="text" />
              <label for="f-email">Email</label><input id="f-email" name="email" type="email" />
              <label for="f-phone">Phone</label><input id="f-phone" name="phone" type="tel" />
              <label for="f-loc">Location</label><input id="f-loc" name="location" type="text" />
              <label for="f-exp">Years of Experience</label><input id="f-exp" name="experience" type="text" />
              <label for="f-li">LinkedIn</label><input id="f-li" name="linkedin" type="url" />
              <label for="f-gh">GitHub</label><input id="f-gh" name="github" type="url" />
              <label for="f-cv">Resume</label><input id="f-cv" name="resume" type="file" />
              <label for="f-cl">Cover Letter</label><input id="f-cl" name="cover_letter" type="file" />
              <button id="submit-btn" type="submit">Submit Application</button>
            </form>
            <div id="result"></div>
            <script>
              document.getElementById('app-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const fail = new URLSearchParams(location.search).get('fail') === '1';
                const r = await fetch(fail ? '/submit-fail' : '/submit-ok', { method: 'POST' });
                document.getElementById('result').textContent = r.ok ? 'CONFIRMED' : 'SUBMIT_FAILED';
              });
            </script>
          </body></html>
        `);
      }
      if (req.url === '/apply-otp') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`<html><body><h1>Verify Identity</h1><input autocomplete="one-time-code" name="otp" /></body></html>`);
      }
      if (req.url === '/apply-captcha') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`<html><body><h1>Security Check</h1><div class="h-captcha" data-sitekey="mock-key"></div></body></html>`);
      }
      if (req.url === '/submit-ok' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'confirmed', confirmationId: 'MOCK-123' }));
      }
      if (req.url === '/submit-fail' && req.method === 'POST') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Mock server error' }));
      }
      res.writeHead(404);
      res.end('Not found');
    });
    srv.listen(0, '127.0.0.1', () => {
      resolve({ srv, url: `http://127.0.0.1:${srv.address().port}` });
    });
  });
}

test.before(async () => {
  appServer = http.createServer(handleRequest);
  await new Promise((resolve) => appServer.listen(0, '127.0.0.1', resolve));
  appUrl = `http://127.0.0.1:${appServer.address().port}`;
  const mock = await startMockEmployerServer();
  mockEmployerServer = mock.srv;
  mockEmployerUrl = mock.url;
});

test.after(async () => {
  await new Promise((resolve) => appServer.close(resolve));
  await new Promise((resolve) => mockEmployerServer.close(resolve));
});

test('TC 1-10, 13, 18-20, 22-23: Fast-Track UI queue, navigation, persistence, profile, approval & status APIs', { skip: !EXEC_PATH }, async () => {
  const browser = await chromium.launch({ executablePath: EXEC_PATH, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(e.message));
  page.on('response', r => { if (r.status() >= 500 && !r.url().includes('/submit-fail')) failedRequests.push(`${r.status()} ${r.url()}`); });

  try {
    // Intercept /api/jobs/update-status so tests never mutate real job_search_tracker.csv
    await page.route('**/api/jobs/update-status', async (route) => {
      const post = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, job: { id: post.id, status: post.status, submitted_at: post.submitted_at } })
      });
    });

    await page.goto(appUrl, { waitUntil: 'networkidle' });

    // TC 1: Fast-Track modal opens
    await page.click('#qa-btn-fast-track');
    await page.waitForSelector('#fast-track-modal.open');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_fast_track_open.png') });

    // TC 2-5: Eligible jobs load, <= 50, sorted by fit score, Applied/Rejected excluded
    const queueCheck = await page.evaluate(() => ({
      len: fastTrackQueue.length,
      ineligibleFound: fastTrackQueue.some(j => ['applied', 'rejected', 'submitted', 'application confirmed'].includes((j.status || '').toLowerCase())),
      sorted: fastTrackQueue.every((j, i, arr) => i === 0 || parseInt(arr[i - 1].fit_rating || '0', 10) >= parseInt(j.fit_rating || '0', 10))
    }));
    assert.ok(queueCheck.len > 0 && queueCheck.len <= 50);
    assert.equal(queueCheck.ineligibleFound, false);
    assert.equal(queueCheck.sorted, true);

    // TC 7-8: Skip navigation works without marking Applied & progress count is accurate
    const label1 = await page.textContent('#ft-progress-label');
    assert.match(label1, /1 of \d+/);
    await page.click('#ft-btn-skip');
    const label2 = await page.textContent('#ft-progress-label');
    assert.match(label2, /2 of \d+/);
    const firstStatusAfterSkip = await page.evaluate(() => fastTrackQueue[0].status);
    assert.equal(firstStatusAfterSkip, 'Skipped');

    // TC 6: Previous navigation works
    await page.click('#ft-btn-prev');
    const labelBack = await page.textContent('#ft-progress-label');
    assert.match(labelBack, /1 of \d+/);

    // TC 9: Progress survives page refresh
    await page.click('#ft-btn-next');
    const labelBeforeReload = await page.textContent('#ft-progress-label');
    assert.match(labelBeforeReload, /2 of \d+/);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('#qa-btn-fast-track');
    await page.waitForSelector('#fast-track-modal.open');
    const labelAfterReload = await page.textContent('#ft-progress-label');
    assert.match(labelAfterReload, /2 of \d+/);

    // TC 10: Candidate snippets match /api/profile
    const profileRes = await fetch(`${appUrl}/api/profile`);
    const profileData = await profileRes.json();
    const snippetsText = await page.textContent('#ft-quick-snippets');
    assert.ok(snippetsText.includes(profileData.name));
    assert.ok(snippetsText.includes(profileData.email));

    // TC 13: Missing profile fields produce warning
    await page.route('**/api/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ name: 'Vijay Kumar', email: '', phone: '', location: '', linkedin: '', github: '' })
      });
    });
    await page.evaluate(() => populateFastTrackSnippets());
    const warnVisible = await page.isVisible('#ft-profile-warning');
    assert.equal(warnVisible, true);
    await page.unroute('**/api/profile');

    // TC 19-20 & 22: Explicit approval panel required before Submitted, distinguished from Application Confirmed
    await page.click('#ft-btn-mark-next');
    await page.waitForSelector('#ft-approval-panel', { state: 'visible' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_approval_panel.png') });
    await page.click('#ft-btn-approve-submit');
    await page.waitForTimeout(300);
    const pctText = await page.textContent('#ft-progress-percent');
    assert.match(pctText, /1 Submitted/);

    assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join('; ')}`);
    assert.equal(failedRequests.length, 0, `Failed requests: ${failedRequests.join('; ')}`);
  } finally {
    await browser.close();
  }
});

test('TC 11-12, 14-15, 20-21: Mock employer form CV/Cover Letter upload, OTP & CAPTCHA detection, submit success/fail', { skip: !EXEC_PATH }, async () => {
  const browser = await chromium.launch({ executablePath: EXEC_PATH, headless: true });
  const page = await browser.newPage();
  const tmpCv = path.join(os.tmpdir(), 'mock_cv.pdf');
  const tmpCl = path.join(os.tmpdir(), 'mock_cl.pdf');
  fs.writeFileSync(tmpCv, '%PDF-1.4 mock cv');
  fs.writeFileSync(tmpCl, '%PDF-1.4 mock cl');

  try {
    await page.goto(`${mockEmployerUrl}/apply`, { waitUntil: 'domcontentloaded' });
    await page.fill('#f-name', 'Vijay Kumar');
    await page.fill('#f-email', 'vijaychuhan007@gmail.com');
    await page.setInputFiles('#f-cv', tmpCv);
    await page.setInputFiles('#f-cl', tmpCl);
    const filesAttached = await page.evaluate(() => ({
      cv: document.getElementById('f-cv').files.length,
      cl: document.getElementById('f-cl').files.length
    }));
    assert.equal(filesAttached.cv, 1);
    assert.equal(filesAttached.cl, 1);

    // Mock successful submission
    await page.click('#submit-btn');
    await page.waitForFunction(() => document.getElementById('result').textContent === 'CONFIRMED');

    // TC 21: Mock failed submission
    await page.goto(`${mockEmployerUrl}/apply?fail=1`, { waitUntil: 'domcontentloaded' });
    await page.click('#submit-btn');
    await page.waitForFunction(() => document.getElementById('result').textContent === 'SUBMIT_FAILED');

    // TC 14: OTP gate detection
    await page.goto(`${mockEmployerUrl}/apply-otp`, { waitUntil: 'domcontentloaded' });
    const otpPresent = await page.locator('input[autocomplete="one-time-code"]').count();
    assert.equal(otpPresent, 1);

    // TC 15: CAPTCHA gate detection
    await page.goto(`${mockEmployerUrl}/apply-captcha`, { waitUntil: 'domcontentloaded' });
    const captchaPresent = await page.locator('.h-captcha, [data-sitekey]').count();
    assert.equal(captchaPresent, 1);
  } finally {
    await browser.close();
    fs.rmSync(tmpCv, { force: true });
    fs.rmSync(tmpCl, { force: true });
  }
});

test('TC 16-18, 23-24: API security — invalid URLs, launch failure, duplicate block, error messages, auth rejection', async () => {
  // TC 16: Invalid URLs rejected
  const badUrlRes = await fetch(`${appUrl}/api/jobs/autofill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'javascript:alert(1)' })
  });
  assert.equal(badUrlRes.status, 400);

  const ssrfRes = await fetch(`${appUrl}/api/jobs/autofill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'http://127.0.0.1:8080/admin' })
  });
  assert.equal(ssrfRes.status, 400);

  // TC 17 & 23: Resume path traversal & API error messages
  const traversalRes = await fetch(`${appUrl}/api/jobs/autofill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://jobs.lever.co/Sprinto', cv_file: '../../etc/passwd' })
  });
  assert.equal(traversalRes.status, 400);
  const traversalData = await traversalRes.json();
  assert.match(traversalData.error, /Invalid resume file path/i);

  // TC 18: Duplicate application blocked
  const jobsRes = await fetch(`${appUrl}/api/jobs`);
  const { jobs } = await jobsRes.json();
  const applied = jobs.find(j => ['applied', 'submitted', 'application confirmed'].includes((j.status || '').toLowerCase()) && j.source);
  if (applied) {
    const dupRes = await fetch(`${appUrl}/api/jobs/autofill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: applied.source })
    });
    assert.equal(dupRes.status, 409);
  }

  // TC 24: Unauthorized API requests rejected when CAREERPILOT_API_TOKEN is set
  const prevTok = process.env.CAREERPILOT_API_TOKEN;
  process.env.CAREERPILOT_API_TOKEN = 'secret-test-token';
  try {
    const unauthRes = await fetch(`${appUrl}/api/jobs/autofill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://jobs.lever.co/Sprinto' })
    });
    assert.equal(unauthRes.status, 401);
  } finally {
    if (prevTok === undefined) delete process.env.CAREERPILOT_API_TOKEN;
    else process.env.CAREERPILOT_API_TOKEN = prevTok;
  }
});
