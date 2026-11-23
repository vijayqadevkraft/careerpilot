import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAutopilot } from './autopilot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SCHEDULER_STATE_PATH = path.join(ROOT, 'tools', 'scheduler_state.json');
const LOG_PATH = path.join(ROOT, 'tools', 'autopilot.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] [SCHEDULER] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_PATH, line, 'utf8');
  } catch (e) {}
  console.log(`[SCHEDULER] ${msg}`);
}

// Load state
export function getSchedulerState() {
  if (fs.existsSync(SCHEDULER_STATE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(SCHEDULER_STATE_PATH, 'utf8'));
    } catch (e) {}
  }
  return {
    active: true,
    intervalHours: 6,
    status: 'idle',
    lastRun: null,
    nextRun: null,
    runCount: 0,
    totalDrafted: 0,
    lastDraftedCount: 0
  };
}

export function saveSchedulerState(state) {
  try {
    fs.writeFileSync(SCHEDULER_STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {}
}

let timerHandle = null;
let isRunning = false;

export async function executeScheduledRun() {
  if (isRunning) {
    log("Run already in progress. Skipping concurrent execution.");
    return getSchedulerState();
  }

  isRunning = true;
  log("=== Triggering Scheduled Job Hunt & Scrape ===");
  const state = getSchedulerState();
  state.status = 'running';
  state.lastRun = new Date().toISOString();
  state.runCount = (state.runCount || 0) + 1;
  saveSchedulerState(state);

  try {
    const result = await runAutopilot();
    state.status = 'idle';
    if (result && result.newlyDraftedCount > 0) {
      state.totalDrafted = (state.totalDrafted || 0) + result.newlyDraftedCount;
      state.lastDraftedCount = result.newlyDraftedCount;
      log(`Discovered & drafted ${result.newlyDraftedCount} new high-fit roles!`);
    } else {
      state.lastDraftedCount = 0;
      log("Scan complete. Pipeline is already up to date.");
    }
  } catch (err) {
    state.status = 'error';
    state.lastError = err.message;
    log(`Run encountered error: ${err.message}`);
  } finally {
    isRunning = false;
  }

  // Calculate next run
  const intervalMs = (state.intervalHours || 6) * 60 * 60 * 1000;
  state.nextRun = new Date(Date.now() + intervalMs).toISOString();
  saveSchedulerState(state);

  return state;
}

export function startScheduler(intervalHours = 6) {
  if (timerHandle) clearInterval(timerHandle);

  const state = getSchedulerState();
  state.active = true;
  state.intervalHours = intervalHours;
  state.status = 'idle';
  const intervalMs = intervalHours * 60 * 60 * 1000;
  state.nextRun = new Date(Date.now() + intervalMs).toISOString();
  saveSchedulerState(state);

  log(`Scheduler started. Runs every ${intervalHours} hour(s). Next run at: ${state.nextRun}`);

  timerHandle = setInterval(async () => {
    const currentState = getSchedulerState();
    if (currentState.active) {
      await executeScheduledRun();
    }
  }, intervalMs);

  return state;
}

export function stopScheduler() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
  const state = getSchedulerState();
  state.active = false;
  state.nextRun = null;
  state.status = 'stopped';
  saveSchedulerState(state);
  log("Scheduler stopped.");
  return state;
}

// Standalone CLI invocation
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const hours = parseInt(process.argv[2], 10) || 6;
  log(`Starting standalone CareerPilot Scheduler daemon (Every ${hours} hours)...`);
  executeScheduledRun().then(() => {
    startScheduler(hours);
  });
}
