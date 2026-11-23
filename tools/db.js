import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const TRACKER_PATH = path.join(ROOT, 'job_search_tracker.csv');
const DB_NAME = process.env.MONGODB_DB || 'careerpilot';
const COLLECTION_NAME = 'jobs';

let cachedClient = null;
let cachedPromise = null;

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
}

export async function getMongoClient() {
  if (!isMongoConfigured()) return null;

  if (cachedClient) return cachedClient;

  if (!cachedPromise) {
    const uri = process.env.MONGODB_URI.trim();
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    cachedPromise = client.connect().then(c => {
      cachedClient = c;
      return c;
    }).catch(err => {
      cachedPromise = null;
      console.error('[DB] MongoDB connection error:', err.message);
      throw err;
    });
  }

  return cachedPromise;
}

export async function getJobsCollection() {
  const client = await getMongoClient();
  if (!client) return null;
  const db = client.db(DB_NAME);
  return db.collection(COLLECTION_NAME);
}

// Helper: Parse CSV Tracker
export function parseTrackerCSV() {
  if (!fs.existsSync(TRACKER_PATH)) return [];
  const text = fs.readFileSync(TRACKER_PATH, 'utf8').trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const jobs = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');
    const job = {};
    headers.forEach((h, idx) => {
      job[h] = (cols[idx] || '').trim();
    });

    job.id = `${(job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '')}_${(job.role || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (!job.posted_date) {
      job.posted_date = job.date || new Date().toISOString().slice(0, 10);
    }
    jobs.push(job);
  }
  return jobs;
}

// Helper: Save CSV Tracker
export function saveTrackerCSV(jobs) {
  try {
    const headers = ['date', 'company', 'sector', 'role', 'role_type', 'channel', 'status', 'contact_person', 'fit_rating', 'notes', 'cv_file', 'cover_letter_file', 'source', 'deadline', 'posted_date'];
    const lines = [headers.join(',')];
    jobs.forEach(j => {
      const row = headers.map(h => (j[h] || '').replace(/,/g, ' '));
      lines.push(row.join(','));
    });
    fs.writeFileSync(TRACKER_PATH, lines.join('\n') + '\n', 'utf8');
  } catch (err) {
    // If running in a read-only serverless environment (e.g. Vercel), catch gracefully
    console.warn('[DB] Could not write to local CSV (read-only environment):', err.message);
  }
}

// GET all jobs
export async function getAllJobs() {
  if (isMongoConfigured()) {
    try {
      const col = await getJobsCollection();
      if (col) {
        const docs = await col.find({}).sort({ posted_date: -1, date: -1 }).toArray();
        if (docs.length > 0) {
          return docs.map(d => {
            const { _id, ...rest } = d;
            return rest;
          });
        }
      }
    } catch (err) {
      console.warn('[DB] MongoDB fetch failed, falling back to CSV:', err.message);
    }
  }

  return parseTrackerCSV();
}

// GET single job by ID
export async function getJobById(id) {
  if (isMongoConfigured()) {
    try {
      const col = await getJobsCollection();
      if (col) {
        const doc = await col.findOne({ id });
        if (doc) {
          const { _id, ...rest } = doc;
          return rest;
        }
      }
    } catch (e) {}
  }

  const jobs = parseTrackerCSV();
  return jobs.find(j => j.id === id) || null;
}

// UPDATE job status
export async function updateJobStatus(id, status) {
  let updatedJob = null;

  if (isMongoConfigured()) {
    try {
      const col = await getJobsCollection();
      if (col) {
        const res = await col.findOneAndUpdate(
          { id },
          { $set: { status, updatedAt: new Date().toISOString() } },
          { returnDocument: 'after' }
        );
        if (res) {
          const { _id, ...rest } = res;
          updatedJob = rest;
        }
      }
    } catch (err) {
      console.warn('[DB] MongoDB update status failed:', err.message);
    }
  }

  // Also sync with local CSV if writeable
  try {
    const jobs = parseTrackerCSV();
    const job = jobs.find(j => j.id === id);
    if (job) {
      job.status = status;
      saveTrackerCSV(jobs);
      if (!updatedJob) updatedJob = job;
    }
  } catch (e) {}

  return updatedJob;
}

// UPDATE job url/source
export async function updateJobUrl(id, source) {
  let updatedJob = null;

  if (isMongoConfigured()) {
    try {
      const col = await getJobsCollection();
      if (col) {
        const res = await col.findOneAndUpdate(
          { id },
          { $set: { source: source.trim(), updatedAt: new Date().toISOString() } },
          { returnDocument: 'after' }
        );
        if (res) {
          const { _id, ...rest } = res;
          updatedJob = rest;
        }
      }
    } catch (err) {
      console.warn('[DB] MongoDB update URL failed:', err.message);
    }
  }

  try {
    const jobs = parseTrackerCSV();
    const job = jobs.find(j => j.id === id);
    if (job) {
      job.source = source.trim();
      saveTrackerCSV(jobs);
      if (!updatedJob) updatedJob = job;
    }
  } catch (e) {}

  return updatedJob;
}

// ADD new job
export async function addJob(jobData) {
  const today = new Date().toISOString().slice(0, 10);
  const newJob = {
    date: jobData.date || today,
    company: jobData.company || 'Unknown',
    sector: jobData.sector || 'Tech',
    role: jobData.role || 'Senior QA Engineer',
    role_type: jobData.role_type || 'Full-time',
    channel: jobData.channel || 'Direct',
    status: jobData.status || 'discovered',
    contact_person: jobData.contact_person || '',
    fit_rating: jobData.fit_rating || '85',
    notes: jobData.notes || '',
    cv_file: jobData.cv_file || '',
    cover_letter_file: jobData.cover_letter_file || '',
    source: jobData.source || '',
    deadline: jobData.deadline || '',
    posted_date: jobData.posted_date || today
  };
  newJob.id = jobData.id || `${(newJob.company || '').toLowerCase().replace(/[^a-z0-9]/g, '')}_${(newJob.role || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  if (isMongoConfigured()) {
    try {
      const col = await getJobsCollection();
      if (col) {
        await col.updateOne({ id: newJob.id }, { $set: newJob }, { upsert: true });
      }
    } catch (err) {
      console.warn('[DB] MongoDB addJob failed:', err.message);
    }
  }

  try {
    const jobs = parseTrackerCSV();
    jobs.unshift(newJob);
    saveTrackerCSV(jobs);
  } catch (e) {}

  return newJob;
}

// BULK UPSERT jobs (Used by Autopilot and Scrapers)
export async function upsertJobs(jobsList) {
  if (!jobsList || jobsList.length === 0) return { inserted: 0, updated: 0 };

  let mongoCount = 0;
  if (isMongoConfigured()) {
    try {
      const col = await getJobsCollection();
      if (col) {
        const operations = jobsList.map(j => ({
          updateOne: {
            filter: { id: j.id },
            update: { $set: { ...j, updatedAt: new Date().toISOString() } },
            upsert: true
          }
        }));
        const res = await col.bulkWrite(operations, { ordered: false });
        mongoCount = (res.upsertedCount || 0) + (res.modifiedCount || 0);
      }
    } catch (err) {
      console.warn('[DB] MongoDB bulk upsert failed:', err.message);
    }
  }

  // Also sync to CSV
  try {
    const existing = parseTrackerCSV();
    const existingMap = new Map(existing.map(j => [j.id, j]));
    jobsList.forEach(j => {
      existingMap.set(j.id, { ...existingMap.get(j.id), ...j });
    });
    saveTrackerCSV(Array.from(existingMap.values()));
  } catch (e) {}

  return { count: mongoCount || jobsList.length };
}

// GET Daily Analytics
export async function getDailyAnalytics() {
  const jobs = await getAllJobs();
  const dailyMap = {};
  jobs.forEach(j => {
    const d = j.date || 'Unknown';
    if (!dailyMap[d]) {
      dailyMap[d] = { date: d, count: 0, drafted: 0, applied: 0, highFit: 0 };
    }
    dailyMap[d].count++;
    if (j.status === 'drafted') dailyMap[d].drafted++;
    if (j.status === 'applied') dailyMap[d].applied++;
    if (parseInt(j.fit_rating || '0', 10) >= 90) dailyMap[d].highFit++;
  });
  const dailyScrapes = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
  return { total: jobs.length, dailyScrapes };
}

// MIGRATE CSV -> MONGODB
export async function migrateCsvToMongo() {
  if (!isMongoConfigured()) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }
  const col = await getJobsCollection();
  if (!col) throw new Error('Could not connect to MongoDB Atlas collection.');

  const csvJobs = parseTrackerCSV();
  if (csvJobs.length === 0) return { migrated: 0, total: 0 };

  console.log(`[DB Migration] Migrating ${csvJobs.length} jobs from CSV to MongoDB Atlas...`);

  const operations = csvJobs.map(j => ({
    updateOne: {
      filter: { id: j.id },
      update: { $set: { ...j, migratedAt: new Date().toISOString() } },
      upsert: true
    }
  }));

  const res = await col.bulkWrite(operations, { ordered: false });
  return {
    total: csvJobs.length,
    upserted: res.upsertedCount,
    matched: res.matchedCount,
    modified: res.modifiedCount
  };
}
