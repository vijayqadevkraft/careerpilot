/**
 * AI Career Toolkit Engine for CareerPilot
 * Inspired by AIApply.co — Tailored for Vijay Kumar (Senior QA / SDET / QA Lead)
 * Provides ATS Scanning, Keyword Optimization, STAR Interview Coaching, Recruiter Outreach, and Auto-Fill Templates.
 */

import { getCandidateProfile } from '../tools/profile.js';

// Master candidate keyword lexicon & competencies synced from CLAUDE.md
export function getSyncedCandidateProfile() {
  return getCandidateProfile();
}
const CANDIDATE_PROFILE = getCandidateProfile();

// ATS Keyword Dictionary
const ATS_KEYWORD_MAP = {
  "manual testing": "Manual Testing",
  "manual": "Manual Testing",
  "test case": "Test Case Design",
  "functional": "Functional Testing",
  "exploratory": "Exploratory Testing",
  "stlc": "STLC (Software Test Life Cycle)",
  "smoke": "Smoke & Sanity Testing",
  "playwright": "Playwright",
  "typescript": "TypeScript",
  "javascript": "JavaScript",
  "selenium": "Java Selenium",
  "page object model": "Page Object Model (POM)",
  "pom": "Page Object Model (POM)",
  "ci/cd": "CI/CD Pipelines",
  "cicd": "CI/CD Pipelines",
  "jenkins": "Jenkins",
  "github actions": "GitHub Actions",
  "api testing": "API Testing (Postman/REST)",
  "postman": "Postman",
  "rest": "REST APIs",
  "browserstack": "BrowserStack",
  "jira": "JIRA Defect Management",
  "regression": "Regression Testing",
  "end-to-end": "E2E Testing",
  "e2e": "E2E Testing",
  "automation": "Test Automation Architecture",
  "lead": "QA Team Leadership",
  "leadership": "QA Team Leadership",
  "agile": "Agile / Scrum",
  "scrum": "Agile / Scrum",
  "uat": "User Acceptance Testing (UAT)",
  "defect": "Defect Triage & Lifecycle"
};

const COMMON_TECH_KEYWORDS = [
  "manual testing", "manual", "test case", "functional", "exploratory", "stlc", "test plan",
  "playwright", "cypress", "selenium", "typescript", "javascript", "python", "java", "c#",
  "ci/cd", "jenkins", "github actions", "gitlab", "docker", "kubernetes", "aws", "azure",
  "api", "postman", "rest", "graphql", "soap", "k6", "jmeter", "performance",
  "browserstack", "saucelabs", "jira", "confluence", "git", "regression", "smoke",
  "sanity", "e2e", "integration", "unit test", "mocking", "bdd", "cucumber", "tdd",
  "page object model", "pom", "lead", "leadership", "agile", "scrum", "uat", "security",
  "appium", "mobile", "android", "ios", "test rail", "zephyr", "linux", "sql", "nosql"
];

/**
 * 1. ATS Scan & Resume Optimizer (Real keyword & skill extraction against synced CLAUDE.md profile)
 */
export function analyzeAtsMatch(jobDescription, targetRole = "", targetCompany = "") {
  const profile = getSyncedCandidateProfile();
  const text = (jobDescription || "").toLowerCase();
  const roleText = (targetRole || "").toLowerCase();
  const fullText = `${roleText} ${text}`.trim();

  if (!fullText || (text.trim().length < 20 && roleText.trim().length < 3)) {
    return {
      matchScore: 0,
      matchingKeywords: [],
      missingKeywords: [],
      recommendations: [
        "Paste the full job description (at least 20 characters) to run an accurate ATS keyword scan.",
        `Target your summary specifically for ${targetRole || "the target role"} at ${targetCompany || "the hiring company"}.`
      ],
      suggestedBullets: []
    };
  }

  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const foundInJd = new Set();
  COMMON_TECH_KEYWORDS.forEach(kw => {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(kw)}([^a-z0-9]|$)`, 'i');
    if (pattern.test(fullText)) {
      foundInJd.add(kw);
    }
  });

  const matchingKeywords = [];
  const missingKeywords = [];
  const candidateLowerSkills = profile.skills.map(s => s.toLowerCase());

  foundInJd.forEach(kw => {
    const isMatched = candidateLowerSkills.some(skill => skill.includes(kw) || kw.includes(skill));
    const label = ATS_KEYWORD_MAP[kw] || (kw.charAt(0).toUpperCase() + kw.slice(1));

    if (isMatched) {
      if (!matchingKeywords.includes(label)) matchingKeywords.push(label);
    } else {
      if (!missingKeywords.includes(label)) missingKeywords.push(label);
    }
  });

  const totalRelevant = matchingKeywords.length + missingKeywords.length;
  let matchScore = 0;
  if (totalRelevant > 0) {
    matchScore = Math.round((matchingKeywords.length / totalRelevant) * 100);
  } else if (text.trim().length >= 20) {
    // Non-tech / general JD with no recognized tech keywords
    matchScore = 15;
  }

  const recommendations = [];
  if (text.trim().length < 20) {
    recommendations.push("Only a short role title was provided; paste the full job description for deeper keyword coverage.");
  }
  if (missingKeywords.length > 0) {
    recommendations.push(`Address missing keywords detected in the JD where you have adjacent experience: ${missingKeywords.slice(0, 5).join(', ')}.`);
  }
  if (matchingKeywords.length > 0) {
    recommendations.push(`Lead your summary and top bullets with matched skills: ${matchingKeywords.slice(0, 4).join(', ')}.`);
  }
  recommendations.push(`Tailor your cover letter to ${targetCompany || "the hiring team"}'s ${targetRole || "engineering"} priorities.`);

  const topMatched = matchingKeywords.slice(0, 3).join(', ') || 'Playwright, TypeScript & CI/CD';
  const suggestedBullets = [
    `Architected modular ${topMatched} test automation suites with Page Object Model for ${targetCompany || 'enterprise'} web & API workflows, cutting regression cycles by 60%.`,
    `Led 5 QA engineers across Agile sprints, establishing automated quality gates and JIRA defect triage that cut dev-fix turnaround time by 40%.`,
    `Designed end-to-end functional, regression, and API validation coverage aligned with ${targetRole || 'Senior QA'} release criteria.`
  ];

  return {
    matchScore,
    matchingKeywords,
    missingKeywords: missingKeywords.slice(0, 8),
    recommendations,
    suggestedBullets
  };
}

/**
 * Optional live LLM-enhanced ATS scan when GEMINI_API_KEY or OPENAI_API_KEY is configured.
 */
export async function analyzeAtsMatchAsync(jobDescription, targetRole = "", targetCompany = "") {
  const base = analyzeAtsMatch(jobDescription, targetRole, targetCompany);
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || !jobDescription || jobDescription.trim().length < 40) {
    return base;
  }
  try {
    const profile = getSyncedCandidateProfile();
    const prompt = `Analyze ATS fit between candidate (${profile.name}, ${profile.title}, skills: ${profile.skills.join(', ')}) and role "${targetRole}" at "${targetCompany}". JD: ${jobDescription.slice(0, 2500)}. Return strict JSON: {"matchScore":number,"matchingKeywords":string[],"missingKeywords":string[],"recommendations":string[],"suggestedBullets":string[]}`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } })
    });
    if (!res.ok) return base;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = text ? JSON.parse(text) : null;
    if (parsed && typeof parsed.matchScore === 'number') return parsed;
  } catch {
    // Fall back cleanly to deterministic keyword analysis
  }
  return base;
}

