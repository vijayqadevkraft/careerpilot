import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePdfFromHtml, renderCvHtml, renderCoverLetterHtml } from './generate_pdfs.js';
import { scoreJob } from './autopilot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TRACKER_PATH = path.join(ROOT, 'job_search_tracker.csv');

// Load current tracker
const text = fs.readFileSync(TRACKER_PATH, 'utf8').trim();
const lines = text.split(/\r?\n/);
const headers = lines[0].split(',').map(h => h.trim());
const existingJobs = [];
const existingKeys = new Set();

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  const j = {};
  headers.forEach((h, idx) => { j[h] = (cols[idx] || '').trim(); });
  const key = `${(j.company || '').toLowerCase()}_${(j.role || '').toLowerCase()}`;
  existingKeys.add(key);
  existingJobs.push(j);
}

console.log(`Loaded ${existingJobs.length} existing jobs.`);

// Manual QA curated list from verified ATS and direct company portals
const manualJobPostings = [
  {
    company: "Softomatic Technology Services",
    role: "Quality Assurance Engineer - Functional Testing & Manual QA",
    source: "https://www.hirist.tech/j/quality-assurance-engineer-functional-testing-automation-testing-1649422",
    location: "India / Remote",
    notes: "Execute comprehensive manual functional testing, regression test cycles, test case creation, boundary analysis, and defect tracking in JIRA. Work alongside engineering to validate software releases.",
    fit: 96
  },
  {
    company: "Zensar",
    role: "QA Test Engineer - Manual & Functional Testing",
    source: "https://fa-etvl-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3002/job/153176",
    location: "India (Pune / Hybrid)",
    notes: "Responsible for manual test design, test execution, STLC phases, defect identification, and functional validation across enterprise cloud systems and client platforms.",
    fit: 92
  },
  {
    company: "ADV TECHMINDS",
    role: "Senior Manual Tester - Mobile & Functional QA",
    source: "https://www.careers-page.com/freelancer-career/job/L96Y3786",
    location: "Remote",
    notes: "Manual testing of web and mobile applications, creating exploratory test scenarios, participating in Agile sprints, defect logging in JIRA, and UAT sign-offs.",
    fit: 90
  },
  {
    company: "Algoleap Technologies",
    role: "QA Test Engineer (Manual & Functional)",
    source: "https://algoleap.zohorecruit.com/jobs/Careers/660523000150648010",
    location: "India (Bengaluru / Hybrid)",
    notes: "Design, review, and execute manual test cases. Perform functional, integration, smoke, sanity, and regression testing for high-performance software products.",
    fit: 88
  },
  {
    company: "Nasdaq",
    role: "Senior QA Specialist - Functional & Manual Testing",
    source: "https://nasdaq.wd1.myworkdayjobs.com/Global_External_Site/job/India---Bangalore---Karnataka/Senior-Specialist-QA---Functional-Testing--Trading---Clearing-Domain-_R0026973",
    location: "India (Bangalore)",
    notes: "Manual functional testing of mission-critical trading and clearing systems. Execute test plans, author test matrices, verify edge cases, and ensure financial compliance.",
    fit: 88
  },
  {
    company: "GlobalLogic",
    role: "Quality Assurance Engineer - Functional & Regression Testing",
    source: "https://www.hirist.tech/j/quality-assurance-engineer-functional-regression-testing-1682759",
    location: "India (Noida / Gurugram)",
    notes: "Comprehensive manual and functional testing, test scenario design, defect triage in JIRA, regression cycles, and user acceptance testing for enterprise client applications.",
    fit: 86
  },
  {
    company: "Liquidity Services Inc.",
    role: "Manual QA Tester - Web & Platform Applications",
    source: "https://ebwi.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/careers-liquidityservices/job/392",
    location: "Remote / Hybrid",
    notes: "Perform rigorous manual testing across marketplace e-commerce platforms, author detailed defect reproduction steps, and conduct exploratory test sessions.",
    fit: 85
  },
  {
    company: "QAAgility Technologies",
    role: "Manual Test Engineer - Website UI & Functional Testing",
    source: "https://www.hirist.tech/j/manual-test-engineer-website-ui-testing-1659482",
    location: "India (Pune / Remote)",
    notes: "UI/UX manual testing, functional validation, responsive web testing across browsers, test plan development, and bug reporting in JIRA.",
    fit: 85
  },
  {
    company: "Purple Drive",
    role: "QA Manual Test Specialist",
    source: "https://purpledrive.oorwin.com/careers/index.html#/job/details/e86188c948756abad88589d747f6a308fc2c0c0d",
    location: "India / Remote",
    notes: "Full life cycle manual testing, authoring test cases, executing smoke and regression suites, documenting defects, and working closely with developers.",
    fit: 85
  },
  {
    company: "WITS Innovation Lab",
    role: "QA Manual Test Engineer - Functional & Regression Testing",
    source: "https://www.hirist.tech/j/qa-manual-test-engineer-functional-regression-testing-1651010",
    location: "India (Mohali / Chandigarh / Remote)",
    notes: "Manual test engineer located in Tricity / Mohali hub. Executing manual test cases, functional & regression testing, API verification via Postman, and bug triage in JIRA.",
    fit: 89
  },
  {
    company: "Encora",
    role: "QA Functional Engineer - Manual & Exploratory Testing",
    source: "https://job-boards.greenhouse.io/encora10/jobs/5286089007",
    location: "India / Remote",
    notes: "Analyze user stories, author test plans, execute functional manual test cases, isolate tricky edge-case defects, and collaborate on release readiness.",
    fit: 85
  },
  {
    company: "XM",
    role: "Manual QA Tester",
    source: "https://jobs.eu.lever.co/xm/e9e819fd-6719-42e6-b7b8-09ef3e504752",
    location: "Remote",
    notes: "Manual verification of fintech web applications, executing test scenarios, reporting defects with network logs, and ensuring quality before deployment.",
    fit: 80
  },
  {
    company: "Kapres Technology",
    role: "QA Test Engineer (Manual QA)",
    source: "https://kapres.teamtailor.com/jobs/8664659-qa-test-engineer",
    location: "Remote",
    notes: "Quality assurance test engineer focusing on manual exploratory testing, test scenario preparation, and cross-platform verification.",
    fit: 78
  },
  {
    company: "Version 1",
    role: "QA / Test Engineer - Functional Testing",
    source: "https://jobs.smartrecruiters.com/Version1/744000154026761-qa-test-engineer",
    location: "Remote / Hybrid",
    notes: "Execute manual functional test suites, participate in sprint ceremonies, conduct regression cycles, and log bug reports in JIRA.",
    fit: 78
  },
  {
    company: "Linearloop",
    role: "QA Engineer (Manual & Functional Testing)",
    source: "https://www.qajobsboard.com/jobs/qa-engineer-automation-functional-testing-56a45fde",
    location: "India (Ahmedabad / Remote)",
    notes: "Manual functional testing of web and mobile apps, test case writing, smoke and sanity testing, regression coverage, and defect tracking.",
    fit: 78
  }
];

