import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { startScheduler, getSchedulerState, executeScheduledRun, stopScheduler } from '../tools/scheduler.js';
import { 
  getAllJobs, 
  getJobById, 
  updateJobStatus, 
  updateJobUrl, 
  addJob, 
  getDailyAnalytics, 
  migrateCsvToMongo, 
  isMongoConfigured,
  parseTrackerCSV,
  saveTrackerCSV 
} from '../tools/db.js';
import { 
  analyzeAtsMatch,
  analyzeAtsMatchAsync,
  getInterviewQuestions, 
  generateOutreachMessage, 
  getAutoFillTemplates, 
  generateApplicationStrategy,
  tailorResumeDiff,
  getFollowUpReminders,
  translateTransferableSkills,
  chatWithCareerAgent
} from './ai-toolkit.js';
import { getCandidateProfile } from '../tools/profile.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;
const CLAUDE_MD_PATH = path.join(ROOT, 'CLAUDE.md');

// Active Autofill Process Tracker
let activeAutofillChild = null;
const AUTOFILL_STATE_PATH = path.join(ROOT, 'tools', 'autofill', 'state.json');

function isAuthorizedRequest(req) {
  const configuredToken = (process.env.CAREERPILOT_API_TOKEN || '').trim();
  if (!configuredToken) return true;
  const authHeader = req.headers['authorization'] || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const customHeader = (req.headers['x-careerpilot-token'] || '').trim();
  return bearer === configuredToken || customHeader === configuredToken;
}

function validateEmployerUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only http/https employer URLs are allowed.' };
    }
    const host = parsed.hostname.toLowerCase();
    const allowLocal = process.env.CAREERPILOT_ALLOW_LOCAL_MOCK === '1';
    const isPrivateOrLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    if (isPrivateOrLocal && !allowLocal) {
      return { valid: false, error: 'Private or localhost URLs are blocked for security.' };
    }
    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, error: 'Invalid employer application URL.' };
  }
}

function validateResumePath(cvFile) {
  if (!cvFile) return { valid: true, fullPath: '' };
  const resolved = path.resolve(ROOT, cvFile);
  if (!resolved.startsWith(ROOT + path.sep)) {
    return { valid: false, error: 'Invalid resume file path.' };
  }
  return { valid: true, fullPath: resolved };
}

// Helper: Parse JSON Body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