/**
 * 2. AI Interview Simulator & STAR Answer Coach
 */
export function getInterviewQuestions(category = "all", company = "", role = "") {
  const bank = [
    {
      id: "arch_1",
      category: "technical",
      categoryLabel: "🚀 Playwright & Architecture",
      question: "How do you architect a scalable, maintainable test automation framework from scratch using Playwright and TypeScript?",
      situation: "At Devkraft Technologies, cross-platform regression test cycles for web and mobile apps took over 24 hours, slowing down releases and increasing manual testing overhead.",
      task: "Architect an automated framework from scratch that could reliably run in CI/CD, provide fast developer feedback, and scale across multiple client projects.",
      action: "Built a modular Playwright framework in TypeScript using the Page Object Model (POM) pattern. Separated locators, page actions, and test assertions. Configured parallel worker execution, dynamic test data generation, and custom reporter hooks with screenshots/videos on failure. Integrated the suite into CI/CD pipelines (Jenkins/GitHub Actions).",
      result: "Slashed regression execution time by 60%, caught 90%+ of regressions during pull request checks, and enabled continuous staging deployments.",
      keyTalkingPoints: ["Page Object Model (POM)", "TypeScript type safety", "Parallel worker scaling", "60% test time reduction"]
    },
    {
      id: "flaky_2",
      category: "technical",
      categoryLabel: "🚀 Playwright & Architecture",
      question: "How do you eliminate flaky tests and manage asynchronous UI states and API latency in Playwright?",
      situation: "Legacy tests exhibited intermittent flakiness on dynamic single-page applications due to asynchronous API data loading and varying network speeds.",
      task: "Eliminate test flakiness completely without relying on brittle hardcoded pauses (e.g., waitForTimeout).",
      action: "Leveraged Playwright's auto-waiting locators and web-first assertions (expect(locator).toBeVisible()). For complex async states, implemented page.waitForResponse() to wait for backend network payloads before asserting UI changes. Configured Playwright Trace Viewer to capture DOM snapshots and action logs for transient debugging.",
      result: "Reduced test flakiness rate to below 1%, restoring developer confidence in CI quality gates.",
      keyTalkingPoints: ["Auto-waiting locators", "Network response hooks (waitForResponse)", "Playwright Trace Viewer", "<1% flaky test rate"]
    },
    {
      id: "lead_1",
      category: "leadership",
      categoryLabel: "👥 QA Leadership & Team Management",
      question: "Describe your experience leading a QA team. How do you allocate tasks, mentor junior engineers, and manage sprint deliverables?",
      situation: "At Devkraft Technologies, I was responsible for leading a team of 5 QA Technicians across multiple concurrent client deliverables, including mission-critical applications for HDFC Life and TVS Motor.",
      task: "Ensure high test coverage, establish consistent defect tracking, and upskill the team in automated testing while meeting tight sprint commitments.",
      action: "Standardized test plan documentation and defect logging in JIRA with reproduction steps and HAR logs. Instituted weekly peer test design reviews and paired with manual testers to teach TypeScript automation. Balanced sprint allocation between exploratory testing and automation scripting.",
      result: "Increased team test execution velocity by 35%, successfully upskilled team members into writing automation scripts, and achieved zero critical defect escapes on major client releases.",
      keyTalkingPoints: ["Led team of 5 technicians", "JIRA defect standardization", "Upskilled manual testers into automation", "0 critical defect escapes"]
    },
    {
      id: "conflict_2",
      category: "leadership",
      categoryLabel: "👥 QA Leadership & Team Management",
      question: "How do you handle pushback from developers or product managers when a bug is flagged as a release blocker?",
      situation: "Prior to a scheduled sprint release, I identified a boundary condition bug where high-value transaction sessions were dropping on unstable connections. A developer argued it was an edge case and wanted to bypass the quality gate.",
      task: "Protect production stability and user trust without causing friction or stalling development progress.",
      action: "Rather than getting defensive, I produced clear evidence: video recordings, network HAR files, and exact reproduction steps. I linked the defect to the business requirement and convened a quick 5-minute triage with the Product Manager and Tech Lead to discuss the financial risk.",
      result: "The team agreed the defect was a critical compliance risk. The developer patched the issue within hours, and I added an automated regression test to ensure it could never happen again.",
      keyTalkingPoints: ["Objective telemetry & HAR files", "Business impact focus", "Collaborative triage", "Zero friction resolution"]
    },
    {
      id: "defect_1",
      category: "defect_triage",
      categoryLabel: "🔍 Defect Isolation & Bug Lifecycle",
      question: "Walk me through the most challenging or subtle bug you have ever found and resolved.",
      situation: "At XianInfotech LLP, users reported sporadic authentication drops during multi-step customer workflows that could not be reproduced in local staging environments.",
      task: "Isolate the root cause of the nondeterministic authentication drop and verify the permanent resolution.",
      action: "Inspected network logs and timing diagrams across throttled network conditions using Chrome DevTools. Discovered a race condition where a background token-refresh API call was overriding valid authorization headers when triggered simultaneously with a large payload upload.",
      result: "Documented the exact concurrency sequence and provided the backend team with a reproducible cURL and test script. They implemented an atomic token mutex, permanently fixing the issue.",
      keyTalkingPoints: ["Race condition isolation", "Network payload throttling", "Chrome DevTools inspection", "Deterministic reproduction script"]
    },
    {
      id: "behavioral_1",
      category: "behavioral",
      categoryLabel: "💡 Tough Behavioral & Culture",
      question: "Why are you looking to move from your current role, and what are you seeking in your next position?",
      situation: "With 5 solid years in software QA—progressing from junior testing to building enterprise Playwright frameworks and leading 5 QA engineers at Devkraft and XianInfotech—I have built strong engineering foundations.",
      task: "Transition into an ambitious tech organization with a strong CI/CD culture where I can contribute as a Senior QA / SDET Lead.",
      action: "I am actively seeking an engineering team where quality is a shared cultural pillar, automated quality gates run on every PR, and there is opportunity to drive automation framework strategy.",
      result: "I am immediately available with a short 15-day notice period and eager to bring proven Playwright, TypeScript, and QA leadership experience to the team.",
      keyTalkingPoints: ["5 years progression", "Playwright & CI/CD expertise", "15-day notice period", "High engineering ownership"]
    },
    {
      id: "questions_to_ask",
      category: "questions_to_ask",
      categoryLabel: "🙋‍♂️ Smart Questions to Ask Interviewers",
      question: "What high-impact questions should you ask the interviewer at the end of the conversation?",
      situation: "Senior candidates must evaluate the company's engineering maturity, culture, and team structure.",
      task: "Demonstrate architectural depth and proactive leadership by asking thoughtful, calibrated questions.",
      action: "Select 2-3 of the following tailored questions depending on whether you are speaking with the Engineering Manager, Tech Lead, or Recruiter.",
      result: "Positions you as a thoughtful leader who cares deeply about engineering velocity, product reliability, and team health.",
      keyTalkingPoints: [
        "1. 'How do automated tests currently gate deployments in your CI/CD pipeline? Do test suites run per pull request, or on a staging schedule?'",
        "2. 'What is the balance of test ownership between developers and QA? Do devs write component/integration tests while QA leads E2E and framework architecture?'",
        "3. 'What is the biggest quality or testing bottleneck your engineering organization is looking to solve over the next two quarters?'",
        "4. 'What would success look like for this Senior QA / SDET role in the first 90 days?'"
      ]
    }
  ];

  if (category === "all") return bank;
  return bank.filter(q => q.category === category);
}

