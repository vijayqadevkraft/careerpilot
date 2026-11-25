import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllJobs, upsertJobs, isMongoConfigured } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const TRACKER_PATH = path.join(ROOT, 'job_search_tracker.csv');
const SEEN_JOBS_PATH = path.join(ROOT, 'job_scraper', 'seen_jobs.json');
const LOG_PATH = path.join(ROOT, 'tools', 'autopilot.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_PATH, line, 'utf8');
  } catch (e) {}
  console.log(msg);
}

// Candidate Profile Specs
const CANDIDATE = {
  name: "Vijay Kumar",
  title: "Senior QA Engineer / QA Lead (Automation & Manual Testing)",
  experienceYears: 5,
  skills: [
    "Manual Testing",
    "Test Case Design",
    "Functional Testing",
    "Exploratory Testing",
    "Regression Testing",
    "STLC",
    "Defect Lifecycle & JIRA",
    "User Acceptance Testing (UAT)",
    "Smoke & Sanity Testing",
    "Playwright",
    "TypeScript",
    "JavaScript",
    "Java Selenium",
    "CI/CD",
    "GitHub Actions",
    "Jenkins",
    "Postman",
    "API Testing",
    "BrowserStack",
    "QA Leadership"
  ],
  location: "India (Open to Remote / Major Tech Hubs)",
  noticePeriod: "15 days"
};

// Deal-breakers that disqualify a role immediately
const DEAL_BREAKERS = [
  "unpaid",
  "clearance required",
  "us citizenship required",
  "eu citizenship required",
  "onsite in usa",
  "onsite in uk",
  "onsite in germany",
  "10+ years",
  "12+ years",
  "15+ years",
  "c++ kernel",
  "embedded firmware",
  "hardware engineer"
];

export function validateScrapedJob(job) {
  if (!job || !job.company || !job.role || !job.source) return false;
  try {
    const parsed = new URL(job.source);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (EXCLUDED_DOMAINS.some(d => host.includes(d))) return false;
    return true;
  } catch {
    return false;
  }
}

// Domains explicitly excluded per user instructions (all third-party aggregators & job portals)
const EXCLUDED_DOMAINS = [
  'jobleads.',
  'linkedin.com',
  'naukri.com',
  'shine.com',
  'whatjobs.com',
  'adzuna.',
  'monster.com',
  'foundit.in',
  'jobstreet.com',
  'hirist.tech',
  'instahyre.com',
  'justjoin.it',
  'djinni.co',
  'hh.ru',
  'seek.com',
  'cutshort.io',
  'nofluffjobs.com',
  'wellfound.com',
  'itviec.com',
  'pracuj.pl',
  '104.com.tw',
  'jobsdb.com',
  'getonbrd.com',
  'energyjobline.com',
  'dice.com',
  'qajobsboard.com',
  'reed.co.uk',
  'net-empregos.com',
  'mycareersfuture.gov.sg'
];

// Targeted search queries for live tech scraping (both Automation & Manual Testing)
const TARGET_QUERIES = [
  'playwright',
  'playwright typescript',
  'sdet playwright',
  'qa automation playwright',
  'lead qa automation',
  'senior qa engineer',
  'qa lead',
  'manual testing',
  'manual qa tester',
  'qa test engineer',
  'functional testing qa',
  'manual tester',
  'sdet',
  'software tester',
  'api testing qa'
];

