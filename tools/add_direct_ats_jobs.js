import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePdfFromHtml, renderCvHtml, renderCoverLetterHtml } from './generate_pdfs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TRACKER_PATH = path.join(ROOT, 'job_search_tracker.csv');

const directAtsJobs = [
  {
    company: "Interview Kickstart",
    role: "SDET 2 - Playwright & TypeScript (AI-Assisted Testing)",
    sector: "EdTech / AI Platform",
    role_type: "Full-time (Remote - India)",
    channel: "Direct ATS (Ashby)",
    status: "drafted",
    contact_person: "Engineering Hiring Team",
    fit_rating: "98",
    notes: "Direct Ashby ATS. Playwright TypeScript framework architecture, Next.js, Python API testing, AI-assisted QA. Direct engineering review without recruiter middleman.",
    source: "https://jobs.ashbyhq.com/interviewkickstart",
    deadline: "2026-12-30"
  },
  {
    company: "Wolters Kluwer",
    role: "Senior Software Test Automation Engineer (Playwright & TS)",
    sector: "Enterprise Software",
    role_type: "Full-time (Pune - Hybrid)",
    channel: "Direct ATS (Workday)",
    status: "drafted",
    contact_person: "QA Engineering Director",
    fit_rating: "96",
    notes: "Direct Workday ATS. UI and API test automation frameworks using Playwright and TypeScript, enterprise CI/CD gates.",
    source: "https://wolterskluwer.wd3.myworkdayjobs.com/External",
    deadline: "2026-12-30"
  },
  {
    company: "Visa",
    role: "Senior Consultant / SDET (Playwright, API & Microservices)",
    sector: "FinTech / Payments",
    role_type: "Full-time (Bengaluru / Pune / Hybrid)",
    channel: "Direct ATS (Workday)",
    status: "drafted",
    contact_person: "FinTech Quality Practice",
    fit_rating: "96",
    notes: "Direct Workday ATS. Playwright end-to-end and API testing, high availability financial systems. High alignment with HDFC Life background.",
    source: "https://visa.wd1.myworkdayjobs.com/Careers",
    deadline: "2026-12-30"
  },
  {
    company: "Litmus Automation",
    role: "Senior QA Test Engineer (Playwright & Industrial IoT)",
    sector: "Industrial IoT",
    role_type: "Full-time (Pune - Hybrid)",
    channel: "Direct ATS (Ashby)",
    status: "drafted",
    contact_person: "Talent Acquisition",
    fit_rating: "95",
    notes: "Direct Ashby ATS. Standardized on Playwright (TypeScript/JavaScript), API and protocol testing, CI/CD pipeline.",
    source: "https://jobs.ashbyhq.com/litmus",
    deadline: "2026-12-30"
  },
  {
    company: "NETGEAR",
    role: "Senior QA Engineer I - Insight Cloud Platform",
    sector: "Cloud & Networking",
    role_type: "Full-time (Bengaluru - Hybrid)",
    channel: "Direct ATS (Ashby)",
    status: "drafted",
    contact_person: "Cloud Engineering Lead",
    fit_rating: "94",
    notes: "Direct Ashby ATS. Cloud workflow and API automation using TypeScript and Playwright.",
    source: "https://jobs.ashbyhq.com/netgear",
    deadline: "2026-12-30"
  },
  {
    company: "Cleo",
    role: "SDET - Mobile & Web Automation",
    sector: "FinTech",
    role_type: "Full-time (Bengaluru)",
    channel: "Direct ATS (Greenhouse)",
    status: "drafted",
    contact_person: "Core QA Team",
    fit_rating: "94",
    notes: "Direct Greenhouse ATS. Automated test suites for web, mobile, and backend, CI/CD quality gates.",
    source: "https://boards.greenhouse.io/cleo",
    deadline: "2026-12-30"
  },
  {
    company: "Fulcrum Digital",
    role: "Senior QA Automation Lead - Playwright",
    sector: "Digital Transformation",
    role_type: "Full-time (Pune)",
    channel: "Direct ATS (Zoho Recruit)",
    status: "drafted",
    contact_person: "Quality Delivery Manager",
    fit_rating: "96",
    notes: "Direct Zoho Recruit ATS. Playwright automation framework design, TypeScript, QA mentorship, CI/CD.",
    source: "https://fulcrumdigital.zohorecruit.com/jobs/Careers",
    deadline: "2026-12-30"
  },
  {
    company: "Syneos Health",
    role: "Senior QA Tester - Playwright & TypeScript",
    sector: "HealthTech",
    role_type: "Full-time (Remote / India)",
    channel: "Direct Career Portal",
    status: "drafted",
    contact_person: "Talent Acquisition",
    fit_rating: "94",
    notes: "Direct corporate career page. Playwright, TypeScript, regression suites, STLC.",
    source: "https://syneoshealth.com/careers",
    deadline: "2026-12-30"
  },
  {
    company: "Wits Innovation Lab",
    role: "Senior QA Automation Engineer (Playwright & Lead)",
    sector: "Software Engineering",
    role_type: "Full-time (Mohali)",
    channel: "Direct Career Portal",
    status: "drafted",
    contact_person: "Talent Acquisition Team",
    fit_rating: "96",
    notes: "Direct company career portal. Playwright, TypeScript, Java Selenium, Postman API, STLC, Tricity IT corridor.",
    source: "https://witslab.com/careers",
    deadline: "2026-12-30"
  },
  {
    company: "Closeloop Technologies",
    role: "SDET / QA Lead (Playwright & TypeScript)",
    sector: "Cloud & Product Engineering",
    role_type: "Full-time (Mohali Phase 8B)",
    channel: "Direct Career Portal",
    status: "drafted",
    contact_person: "Tech Lead",
    fit_rating: "96",
    notes: "Direct company career portal. Playwright TypeScript Page Object Model, API Testing, Agile sprint leadership.",
    source: "https://closeloop.com/careers",
    deadline: "2026-12-30"
  }
];