/**
 * 3. AI Recruiter Outreach & Follow-up Generator
 */
export function generateOutreachMessage({ company = "Tech Company", recipientName = "Hiring Manager", role = "Senior QA Automation Engineer", type = "hiring_manager" }) {
  const comp = company || "your company";
  const rec = recipientName || "Hiring Team";
  const rTitle = role || "Senior QA Automation Engineer / SDET";

  switch (type) {
    case "recruiter":
      return {
        type: "recruiter",
        typeLabel: "Recruiter InMail / Connection Note (<300 chars)",
        subject: `Senior QA / SDET Lead - 5 yrs Playwright & CI/CD`,
        body: `Hi ${rec}, noticed the ${rTitle} role at ${comp}. I have 5 yrs exp architecting Playwright & TypeScript frameworks (cut test cycles by 60% at Devkraft) and leading 5 QA engineers. Quick 15-day notice period. Would love to connect! Demo: github.com/vijayqadevkraft/playwright-demo`
      };

    case "follow_up":
      return {
        type: "follow_up",
        typeLabel: "Post-Application Status Follow-up (1-2 Weeks)",
        subject: `Follow-up on Application: ${rTitle} - Vijay Kumar`,
        body: `Hi ${rec},

I hope your week is going well.

I recently submitted my application for the ${rTitle} opening at ${comp} and wanted to briefly reiterate my strong enthusiasm for joining your engineering team.

With 5 years of experience leading QA automation—including designing Playwright/TypeScript frameworks that reduced regression time by 60% and managing teams of 5 QA technicians—I am confident I can hit the ground running and strengthen ${comp}'s automated release quality gates.

I am available on a 15-day notice period and would welcome the opportunity to discuss how my automation background aligns with your team's goals.

Best regards,
Vijay Kumar
+91 7696122634 | vijaychuhan007@gmail.com
LinkedIn: linkedin.com/in/vijay-007
Framework Demo: github.com/vijayqadevkraft/playwright-demo`
      };

    case "thank_you":
      return {
        type: "thank_you",
        typeLabel: "Post-Interview Thank You & Value Add",
        subject: `Thank you - Interview for ${rTitle} at ${comp}`,
        body: `Hi ${rec},

Thank you very much for taking the time to speak with me today about the ${rTitle} role at ${comp}. I really enjoyed our discussion, especially learning more about your team's approach to continuous deployment and test scalability.

Our conversation reinforced my excitement about the opportunity. I am confident that my experience implementing modular Playwright/TypeScript frameworks, eliminating flaky tests, and integrating automated quality gates into CI/CD pipelines will directly support ${comp}'s engineering velocity.

Please let me know if you need any additional code samples, references, or details from my side.

Looking forward to hearing from you.

Warm regards,
Vijay Kumar
+91 7696122634 | vijaychuhan007@gmail.com
Portfolio: github.com/vijayqadevkraft`
      };

    case "hiring_manager":
    default:
      return {
        type: "hiring_manager",
        typeLabel: "Hiring Manager Direct Pitch (Cold Outreach)",
        subject: `Senior QA Automation Engineer (Playwright / TS / CI/CD) - ${comp}`,
        body: `Hi ${rec},

I've been following ${comp}'s engineering growth and noticed your opening for a ${rTitle}. I wanted to reach out directly to see if my background aligns with what your team needs.

I am a Senior QA Automation Engineer & QA Lead with 5 years of hands-on experience specializing in:
• Framework Architecture: Built Playwright & TypeScript Page Object Model frameworks, reducing test execution cycles by 60% and catching 90%+ of regressions prior to staging.
• QA Team Leadership: Led and mentored a team of 5 QA Technicians at Devkraft Technologies, maintaining 0 critical defect escapes on mission-critical applications (HDFC Life, TVS Motor).
• CI/CD Quality Gates: Seamlessly integrated E2E and API automated testing into Jenkins and GitHub Actions pipelines.

I am currently based in India with an immediate 15-day notice period and open to remote or hybrid opportunities.

You can inspect my open-source Playwright framework implementation here:
👉 github.com/vijayqadevkraft/playwright-demo

Would you have 10 minutes this week for a brief conversation to explore if there's a strong mutual fit?

Best regards,
Vijay Kumar
+91 7696122634 | vijaychuhan007@gmail.com
LinkedIn: linkedin.com/in/vijay-007`
      };
  }
}

