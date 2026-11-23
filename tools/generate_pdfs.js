import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import playwrightCore from './autofill/node_modules/playwright-core/index.js';
const { chromium } = playwrightCore;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function getBrowserExecutable() {
  if (fs.existsSync(CHROME_PATH)) return CHROME_PATH;
  if (fs.existsSync(EDGE_PATH)) return EDGE_PATH;
  throw new Error("Neither Google Chrome nor Microsoft Edge was found on this system.");
}

// Generate HTML for moderncv banking style CV (Exact 1-Page High-Impact Executive/Tech Layout)
export function renderCvHtml({ company, role, highlights }) {
  const targetCompany = company || 'Target Company';
  const targetRole = role || 'Senior QA Automation Engineer';
  const targetHighlights = highlights || 'Playwright, TypeScript, CI/CD Integration, QA Leadership';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vijay Kumar - CV (${targetCompany})</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 15mm 10mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      font-size: 8.8pt;
      line-height: 1.34;
      background: #ffffff;
    }
    a {
      color: #1d4ed8;
      text-decoration: none;
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
      border-bottom: 1.5px solid #1d4ed8;
      padding-bottom: 6px;
    }
    .name {
      font-size: 22pt;
      font-weight: 700;
      color: #1d4ed8;
      letter-spacing: -0.4px;
      margin-bottom: 3px;
    }
    .contact-line {
      font-size: 8.8pt;
      color: #475569;
    }
    .contact-line span {
      margin: 0 4px;
      color: #94a3b8;
    }
    .section-title {
      font-size: 9.8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #1d4ed8;
      margin-top: 8px;
      margin-bottom: 4px;
      padding-bottom: 2px;
      border-bottom: 1px solid #cbd5e1;
    }
    .profile-statement {
      font-size: 8.8pt;
      text-align: justify;
      color: #334155;
      margin-bottom: 6px;
    }
    ul {
      margin-left: 15px;
      margin-bottom: 4px;
    }
    li {
      margin-bottom: 2px;
      font-size: 8.7pt;
      color: #334155;
    }
    .exp-entry {
      margin-bottom: 6px;
      page-break-inside: avoid;
    }
    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1px;
    }
    .exp-role {
      font-size: 9.3pt;
      font-weight: 700;
      color: #0f172a;
    }
    .exp-date {
      font-size: 8.5pt;
      font-weight: 600;
      color: #64748b;
    }
    .exp-sub {
      display: flex;
      justify-content: space-between;
      font-size: 8.8pt;
      color: #1d4ed8;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .exp-location {
      font-size: 8.3pt;
      color: #64748b;
      font-weight: 400;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="name">Vijay Kumar</div>
    <div class="contact-line">
      India <span>|</span>
      <a href="tel:+917696122634">+91 7696122634</a> <span>|</span>
      <a href="mailto:vijaychuhan007@gmail.com">vijaychuhan007@gmail.com</a> <span>|</span>
      <a href="https://linkedin.com/in/vijay-007" target="_blank">linkedin.com/in/vijay-007</a> <span>|</span>
      <a href="https://github.com/vijayqadevkraft" target="_blank">github.com/vijayqadevkraft</a>
    </div>
  </div>

  <!-- PROFILE STATEMENT -->
  <div class="profile-statement">
    Senior QA Engineer &amp; QA Lead with <strong>5 years</strong> of quality engineering experience combining meticulous manual testing (STLC, test scenario architecture, exploratory &amp; regression suites) with scalable test automation (<strong>Playwright, TypeScript, JavaScript</strong>). Proven record slashing regression cycles by <strong>60%</strong>, driving zero-defect releases for high-volume enterprise systems, and leading QA technicians. Specifically tailored for <strong>${targetCompany}</strong>'s <strong>${targetRole}</strong> opening.
  </div>

  <!-- CORE COMPETENCIES -->
  <div class="section-title">Core Competencies</div>
  <ul>
    <li><strong>Manual &amp; Functional QA:</strong> Comprehensive STLC, Test Case Architecture, Exploratory &amp; Smoke/Sanity Testing, Boundary Value Analysis, JIRA Defect Lifecycle, UAT.</li>
    <li><strong>Playwright &amp; Automation Architecture:</strong> Modular Playwright frameworks, Page Object Model (POM), TypeScript, JavaScript, Java Selenium WebDriver, BrowserStack cross-browser cloud.</li>
    <li><strong>CI/CD &amp; Automated Quality Gates:</strong> Automated PR-triggered test runs, GitHub Actions, Jenkins, API automation (Postman, REST), continuous regression testing.</li>
    <li><strong>QA Team Leadership &amp; Delivery:</strong> Mentored 5 QA technicians, standardized JIRA defect triage, Agile/Scrum sprint coordination, User Acceptance Testing (UAT).</li>
    <li><strong>Target Alignment for ${targetCompany}:</strong> ${targetHighlights}.</li>
  </ul>

  <!-- PROFESSIONAL EXPERIENCE -->
  <div class="section-title">Professional Experience</div>

  <div class="exp-entry">
    <div class="exp-header">
      <span class="exp-role">Senior QA Automation Engineer</span>
      <span class="exp-date">Nov 2024 – Present</span>
    </div>
    <div class="exp-sub">
      <span>XianInfotech LLP</span>
      <span class="exp-location">India</span>
    </div>
    <ul>
      <li>Architected and scaled modular <strong>Playwright + TypeScript</strong> test automation suites, achieving 90%+ automation coverage on core regression flows.</li>
      <li>Executed rigorous manual exploratory, functional, and boundary testing across web &amp; mobile platforms, uncovering 65+ critical edge-case defects before production deployment.</li>
      <li>Spearheaded JIRA defect triage, detailed bug reproduction videos, and API verification via Postman, cutting dev-fix turnaround time by <strong>40%</strong>.</li>
      <li>Collaborated directly with engineering leads and product managers in fast-paced Agile sprints to establish zero-defect release criteria.</li>
    </ul>
  </div>

  <div class="exp-entry">
    <div class="exp-header">
      <span class="exp-role">Senior QA Engineer &amp; Automation Lead</span>
      <span class="exp-date">May 2021 – May 2024</span>
    </div>
    <div class="exp-sub">
      <span>Devkraft Technologies</span>
      <span class="exp-location">India</span>
    </div>
    <ul>
      <li>Architected and implemented a modular <strong>Playwright + TypeScript</strong> automation framework, reducing regression execution time by <strong>60%</strong>.</li>
      <li>Integrated automated test suites directly into CI/CD pipelines (GitHub Actions/Jenkins) to validate pull requests and block regressions upstream.</li>
      <li>Led and mentored a team of <strong>5 QA Technicians</strong>, conducting code reviews, assigning sprint deliverables, and elevating automated testing standards.</li>
      <li>Authored comprehensive Test Strategies for Android and web apps covering functional, API, cross-browser, and regression test suites.</li>
      <li>Verified high-stakes platforms for enterprise clients including <strong>HDFC Life Insurance</strong> and <strong>TVS Motor</strong> under strict reliability SLA criteria.</li>
      <li>Coordinated User Acceptance Testing (UAT) with business analysts and product stakeholders to secure sign-off prior to production releases.</li>
    </ul>
  </div>

  <div class="exp-entry">
    <div class="exp-header">
      <span class="exp-role">QA Trainee</span>
      <span class="exp-date">Jul 2020 – Dec 2020</span>
    </div>
    <div class="exp-sub">
      <span>Xornor Software Technologies</span>
      <span class="exp-location">India</span>
    </div>
    <ul>
      <li>Executed functional and boundary test cases across multi-tier software products in fast-paced Agile sprint cycles.</li>
      <li>Gained deep grounding in software testing lifecycles (STLC), defect reporting, and test matrix documentation.</li>
    </ul>
  </div>

  <!-- FEATURED PROJECTS -->
  <div class="section-title">Featured Projects &amp; Frameworks</div>
  <ul>
    <li><strong>Playwright Automation Demo (<a href="https://github.com/vijayqadevkraft/playwright-demo" target="_blank">github.com/vijayqadevkraft/playwright-demo</a>):</strong> Production-grade open-source automation framework written in TypeScript featuring Page Object Model, parallel workers, cross-browser capabilities, and GitHub Actions CI.</li>
    <li><strong>Enterprise Financial &amp; Mobility Apps:</strong> Mission-critical mobile and web testing for HDFC Life and TVS Motor customer workflows ensuring 99.9% uptime.</li>
  </ul>

  <!-- EDUCATION -->
  <div class="section-title">Education</div>
  <div class="exp-entry" style="margin-bottom:0;">
    <div class="exp-header">
      <span class="exp-role">B.Tech in Computer Science &amp; Engineering</span>
      <span class="exp-date">CT Group of Institutions, India</span>
    </div>
    <div class="exp-sub" style="color: #64748b; font-weight:400; font-size:8.3pt;">
      Key Studies: Software Engineering, Quality Assurance, Test Automation, Object-Oriented Programming, Data Structures.
    </div>
  </div>

</body>
</html>`;
}

// Generate HTML for Cover Letter
export function renderCoverLetterHtml({ company, role, highlights }) {
  const targetCompany = company || 'Hiring Team';
  const targetRole = role || 'Senior QA Automation Engineer';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cover Letter - Vijay Kumar (${targetCompany})</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 22mm 20mm 22mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      font-size: 10.5pt;
      line-height: 1.55;
      background: #ffffff;
    }
    a {
      color: #1d4ed8;
      text-decoration: none;
    }
    .header {
      border-bottom: 2px solid #1d4ed8;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .name {
      font-size: 26pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .contact-line {
      font-size: 9.5pt;
      color: #475569;
    }
    .contact-line span {
      margin: 0 4px;
      color: #94a3b8;
    }
    .date {
      font-size: 10pt;
      color: #64748b;
      margin-bottom: 18px;
    }
    .salutation {
      font-size: 11pt;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }
    p {
      margin-bottom: 12px;
      text-align: justify;
    }
    ul {
      margin-left: 20px;
      margin-bottom: 14px;
    }
    li {
      margin-bottom: 6px;
      font-size: 10pt;
      color: #334155;
    }
    li strong {
      color: #0f172a;
    }
    .closing {
      margin-top: 22px;
    }
    .signature {
      margin-top: 10px;
      font-weight: 700;
      font-size: 11pt;
      color: #0f172a;
    }
    .signature-title {
      font-size: 9.5pt;
      color: #64748b;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="name">Vijay Kumar</div>
    <div class="contact-line">
      <a href="mailto:vijaychuhan007@gmail.com">vijaychuhan007@gmail.com</a> <span>|</span>
      <a href="tel:+917696122634">+91 7696122634</a> <span>|</span>
      <a href="https://www.linkedin.com/in/vijay-007" target="_blank">LinkedIn</a> <span>|</span>
      <a href="https://github.com/vijayqadevkraft" target="_blank">GitHub</a> <span>|</span>
      India
    </div>
  </div>

  <div class="date">${today}</div>

  <div class="salutation">Dear Hiring Team at ${targetCompany},</div>

  <p>
    I am writing to apply for the <strong>${targetRole}</strong> role at <strong>${targetCompany}</strong>. With over 5 years of quality engineering experience spanning hands-on <strong>Playwright &amp; TypeScript test automation</strong>, deep manual/exploratory testing (STLC), and QA team leadership, I specialize in helping fast-paced engineering teams ship features rapidly with zero production defect leakage.
  </p>

  <p>
    At dev-first tech firms and client platforms, I have built test practices from the ground up and driven high-velocity delivery:
  </p>

  <ul>
    <li><strong>Playwright &amp; TypeScript Frameworks:</strong> Architected modular automation frameworks with Page Object Model and parallel execution, slashing regression cycle duration by <strong>60%</strong> (from 8 hours to under 3 hours). (Live framework demo: <a href="https://github.com/vijayqadevkraft/playwright-demo" target="_blank">github.com/vijayqadevkraft/playwright-demo</a>).</li>
    <li><strong>Exhaustive Manual &amp; Functional Testing:</strong> 5 years designing test matrices, boundary value analysis, sanity/smoke cycles, and JIRA defect triage—uncovering 65+ critical edge-case bugs that automated scripts missed.</li>
    <li><strong>CI/CD Automated Quality Gates:</strong> Integrated automated test suites with GitHub Actions and Jenkins pipelines to validate pull requests continuously, blocking regressions upstream.</li>
    <li><strong>Proven QA Ownership &amp; Leadership:</strong> Directed and mentored 5 QA engineers, standardized sprint defect workflows, and ensured flawless releases for enterprise products including HDFC Life and TVS Motor.</li>
  </ul>

  <p>
    I am particularly drawn to <strong>${targetCompany}</strong> because of your product focus and engineering culture. As a self-directed senior engineer who thrives in lean teams, I require zero ramp-up time: I can immediately audit your core user journeys, set up automated smoke test gates in CI/CD, and partner closely with your developers to guarantee reliable releases.
  </p>

  <p>
    I would welcome the opportunity to discuss how my automation architecture and QA leadership can deliver immediate value to ${targetCompany}. Thank you for your time and consideration.
  </p>

  <div class="closing">
    <div>Kind regards,</div>
    <div class="signature">Vijay Kumar</div>
    <div class="signature-title">Senior QA Automation Engineer &amp; QA Lead</div>
  </div>

</body>
</html>`;
}

