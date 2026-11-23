import { scoreJob } from './autopilot.js';

const EXCLUDED_DOMAINS = [
  'linkedin.com',
  'naukri.com',
  'shine.com',
  'whatjobs.com',
  'adzuna.com',
  'monster.com',
  'foundit.in',
  'jobstreet.com'
];

const TARGET_QUERIES = [
  'playwright',
  'playwright typescript',
  'sdet playwright',
  'qa automation playwright'
];

export async function fetchLiveTechJobs() {
  const seenUrls = new Set();
  const qualifiedJobs = [];

  for (const query of TARGET_QUERIES) {
    try {
      const url = `https://freehire.me/api/v1/jobs/search?q=${encodeURIComponent(query)}&limit=30`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const items = json?.data || [];

      for (const item of items) {
        const rawUrl = (item.url || '').trim();
        if (!rawUrl) continue;
        const lowerUrl = rawUrl.toLowerCase();
        
        // Strict exclusion of LinkedIn, Naukri, and aggregator spam
        if (EXCLUDED_DOMAINS.some(domain => lowerUrl.includes(domain))) continue;

        // Clean URL (remove tracking parameters)
        const cleanUrl = rawUrl.split('?utm_')[0].split('?ref=')[0];
        if (seenUrls.has(cleanUrl)) continue;
        seenUrls.add(cleanUrl);

        const title = (item.title || '').trim();
        const lowerTitle = title.toLowerCase();

        // Must be relevant QA / SDET / Automation / Test role
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
          fullText: `${title} ${cleanDesc} ${item.location || ''}`
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
      console.error(`Error querying ${query}:`, err.message);
    }
  }

  // Sort by fit score descending
  qualifiedJobs.sort((a, b) => b.fit_score - a.fit_score);
  return qualifiedJobs;
}

if (process.argv[1] && process.argv[1].endsWith('test_live_fetch.js')) {
  fetchLiveTechJobs().then(jobs => {
    console.log(`\nFound ${jobs.length} qualified QA/SDET jobs (No LinkedIn, No Naukri)!`);
    console.log('Top 5 highest fit:');
    jobs.slice(0, 5).forEach((j, i) => {
      console.log(`\n#${i + 1}: [${j.fit_score}%] ${j.company} - ${j.title}`);
      console.log(`   URL: ${j.url}`);
      console.log(`   Highlights: ${j.highlights}`);
      console.log(`   Location: ${j.location}`);
    });
  });
}