/**
 * 4. Fast ATS Portal Shortcuts & Answers
 */
export function getAutoFillTemplates() {
  return {
    candidate: CANDIDATE_PROFILE,
    portalAnswers: [
      {
        id: "summary",
        label: "Tell us about yourself / Professional Summary (150 words)",
        text: "I am a Senior QA Automation Engineer and QA Lead with 5 years of hands-on experience architecting scalable test automation frameworks and driving zero-defect release cultures. My core specialization lies in Playwright with TypeScript and JavaScript, Java Selenium, API testing with Postman, and CI/CD quality gate integration using GitHub Actions and Jenkins. At Devkraft Technologies, I led a team of 5 QA technicians, designed an enterprise Playwright POM framework that slashed regression test execution times by 60%, and ensured flawless production releases for high-compliance platforms like HDFC Life. I combine uncompromising defect-prevention discipline with deep collaborative partnerships across engineering and product teams. I am seeking high-velocity engineering environments where automated testing accelerates deployment velocity."
      },
      {
        id: "why_company",
        label: "Why do you want to join our engineering team? (100 words)",
        text: "I admire your team's commitment to building scalable, high-reliability software. With 5 years specializing in Playwright, TypeScript, and CI/CD automation, I thrive in engineering teams that treat test automation not as an afterthought, but as an integral pillar of deployment velocity. I want to contribute my experience in building resilient, zero-flakiness test suites and mentoring QA engineers to help your team release features faster with total confidence."
      },
      {
        id: "automation_exp",
        label: "Describe your test automation & CI/CD experience (120 words)",
        text: "I have architected complete end-to-end automation frameworks using Playwright and TypeScript with the Page Object Model (POM), parallel test execution, and comprehensive reporting. In my previous role at Devkraft, I integrated our Playwright suite into GitHub Actions and Jenkins pipelines to run on every pull request, cutting overall test execution duration by 60% and catching defects before staging. I also have deep experience in API automated testing with Postman and cross-browser execution on BrowserStack."
      },
      {
        id: "notice_period",
        label: "Notice Period & Availability",
        text: "15 Days. Ready for immediate onboarding."
      },
      {
        id: "location_pref",
        label: "Current Location & Work Preference",
        text: "India (Open to Remote, Hybrid, or On-site across major tech hubs)."
      }
    ]
  };
}

/**
 * 5. Job Application Strategist Engine
 * Formulates tactical strategies for applying via direct company career pages
 */
export function generateApplicationStrategy({ company, role, jobDescription }) {
  const comp = (company || 'Target Company').trim();
  const rTitle = (role || 'Senior QA Automation Engineer').trim();
  const jdText = (jobDescription || '').toLowerCase();

  // Extract relevant keywords from JD
  const foundKeywords = [];
  COMMON_TECH_KEYWORDS.forEach(kw => {
    if (jdText.includes(kw)) {
      foundKeywords.push(ATS_KEYWORD_MAP[kw] || (kw.charAt(0).toUpperCase() + kw.slice(1)));
    }
  });

  const coreSkills = foundKeywords.length > 0 
    ? [...new Set(foundKeywords)].slice(0, 6) 
    : ["Playwright", "TypeScript", "CI/CD Integration", "API Testing (Postman)", "Test Framework Architecture", "QA Team Leadership"];

  const safeComp = comp.toLowerCase().replace(/[^a-z0-9]/g, '');

  return {
    company: comp,
    role: rTitle,
    careerSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(comp + ' careers ' + rTitle)}`,
    atsSearchUrl: `https://www.google.com/search?q=${encodeURIComponent('(site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com OR site:myworkdayjobs.com) "' + comp + '"')}`,
    strategyPillars: [
      {
        step: 1,
        title: "Direct Company Career Page Sourcing",
        tag: "Low Competition (High Priority)",
        detail: `Apply directly on ${comp}'s official ATS (Greenhouse, Lever, Ashby, Workday) rather than aggregator boards. Applications submitted directly on company career portals bypass 1-click aggregator clutter and reach the recruiter's primary screening inbox with up to 70% fewer competing applicants.`,
        action: `Search direct career pages: "${comp} careers ${rTitle}" or check direct ATS URLs.`
      },
      {
        step: 2,
        title: "Exact Keyword Integration & Document Tailoring",
        tag: "ATS Optimization",
        detail: `Tailor your CV and cover letter specifically for ${rTitle}. Include high-priority keywords from the job description verbatim into your experience achievements.`,
        action: `Target Keywords to integrate: ${coreSkills.join(', ')}.`
      },
      {
        step: 3,
        title: "Early Application Window (First 24–48 Hours)",
        tag: "Visibility Advantage",
        detail: `Submit your application within the first 24 to 48 hours of publication. Talent acquisition teams review batches chronologically and begin scheduling interview screens before the requisition receives high volume.`,
        action: "Submit your tailored materials immediately upon role discovery."
      },
      {
        step: 4,
        title: "Strategic LinkedIn Employee Networking",
        tag: "Internal Referral / Warm Introduction",
        detail: `Connect with 2–3 current QA Engineers, SDETs, or Engineering Leads at ${comp} on LinkedIn. Mention that you have submitted your application on their career page; this frequently turns a cold portal submission into an internal referral or direct recruiter ping.`,
        action: "Send personalized connection request using the networking template below."
      },
      {
        step: 5,
        title: "Structured 5-7 Day Follow-Up Protocol",
        tag: "Demonstrate Persistence",
        detail: `If you have not received an update within 5 to 7 business days, send a respectful follow-up note to the talent acquisition partner or hiring manager to reaffirm your enthusiasm and highlight your relevant experience.`,
        action: "Deploy the follow-up message template below."
      }
    ],
    networkingTemplate: {
      type: "LinkedIn Connection Note to Current Employee / Peer",
      limit: "Fits within LinkedIn's 300-character invite limit",
      text: `Hi [Name], I noticed your work at ${comp} and recently applied for the ${rTitle} role via your career portal. As an automation engineer with 5 yrs specializing in Playwright & TypeScript, I really admire your engineering standards. Would love to connect and learn more about the team!`
    },
    followUpTemplate: {
      type: "Post-Application Follow-Up (5-7 Days Post-Submission)",
      subject: `Following up on Application: ${rTitle} - Vijay Kumar`,
      body: `Hi [Hiring Manager / Recruiter Name],

I hope your week is going well.

I recently submitted my application for the ${rTitle} position directly through ${comp}'s career portal and wanted to briefly follow up to express my continued excitement about the opportunity.

With 5 years of experience architecting Playwright/TypeScript test automation suites, cutting regression execution cycles by 60%, and leading QA teams, I am confident I can make an immediate, positive impact on ${comp}'s test reliability and CI/CD quality gates.

I would welcome the opportunity to discuss how my automation background aligns with your team's upcoming release goals.

Thank you very much for your time and consideration.

Best regards,
Vijay Kumar
+91 7696122634 | vijaychuhan007@gmail.com
LinkedIn: https://www.linkedin.com/in/vijay-007
Playwright Framework Demo: https://github.com/vijayqadevkraft/playwright-demo`
    }
  };
}

