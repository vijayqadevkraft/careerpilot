import fs from 'fs';
import path from 'path';

const seenJobsPath = path.resolve('job_scraper/seen_jobs.json');
const trackerPath = path.resolve('job_search_tracker.csv');

const initialJobs = [
  {
    company: "CGI",
    title: "Senior Quality Engineer - Automation Testing with TypeScript & Playwright",
    url: "https://www.cgi.com/en/careers",
    location: "Bengaluru, India",
    posted_date: "2026-11-01",
    deadline: "2026-11-30",
    fit: "high",
    fit_rating: 92,
    status: "new",
    portal: "websearch",
    source: "websearch",
    notes: "Requires 5+ yrs QA, strong TypeScript and Playwright, CI/CD with GitHub Actions. Exact profile match."
  },
  {
    company: "NewVision Software & Consultancy",
    title: "Senior Playwright QA Automation Engineer",
    url: "https://newvisionsoftware.com/careers",
    location: "Pune / Hyderabad / Remote, India",
    posted_date: "2026-11-02",
    deadline: "2026-11-30",
    fit: "high",
    fit_rating: 90,
    status: "new",
    portal: "websearch",
    source: "websearch",
    notes: "Requires building Playwright TS framework from scratch, API testing, POM, CI/CD pipeline integration."
  },
  {
    company: "Srv Headhunt Private Limited",
    title: "Senior QA Engineer / QA Engineering Lead",
    url: "https://srvheadhunt.com/jobs",
    location: "Remote, India",
    posted_date: "2026-11-03",
    deadline: "2026-11-28",
    fit: "high",
    fit_rating: 88,
    status: "new",
    portal: "websearch",
    source: "websearch",
    notes: "5+ years driving automation strategy, Playwright web and mobile test suites with JS/TS."
  },
  {
    company: "Codebase",
    title: "Senior QA Automation Engineer",
    url: "https://codebase.com/careers",
    location: "Pune, India (Hybrid)",
    posted_date: "2026-11-02",
    deadline: "2026-11-30",
    fit: "high",
    fit_rating: 86,
    status: "new",
    portal: "websearch",
    source: "websearch",
    notes: "Playwright framework from ground up, SaaS product quality, API and database testing."
  },
  {
    company: "Data Platform Experts",
    title: "QA Engineer – Automation & Playwright",
    url: "https://dataplatformexperts.com/careers",
    location: "Remote",
    posted_date: "2026-11-01",
    deadline: "2026-11-25",
    fit: "high",
    fit_rating: 85,
    status: "new",
    portal: "websearch",
    source: "websearch",
    notes: "Remote QA role focusing on Playwright, TypeScript, and API testing."
  }
];

// Update seen_jobs.json
let seenDoc = { seen: {} };
if (fs.existsSync(seenJobsPath)) {
  try {
    seenDoc = JSON.parse(fs.readFileSync(seenJobsPath, 'utf8'));
  } catch (e) {
    seenDoc = { seen: {} };
  }
}

const today = new Date().toISOString().slice(0, 10);

initialJobs.forEach(job => {
  const key = `${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}_${job.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  seenDoc.seen[key] = {
    ...job,
    first_seen: today
  };
});

fs.writeFileSync(seenJobsPath, JSON.stringify(seenDoc, null, 2), 'utf8');

// Update job_search_tracker.csv
// header: date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source,deadline
let trackerContent = fs.readFileSync(trackerPath, 'utf8').trim();
if (!trackerContent) {
  trackerContent = 'date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source,deadline';
}

const rows = [trackerContent];
initialJobs.forEach(job => {
  const companyClean = job.company.replace(/,/g, ' ');
  const titleClean = job.title.replace(/,/g, ' ');
  const notesClean = job.notes.replace(/,/g, ' ');
  rows.push(`${today},${companyClean},Tech,${titleClean},Full-time,Direct,discovered,,${job.fit_rating},${notesClean},,,${job.url},${job.deadline}`);
});

fs.writeFileSync(trackerPath, rows.join('\n') + '\n', 'utf8');
console.log(`Successfully populated ${initialJobs.length} active jobs into seen_jobs.json and job_search_tracker.csv.`);
