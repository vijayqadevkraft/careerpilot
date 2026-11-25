import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import handleRequest from '../web/server.js';
import playwrightCore from '../tools/autofill/node_modules/playwright-core/index.js';

const { chromium } = playwrightCore;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EXEC_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : (fs.existsSync(EDGE_PATH) ? EDGE_PATH : null);

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(handleRequest);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('E2E: Dashboard loads cleanly in dark theme and Fast-Track modal navigates', { skip: !EXEC_PATH }, async () => {
  const browser = await chromium.launch({ executablePath: EXEC_PATH, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.equal(bgColor, 'rgb(248, 250, 252)');

    await page.click('#qa-btn-fast-track');
    await page.waitForSelector('#fast-track-modal.open');
    const firstLabel = await page.textContent('#ft-progress-label');
    assert.match(firstLabel, /1 of 50/);

    await page.click('#ft-btn-next');
    const secondLabel = await page.textContent('#ft-progress-label');
    assert.match(secondLabel, /2 of 50/);

    await page.click('#ft-btn-prev');
    const backLabel = await page.textContent('#ft-progress-label');
    assert.match(backLabel, /1 of 50/);

    assert.equal(consoleErrors.length, 0, `Unexpected console errors: ${consoleErrors.join('; ')}`);
  } finally {
    await browser.close();
  }
});