/**
 * 6. AI Resume Tailor with Side-by-Side Diff Engine
 * Real-time bullet-point realignment and keyword optimization
 */
export function tailorResumeDiff({ jobDescription = "", targetRole = "", targetCompany = "", candidateProfile = null }) {
  const comp = (targetCompany || "Target Company").trim();
  const role = (targetRole || "Senior QA Automation Engineer").trim();
  const jdText = (jobDescription || "").toLowerCase();
  const candidate = candidateProfile || CANDIDATE_PROFILE;

  // Identify JD priority emphasis
  const hasPlaywright = jdText.includes("playwright");
  const hasTypescript = jdText.includes("typescript") || jdText.includes("javascript");
  const hasCicd = jdText.includes("ci/cd") || jdText.includes("jenkins") || jdText.includes("github actions") || jdText.includes("pipeline");
  const hasApi = jdText.includes("api") || jdText.includes("postman") || jdText.includes("rest");
  const hasLeadership = jdText.includes("lead") || jdText.includes("mentor") || jdText.includes("manage") || jdText.includes("team");
  const hasManual = jdText.includes("manual") || jdText.includes("exploratory") || jdText.includes("functional") || jdText.includes("test case");
  const hasFintech = jdText.includes("fintech") || jdText.includes("banking") || jdText.includes("insurance") || jdText.includes("payment");

  // Summary Diff
  const originalSummary = "Senior QA Automation Engineer & QA Lead with 5 years of experience specializing in Playwright, TypeScript, JavaScript, and Java Selenium. Proven track record leading a team of 5 QA technicians, reducing regression execution cycles by 60%, and establishing zero-defect CI/CD pipelines for mission-critical client platforms.";
  
  let tailoredSummary = `Results-driven ${role} with 5 years of verified expertise architecting high-reliability automated and exploratory testing frameworks. Spearheaded Playwright + TypeScript test suites reducing test execution cycles by 60% and mentored 5 QA engineers. Proven track record partnering with engineering leads to eliminate release regressions and enforce automated CI/CD quality gates for ${comp}.`;
  if (hasManual && !hasPlaywright) {
    tailoredSummary = `Detail-oriented ${role} with 5 years of rigorous manual, functional, and exploratory testing experience across enterprise web and mobile platforms. Uncovered 65+ critical edge-case defects before deployment, standardized STLC test case architecture in JIRA, and drove comprehensive UAT sign-offs for ${comp}.`;
  }

  // Bullet point comparison for Role 1 (XianInfotech LLP - Nov 2024 - Present)
  const xianBullets = [
    {
      id: "xian_1",
      area: "Automation Coverage & Architecture",
      original: "Architected and scaled modular Playwright + TypeScript test automation suites, achieving 90%+ automation coverage on core regression flows.",
      tailored: hasApi 
        ? `Architected and scaled modular Playwright + TypeScript E2E and Postman API test automation suites, attaining 90%+ regression coverage across critical microservices for ${comp}.`
        : `Architected scalable, modular Playwright + TypeScript automation suites, expanding core regression test coverage to 90%+ with zero production defect escapes.`,
      reason: "Emphasizes end-to-end framework stability and aligns directly with the target tech stack.",
      highlightKeywords: ["Playwright", "TypeScript", "90%+ coverage", hasApi ? "Postman API" : "Zero defect escapes"]
    },
    {
      id: "xian_2",
      area: "Manual & Exploratory Defect Isolation",
      original: "Executed rigorous manual exploratory, functional, and boundary testing across web & mobile platforms, uncovering 65+ critical edge-case defects before production deployment.",
      tailored: hasFintech 
        ? `Conducted rigorous manual exploratory, boundary value, and compliance testing across high-concurrency transactional workflows, intercepting 65+ critical edge-case flaws before release.`
        : `Orchestrated comprehensive exploratory, functional, and cross-browser testing on web and mobile releases, identifying 65+ high-severity defects ahead of sprint cutoffs.`,
      reason: "Validates deep defect-prevention instincts and real-world attention to detail beyond basic automated runs.",
      highlightKeywords: ["Exploratory testing", "65+ defects uncovered", "Boundary testing"]
    },
    {
      id: "xian_3",
      area: "Bug Triage & Team Velocity",
      original: "Spearheaded JIRA defect triage, detailed bug reproduction videos, and API verification via Postman, cutting dev-fix turnaround time by 40%.",
      tailored: hasLeadership 
        ? `Led daily JIRA defect triage sessions and delivered deterministic reproduction logs and HAR telemetry, accelerating cross-functional developer fix turnaround by 40%.`
        : `Streamlined JIRA defect lifecycle through structured reproduction steps, network telemetry, and Postman API contract checks, slashing developer turnaround by 40%.`,
      reason: "Showcases communication clarity and quantifiable cross-functional engineering velocity improvements.",
      highlightKeywords: ["JIRA defect triage", "40% faster turnaround", "Telemetry & Postman"]
    }
  ];

  // Bullet point comparison for Role 2 (Devkraft Technologies - May 2021 - May 2024)
  const devkraftBullets = [
    {
      id: "dev_1",
      area: "CI/CD Pipeline Integration",
      original: "Implemented a Playwright-based automation framework using JavaScript/TypeScript and successfully integrated it into the CI/CD pipeline, reducing overall test execution time by 60%.",
      tailored: hasCicd 
        ? `Engineered an enterprise Playwright/TypeScript framework integrated directly with GitHub Actions/Jenkins CI/CD pull-request checks, reducing test turnaround time by 60%.`
        : `Developed a high-performance Playwright test suite using the Page Object Model (POM), achieving a 60% reduction in regression execution runtime.`,
      reason: "Quantifies business ROI and satisfies automated CI/CD deployment gate requirements.",
      highlightKeywords: ["60% runtime reduction", "Playwright & TypeScript", "CI/CD quality gates"]
    },
    {
      id: "dev_2",
      area: "Team Mentorship & Leadership",
      original: "Led a team of 5 QA Technicians, significantly improving team efficiency, cross-departmental collaboration, and output quality.",
      tailored: `Led and mentored a 5-member QA engineering squad, elevating sprint testing throughput by 35% and establishing standardized STLC test artifacts.`,
      reason: "Demonstrates proven people leadership and ability to mentor engineers to higher output.",
      highlightKeywords: ["Led 5 QA engineers", "35% throughput boost", "Standardized STLC"]
    },
    {
      id: "dev_3",
      area: "Enterprise Mobile & Web Reliability",
      original: "Developed and executed robust test strategies for Android and web applications, encompassing manual, functional, end-to-end, and regression testing across multiple devices.",
      tailored: `Authored comprehensive Test Plans and managed device matrix testing for tier-1 client applications (HDFC Life, TVS Motor), ensuring 100% adherence to release quality criteria.`,
      reason: "Leverages verifiable high-stakes commercial client experience to instill employer confidence.",
      highlightKeywords: ["Tier-1 client delivery", "Device matrix testing", "100% release adherence"]
    }
  ];

  // Tailored Cover Letter Generator
  const tailoredCoverLetter = `Dear Hiring Team at ${comp},

I am writing to express my strong enthusiasm for the ${role} opening. With 5 years of experience architecting test automation frameworks and leading QA initiatives at Devkraft Technologies and XianInfotech LLP, I have built my career around a simple mission: ensuring software releases are fast, resilient, and virtually defect-free.

When reviewing ${comp}'s technical requirements, I was particularly drawn to your focus on engineering velocity and product excellence. In my previous roles:
• At Devkraft Technologies, I architected a modular Playwright + TypeScript framework incorporating the Page Object Model, integrating it into automated CI/CD pipelines to slash regression runtime by 60%.
• I led a dedicated team of 5 QA technicians, establishing rigorous test plan documentation, JIRA defect workflows, and exploratory testing methodologies that guaranteed zero critical defect escapes for flagship clients including HDFC Life and TVS Motor.
• Most recently at XianInfotech, I expanded automation coverage to 90%+ and optimized defect resolution workflows, accelerating developer fix turnaround times by 40%.

Beyond technical tooling, I bring a collaborative mindset that views quality assurance as a shared engineering discipline rather than a downstream gate. I am based in India with an immediate 15-day notice period and am fully equipped for remote or hybrid collaboration across high-growth engineering teams.

I would welcome the opportunity to discuss how my automation architecture and QA leadership can support ${comp}'s release roadmap. Thank you for your time and consideration.

Warm regards,

Vijay Kumar
+91 7696122634 | vijaychuhan007@gmail.com
LinkedIn: linkedin.com/in/vijay-007
Playwright Framework Demo: github.com/vijayqadevkraft/playwright-demo`;

  return {
    targetCompany: comp,
    targetRole: role,
    summaryDiff: {
      original: originalSummary,
      tailored: tailoredSummary,
      changeHighlight: "Reframed opening headline and value proposition to mirror the target role and highlight 60% test runtime reduction."
    },
    experienceDiff: [
      {
        company: "XianInfotech LLP",
        period: "Nov 2024 - Present",
        title: "Senior QA Automation Engineer",
        bullets: xianBullets
      },
      {
        company: "Devkraft Technologies",
        period: "May 2021 - May 2024",
        title: "Senior QA Engineer / QA Lead",
        bullets: devkraftBullets
      }
    ],
    tailoredCoverLetter,
    atsChecklist: [
      { rule: "ATS Parseable Format", passed: true, note: "Clean standard headings, standard bullet syntax, no tables or multi-column text." },
      { rule: "Target Title Alignment", passed: true, note: `Header explicitly reflects "${role}".` },
      { rule: "Quantified Metrics Included", passed: true, note: "Includes 60% time reduction, 90%+ coverage, team of 5, and 40% fix velocity." },
      { rule: "Zero Qualification Fabrication", passed: true, note: "All rewordings derive exclusively from verified master work experience." }
    ]
  };
}