// Function to generate PDF using local Chrome/Edge
export async function generatePdfFromHtml(htmlContent, outputPath) {
  const browserPath = getBrowserExecutable();
  const sessionDir = path.join(os.tmpdir(), `pw_pdf_${Date.now()}_${Math.floor(Math.random() * 100000)}`);

  const context = await chromium.launchPersistentContext(sessionDir, {
    executablePath: browserPath,
    headless: true,
    args: ['--no-first-run', '--no-default-browser-check']
  });

  try {
    const page = await context.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load' });
    
    // Ensure parent dir exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });

    console.log(`[PDF OK] Generated: ${outputPath}`);
    return outputPath;
  } finally {
    await context.close();
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// Standalone execution to generate PDFs for all drafted jobs
export async function generateAllPdfs() {
  console.log("=== Generating All Candidate PDFs ===");
  const TRACKER_PATH = path.join(ROOT, 'job_search_tracker.csv');
  if (!fs.existsSync(TRACKER_PATH)) {
    console.log("No tracker CSV found.");
    return;
  }

  const lines = fs.readFileSync(TRACKER_PATH, 'utf8').trim().split(/\r?\n/);
  if (lines.length <= 1) return;

  const headers = lines[0].split(',').map(h => h.trim());
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const job = {};
    headers.forEach((h, idx) => { job[h] = (cols[idx] || '').trim(); });

    const company = job.company;
    const role = job.role;
    const safeCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // CV
    const cvPdfPath = path.join(ROOT, 'cv', `main_${safeCompany}_qa.pdf`);
    const cvHtml = renderCvHtml({ company, role, highlights: job.notes });
    await generatePdfFromHtml(cvHtml, cvPdfPath);

    // Cover Letter
    const clPdfPath = path.join(ROOT, 'cover_letters', `cover_${safeCompany}_qa.pdf`);
    const clHtml = renderCoverLetterHtml({ company, role, highlights: job.notes });
    await generatePdfFromHtml(clHtml, clPdfPath);
  }

  // Also master example CV and Letter
  const masterCvHtml = renderCvHtml({ company: 'General Application', role: 'Senior QA Automation Engineer / QA Lead' });
  await generatePdfFromHtml(masterCvHtml, path.join(ROOT, 'cv', 'Vijay_Kumar_Senior_QA_CV.pdf'));

  const masterClHtml = renderCoverLetterHtml({ company: 'Target Company', role: 'Senior QA Automation Engineer' });
  await generatePdfFromHtml(masterClHtml, path.join(ROOT, 'cover_letters', 'Vijay_Kumar_Cover_Letter.pdf'));

  console.log("=== All PDFs successfully generated! ===");
}

// If run directly via CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  generateAllPdfs().catch(err => {
    console.error("Error generating PDFs:", err);
    process.exit(1);
  });
}
