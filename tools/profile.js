import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_CLAUDE_PATH = path.join(ROOT, 'CLAUDE.md');

const DEFAULT_PROFILE = {
  name: 'Vijay Kumar',
  firstName: 'Vijay',
  lastName: 'Kumar',
  title: 'Senior QA Automation Engineer / QA Lead / SDET',
  experienceYears: 5,
  noticePeriod: '15 Days',
  location: 'India (Open to Remote / Major Tech Hubs)',
  email: 'vijaychuhan007@gmail.com',
  phone: '+91 7696122634',
  linkedin: 'https://www.linkedin.com/in/vijay-007',
  github: 'https://github.com/vijayqadevkraft',
  demoRepo: 'https://github.com/vijayqadevkraft/playwright-demo',
  skills: [
    'Manual Testing', 'Test Case Design', 'Functional Testing', 'Exploratory Testing',
    'STLC', 'Defect Management', 'JIRA', 'Bug Triage', 'User Acceptance Testing', 'UAT',
    'Smoke Testing', 'Sanity Testing', 'Boundary Value Analysis', 'Regression Testing',
    'Playwright', 'TypeScript', 'JavaScript', 'Java Selenium', 'Page Object Model', 'POM',
    'CI/CD Integration', 'GitHub Actions', 'Jenkins', 'Pipeline Automation', 'Quality Gates',
    'API Testing', 'Postman', 'REST API', 'JSON', 'BrowserStack', 'Cross-browser Testing',
    'E2E Testing', 'QA Team Leadership', 'Mentorship', 'Test Strategy', 'Test Planning',
    'Root Cause Analysis', 'Agile', 'Scrum', 'Prompt Engineering'
  ]
};

function extractField(markdown, label) {
  const re = new RegExp(`^-\\s*\\*\\*${label}:\\*\\*\\s*(.+)$`, 'im');
  const m = markdown.match(re);
  return m ? m[1].trim().replace(/^"|"$/g, '') : null;
}

/**
 * Parse candidate profile from CLAUDE.md as the single source of truth.
 */
export function getCandidateProfile(claudePath = DEFAULT_CLAUDE_PATH) {
  if (!fs.existsSync(claudePath)) {
    return { ...DEFAULT_PROFILE, syncedFrom: 'defaults', raw: '' };
  }

  const raw = fs.readFileSync(claudePath, 'utf8');
  const name = extractField(raw, 'Name') || DEFAULT_PROFILE.name;
  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0] || DEFAULT_PROFILE.firstName;
  const lastName = nameParts.slice(1).join(' ') || DEFAULT_PROFILE.lastName;
  const location = extractField(raw, 'Location') || DEFAULT_PROFILE.location;
  const phone = extractField(raw, 'Phone') || DEFAULT_PROFILE.phone;
  const email = extractField(raw, 'Email') || DEFAULT_PROFILE.email;
  const linkedin = extractField(raw, 'LinkedIn') || DEFAULT_PROFILE.linkedin;
  const github = extractField(raw, 'GitHub') || DEFAULT_PROFILE.github;
  const headline = extractField(raw, 'LinkedIn headline') || extractField(raw, 'Status') || DEFAULT_PROFILE.title;

  const skillLines = [];
  for (const category of ['Primary', 'Secondary', 'Domain', 'Software']) {
    const val = extractField(raw, category);
    if (val) {
      val.split(',').forEach(s => {
        const cleaned = s.replace(/\(.*?\)/g, '').trim();
        if (cleaned && !skillLines.includes(cleaned)) skillLines.push(cleaned);
      });
    }
  }

  const skills = skillLines.length > 0 ? [...new Set([...skillLines, ...DEFAULT_PROFILE.skills])] : DEFAULT_PROFILE.skills;

  return {
    ...DEFAULT_PROFILE,
    name,
    firstName,
    lastName,
    title: headline,
    location,
    phone,
    email,
    linkedin,
    github,
    skills,
    syncedFrom: 'CLAUDE.md',
    raw
  };
}