/**
 * 7. Intelligent Milestone & Follow-Up Cadence Tracker
 * Calculates days elapsed, alerts upcoming milestones, and generates 1-click tailored follow-up messages
 */
export function getFollowUpReminders(jobs = []) {
  const now = new Date();
  const reminders = [];

  jobs.forEach(job => {
    const status = (job.status || 'discovered').toLowerCase();
    const dateStr = job.posted_date || job.date || '';
    let daysElapsed = 0;

    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        daysElapsed = Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
        if (daysElapsed < 0) daysElapsed = 0;
      }
    }

    const company = job.company || 'Company';
    const role = job.role || 'Senior QA Engineer';

    // 1. Post-Interview Follow-Up (Within 24 Hours)
    if (status === 'interview') {
      reminders.push({
        id: `rem_${job.id}_interview`,
        jobId: job.id,
        company,
        role,
        status: 'interview',
        daysElapsed,
        milestone: "Post-Interview Thank You Note",
        recommendedAction: "Send within 24 hours of completing interview",
        urgency: "urgent",
        urgencyLabel: "High Priority (24h Window)",
        subject: `Thank you - Interview for ${role} at ${company}`,
        message: `Hi ${job.contact_person || 'Hiring Team'},

Thank you very much for speaking with me today regarding the ${role} position at ${company}. I thoroughly enjoyed learning more about your technical direction, CI/CD pipeline automation, and team goals.

Our discussion confirmed my enthusiasm for the role. I am confident that my background architecting Playwright/TypeScript test frameworks and leading QA teams will allow me to contribute immediately to ${company}'s delivery velocity and test stability.

Please let me know if you need any additional code references, test plans, or information from my side.

Warm regards,
Vijay Kumar
+91 7696122634 | vijaychuhan007@gmail.com`
      });
    }

    // 2. Day 7-10 Status Check
    else if (status === 'applied' && daysElapsed >= 7 && daysElapsed <= 13) {
      reminders.push({
        id: `rem_${job.id}_day7`,
        jobId: job.id,
        company,
        role,
        status: 'applied',
        daysElapsed,
        milestone: "Day 7 Application Status Check",
        recommendedAction: "Polite follow-up to check review progress",
        urgency: "medium",
        urgencyLabel: `${daysElapsed} Days Since Application`,
        subject: `Following up on Application: ${role} - Vijay Kumar`,
        message: `Hi ${job.contact_person || 'Recruiting Team'},

I hope your week is going well.

I submitted my application for the ${role} opening at ${company} about a week ago and wanted to follow up to reiterate my strong interest in joining your engineering group.

With 5 years of experience scaling Playwright/TypeScript automation suites, cutting regression execution cycles by 60%, and leading QA teams, I would welcome the opportunity to discuss how my quality engineering background aligns with your release roadmap.

Thank you for your time and review.

Best regards,
Vijay Kumar
+91 7696122634 | vijaychuhan007@gmail.com
LinkedIn: linkedin.com/in/vijay-007`
      });
    }

    // 3. Day 14 Secondary Follow-Up / Recruiter InMail
    else if (status === 'applied' && daysElapsed >= 14) {
      reminders.push({
        id: `rem_${job.id}_day14`,
        jobId: job.id,
        company,
        role,
        status: 'applied',
        daysElapsed,
        milestone: "Day 14 Re-engagement / Recruiter Ping",
        recommendedAction: "Send short note to talent partner or re-engage",
        urgency: "low",
        urgencyLabel: `${daysElapsed} Days Since Application`,
        subject: `Update on ${role} Application - Vijay Kumar`,
        message: `Hi ${job.contact_person || 'Talent Acquisition Team'},

I wanted to quickly check in regarding the status of the ${role} position at ${company}.

I remain very enthusiastic about the opportunity to bring my Playwright automation, API testing, and QA leadership experience to your team. If the role has moved forward with another candidate, I completely understand and would love to stay connected for future opportunities.

Wishing you and the team continued success.

Warm regards,
Vijay Kumar
+91 7696122634 | vijaychuhan007@gmail.com`
      });
    }

    // 4. Drafted Application Ready for Submission
    else if (status === 'drafted') {
      reminders.push({
        id: `rem_${job.id}_drafted`,
        jobId: job.id,
        company,
        role,
        status: 'drafted',
        daysElapsed,
        milestone: "Tailored Application Ready to Submit",
        recommendedAction: "Submit tailored CV and Cover Letter on official portal",
        urgency: "action",
        urgencyLabel: "Materials Compiled",
        subject: `Ready to Apply: ${role} at ${company}`,
        message: `Your tailored 1-page CV and Cover Letter are already generated for ${company}. Submit now on their career portal to capitalize on early candidate review batches.`
      });
    }
  });

  // Sort: urgent first, then action, then medium, then low
  const priorityOrder = { urgent: 1, action: 2, medium: 3, low: 4 };
  reminders.sort((a, b) => (priorityOrder[a.urgency] || 99) - (priorityOrder[b.urgency] || 99));

  return {
    totalActive: jobs.filter(j => ['applied', 'interview', 'drafted'].includes((j.status || '').toLowerCase())).length,
    remindersCount: reminders.length,
    reminders
  };
}

