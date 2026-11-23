#!/usr/bin/env node
/**
 * AI Career Agent Assistant CLI
 * Implements the Blueprint for an Intelligent Career Assistant Agent:
 * - Smart Job Matching & Semantic Scoring
 * - Context-Aware Resume Tailoring with Side-by-Side Diff
 * - Pipeline Organization & Follow-up Cadence Reminders
 * - Career Changer / Transferable Skills Translation
 * - Conversational Career Co-Pilot
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

import { 
  analyzeAtsMatch, 
  getInterviewQuestions, 
  generateOutreachMessage, 
  getAutoFillTemplates, 
  generateApplicationStrategy,
  tailorResumeDiff,
  getFollowUpReminders,
  translateTransferableSkills,
  chatWithCareerAgent
} from '../web/ai-toolkit.js';

const TRACKER_PATH = path.join(ROOT, 'job_search_tracker.csv');

function parseTrackerJobs() {
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

function showBanner() {
  console.log(`\x1b[36m========================================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m🤖 AI CAREER AGENT ASSISTANT - PERSONAL JOB CO-PILOT\x1b[0m`);
  console.log(`   Tailored for Vijay Kumar (Senior QA Automation & QA Lead)`);
  console.log(`   Precision Matching • Resume Diff Tailor • Follow-Up Cadence`);
  console.log(`\x1b[36m========================================================================\x1b[0m\n`);
}

function printReminders() {
  const jobs = parseTrackerJobs();
  const res = getFollowUpReminders(jobs);
  
  console.log(`\x1b[1m\x1b[33m📅 ACTIVE PIPELINE & FOLLOW-UP CADENCE\x1b[0m`);
  console.log(`Total Active Applications: ${res.totalActive}`);
  console.log(`Applications Requiring Action: ${res.remindersCount}\n`);

  if (res.reminders.length === 0) {
    console.log(`\x1b[32m✓ All applications are up to date! No immediate follow-ups required.\x1b[0m`);
    return;
  }

  res.reminders.slice(0, 10).forEach((rem, idx) => {
    let badge = `\x1b[34m[INFO]\x1b[0m`;
    if (rem.urgency === 'urgent') badge = `\x1b[31m[URGENT 24H]\x1b[0m`;
    else if (rem.urgency === 'action') badge = `\x1b[35m[READY]\x1b[0m`;
    else if (rem.urgency === 'medium') badge = `\x1b[33m[FOLLOW-UP]\x1b[0m`;

    console.log(`${idx + 1}. ${badge} \x1b[1m${rem.company}\x1b[0m - ${rem.role}`);
    console.log(`   Milestone: \x1b[36m${rem.milestone}\x1b[0m (${rem.urgencyLabel})`);
    console.log(`   Action: ${rem.recommendedAction}`);
    console.log(`   Subject: \x1b[90m${rem.subject}\x1b[0m\n`);
  });
}

function printTailoredDiff(company = "Willware Technologies", role = "Senior QA Automation Engineer", jd = "") {
  console.log(`\x1b[1m\x1b[32m📄 RESUME TAILORING & SIDE-BY-SIDE DIFF FOR ${company.toUpperCase()}\x1b[0m\n`);
  const diff = tailorResumeDiff({
    targetCompany: company,
    targetRole: role,
    jobDescription: jd || "Playwright, TypeScript, CI/CD, Page Object Model, API Testing, QA Leadership"
  });

  console.log(`\x1b[1m1. PROFESSIONAL SUMMARY COMPARISON:\x1b[0m`);
  console.log(`\x1b[90m[ORIGINAL]:\x1b[0m ${diff.summaryDiff.original}`);
  console.log(`\x1b[32m[TAILORED]:\x1b[0m ${diff.summaryDiff.tailored}`);
  console.log(`\x1b[36mKey Alignment:\x1b[0m ${diff.summaryDiff.changeHighlight}\n`);

  console.log(`\x1b[1m2. WORK EXPERIENCE BULLET REALIGNMENT:\x1b[0m`);
  diff.experienceDiff.forEach(exp => {
    console.log(`\n\x1b[1m🏢 ${exp.company} (${exp.period}) - ${exp.title}\x1b[0m`);
    exp.bullets.forEach((b, i) => {
      console.log(`  \x1b[1mBullet ${i + 1} [${b.area}]:\x1b[0m`);
      console.log(`    \x1b[90mOriginal:\x1b[0m ${b.original}`);
      console.log(`    \x1b[32mTailored:\x1b[0m ${b.tailored}`);
      console.log(`    \x1b[35mWhy it works:\x1b[0m ${b.reason}`);
      console.log(`    \x1b[34mKeywords:\x1b[0m ${b.highlightKeywords.join(', ')}`);
    });
  });

  console.log(`\n\x1b[1m3. ATS COMPLIANCE CHECKLIST:\x1b[0m`);
  diff.atsChecklist.forEach(c => {
    console.log(`  \x1b[32m✓\x1b[0m \x1b[1m${c.rule}:\x1b[0m ${c.note}`);
  });
}

function printSkillsTranslation(domain = "manual_qa") {
  console.log(`\x1b[1m\x1b[35m🔄 CAREER CHANGER & TRANSFERABLE SKILLS TRANSLATION\x1b[0m\n`);
  const tr = translateTransferableSkills({ fromDomain: domain, toRole: "sdet" });

  console.log(`\x1b[1mTarget Track: ${tr.title}\x1b[0m [${tr.badge}]`);
  console.log(`Overview: ${tr.overview}\n`);

  console.log(`\x1b[1mSKILL MAPPINGS:\x1b[0m`);
  tr.mappings.forEach((m, idx) => {
    console.log(`${idx + 1}. \x1b[90mFrom:\x1b[0m ${m.from}`);
    console.log(`   \x1b[32mTo:\x1b[0m   ${m.to}`);
    console.log(`   \x1b[36mStrategic Benefit:\x1b[0m ${m.benefit}\n`);
  });

  console.log(`\x1b[1mRESUME PHRASING (BEFORE VS. AFTER):\x1b[0m`);
  tr.resumePhrasing.forEach((rp, idx) => {
    console.log(`${idx + 1}. \x1b[90mBefore:\x1b[0m "${rp.before}"`);
    console.log(`   \x1b[32mAfter:\x1b[0m  "${rp.after}"\n`);
  });

  console.log(`\x1b[1mINTERVIEW SOUNDBITE:\x1b[0m`);
  console.log(`\x1b[33m"${tr.interviewSoundbite}"\x1b[0m\n`);
}

async function runInteractiveChat() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`\x1b[1m\x1b[32m💬 Interactive AI Career Agent Co-Pilot Session Started\x1b[0m`);
  console.log(`Type any career question, paste a JD, or type 'exit' to quit.\n`);

  const promptUser = () => {
    rl.question('\x1b[1m\x1b[36mYou:\x1b[0m ', (input) => {
      const q = input.trim();
      if (!q || q.toLowerCase() === 'exit' || q.toLowerCase() === 'quit') {
        console.log(`\x1b[33mCareer Agent session ended. Keep building momentum!\x1b[0m`);
        rl.close();
        return;
      }

      const res = chatWithCareerAgent({ message: q });
      console.log(`\n\x1b[1m\x1b[35m🤖 Career Agent:\x1b[0m`);
      console.log(res.reply);
      if (res.quickPrompts && res.quickPrompts.length > 0) {
        console.log(`\n\x1b[90mSuggested follow-ups:\x1b[0m ${res.quickPrompts.map(p => `"${p}"`).join(' | ')}\n`);
      } else {
        console.log('');
      }
      promptUser();
    });
  };

  promptUser();
}

// CLI argument handler
const args = process.argv.slice(2);
showBanner();

if (args.includes('--reminders') || args.includes('-r')) {
  printReminders();
} else if (args.includes('--tailor') || args.includes('-t')) {
  const comp = args[1] && !args[1].startsWith('-') ? args[1] : "Willware Technologies";
  const role = args[2] && !args[2].startsWith('-') ? args[2] : "Senior QA Automation Engineer";
  printTailoredDiff(comp, role);
} else if (args.includes('--skills') || args.includes('-s')) {
  const domain = args[1] && !args[1].startsWith('-') ? args[1] : "manual_qa";
  printSkillsTranslation(domain);
} else if (args.includes('--chat') || args.includes('-c')) {
  runInteractiveChat();
} else {
  // Default overview run
  printReminders();
  console.log(`\x1b[36m------------------------------------------------------------------------\x1b[0m`);
  printTailoredDiff("Capgemini", "Playwright Automation");
  console.log(`\x1b[36m------------------------------------------------------------------------\x1b[0m`);
  console.log(`\x1b[1mQuick CLI Commands:\x1b[0m`);
  console.log(`  node tools/career_agent.js --reminders      # Check active application milestones`);
  console.log(`  node tools/career_agent.js --tailor [Co]   # Generate side-by-side resume diff`);
  console.log(`  node tools/career_agent.js --skills        # View transferable skills translations`);
  console.log(`  node tools/career_agent.js --chat          # Start interactive co-pilot session\n`);
  console.log(`Web App with full visual UI running at: \x1b[1m\x1b[32mhttp://localhost:3000\x1b[0m\n`);
}
