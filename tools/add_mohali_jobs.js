import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const trackerPath = path.join(ROOT, 'job_search_tracker.csv');

const newJobs = [
  {
    company: 'Wits Innovation Lab',
    role: 'Senior QA Automation Engineer (Playwright)',
    sector: 'Tech',
    role_type: 'Full-time (Mohali)',
    channel: 'Company Portal',
    status: 'drafted',
    contact_person: 'Talent Acquisition Team',
    fit_rating: '96',
    notes: 'Playwright TypeScript Java Selenium Postman API Testing CI/CD Mohali/Kharar IT Hub',
    source: 'https://witslab.com/careers',
    deadline: '2026-12-15'
  },
  {
    company: 'Closeloop Technologies',
    role: 'SDET / QA Automation Engineer (Playwright & TypeScript)',
    sector: 'Tech',
    role_type: 'Full-time (Mohali)',
    channel: 'Company Portal',
    status: 'drafted',
    contact_person: 'Talent Team',
    fit_rating: '96',
    notes: 'Playwright TypeScript Page Object Model API Testing Agile Mohali Phase 8B',
    source: 'https://closeloop.com/careers',
    deadline: '2026-12-15'
  },
  {
    company: 'Debut Infotech',
    role: 'QA Automation Engineer (Playwright / API)',
    sector: 'Tech',
    role_type: 'Full-time (Mohali)',
    channel: 'Direct Career Page',
    status: 'drafted',
    contact_person: 'Hiring Manager',
    fit_rating: '94',
    notes: 'Playwright API Automation JIRA Regression Testing Mohali IT Corridor',
    source: 'https://www.debutinfotech.com/careers',
    deadline: '2026-12-20'
  },
  {
    company: 'Priority Technology Holdings',
    role: 'Lead SDET - Automation & DevOps Quality Gates',
    sector: 'Tech',
    role_type: 'Hybrid (Mohali/Chandigarh)',
    channel: 'Company ATS',
    status: 'drafted',
    contact_person: 'Talent Acquisition Partner',
    fit_rating: '95',
    notes: 'QA Leadership Playwright/Selenium CI/CD Pipelines Azure DevOps Chandigarh/Mohali',
    source: 'https://prth.com/careers',
    deadline: '2026-12-10'
  }
];

let existingText = fs.readFileSync(trackerPath, 'utf8').trim();
let lines = existingText ? existingText.split(/\r?\n/) : [];
const today = new Date().toISOString().split('T')[0];

newJobs.forEach(j => {
  const safeComp = j.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cvRel = `cv/main_${safeComp}_qa.tex`;
  const clRel = `cover_letters/cover_${safeComp}_qa.tex`;
  const cvPath = path.join(ROOT, cvRel);
  const clPath = path.join(ROOT, clRel);

  if (!fs.existsSync(cvPath)) {
    fs.writeFileSync(cvPath, `% Tailored CV for ${j.company} - ${j.role}\n`, 'utf8');
  }
  if (!fs.existsSync(clPath)) {
    fs.writeFileSync(clPath, `% Tailored Cover Letter for ${j.company} - ${j.role}\n`, 'utf8');
  }

  const row = [
    today,
    j.company,
    j.sector,
    j.role,
    j.role_type,
    j.channel,
    j.status,
    j.contact_person,
    j.fit_rating,
    j.notes,
    cvRel,
    clRel,
    j.source,
    j.deadline
  ].join(',');

  lines.push(row);
});

fs.writeFileSync(trackerPath, lines.join('\n') + '\n', 'utf8');
console.log(`Successfully added ${newJobs.length} Mohali jobs into ${trackerPath}!`);