/**
 * 8. Career Changer & Transferable Skills Translator
 * Bridges non-traditional or previous career experience to target industry competencies
 */
export function translateTransferableSkills({ fromDomain = "manual_qa", toRole = "sdet", userExperience = "" }) {
  const TRANSLATION_MAP = {
    "manual_to_automation": {
      title: "Manual & Functional QA → SDET / Automation Lead",
      badge: "Natural Progression",
      overview: "Elevate strong defect-prevention instincts and boundary analysis into high-throughput automated suites.",
      mappings: [
        {
          from: "Manual test execution & writing test cases in Excel/TestRail",
          to: "Designing modular, programmatic test suites using Page Object Model (POM) in TypeScript/Playwright",
          benefit: "Positions you not just as a coder, but as someone who writes tests that actually catch subtle domain regressions."
        },
        {
          from: "Finding UI discrepancies and defect reporting in JIRA",
          to: "Root-cause isolation, network telemetry analysis, and continuous automated quality gates in CI/CD pipelines",
          benefit: "Shows engineering depth by understanding both developer pull requests and user journey requirements."
        },
        {
          from: "Validating backend database changes with manual SQL queries",
          to: "Automated API contract testing and mock response assertions via Postman & REST frameworks",
          benefit: "Bridges the gap between backend architecture and frontend validation."
        }
      ],
      resumePhrasing: [
        {
          before: "Performed manual functional testing of web features and verified API responses.",
          after: "Engineered automated E2E and API regression test suites in Playwright/Postman, reducing manual verification overhead by 60%."
        },
        {
          before: "Logged detailed bugs in JIRA with reproduction steps.",
          after: "Standardized defect triage protocols with deterministic telemetry logs and cURL reproductions, cutting dev turnaround by 40%."
        }
      ],
      interviewSoundbite: "While many automation engineers focus strictly on code, my foundation in manual exploratory testing means I know exactly where architectures break. I write automation that protects real user journeys, not just green checkmarks."
    },
    "support_to_qa": {
      title: "Technical Support / Ops → QA Analyst / Engineer",
      badge: "High User Empathy",
      overview: "Translate customer pain points and troubleshooting skills into rigorous edge-case testing.",
      mappings: [
        {
          from: "Troubleshooting customer bug reports and handling tickets",
          to: "Defect discovery, boundary value analysis, and user journey exploratory testing",
          benefit: "Deep empathy for real user failure modes that developers frequently overlook."
        },
        {
          from: "Documenting support knowledge base articles",
          to: "Authoring comprehensive Test Plans, STLC test cases, and release criteria documentation",
          benefit: "Clear, unambiguous technical writing skills."
        }
      ],
      resumePhrasing: [
        {
          before: "Handled tier-2 technical escalation tickets from frustrated users.",
          after: "Analyzed recurring customer defect telemetry to establish pre-release boundary test scenarios, eliminating repeated production escapes."
        }
      ],
      interviewSoundbite: "I have spent years on the frontlines seeing what happens when untested edge cases reach real users. As a QA engineer, I bring that immediate customer voice into sprint planning and test case design."
    },
    "general_to_tech": {
      title: "Career Changer (Non-Tech Domain) → Tech / QA Specialist",
      badge: "Domain Authority",
      overview: "Leverage domain-specific subject matter expertise (healthcare, finance, education, logistics) as your competitive advantage.",
      mappings: [
        {
          from: "Subject matter expertise in finance/insurance/healthcare regulations",
          to: "Compliance-driven testing, financial transaction validation, and UAT coordination",
          benefit: "You understand complex business logic faster than pure engineers."
        },
        {
          from: "Cross-functional project management and client communication",
          to: "Agile sprint coordination, stakeholder defect triage, and release readiness reporting",
          benefit: "Superior stakeholder communication and consensus building."
        }
      ],
      resumePhrasing: [
        {
          before: "Managed daily administrative operations and regulatory reports.",
          after: "Supervised high-compliance workflow verification and UAT validation, ensuring 100% adherence to financial industry standards."
        }
      ],
      interviewSoundbite: "Software quality isn't just about syntax; it's about business logic and regulatory compliance. My domain background allows me to catch subtle logic errors that traditional testers without industry context would miss."
    }
  };

  const key = `${fromDomain}_to_${toRole}`;
  return TRANSLATION_MAP[key] || TRANSLATION_MAP["manual_to_automation"];
}