export async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // --- API ROUTES ---

  // 0. GET /api/health
  if (req.method === 'GET' && pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      database: isMongoConfigured() ? 'mongodb' : 'csv',
      timestamp: new Date().toISOString()
    }));
  }

  // 0b. POST /api/db/sync-csv
  if (req.method === 'POST' && pathname === '/api/db/sync-csv') {
    try {
      const result = await migrateCsvToMongo();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 1. GET /api/jobs
  if (req.method === 'GET' && pathname === '/api/jobs') {
    try {
      const jobs = await getAllJobs();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, jobs }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 2. POST /api/jobs/update-status
  if (req.method === 'POST' && pathname === '/api/jobs/update-status') {
    if (!isAuthorizedRequest(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Unauthorized request' }));
    }
    try {
      const data = await parseJsonBody(req);
      const { id, status, submitted_at, confirmation_evidence } = data;
      if (!id || !status) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'id and status required' }));
      }
      const job = await updateJobStatus(id, status, { submitted_at, confirmation_evidence });
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Job not found' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, job }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 2b. POST /api/jobs/update-url
  if (req.method === 'POST' && pathname === '/api/jobs/update-url') {
    try {
      const data = await parseJsonBody(req);
      const { id, source } = data;
      if (!id || !source) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'id and source required' }));
      }
      const job = await updateJobUrl(id, source);
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Job not found' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, job }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 3. POST /api/jobs/add
  if (req.method === 'POST' && pathname === '/api/jobs/add') {
    try {
      const data = await parseJsonBody(req);
      const newJob = await addJob(data);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, job: newJob }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 4. GET /api/document?file=path/to/file
  if (req.method === 'GET' && pathname === '/api/document') {
    let fileRel = parsedUrl.searchParams.get('file');
    if (!fileRel) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'file param required' }));
    }
    // If a .pdf path is passed to /api/document, try to find matching .tex for source inspection
    if (fileRel.endsWith('.pdf')) {
      const texRel = fileRel.replace(/\.pdf$/, '.tex');
      if (fs.existsSync(path.resolve(ROOT, texRel))) {
        fileRel = texRel;
      }
    }
    const safePath = path.resolve(ROOT, fileRel);
    if (!safePath.startsWith(ROOT) || !fs.existsSync(safePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found or forbidden' }));
    }
    const content = fs.readFileSync(safePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(content);
  }

  // 4b. GET /api/pdf?file=path/to/file (Serve / Download Compiled PDF)
  if (req.method === 'GET' && (pathname === '/api/pdf' || pathname === '/api/pdf/download')) {
    let fileRel = parsedUrl.searchParams.get('file');
    if (!fileRel) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'file param required' }));
    }
    // If .tex was passed, map to corresponding .pdf
    if (fileRel.endsWith('.tex')) {
      fileRel = fileRel.replace(/\.tex$/, '.pdf');
    }
    const safePath = path.resolve(ROOT, fileRel);
    if (!safePath.startsWith(ROOT) || !fs.existsSync(safePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'PDF file not found: ' + fileRel }));
    }
    const filename = path.basename(safePath);
    const isDownload = pathname.includes('download') || parsedUrl.searchParams.get('download') === '1';

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`
    });
    const stream = fs.createReadStream(safePath);
    return stream.pipe(res);
  }

  // 5. GET /api/profile (Synced dynamically from CLAUDE.md)
  if (req.method === 'GET' && pathname === '/api/profile') {
    const profile = getCandidateProfile();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ...profile,
      experience: `${profile.experienceYears} Years`
    }));
  }

  // 6. POST /api/generate-application (Job-specific tailored CV & Cover Letter)
  if (req.method === 'POST' && pathname === '/api/generate-application') {
    try {
      const data = await parseJsonBody(req);
      const { id } = data;
      const job = await getJobById(id);
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Job not found' }));
      }
      
      const profile = getCandidateProfile();
      const ats = analyzeAtsMatch(job.notes || '', job.role, job.company);
      const safeCompany = job.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const cvFilename = `cv/main_${safeCompany}_qa.tex`;
      const clFilename = `cover_letters/cover_${safeCompany}_qa.tex`;
      const tailoredHighlights = ats.matchingKeywords.length > 0
        ? `${ats.matchingKeywords.join(', ')} | ${job.notes || ''}`.trim()
        : (job.notes || profile.skills.slice(0, 8).join(', '));
      
      // Generate job-specific tailored .tex files
      const exampleCV = fs.readFileSync(path.join(ROOT, 'cv', 'main_example.tex'), 'utf8');
      const tailoredCV = exampleCV
        .replace(/%%?\s*TARGET_COMPANY/g, job.company)
        .replace(/%%?\s*TARGET_ROLE/g, job.role)
        .replace(/\\textbf\{Target Role:.*?\}/, `\\textbf{Target Role:} ${job.role} at ${job.company}`);
      fs.writeFileSync(path.join(ROOT, cvFilename), `% Tailored for ${job.company} — ${job.role} (ATS Keywords: ${ats.matchingKeywords.join(', ')})\n${tailoredCV}`, 'utf8');

      const exampleCL = fs.readFileSync(path.join(ROOT, 'cover_letters', 'cover_example.tex'), 'utf8');
      const tailoredCL = exampleCL
        .replace(/\[Company Name\]/g, job.company)
        .replace(/\[Role Title\]/g, job.role);
      fs.writeFileSync(path.join(ROOT, clFilename), `% Tailored Cover Letter for ${job.company} — ${job.role}\n${tailoredCL}`, 'utf8');

      // Generate job-specific production-ready PDFs
      const cvPdfRel = `cv/main_${safeCompany}_qa.pdf`;
      const clPdfRel = `cover_letters/cover_${safeCompany}_qa.pdf`;
      try {
        const { renderCvHtml, renderCoverLetterHtml, generatePdfFromHtml } = await import('../tools/generate_pdfs.js');
        await generatePdfFromHtml(renderCvHtml({ company: job.company, role: job.role, highlights: tailoredHighlights }), path.join(ROOT, cvPdfRel));
        await generatePdfFromHtml(renderCoverLetterHtml({ company: job.company, role: job.role, highlights: tailoredHighlights }), path.join(ROOT, clPdfRel));
      } catch (pdfErr) {
        console.error('PDF auto-generation warning:', pdfErr.message);
      }

      job.status = 'drafted';
      job.cv_file = fs.existsSync(path.join(ROOT, cvPdfRel)) ? cvPdfRel : cvFilename;
      job.cover_letter_file = fs.existsSync(path.join(ROOT, clPdfRel)) ? clPdfRel : clFilename;
      await addJob(job);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, job, ats }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // 7. POST /api/jobs/autofill
  if (req.method === 'POST' && pathname === '/api/jobs/autofill') {
    if (!isAuthorizedRequest(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Unauthorized request' }));
    }
    try {
      if (process.env.VERCEL) {
        res.writeHead(501, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          state: 'Unavailable',
          error: 'Desktop Chrome auto-fill requires the local server (npm start) and is not supported in Vercel serverless deployments.'
        }));
      }

      const data = await parseJsonBody(req);
      const { url, cv_file, force } = data;
      if (!url) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'url required' }));
      }

      const urlCheck = validateEmployerUrl(url);
      if (!urlCheck.valid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, state: 'Failed', error: urlCheck.error }));
      }

      const cvCheck = validateResumePath(cv_file);
      if (!cvCheck.valid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, state: 'Failed', error: cvCheck.error }));
      }

      // Prevent duplicate applications unless explicitly forced by user
      const normUrl = urlCheck.url.trim().replace(/\/+$/, '').toLowerCase();
      const existingJobs = await getAllJobs();
      const TERMINAL_APPLIED = new Set(['applied', 'submitted', 'application confirmed']);
      const alreadyApplied = existingJobs.find(j =>
        TERMINAL_APPLIED.has((j.status || '').toLowerCase()) &&
        (j.source || '').trim().replace(/\/+$/, '').toLowerCase() === normUrl
      );
      if (alreadyApplied && !force) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          duplicate: true,
          error: `Already ${alreadyApplied.status} to ${alreadyApplied.company} — ${alreadyApplied.role}. Confirm to re-open.`
        }));
      }

      // Terminate any previous autofill session cleanly to prevent session locks
      if (activeAutofillChild) {
        try {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', activeAutofillChild.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
          } else {
            activeAutofillChild.kill('SIGKILL');
          }
        } catch (e) {}
        activeAutofillChild = null;
      }

      const scriptPath = path.join(ROOT, 'tools', 'autofill', 'autofill.js');
      const cvFullPath = cvCheck.fullPath;
      const spawnLogPath = path.join(ROOT, 'tools', 'autofill', 'spawn.log');
      let out = 'ignore';
      try {
        out = fs.openSync(spawnLogPath, 'a');
      } catch (logErr) {
        out = 'ignore';
      }

      try {
        fs.writeFileSync(AUTOFILL_STATE_PATH, JSON.stringify({
          state: 'Initializing',
          url: urlCheck.url,
          updatedAt: new Date().toISOString()
        }), 'utf8');
      } catch (e) {}

      // Spawn Playwright script in detached process on desktop and verify startup
      const child = spawn('node', [scriptPath, urlCheck.url, cvFullPath], {
        detached: true,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', out, out],
        cwd: path.join(ROOT, 'tools', 'autofill')
      });

      const launchCheck = await new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) { settled = true; resolve({ ok: true }); }
        }, 250);
        child.once('error', (err) => {
          if (!settled) { settled = true; clearTimeout(timer); resolve({ ok: false, error: err.message }); }
        });
        child.once('exit', (code) => {
          if (!settled && code !== 0) {
            settled = true;
            clearTimeout(timer);
            resolve({ ok: false, error: `Browser automation exited immediately (code ${code}).` });
          }
        });
      });

      if (!launchCheck.ok) {
        try {
          fs.writeFileSync(AUTOFILL_STATE_PATH, JSON.stringify({
            state: 'Failed',
            error: launchCheck.error,
            updatedAt: new Date().toISOString()
          }), 'utf8');
        } catch (e) {}
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, state: 'Failed', error: launchCheck.error }));
      }

      activeAutofillChild = child;
      child.unref();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, state: 'Initializing', message: 'Browser process started with auto-fill.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, state: 'Failed', error: err.message }));
    }
  }

  // 7a. GET /api/jobs/autofill-status
  if (req.method === 'GET' && pathname === '/api/jobs/autofill-status') {
    try {
      if (process.env.VERCEL) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, state: 'Unavailable', serverless: true }));
      }
      if (!fs.existsSync(AUTOFILL_STATE_PATH)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, state: 'Idle' }));
      }
      const stateData = JSON.parse(fs.readFileSync(AUTOFILL_STATE_PATH, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, ...stateData }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, state: 'Failed', error: err.message }));
    }
  }

  // 7b. POST /api/jobs/submit-code (Submit Identity Verification OTP to Bot)
  if (req.method === 'POST' && pathname === '/api/jobs/submit-code') {
    if (!isAuthorizedRequest(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Unauthorized request' }));
    }
    try {
      if (process.env.VERCEL) {
        res.writeHead(501, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'Autofill OTP submission requires the local server (npm start) and is not supported on Vercel.'
        }));
      }
      const data = await parseJsonBody(req);
      const code = (data.code || '').trim();
      if (!code || !/^[a-zA-Z0-9]{4,10}$/.test(code)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Valid verification code is required.' }));
      }
      const codePath = path.join(ROOT, 'tools', 'autofill', 'code.json');
      fs.writeFileSync(codePath, JSON.stringify({ code: code, applied: false, timestamp: Date.now() }), 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: 'Verification code submitted to browser automation.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 7c. POST /api/jobs/stop-autofill
  if (req.method === 'POST' && pathname === '/api/jobs/stop-autofill') {
    try {
      if (process.env.VERCEL) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: 'No active auto-fill session on serverless deployment.' }));
      }
      if (activeAutofillChild) {
        try {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', activeAutofillChild.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
          } else {
            activeAutofillChild.kill('SIGKILL');
          }
        } catch (e) {}
        activeAutofillChild = null;
      }
      const codePath = path.join(ROOT, 'tools', 'autofill', 'code.json');
      if (fs.existsSync(codePath)) {
        try { fs.unlinkSync(codePath); } catch (e) {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: 'Auto-fill session stopped.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 8. POST /api/autopilot/run
  if (req.method === 'POST' && pathname === '/api/autopilot/run') {
    try {
      const { runAutopilot } = await import('../tools/autopilot.js');
      const result = await runAutopilot();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 9. GET /api/scheduler/status
  if (req.method === 'GET' && pathname === '/api/scheduler/status') {
    try {
      const state = getSchedulerState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, ...state }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 10. POST /api/scheduler/trigger (Force immediate scrape & hunt)
  if (req.method === 'POST' && pathname === '/api/scheduler/trigger') {
    try {
      const state = await executeScheduledRun();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, state }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 11. POST /api/scheduler/toggle (Enable/Disable/Interval)
  if (req.method === 'POST' && pathname === '/api/scheduler/toggle') {
    try {
      const data = await parseJsonBody(req);
      let state;
      if (data.active === false) {
        state = stopScheduler();
      } else {
        const interval = parseInt(data.intervalHours, 10) || 6;
        state = startScheduler(interval);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, state }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 12. POST /api/ai/ats-scan
  if (req.method === 'POST' && pathname === '/api/ai/ats-scan') {
    try {
      const data = await parseJsonBody(req);
      const result = await analyzeAtsMatchAsync(data.jobDescription, data.role, data.company);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, ...result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 13. GET & POST /api/ai/interview-prep
  if ((req.method === 'GET' || req.method === 'POST') && pathname === '/api/ai/interview-prep') {
    try {
      let category = parsedUrl.searchParams.get('category') || 'all';
      let company = parsedUrl.searchParams.get('company') || '';
      let role = parsedUrl.searchParams.get('role') || '';

      if (req.method === 'POST') {
        const data = await parseJsonBody(req);
        if (data.category) category = data.category;
        if (data.company) company = data.company;
        if (data.role) role = data.role;
      }

      const questions = getInterviewQuestions(category, company, role);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, questions }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 14. POST /api/ai/outreach
  if (req.method === 'POST' && pathname === '/api/ai/outreach') {
    try {
      const data = await parseJsonBody(req);
      const message = generateOutreachMessage(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, ...message }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 15. GET /api/ai/autofill-shortcuts
  if (req.method === 'GET' && pathname === '/api/ai/autofill-shortcuts') {
    try {
      const templates = getAutoFillTemplates();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, ...templates }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 16. POST /api/ai/strategy
  if (req.method === 'POST' && pathname === '/api/ai/strategy') {
    try {
      const data = await parseJsonBody(req);
      const strategy = generateApplicationStrategy(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, ...strategy }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 17. GET /api/analytics/daily (Day-by-Day Scraping Breakdown)
  if (req.method === 'GET' && pathname === '/api/analytics/daily') {
    try {
      const analytics = await getDailyAnalytics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, ...analytics }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 18. POST /api/ai/agent/tailor-diff
  if (req.method === 'POST' && pathname === '/api/ai/agent/tailor-diff') {
    try {
      const data = await parseJsonBody(req);
      const result = tailorResumeDiff(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, ...result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 19. GET /api/ai/agent/reminders
  if (req.method === 'GET' && pathname === '/api/ai/agent/reminders') {
    try {
      const jobs = await getAllJobs();
      const result = getFollowUpReminders(jobs);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, ...result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 20. POST /api/ai/agent/translate-skills
  if (req.method === 'POST' && pathname === '/api/ai/agent/translate-skills') {
    try {
      const data = await parseJsonBody(req);
      const result = translateTransferableSkills(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, ...result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // 21. POST /api/ai/agent/chat
  if (req.method === 'POST' && pathname === '/api/ai/agent/chat') {
    try {
      const data = await parseJsonBody(req);
      const result = chatWithCareerAgent(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, ...result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // --- STATIC FILES ---
  let decodedPath = pathname;
  try { decodedPath = decodeURIComponent(pathname); } catch {}
  if (decodedPath.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  let targetFile = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  if (targetFile === 'mini') {
    targetFile = 'mini.html';
  }
  const webPublicDir = path.resolve(__dirname, 'public');
  const rootPublicDir = path.resolve(ROOT, 'public');
  let filePath = path.resolve(webPublicDir, targetFile);
  if (!filePath.startsWith(webPublicDir + path.sep) && filePath !== path.join(webPublicDir, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.resolve(rootPublicDir, targetFile);
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, 'public', 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      return res.end(data);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found');
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found');
  }
}

export default handleRequest;

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (!process.env.VERCEL && isMainModule) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Job Search Web App running at http://localhost:${PORT}`);
    if (isMongoConfigured()) {
      console.log(`[DB] Connected to MongoDB Atlas.`);
    } else {
      console.log(`[DB] Running in local CSV mode (MONGODB_URI not configured).`);
    }
    // Initialize Background Scheduler
    const schedulerState = getSchedulerState();
    if (schedulerState.active !== false) {
      startScheduler(schedulerState.intervalHours || 6);
    }
  });
}