// Helper: Read CSV Tracker
function getTrackerJobs() {
  if (!fs.existsSync(TRACKER_PATH)) return [];
  const text = fs.readFileSync(TRACKER_PATH, 'utf8').trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const jobs = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const job = {};
    headers.forEach((h, idx) => {
      job[h] = (cols[idx] || '').trim();
    });
    job.id = `${(job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '')}_${(job.role || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    jobs.push(job);
  }
  return jobs;
}

// Helper: Save CSV Tracker
function saveTrackerJobs(jobs) {
  const headers = ['date', 'company', 'sector', 'role', 'role_type', 'channel', 'status', 'contact_person', 'fit_rating', 'notes', 'cv_file', 'cover_letter_file', 'source', 'deadline', 'posted_date'];
  const lines = [headers.join(',')];
  jobs.forEach(j => {
    const row = headers.map(h => (j[h] || '').replace(/,/g, ' '));
    lines.push(row.join(','));
  });
  fs.writeFileSync(TRACKER_PATH, lines.join('\n') + '\n', 'utf8');
}

// Helper: Seen Jobs
function getSeenJobs() {
  if (!fs.existsSync(SEEN_JOBS_PATH)) return { seen: {} };
  try {
    return JSON.parse(fs.readFileSync(SEEN_JOBS_PATH, 'utf8'));
  } catch (e) {
    return { seen: {} };
  }
}

function saveSeenJobs(data) {
  fs.writeFileSync(SEEN_JOBS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// 5-Dimension Intelligent Fit Scorer
export function scoreJob(job) {
  const text = `${job.title || ''} ${job.notes || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();

  // Check Deal Breakers
  for (const db of DEAL_BREAKERS) {
    if (text.includes(db)) {
      return { score: 0, reason: `Deal-breaker detected: ${db}` };
    }
  }

  let score = 50; // Baseline for QA tech roles
  const highlights = [];

  // Dimension 1: Playwright & Automation (+25)
  if (text.includes('playwright')) {
    score += 15;
    highlights.push('Playwright');
  }
  if (text.includes('typescript') || text.includes('javascript') || text.includes(' ts ') || text.includes(' js ')) {
    score += 10;
    highlights.push('TypeScript/JS');
  }

  // Dimension 1B: Manual Testing & QA Fundamentals (+22)
  const manualKeywords = ['manual', 'functional test', 'test case', 'exploratory', 'regression', 'stlc', 'defect', 'jira', 'uat', 'sanity', 'smoke test', 'test plan', 'black box'];
  const matchedManual = manualKeywords.filter(k => text.includes(k));
  if (matchedManual.length > 0) {
    score += Math.min(22, matchedManual.length * 6);
    highlights.push('Manual & Functional QA');
  }

  // Dimension 2: CI/CD & Automation Gates (+10)
  if (text.includes('ci/cd') || text.includes('pipeline') || text.includes('github actions') || text.includes('jenkins')) {
    score += 10;
    highlights.push('CI/CD Integration');
  }

  // Dimension 3: Leadership & QA Ownership (+10)
  if (text.includes('lead') || text.includes('senior') || text.includes('mentor') || text.includes('strategy')) {
    score += 10;
    highlights.push('Senior/Lead Ownership');
  }

  // Dimension 4: API Testing & Modern QA (+8)
  if (text.includes('api') || text.includes('postman') || text.includes('rest')) {
    score += 8;
    highlights.push('API Testing');
  }

  // Dimension 5: Remote / Hub Location Match (+7)
  if (text.includes('remote') || text.includes('india') || text.includes('mohali') || text.includes('chandigarh') || text.includes('punjab') || text.includes('bengaluru') || text.includes('pune') || text.includes('hyderabad') || text.includes('chennai') || text.includes('gurgaon') || text.includes('noida')) {
    score += 7;
    highlights.push('Location Match');
  }

  const finalScore = Math.min(score, 96);
  return {
    score: finalScore,
    highlights: highlights.join(', ')
  };
}

// Generate Tailored LaTeX CV
function generateTailoredCV(company, role, highlights) {
  const safeCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cvRelPath = `cv/main_${safeCompany}_qa.tex`;
  const cvFullPath = path.join(ROOT, cvRelPath);

  if (fs.existsSync(cvFullPath)) return cvRelPath;

  const cvContent = `%% Tailored CV for ${company} - ${role}
%% Candidate: Vijay Kumar (Senior QA Automation Engineer & Lead)

\\documentclass[11pt,a4paper,sans]{moderncv}
\\moderncvstyle{banking}
\\moderncvcolor{blue}

\\renewcommand*{\\namefont}{\\fontsize{32}{34}\\bfseries\\upshape}
\\colorlet{firstnamecolor}{color1}
\\colorlet{lastnamecolor}{color1}
\\colorlet{namecolor}{color1}
\\renewcommand*{\\sectionstyle}[1]{{\\sectionfont\\color{color1}#1}}

\\usepackage[utf8]{inputenc}
\\ifpdftex\\usepackage[T1]{fontenc}\\fi
\\AtEndPreamble{\\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    filecolor=magenta,
    urlcolor=blue,
    pdftitle={Vijay Kumar - CV (${company})},
    pdfpagemode=UseNone,
}}
\\usepackage[scale=0.82]{geometry}
\\usepackage{import}
\\usepackage{needspace}

\\name{Vijay}{Kumar}
\\address{India}{}{}
\\phone[mobile]{+91 7696122634}
\\email{vijaychuhan007@gmail.com}
\\extrainfo{\\href{https://linkedin.com/in/vijay-007}{linkedin.com/in/vijay-007} \\,|\\, \\href{https://github.com/vijayqadevkraft}{github.com/vijayqadevkraft}}

\\begin{document}
\\makecvtitle

\\vspace{4pt}
\\small{Senior QA Engineer & QA Lead with 5 years of experience combining exhaustive manual testing (STLC, test scenario design, exploratory testing, regression validation) with scalable test automation (Playwright, TypeScript, CI/CD). Proven record slashing defect leakage, leading QA technicians, and ensuring flawless release delivery for enterprise systems. Specifically tailored for \\textbf{${company}}'s ${role} position.}

\\section{Core Competencies}
\\vspace{1pt}
\\begin{itemize}
\\item \\textbf{Manual \\& Functional QA}: Comprehensive STLC, Test Case Architecture, Exploratory Testing, Regression Suites, Boundary Value Analysis, JIRA Defect Lifecycle, UAT.
\\item \\textbf{Playwright \\& Automation}: Modular Playwright framework architecture, Page Object Model (POM), TypeScript, JavaScript, Java Selenium, BrowserStack cross-browser cloud.
\\item \\textbf{CI/CD \\& Quality Gates}: Automated PR test runs, GitHub Actions, Jenkins, API validation (Postman, REST), continuous delivery pipelines.
\\item \\textbf{Leadership \\& Methodologies}: Directed 5 QA technicians, standardized JIRA defect triage, Agile/Scrum sprint coordination, User Acceptance Testing (UAT).
\\item \\textbf{Target Focus for ${company}}: ${highlights || 'Manual and automated test coverage, high defect discovery velocity, robust quality gates.'}
\\end{itemize}

\\section{Professional Experience}
\\vspace{3pt}
\\begin{itemize}

\\needspace{5\\baselineskip}
\\item{\\cventry{Nov 2024 -- Nov 2025}{Software Tester}{XianInfotech LLP}{India}{}{\\vspace{1pt}
\\begin{itemize}
    \\item Designed and executed exhaustive automated and exploratory test suites for mission-critical client deliverables.
    \\item Logged, categorized, and isolated critical defects with detailed network logs and reproduction steps in JIRA.
    \\item Partnered cross-functionally across development teams to accelerate verification cycles and protect live releases.
\\end{itemize}}}

\\vspace{3pt}

\\needspace{5\\baselineskip}
\\item{\\cventry{May 2021 -- May 2024}{Senior QA Engineer}{Devkraft Technologies}{India}{}{\\vspace{1pt}
\\begin{itemize}
    \\item Architected and scaled a modular Playwright + TypeScript test automation framework, slashing regression execution time by 60\\%.
    \\item Integrated automated test suites into CI/CD pipelines (GitHub Actions/Jenkins) to validate pull requests and block defects upstream.
    \\item Led and mentored a team of 5 QA technicians, assigning sprint tasks, conducting code reviews, and driving team velocity.
    \\item Tested enterprise client applications including high-volume portals for HDFC Life and TVS Motor.
\\end{itemize}}}

\\vspace{3pt}

\\needspace{5\\baselineskip}
\\item{\\cventry{Jul 2020 -- Dec 2020}{QA Trainee}{Xornor Software Technologies}{India}{}{\\vspace{1pt}
\\begin{itemize}
    \\item Executed functional test suites, boundary value analysis, and equivalence partitioning on multi-tier applications.
\\end{itemize}}}

\\end{itemize}

\\section{Featured Projects}
\\vspace{1pt}
\\begin{itemize}
\\item \\textbf{Playwright Automation Demo} (\\href{https://github.com/vijayqadevkraft/playwright-demo}{github.com/vijayqadevkraft/playwright-demo}): Production-grade automated testing repo in TypeScript with POM, parallel execution, and CI/CD triggers.
\\item \\textbf{Enterprise Client Testing}: High-stakes financial and customer applications verified under strict compliance guidelines.
\\end{itemize}

\\section{Education}
\\vspace{1pt}
\\begin{itemize}
\\item{\\cventry{}{B.Tech in Computer Science Engineering}{CT Group of Institutions}{India}{}{\\vspace{1pt}
Core Studies: Software Engineering, Testing Methodologies, Object-Oriented Design.
}}
\\end{itemize}

\\section{Languages \\& Availability}
\\vspace{1pt}
\\begin{itemize}
\\item English (Professional proficiency), Hindi (Native), Punjabi (Native).
\\item Notice Period: 15 Days | Availability: Immediate / Short Notice.
\\end{itemize}

\\end{document}
`;

  fs.writeFileSync(cvFullPath, cvContent, 'utf8');
  return cvRelPath;
}

// Generate Tailored Cover Letter
function generateTailoredCoverLetter(company, role, highlights) {
  const safeCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const clRelPath = `cover_letters/cover_${safeCompany}_qa.tex`;
  const clFullPath = path.join(ROOT, clRelPath);

  if (fs.existsSync(clFullPath)) return clRelPath;

  const clContent = `%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Cover Letter - ${company}, ${role}
% Candidate: Vijay Kumar
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\documentclass[]{cover}
\\usepackage{fancyhdr}

\\pagestyle{fancy}
\\fancyhf{}

\\rfoot{Page \\thepage \\hspace{0pt}}
\\thispagestyle{empty}
\\renewcommand{\\headrulewidth}{0pt}
\\begin{document}

\\namesection{}{\\Huge{Vijay Kumar}}{  \\href{mailto:vijaychuhan007@gmail.com}{vijaychuhan007@gmail.com} | [+91 7696122634] |  \\urlstyle{same}\\href{https://www.linkedin.com/in/vijay-007}{LinkedIn} | \\href{https://github.com/vijayqadevkraft}{GitHub}
}

\\currentdate{\\today}
\\lettercontent{Dear Hiring Team at ${company},}

\\lettercontent{I am writing to express my strong enthusiasm for the ${role} position at ${company}. With over 5 years of dedicated quality assurance experience spanning rigorous manual test case design, exploratory testing, scalable Playwright & TypeScript automation, and CI/CD quality gates, I am eager to contribute to ${company}'s software delivery excellence.}

\\lettercontent{Throughout my career, I have focused on driving quality upstream and transforming regression cycles from bottlenecks into agile release accelerators. At Devkraft Technologies and XianInfotech, I drove key QA initiatives with concrete results:}

{\\raggedright\\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}\\fontsize{11pt}{13pt}\\selectfont
\\begin{itemize}
    \\item \\textbf{Manual \\& Functional Testing Excellence:} Formulated exhaustive test plans, boundary value matrices, and edge-case scenarios; collaborated closely with developers to isolate and triage defects in JIRA with zero defect leakage.
    \\item \\textbf{Playwright \\& TypeScript Automation:} Architected a modular Playwright test automation framework using TypeScript that cut regression execution duration by 60\\%, enabling confident continuous releases.
    \\item \\textbf{Continuous CI/CD Quality Gates:} Configured automated testing suites within GitHub Actions and Jenkins pipelines to validate PRs automatically and eliminate flaky regressions before deployment.
    \\item \\textbf{QA Team Leadership:} Guided and mentored 5 QA technicians, standardizing defect workflows in JIRA, authoring test strategies, and facilitating seamless User Acceptance Testing (UAT).
    \\item \\textbf{High-Stakes Systems Delivery:} Successfully verified enterprise-scale web and mobile platforms for major enterprise clients (including HDFC Life and TVS Motor) under rigorous reliability standards.
\\end{itemize}\\par}
\\vspace{6pt}

\\lettercontent{${company}'s engineering reputation and focus on scalable technology align closely with my background. I bring a proactive, owner mindset that pairs hands-on automation expertise with transparent cross-functional collaboration across developers, product managers, and stakeholders.}

\\lettercontent{I welcome the opportunity to discuss how my test automation architecture experience can add immediate value to ${company}'s engineering teams. Thank you for your time and consideration.}

\\lettercontent{I look forward to speaking with you.}

\\begin{flushright}
\\closing{Kind regards,}
\\vspace{6pt}
Vijay Kumar\\\\
Senior QA Automation Engineer \\& Lead
\\end{flushright}

\\end{document}
`;

  fs.writeFileSync(clFullPath, clContent, 'utf8');
  return clRelPath;
}

// Live Tech Scraper (Direct Company Portals, ATS Platforms, Instahyre, Hirist)
export async function fetchLiveTechJobs() {
  const seenUrls = new Set();
  const qualifiedJobs = [];

  for (const query of TARGET_QUERIES) {
    try {
      const apiUrl = `https://freehire.me/api/v1/jobs/search?q=${encodeURIComponent(query)}&limit=30`;
      const res = await fetch(apiUrl);
      if (!res.ok) continue;
      const json = await res.json();
      const items = json?.data || [];

      for (const item of items) {
        const rawUrl = (item.url || '').trim();
        if (!rawUrl) continue;
        const lowerUrl = rawUrl.toLowerCase();

        // 1. Strict Exclusion of LinkedIn, Naukri, and aggregator spam
        if (EXCLUDED_DOMAINS.some(domain => lowerUrl.includes(domain))) continue;

        // 1b. Active recent postings (within 30 days)
        const todayIso = new Date().toISOString().slice(0, 10);
        const postedDate = (item.posted_at || item.created_at || '').slice(0, 10);
        if (postedDate) {
          const postTime = new Date(postedDate).getTime();
          const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
          if (!isNaN(postTime) && (Date.now() - postTime > maxAgeMs)) {
            continue; // Skip postings older than 30 days
          }
        }

        // 2. Clean URL
        const cleanUrl = rawUrl.split('?utm_')[0].split('?ref=')[0];
        if (seenUrls.has(cleanUrl)) continue;
        seenUrls.add(cleanUrl);

        const title = (item.title || '').trim();
        const lowerTitle = title.toLowerCase();

        // 3. Must be relevant QA / SDET / Automation / Test role
        const isQaRole = lowerTitle.includes('qa') ||
                         lowerTitle.includes('test') ||
                         lowerTitle.includes('sdet') ||
                         lowerTitle.includes('quality') ||
                         lowerTitle.includes('automation');
        if (!isQaRole) continue;

        const company = (item.company || 'Tech Company').replace(/^careers\./i, '').trim();
        const cleanDesc = (item.description || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim();

        const jobObj = {
          company,
          title,
          url: cleanUrl,
          location: item.location || 'Remote / India',
          role_type: item.work_mode === 'remote' ? 'Remote' : 'Full-time',
          sector: 'Tech',
          notes: cleanDesc.slice(0, 400),
          cleanDesc,
          posted_date: postedDate || todayIso
        };

        const evalResult = scoreJob({
          title: jobObj.title,
          notes: jobObj.notes,
          description: cleanDesc,
          location: jobObj.location
        });

        jobObj.fit_score = evalResult.score;
        jobObj.highlights = evalResult.highlights;

        if (evalResult.score >= 70) {
          qualifiedJobs.push(jobObj);
        }
      }
    } catch (err) {
      log(`[FETCH ERROR] Query "${query}" failed: ${err.message}`);
    }
  }

  return qualifiedJobs;
}

// Main Autopilot Execution Function
export async function runAutopilot() {
  log("=== Starting CareerPilot Autopilot Hunt & Material Generation ===");

  const trackerJobs = await getAllJobs();
  const seenData = getSeenJobs();
  const existingIds = new Set(trackerJobs.map(j => j.id));
  const existingUrls = new Set(trackerJobs.map(j => (j.source || '').toLowerCase().trim()));

  let newlyDraftedCount = 0;
  let newlyDiscoveredCount = 0;
  const draftedJobs = [];

  // 1. Fetch live jobs dynamically from real job boards & company portals
  log("Scanning live tech job portals & company ATS systems...");
  let liveJobs = [];
  try {
    liveJobs = await fetchLiveTechJobs();
    log(`Fetched ${liveJobs.length} qualified live tech roles (No LinkedIn, No Naukri).`);
  } catch (fetchErr) {
    log(`Live fetch failed, continuing with cached/tracker state: ${fetchErr.message}`);
  }

  // 2. Process each live job
  for (const job of liveJobs) {
    const safeCompany = job.company.toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeRole = job.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const jobId = `${safeCompany}_${safeRole}`;

    const cleanSourceUrl = job.url.toLowerCase().trim();
    if (existingIds.has(jobId) || existingUrls.has(cleanSourceUrl)) {
      continue;
    }

    const fitScore = job.fit_score;
    const highlights = job.highlights;

    // Record in seen_jobs
    seenData.seen[jobId] = {
      company: job.company,
      title: job.title,
      url: job.url,
      fit_rating: fitScore,
      first_seen: new Date().toISOString().slice(0, 10),
      posted_date: job.posted_date || new Date().toISOString().slice(0, 10),
      highlights
    };

    const today = new Date().toISOString().slice(0, 10);
    const postedDate = job.posted_date || today;

    // If fit >= 85, automatically draft application materials (PDF CV + PDF Cover Letter)
    if (fitScore >= 85) {
      log(`[HIGH FIT: ${fitScore}%] Drafting tailored application for ${job.company} - ${job.title}... (Listed: ${postedDate}, Scraped: ${today})`);
      const cvFile = generateTailoredCV(job.company, job.title, highlights);
      const clFile = generateTailoredCoverLetter(job.company, job.title, highlights);

      const safeCompanyFile = job.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const cvPdfRel = `cv/main_${safeCompanyFile}_qa.pdf`;
      const clPdfRel = `cover_letters/cover_${safeCompanyFile}_qa.pdf`;

      try {
        const { renderCvHtml, renderCoverLetterHtml, generatePdfFromHtml } = await import('./generate_pdfs.js');
        await generatePdfFromHtml(renderCvHtml({ company: job.company, role: job.title, highlights: job.notes }), path.join(ROOT, cvPdfRel));
        await generatePdfFromHtml(renderCoverLetterHtml({ company: job.company, role: job.title, highlights: job.notes }), path.join(ROOT, clPdfRel));
      } catch (pdfErr) {
        log(`[PDF WARN] ${pdfErr.message}`);
      }

      const newJob = {
        date: today,
        company: job.company,
        sector: job.sector || 'Tech',
        role: job.title,
        role_type: job.role_type || 'Full-time',
        channel: 'Direct Career Portal',
        status: 'drafted', // Directly into DRAFTED for 1-click submission
        contact_person: '',
        fit_rating: String(fitScore),
        notes: job.notes || `${highlights}. Direct company posting.`,
        cv_file: fs.existsSync(path.join(ROOT, cvPdfRel)) ? cvPdfRel : cvFile,
        cover_letter_file: fs.existsSync(path.join(ROOT, clPdfRel)) ? clPdfRel : clFile,
        source: job.url,
        deadline: '',
        posted_date: postedDate
      };

      trackerJobs.unshift(newJob);
      existingIds.add(jobId);
      existingUrls.add(cleanSourceUrl);
      draftedJobs.push(newJob);
      newlyDraftedCount++;
    } else if (fitScore >= 70) {
      // Fit between 70-84: add to discovered
      const newJob = {
        date: today,
        company: job.company,
        sector: job.sector || 'Tech',
        role: job.title,
        role_type: job.role_type || 'Full-time',
        channel: 'Direct Career Portal',
        status: 'discovered',
        contact_person: '',
        fit_rating: String(fitScore),
        notes: job.notes || `${highlights}.`,
        cv_file: '',
        cover_letter_file: '',
        source: job.url,
        deadline: '',
        posted_date: postedDate
      };

      trackerJobs.push(newJob);
      existingIds.add(jobId);
      existingUrls.add(cleanSourceUrl);
      newlyDiscoveredCount++;
    }
  }

  // Save changes
  if (newlyDraftedCount > 0 || newlyDiscoveredCount > 0) {
    saveTrackerJobs(trackerJobs);
    if (isMongoConfigured()) {
      try {
        await upsertJobs(trackerJobs);
        log(`[DB] Successfully synchronized ${trackerJobs.length} jobs with MongoDB Atlas.`);
      } catch (dbErr) {
        log(`[DB WARNING] MongoDB sync error: ${dbErr.message}`);
      }
    }
    saveSeenJobs(seenData);
    log(`[SUCCESS] Autopilot drafted ${newlyDraftedCount} high-fit roles and discovered ${newlyDiscoveredCount} matching roles.`);
  } else {
    log(`[INFO] Pipeline is up-to-date. No new roles needed drafting.`);
  }

  return {
    success: true,
    newlyDraftedCount,
    newlyDiscoveredCount,
    draftedJobs,
    totalTracked: trackerJobs.length
  };
}

// Allow CLI execution: `node tools/autopilot.js`
if (process.argv[1] && process.argv[1].endsWith('autopilot.js')) {
  runAutopilot()
    .then(res => {
      console.log(`\n⚡ Autopilot finished successfully!`);
      console.log(`Newly Drafted Applications: ${res.newlyDraftedCount}`);
      console.log(`Newly Discovered Roles: ${res.newlyDiscoveredCount || 0}`);
      console.log(`Total Tracked in Pipeline: ${res.totalTracked}`);
    })
    .catch(err => {
      console.error(`Autopilot error:`, err);
      process.exit(1);
    });
}