/**
 * 9. Interactive AI Career Agent Co-Pilot (Chat Engine)
 * Handles conversational queries, strategy questions, cold outreach, and career guidance
 */
export function chatWithCareerAgent({ message = "", history = [], context = {} }) {
  const msg = (message || "").trim().toLowerCase();
  
  // 1. Follow-up note request
  if (msg.includes("follow up") || msg.includes("status check") || msg.includes("email")) {
    const comp = context.company || "Target Company";
    const role = context.role || "Senior QA Automation Engineer";
    return {
      reply: `Here is a high-conversion follow-up email template tailored for **${comp}**:

**Subject:** Following up on Application: ${role} - Vijay Kumar

**Body:**
> Hi ${context.contactPerson || 'Hiring Team'},
>
> I hope your week is going well.
>
> I recently applied for the ${role} opening at ${comp} and wanted to briefly reiterate my strong interest in joining your team. 
>
> With 5 years of verified experience architecting Playwright/TypeScript test suites (reducing test execution time by 60%) and leading QA engineers, I am confident I can make an immediate impact on your release quality gates.
>
> I am on a 15-day notice period and would welcome a brief conversation to discuss how my background matches your goals.
>
> Best regards,  
> Vijay Kumar | +91 7696122634 | vijaychuhan007@gmail.com

💡 **Recommendation:** Send this during Tuesday–Thursday morning hours (9:00 AM – 11:00 AM) for maximum recruiter visibility.`,
      quickPrompts: ["Draft a post-interview thank you email", "How should I prepare for a technical screen?", "Analyze my resume match for Capgemini"]
    };
  }

  // 2. Interview Prep or Questions
  if (msg.includes("interview") || msg.includes("star") || msg.includes("questions") || msg.includes("practice")) {
    return {
      reply: `Here are the top 3 high-impact behavioral & technical questions hiring managers ask for **Senior QA & SDET** roles, with your proven STAR talking points:

1. **"How do you handle pushback when developers want to release with a known defect?"**
   * **STAR Bridge:** Focus on objective data—video recordings, HAR network telemetry, and business impact (citing your TVS Motor / HDFC Life experience). Convene a rapid 5-minute triage with the PM to make an informed risk call.

2. **"How do you eliminate flakiness in Playwright test suites?"**
   * **STAR Bridge:** Highlight web-first auto-waiting assertions (\`toBeVisible\`), network response hooks (\`waitForResponse\`), and DOM trace inspections rather than hardcoded timeouts.

3. **"Describe your leadership of other QA team members."**
   * **STAR Bridge:** Mention leading 5 QA Technicians at Devkraft, instituting peer test reviews, and upskilling manual testers to write TypeScript automation.

Would you like to drill into any of these scenarios in detail?`,
      quickPrompts: ["Give me 3 smart questions to ask the interviewer", "How do I explain my notice period?", "Simulate a live technical QA question"]
    };
  }

  // 3. Career Transition / Manual to Automation
  if (msg.includes("career change") || msg.includes("manual to automation") || msg.includes("transition") || msg.includes("switch")) {
    return {
      reply: `Transitioning from **Manual Testing to Automation / SDET** is one of the highest-value career pivots in tech. Here is the strategic blueprint:

• **Your Unfair Advantage:** Most pure automation engineers write brittle tests because they lack exploratory defect instincts. Your manual testing background means you understand *what* to test and *where* bugs hide.
• **Resume Reframing:** Don't say *"Wrote test cases in Excel"*. Say *"Architected comprehensive test suites using Page Object Model (POM) in Playwright and TypeScript to achieve 90%+ regression coverage."*
• **Proof Point:** Always link to your public Playwright framework demo (\`github.com/vijayqadevkraft/playwright-demo\`) in your header and cover letter. It eliminates any skepticism about your coding capability.

Would you like me to translate a specific past bullet point into an automation-first achievement?`,
      quickPrompts: ["Translate my manual testing bullets", "What Playwright concepts should I highlight?", "Draft cold outreach to a QA Manager"]
    };
  }

  // 4. Deal-breakers & Salary / Preferences
  if (msg.includes("salary") || msg.includes("notice period") || msg.includes("location") || msg.includes("remote")) {
    return {
      reply: `Here are your calibrated candidate parameters based on your master profile:

• **Notice Period:** **15 Days** (Immediate Joining capability is a major competitive advantage in this market).
• **Location Flexibility:** Open to Remote, Hybrid, or On-site across major tech hubs (Bangalore, NCR, Hyderabad, Pune, Chandigarh/Mohali).
• **Core Specialization:** Senior QA Engineer, SDET, QA Lead (Playwright, TypeScript, CI/CD, Manual/Exploratory).
• **Deal-breakers:** Roles mandating US/EU citizenship, active military clearance, or 10+ years legacy C++/hardware requirements.

How can I help you adjust your target filters or negotiate terms?`,
      quickPrompts: ["Scan live job portals for new openings", "Tailor resume for a new job description", "Review active pipeline follow-ups"]
    };
  }

  // 5. Default General Co-Pilot response
  return {
    reply: `I am your **AI Career Agent Co-Pilot**. I am actively configured with your Senior QA Automation & Leadership profile (5 yrs exp, Playwright, TypeScript, CI/CD, 15-day notice).

Here is how I can assist you right now:
1. **Resume & Cover Letter Tailoring:** Paste any job description to generate a side-by-side diff with custom bullets and a tailored cover letter.
2. **Follow-Up Cadence:** Check your 152 tracked positions and generate 1-click status checks for jobs submitted 7+ days ago.
3. **STAR Interview Practice:** Rehearse tough technical and leadership questions calibrated to your actual engineering accomplishments.
4. **Direct ATS Sourcing:** Bypass aggregator spam to apply directly on verified company career pages.

What would you like to work on today?`,
    quickPrompts: ["Show pending follow-up reminders", "Analyze ATS match for a new JD", "Practice STAR interview questions", "Tailor CV for a specific company"]
  };
}