async function run() {
  console.log("Loading tracker CSV...");
  const text = fs.readFileSync(TRACKER_PATH, 'utf8').trim();
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  
  const existingJobs = [];
  const existingKeys = new Set();
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const j = {};
    headers.forEach((h, idx) => { j[h] = (cols[idx] || '').trim(); });
    const key = `${(j.company || '').toLowerCase().trim()}_${(j.role || '').toLowerCase().trim()}`;
    existingKeys.add(key);
    existingJobs.push(j);
  }

  const today = new Date().toISOString().slice(0, 10);
  const newlyAdded = [];

  for (const job of directAtsJobs) {
    const key = `${job.company.toLowerCase().trim()}_${job.role.toLowerCase().trim()}`;
    const safeCompany = job.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cvPdfRel = `cv/main_${safeCompany}_qa.pdf`;
    const clPdfRel = `cover_letters/cover_${safeCompany}_qa.pdf`;

    const cvPdfAbs = path.join(ROOT, cvPdfRel);
    const clPdfAbs = path.join(ROOT, clPdfRel);

    // Generate PDFs if missing
    if (!fs.existsSync(cvPdfAbs)) {
      try {
        const cvHtml = renderCvHtml({ company: job.company, role: job.role, highlights: job.notes });
        await generatePdfFromHtml(cvHtml, cvPdfAbs);
      } catch (err) {
        console.warn(`[CV PDF WARN] ${err.message}`);
      }
    }

    if (!fs.existsSync(clPdfAbs)) {
      try {
        const clHtml = renderCoverLetterHtml({ company: job.company, role: job.role, highlights: job.notes });
        await generatePdfFromHtml(clHtml, clPdfAbs);
      } catch (err) {
        console.warn(`[CL PDF WARN] ${err.message}`);
      }
    }

    job.date = today;
    job.posted_date = today;
    job.cv_file = cvPdfRel;
    job.cover_letter_file = clPdfRel;

    if (!existingKeys.has(key)) {
      newlyAdded.push(job);
      existingKeys.add(key);
    }
  }

  console.log(`Adding ${newlyAdded.length} new direct ATS & hidden jobs...`);
  // Place newly added at the top of the tracker
  const combined = [...newlyAdded, ...existingJobs];

  const csvRows = [headers.join(',')];
  combined.forEach(j => {
    const row = headers.map(h => (j[h] || '').replace(/,/g, ' '));
    csvRows.push(row.join(','));
  });

  fs.writeFileSync(TRACKER_PATH, csvRows.join('\n') + '\n', 'utf8');
  console.log(`Tracker updated! Total jobs: ${combined.length}`);
}

run().catch(err => {
  console.error("Error adding direct ATS jobs:", err);
  process.exit(1);
});
