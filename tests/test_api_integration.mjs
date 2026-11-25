import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import handleRequest from '../web/server.js';

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

test('GET /api/profile returns profile synced from CLAUDE.md', async () => {
  const res = await fetch(`${baseUrl}/api/profile`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.name, 'Vijay Kumar');
  assert.equal(data.syncedFrom, 'CLAUDE.md');
  assert.ok(Array.isArray(data.skills) && data.skills.length > 5);
});

test('GET /api/jobs returns tracked jobs list', async () => {
  const res = await fetch(`${baseUrl}/api/jobs`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.jobs));
  assert.ok(data.jobs.length > 0);
});

test('POST /api/ai/ats-scan computes real keyword-driven scores without hardcoded 92 floor', async () => {
  const emptyRes = await fetch(`${baseUrl}/api/ai/ats-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobDescription: '', role: '', company: '' })
  });
  assert.equal(emptyRes.status, 200);
  const emptyData = await emptyRes.json();
  assert.equal(emptyData.matchScore, 0);

  const qaRes = await fetch(`${baseUrl}/api/ai/ats-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobDescription: 'We need a Senior QA Engineer skilled in Playwright, TypeScript, CI/CD, GitHub Actions, Postman API testing, and JIRA.',
      role: 'Senior QA Engineer',
      company: 'TestCorp'
    })
  });
  const qaData = await qaRes.json();
  assert.ok(qaData.matchScore >= 80, `Expected high QA match score, got ${qaData.matchScore}`);
  assert.ok(qaData.matchingKeywords.includes('Playwright'));

  const unrelatedRes = await fetch(`${baseUrl}/api/ai/ats-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobDescription: 'Looking for a Kubernetes, Docker, GraphQL, Python, and C# specialist.',
      role: 'Platform Engineer',
      company: 'CloudCorp'
    })
  });
  const unrelatedData = await unrelatedRes.json();
  assert.ok(unrelatedData.matchScore < qaData.matchScore, 'Unrelated stack must score lower than QA stack');
  assert.ok(unrelatedData.missingKeywords.length > 0);
});

test('POST /api/jobs/autofill enforces missing URL and duplicate-application guard', async () => {
  const badRes = await fetch(`${baseUrl}/api/jobs/autofill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(badRes.status, 400);

  const jobsRes = await fetch(`${baseUrl}/api/jobs`);
  const { jobs } = await jobsRes.json();
  const appliedJob = jobs.find(j => (j.status || '').toLowerCase() === 'applied' && j.source);
  if (appliedJob) {
    const dupRes = await fetch(`${baseUrl}/api/jobs/autofill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: appliedJob.source })
    });
    assert.equal(dupRes.status, 409);
    const dupData = await dupRes.json();
    assert.equal(dupData.duplicate, true);
  }
});