async function run() {
  const newlyAdded = [];

  for (const item of manualJobPostings) {
    const key = `${item.company.toLowerCase()}_${item.role.toLowerCase()}`;
    if (existingKeys.has(key)) {
      console.log(`Skipping existing: ${item.company} - ${item.role}`);
      continue;
    }

    const safeCompany = item.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const isHighFit = item.fit >= 85;
    const status = isHighFit ? 'drafted' : 'discovered';

    let cvFile = '';
    let clFile = '';

    if (isHighFit) {
      const cvRelPath = `cv/main_${safeCompany}_qa.pdf`;
      const clRelPath = `cover_letters/cover_${safeCompany}_qa.pdf`;
      const cvAbsPath = path.join(ROOT, cvRelPath);
      const clAbsPath = path.join(ROOT, clRelPath);

      const highlights = "Manual STLC, Test Case Architecture, Exploratory Testing, Regression & JIRA Defect Lifecycle";

      try {
        const cvHtml = renderCvHtml({ company: item.company, role: item.role, highlights });
        await generatePdfFromHtml(cvHtml, cvAbsPath);

        const clHtml = renderCoverLetterHtml({ company: item.company, role: item.role, highlights });
        await generatePdfFromHtml(clHtml, clAbsPath);

        cvFile = cvRelPath;
        clFile = clRelPath;
        console.log(`✓ Generated tailored CV and Cover Letter PDF for ${item.company}`);
      } catch (err) {
        console.error(`Error generating PDF for ${item.company}:`, err.message);
      }
    }

    const row = {
      date: '2026-11-16',
      company: item.company,
      sector: 'Tech',
      role: item.role,
      role_type: item.location.toLowerCase().includes('remote') ? 'Remote' : 'Full-time',
      channel: 'Direct Career Portal',
      status: status,
      contact_person: '',
      fit_rating: String(item.fit),
      notes: item.notes.replace(/,/g, ' '),
      cv_file: cvFile,
      cover_letter_file: clFile,
      source: item.source,
      deadline: ''
    };

    existingJobs.push(row);
    existingKeys.add(key);
    newlyAdded.push(row);
  }

  // Save back to CSV
  const outLines = [headers.join(',')];
  existingJobs.forEach(j => {
    const r = headers.map(h => (j[h] || '').replace(/,/g, ' '));
    outLines.push(r.join(','));
  });

  fs.writeFileSync(TRACKER_PATH, outLines.join('\n') + '\n', 'utf8');
  console.log(`\n=== Successfully added ${newlyAdded.length} Manual QA positions to tracker! Total positions now: ${existingJobs.length} ===`);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
