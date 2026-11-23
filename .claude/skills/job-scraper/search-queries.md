# Search Queries for Job Scraper - Vijay Kumar

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first. Active country-agnostic CLIs include `freehire-search` (`linkedin-search` disabled).
The `site:` query templates in this file are the **WebSearch fallback** — for portals without a CLI, company career pages, or when a CLI fails.

## Search Sites
Primary:
- **instahyre.com** - High-growth tech and product companies in India
- **wellfound.com** - Tech startups and remote roles
- **freehire.me** - Multi-market ATS aggregator (Greenhouse, Lever, Workday)

Secondary:
- Direct Company career portals and ATS boards (Google search with `site:` filters)

## Query Categories

### Priority 1: Senior QA Engineer / SDET (Playwright & TypeScript)
Matches strongest core automation expertise and framework development background.

```
site:instahyre.com "Playwright" "SDET" OR "QA Automation"
site:wellfound.com "Playwright" "Senior QA" OR "SDET"
"Senior Automation Engineer" "Playwright" "TypeScript" ("Bengaluru" OR "Remote" OR "Pune" OR "Gurugram" OR "Mohali")
site:boards.greenhouse.io "Playwright" "QA" "India" OR "Remote"
site:jobs.lever.co "Playwright" "Senior QA" OR "SDET"
```

### Priority 2: QA Lead / Test Automation Lead
Matches leadership experience (led team of 5 QA technicians, CI/CD and strategy ownership).

```
site:instahyre.com "QA Lead" "Automation"
site:wellfound.com "QA Lead" OR "Lead QA Engineer" "Remote"
"Lead QA Engineer" ("Test Strategy" OR "CI/CD") ("India" OR "Remote")
site:boards.greenhouse.io "QA Lead" OR "Lead SDET"
```

### Priority 3: Mobile & Web Test Automation (Cross-Platform)
Leverages extensive Android, mobile app testing (TVS Motor, Tangibl), and BrowserStack expertise.

```
site:instahyre.com "Senior QA" "BrowserStack" OR "Playwright"
site:wellfound.com "SDET" "Mobile" OR "Web" "Remote"
"Senior QA Engineer" "Playwright" "Mobile" ("Remote" OR "India")
```

### Priority 4: Broader SDET & API Automation Roles
Broader net for software development engineers in test and API testing positions.

```
site:instahyre.com "SDET" "TypeScript" "API Testing"
site:wellfound.com "SDET" "Playwright" "Remote"
"SDET" "Playwright" "API Testing" ("Remote" OR "India")
```

## Location Filter
- **Preferred Locations:** Remote (Global / India), Bengaluru, Hyderabad, Pune, Delhi NCR (Gurugram/Noida), Chandigarh / Mohali.
- **Acceptable:** Hybrid in major Indian tech hubs or 100% Remote.
- **Deal-breaker:** Roles requiring mandatory unassisted relocation to locations without remote flexibility.

## Language Filter
- English (Professional working proficiency) - Primary.
- Hindi / Punjabi - Native / Conversational.

## Date Filter
- Scrape postings from the last 14 days (or active postings with open application windows).
