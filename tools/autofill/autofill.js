import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { getCandidateProfile } from '../profile.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const LOG_FILE = path.join(__dirname, 'autofill.log');
const STATE_FILE = path.join(__dirname, 'state.json');

function setAutomationState(state, extra = {}) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      state,
      ...extra,
      updatedAt: new Date().toISOString()
    }), 'utf8');
  } catch (e) {}
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (e) {}
  console.log(msg);
}

// Global Process Crash Guards
process.on('uncaughtException', (err) => {
  log(`[GUARD] Uncaught Exception: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (reason) => {
  log(`[GUARD] Unhandled Rejection: ${reason}`);
});

// Candidate Profile synced from CLAUDE.md
const _syncedProfile = getCandidateProfile();
const PROFILE = {
  firstName: _syncedProfile.firstName || "Vijay",
  lastName: _syncedProfile.lastName || "Kumar",
  fullName: _syncedProfile.name || "Vijay Kumar",
  email: _syncedProfile.email || "vijaychuhan007@gmail.com",
  phone: _syncedProfile.phone || "+91 7696122634",
  phoneDigits: (_syncedProfile.phone || "7696122634").replace(/\D/g, '').slice(-10),
  countryCode: "+91",
  linkedIn: _syncedProfile.linkedin || "https://www.linkedin.com/in/vijay-007",
  github: _syncedProfile.github || "https://github.com/vijayqadevkraft",
  portfolio: _syncedProfile.github || "https://github.com/vijayqadevkraft",
  location: _syncedProfile.location || "India",
  city: "Jalandhar",
  state: "Punjab",
  postalCode: "144001",
  country: "India",
  nationality: "Indian",
  currentCompany: "XianInfotech LLP",
  currentTitle: _syncedProfile.title || "Senior QA Engineer",
  yearsExperience: String(_syncedProfile.experienceYears || 5),
  noticePeriod: "15",
  noticePeriodFull: _syncedProfile.noticePeriod || "15 days",
  workAuthorization: "Yes",
  requireSponsorship: "No",
  gender: "Male",
  degree: "B.Tech in Computer Science & Engineering",
  university: "CT Group of Institutions",
  gradYear: "2019",
  summary: "Senior QA Automation Engineer & QA Lead with 5+ years specializing in Playwright, TypeScript/JavaScript test automation, API testing, and CI/CD pipelines."
};

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

// Bring browser to front on Windows so user immediately sees the window
function bringBrowserToFront(sessionDir = '') {
  if (process.platform === 'win32') {
    try {
      const profileTag = sessionDir ? path.basename(sessionDir) : 'cp_profile_';
      const ps = `
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32Focus {
          [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
          [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
          [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
          [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
          [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
        }
"@
        $target = $null;
        $wmi = Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*${profileTag}*' };
        if ($wmi) {
          $pids = $wmi | ForEach-Object { $_.ProcessId };
          $target = Get-Process -Id $pids -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;
        }
        if (-not $target) {
          $target = Get-Process chrome, msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' } | Sort-Object StartTime -Descending | Select-Object -First 1;
        }
        if ($target) {
          $h = $target.MainWindowHandle;
          $fg = [Win32Focus]::GetForegroundWindow();
          $pidOut = 0;
          $fgThread = [Win32Focus]::GetWindowThreadProcessId($fg, [ref]$pidOut);
          $curThread = [Win32Focus]::GetCurrentThreadId();
          if ($fgThread -ne 0 -and $fgThread -ne $curThread) {
            [Win32Focus]::AttachThreadInput($curThread, $fgThread, $true) | Out-Null;
          }
          [Win32Focus]::ShowWindow($h, 9) | Out-Null;
          [Win32Focus]::ShowWindow($h, 3) | Out-Null;
          [Win32Focus]::BringWindowToTop($h) | Out-Null;
          [Win32Focus]::SetForegroundWindow($h) | Out-Null;
          if ($fgThread -ne 0 -and $fgThread -ne $curThread) {
            [Win32Focus]::AttachThreadInput($curThread, $fgThread, $false) | Out-Null;
          }
        }
      `;
      spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'ignore', windowsHide: true }).unref();
    } catch (e) {}
  }
}

async function runAutoFill(targetUrl, cvFilePath) {
  setAutomationState('Initializing', { url: targetUrl });
  log(`=======================================================`);
  log(`=== Starting CareerPilot AutoFill Session ===`);
  log(`Target URL: ${targetUrl}`);
  log(`CV Attachment: ${cvFilePath || '(none)'}`);

  const browserPath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;
  log(`Using browser executable: ${browserPath}`);
  
  // Use unique temporary profile per session to prevent any session-locking conflicts
  const sessionDir = path.join(os.tmpdir(), `cp_profile_${Date.now()}_${Math.floor(Math.random() * 100000)}`);
  log(`Session profile directory: ${sessionDir}`);

  // Resolve CV file if relative
  let resolvedCvPath = null;
  if (cvFilePath) {
    let full = path.isAbsolute(cvFilePath) ? cvFilePath : path.join(ROOT_DIR, cvFilePath);
    if (full.endsWith('.tex')) {
      const pdfCandidate = full.replace(/\.tex$/, '.pdf');
      if (fs.existsSync(pdfCandidate)) full = pdfCandidate;
    }
    if (fs.existsSync(full)) {
      resolvedCvPath = full;
      log(`CV file found: ${resolvedCvPath}`);
    } else {
      // Fallback to standard CV if specific not found
      const fallback = path.join(ROOT_DIR, 'cv', 'Vijay_Kumar_Senior_QA_CV.pdf');
      if (fs.existsSync(fallback)) {
        resolvedCvPath = fallback;
        log(`Using fallback master CV: ${resolvedCvPath}`);
      }
    }
  }

  let context;
  try {
    context = await chromium.launchPersistentContext(sessionDir, {
      executablePath: browserPath,
      headless: false,
      viewport: null, // Allow user-controlled window resizing
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      args: [
        '--start-maximized',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-infobars'
      ]
    });
    log(`Browser launched with isolated persistent context successfully.`);
    setAutomationState('Browser Launched', { url: targetUrl });
  } catch (err) {
    setAutomationState('Failed', { error: err.message });
    log(`Launch error: ${err.message}`);
    process.exit(1);
  }

  // Setup hook on any page created or existing
  async function setupPage(page) {
    log(`Configuring page: ${page.url() || 'initial'}`);

    // Expose fill trigger callable from injected toolbar
    try {
      await page.exposeFunction('careerpilotFillNow', async () => {
        log(`Toolbar "Fill Now" triggered by user on: ${page.url()}`);
        await fillAllFrames(page, resolvedCvPath, true);
      });
    } catch (e) {
      // Function may already be exposed in persistent context
    }

    // Inject toolbar on DOM content loaded
    try {
      await page.addInitScript(() => {
        function injectUI() {
          if (document.getElementById('careerpilot-bar')) return;
          const bar = document.createElement('div');
          bar.id = 'careerpilot-bar';
          bar.style.cssText = `
            position: fixed !important;
            top: 14px !important;
            right: 14px !important;
            z-index: 2147483647 !important;
            background: #0f172a !important;
            color: #ffffff !important;
            border: 2px solid #38bdf8 !important;
            padding: 8px 16px !important;
            border-radius: 10px !important;
            box-shadow: 0 8px 30px rgba(0,0,0,0.5) !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            cursor: move !important;
            user-select: none !important;
          `;
          bar.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:16px;">⚡</span>
              <strong style="color:#38bdf8; font-size:12px; letter-spacing:0.5px;">CAREERPILOT AUTOFILL</strong>
            </div>
            <button id="cp-btn-fill" style="
              background: linear-gradient(135deg, #0284c7, #38bdf8) !important;
              color: #ffffff !important;
              border: none !important;
              padding: 6px 14px !important;
              border-radius: 6px !important;
              font-weight: 700 !important;
              font-size: 12px !important;
              cursor: pointer !important;
              transition: transform 0.1s !important;
            ">👉 Fill Form</button>
            <button id="cp-btn-close" style="
              background: transparent !important;
              color: #94a3b8 !important;
              border: none !important;
              font-size: 18px !important;
              cursor: pointer !important;
              padding: 0 4px !important;
              line-height: 1 !important;
            ">&times;</button>
          `;

          document.body.appendChild(bar);

          const btnFill = document.getElementById('cp-btn-fill');
          if (btnFill) {
            btnFill.addEventListener('click', (e) => {
              e.stopPropagation();
              btnFill.innerText = '⏳ Filling...';
              if (window.careerpilotFillNow) {
                window.careerpilotFillNow();
              }
              setTimeout(() => {
                btnFill.innerText = '✓ Form Filled!';
                setTimeout(() => { btnFill.innerText = '👉 Fill Form'; }, 2000);
              }, 1000);
            });
          }

          const btnClose = document.getElementById('cp-btn-close');
          if (btnClose) {
            btnClose.addEventListener('click', () => bar.remove());
          }
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', injectUI);
        } else {
          injectUI();
        }
      });
    } catch (e) {
      log(`Error adding init script: ${e.message}`);
    }

    // Auto-fill periodically when form fields are detected
    const autoInterval = setInterval(async () => {
      try {
        if (page.isClosed()) {
          clearInterval(autoInterval);
          return;
        }
        await autoAdvanceApply(page);
        await autoFillEmailStep(page);
        await autoFillVerificationCode(page);
        await fillAllFrames(page, resolvedCvPath, false);
      } catch (err) {
        // Suppress transient navigation errors
      }
    }, 2000);

    page.on('close', () => {
      clearInterval(autoInterval);
    });
  }

  // Setup any existing pages
  const existingPages = context.pages();
  let mainPage = existingPages[0] || (await context.newPage());
  await setupPage(mainPage);

  // Hook new tabs/windows
  context.on('page', async (newPage) => {
    log(`[EVENT] New tab/window opened: ${newPage.url()}`);
    await setupPage(newPage);
    bringBrowserToFront(sessionDir);
  });

  // Navigate main page to target URL with retry error recovery
  if (targetUrl) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        log(`Navigating main page to: ${targetUrl} (attempt ${attempt}/2)`);
        await mainPage.goto(targetUrl, { waitUntil: 'commit', timeout: 25000 });
        await mainPage.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
        log(`Navigation reached: ${mainPage.url()}`);
        bringBrowserToFront(sessionDir);
        break;
      } catch (err) {
        log(`Navigation recovery (attempt ${attempt}): ${err.message}`);
        if (attempt < 2) await mainPage.waitForTimeout(1000).catch(() => {});
      }
    }
  }

  // Initial fill attempt
  setTimeout(async () => {
    try {
      bringBrowserToFront(sessionDir);
      await autoAdvanceApply(mainPage);
      await autoFillEmailStep(mainPage);
      await fillAllFrames(mainPage, resolvedCvPath, false);
    } catch (e) {}
  }, 1500);

  // Keep script alive until the user closes the entire browser context
  await new Promise((resolve) => {
    context.on('close', () => {
      log(`Browser closed by user. Session finished.`);
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        log(`Cleaned up session profile: ${sessionDir}`);
      } catch (e) {}
      resolve();
    });
  });
}

// Smart detection: If on job details page, automatically click "Apply" / "APPLY NOW"
async function autoAdvanceApply(page) {
  if (page.isClosed()) return;
  try {
    const currentUrl = page.url();
    const isApplyPage = currentUrl.includes('/apply') || currentUrl.includes('/application') || currentUrl.includes('/jobsearch/');
    if (isApplyPage && !currentUrl.includes('/job/')) return;

    // 1. Accept Cookie Banners if present
    const cookieBtn = page.locator('button:has-text("Accept All"), button:has-text("Accept all"), button#onetrust-accept-btn-handler, button:has-text("Agree"), a:has-text("Accept"), button:has-text("Allow all"), button#req-cookies-switch-1').first();
    if (await cookieBtn.count() > 0 && await cookieBtn.isVisible()) {
      await cookieBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }

    // 2. Selectors for Apply Buttons across all ATS platforms
    const applySelectors = [
      'a.postings-btn[href$="/apply"]',
      'a[href$="/apply"]',
      '.dialogApplyBtn',
      'a[href*="/apply/"]',
      'a[href*="talentcommunity/apply"]',
      'a:has-text("Apply on company website")',
      'a:has-text("Apply for this job")',
      'a:has-text("Apply Now")',
      'button:has-text("Apply Now")',
      'button:has-text("APPLY NOW")',
      'a:has-text("Apply now")',
      'button:has-text("Apply now")',
      'a[data-automation-id="applyButton"]',
      'button[data-automation-id="applyButton"]',
      'oj-button:has-text("Apply Now")',
      'a#applyOption-top-manual',
      'a.socialbutton-link',
      '#apply_button'
    ];

    for (const sel of applySelectors) {
      const btn = page.locator(sel).first();
      if (await btn.count() > 0 && await btn.isVisible().catch(() => false)) {
        log(`[AUTO-ADVANCE] Found Apply trigger (${sel}) on ${currentUrl}. Clicking...`);
        // Try direct click with force: true
        await btn.click({ force: true, timeout: 3000 }).catch(async () => {
          // If click was intercepted, evaluate JS click
          await btn.evaluate(el => el.click()).catch(() => {});
        });
        await page.waitForTimeout(2000);
        return;
      }
    }
  } catch (e) {
    // Suppress transient navigation errors
  }
}

// Auto-fill Identity / Email step on enterprise portals (e.g. Oracle Cloud HCM, Workday)
async function autoFillEmailStep(page) {
  if (page.isClosed()) return;
  try {
    const emailInput = page.locator('input[name="primary-email"], input#primary-email-0, input[type="email"]').first();
    if (await emailInput.count() > 0 && await emailInput.isVisible()) {
      const val = await emailInput.inputValue();
      if (!val) {
        log(`[AUTO-FILL] Entering candidate email into identity verification input...`);
        await emailInput.fill(PROFILE.email);
        await page.waitForTimeout(500);

        // Click NEXT button if available
        const nextBtn = page.locator('button:has-text("NEXT"), button:has-text("Next")').first();
        if (await nextBtn.count() > 0 && await nextBtn.isVisible()) {
          log(`[AUTO-FILL] Clicking NEXT to send identity verification code...`);
          await nextBtn.click();
        }
      }
    }
  } catch (e) {}
}

// Auto-fill verification code if user submits it from CareerPilot portal
const CODE_FILE = path.join(__dirname, 'code.json');

async function autoFillVerificationCode(page) {
  if (page.isClosed()) return;
  try {
    if (fs.existsSync(CODE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CODE_FILE, 'utf8'));
      if (data && data.code && !data.applied) {
        log(`[AUTO-FILL] Verification code [REDACTED] detected from portal. Finding code input...`);
        const frames = page.frames();
        let filled = false;

        for (const frame of frames) {
          if (filled) break;
          try {
            const selectors = [
              'input[autocomplete="one-time-code"]',
              'input[name*="otp" i]',
              'input[name*="code" i]',
              'input[id*="code" i]',
              'input[name*="verification" i]',
              'input[id*="verification" i]',
              'input[placeholder*="code" i]',
              'input[aria-label*="code" i]',
              'oj-input-text input',
              'input[type="text"][maxlength="6"]',
              'input[type="text"][maxlength="8"]'
            ];
            for (const sel of selectors) {
              const codeInput = frame.locator(sel).first();
              if (await codeInput.count() > 0 && await codeInput.isVisible()) {
                await codeInput.fill(data.code);
                await page.waitForTimeout(600);
                filled = true;
                data.applied = true;
                fs.writeFileSync(CODE_FILE, JSON.stringify(data), 'utf8');
                log(`[AUTO-FILL] Verification code [REDACTED] entered into ${sel}.`);

                // Click Verify / Continue / Next / Submit button
                const verifyBtn = frame.locator('button:has-text("VERIFY"), button:has-text("Verify"), button:has-text("SUBMIT"), button:has-text("Submit"), button:has-text("NEXT"), button:has-text("Next"), button:has-text("Continue"), button[type="submit"]').first();
                if (await verifyBtn.count() > 0 && await verifyBtn.isVisible()) {
                  await verifyBtn.click();
                  log(`[AUTO-FILL] Clicked Verify button with code!`);
                }
                break;
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    log(`[CODE ERROR] ${e.message}`);
  }
}

async function detectSecurityGates(page) {
  if (page.isClosed()) return { otpRequired: false, captchaDetected: false };
  try {
    return await page.evaluate(() => {
      const captchaDetected = Boolean(
        document.querySelector('iframe[src*="hcaptcha"], iframe[src*="recaptcha"], iframe[src*="turnstile"], .cf-turnstile, .g-recaptcha, .h-captcha, [data-sitekey]')
      );
      const otpInput = document.querySelector('input[autocomplete="one-time-code"], input[name*="otp" i], input[name*="verification" i], input[id*="verification" i]');
      const otpRequired = Boolean(otpInput && otpInput.offsetParent !== null);
      return { otpRequired, captchaDetected };
    });
  } catch {
    return { otpRequired: false, captchaDetected: false };
  }
}

// Fills fields across main page and all nested iframes (Workday, Greenhouse, Lever, etc.)
async function fillAllFrames(page, cvFilePath, showToast = false) {
  if (page.isClosed()) return;

  let filledTotal = 0;
  const frames = page.frames();

  for (const frame of frames) {
    try {
      const count = await frame.evaluate((p) => {
        let count = 0;

        function setVal(elem, value) {
          if (!elem || elem.disabled || elem.readOnly) return false;
          if (elem.value === value) return false;

          const proto = elem instanceof HTMLTextAreaElement 
            ? window.HTMLTextAreaElement.prototype 
            : window.HTMLInputElement.prototype;
          const desc = Object.getOwnPropertyDescriptor(proto, 'value');
          if (desc && desc.set) {
            desc.set.call(elem, value);
          } else {
            elem.value = value;
          }

          elem.dispatchEvent(new Event('input', { bubbles: true }));
          elem.dispatchEvent(new Event('change', { bubbles: true }));
          elem.dispatchEvent(new Event('blur', { bubbles: true }));

          // Visual green highlight
          try {
            elem.style.border = '2px solid #10b981';
            elem.style.backgroundColor = '#f0fdf4';
          } catch (e) {}

          return true;
        }

        function getFieldMeta(elem) {
          const parts = [
            elem.name || '',
            elem.id || '',
            elem.placeholder || '',
            elem.getAttribute('aria-label') || '',
            elem.getAttribute('data-qa') || '',
            elem.className || ''
          ];

          if (elem.id) {
            try {
              const lbl = document.querySelector(`label[for="${CSS.escape(elem.id)}"]`);
              if (lbl) parts.push(lbl.innerText || lbl.textContent || '');
            } catch (e) {}
          }

          const labelledBy = elem.getAttribute('aria-labelledby');
          if (labelledBy) {
            for (const lid of labelledBy.split(/\s+/)) {
              const el = document.getElementById(lid);
              if (el) parts.push(el.innerText || el.textContent || '');
            }
          }

          const parentLabel = elem.closest('label');
          if (parentLabel) parts.push(parentLabel.innerText || parentLabel.textContent || '');

          const questionWrap = elem.closest('.application-question, .application-field, [class*="question" i], [class*="field" i]');
          if (questionWrap) {
            const qLabel = questionWrap.querySelector('.application-label, .label, label, legend, [class*="label" i]');
            if (qLabel) parts.push(qLabel.innerText || qLabel.textContent || '');
          }

          return parts.join(' ').toLowerCase();
        }

        // Match all interactive inputs & textareas
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea'));

        for (const input of inputs) {
          const meta = getFieldMeta(input);

          // Anti-bot Honeypot guard
          if (meta.includes('honey') || meta.includes('pot') || meta.includes('bot')) continue;

          // Never fill website search / navigation filters with candidate specs!
          const isSearch = input.type === 'search' ||
                           meta.includes('keyword') ||
                           meta.includes('filter') ||
                           input.closest('header, nav, .search-box, .search-bar, form[role="search"], [id*="search" i], [class*="search" i]');
          if (isSearch) continue;

          // First Name
          if (meta.includes('first_name') || meta.includes('firstname') || meta.includes('first name') || meta.includes('givenname') || meta.includes('fname')) {
            if (setVal(input, p.firstName)) count++;
          }
          // Last Name
          else if (meta.includes('last_name') || meta.includes('lastname') || meta.includes('last name') || meta.includes('familyname') || meta.includes('lname') || meta.includes('surname')) {
            if (setVal(input, p.lastName)) count++;
          }
          // Full Name
          else if (meta.includes('candidate_name') || meta.includes('fullname') || meta.includes('full name') || (meta.includes('name') && !meta.includes('company') && !meta.includes('user') && !meta.includes('file') && !meta.includes('search'))) {
            if (setVal(input, p.fullName)) count++;
          }
          // Email
          else if (input.type === 'email' || meta.includes('email') || meta.includes('e-mail')) {
            if (setVal(input, p.email)) count++;
          }
          // Phone / Mobile
          else if (input.type === 'tel' || meta.includes('phone') || meta.includes('mobile') || meta.includes('contact_number') || meta.includes('cell')) {
            if (setVal(input, p.phone)) count++;
          }
          // LinkedIn
          else if (meta.includes('linkedin')) {
            if (setVal(input, p.linkedIn)) count++;
          }
          // GitHub / Portfolio / Website
          else if (meta.includes('github') || meta.includes('portfolio') || meta.includes('website') || meta.includes('url')) {
            if (setVal(input, p.github)) count++;
          }
          // Postal Code / Zip
          else if (meta.includes('postal') || meta.includes('zip') || meta.includes('pincode')) {
            if (setVal(input, p.postalCode)) count++;
          }
          // State / Province
          else if (meta.includes('state') || meta.includes('province') || meta.includes('region')) {
            if (setVal(input, p.state)) count++;
          }
          // Location / City / Address
          else if (meta.includes('city') || meta.includes('address') || meta.includes('residence') || (meta.includes('location') && !meta.includes('search'))) {
            if (setVal(input, p.location)) count++;
          }
          // Current Company
          else if (meta.includes('company') || meta.includes('employer') || meta.includes('organization') || meta.includes('current_company') || /\borg\b/.test(meta) || meta.includes('org-input')) {
            if (setVal(input, p.currentCompany)) count++;
          }
          // Current Title / Designation
          else if (meta.includes('current_title') || meta.includes('designation') || meta.includes('current title') || meta.includes('headline') || meta.includes('job title')) {
            if (setVal(input, p.currentTitle)) count++;
          }
          // Total Years of Experience
          else if (meta.includes('experience') || meta.includes('years_of_experience') || meta.includes('total experience')) {
            if (setVal(input, p.yearsExperience)) count++;
          }
          // Notice Period
          else if (meta.includes('notice') || meta.includes('notice_period') || meta.includes('availability')) {
            if (setVal(input, p.noticePeriodFull)) count++;
          }
          // Summary / Cover Letter Text / Bio
          else if (input.tagName === 'TEXTAREA' && (meta.includes('cover') || meta.includes('summary') || meta.includes('note') || meta.includes('about') || meta.includes('bio'))) {
            if (setVal(input, p.summary)) count++;
          }
        }

        // Auto-select common Dropdowns
        const selects = Array.from(document.querySelectorAll('select'));
        for (const select of selects) {
          const meta = `${select.name || ''} ${select.id || ''} ${select.getAttribute('aria-label') || ''}`.toLowerCase();
          const options = Array.from(select.options);

          // Notice Period Dropdown
          if (meta.includes('notice')) {
            const opt = options.find(o => o.text.includes('15') || o.text.toLowerCase().includes('immediate') || o.text.includes('1 month'));
            if (opt && select.value !== opt.value) {
              select.value = opt.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              count++;
            }
          }
          // Work Authorization / Sponsorship Dropdown
          else if (meta.includes('sponsor') || meta.includes('visa')) {
            const opt = options.find(o => o.text.toLowerCase().trim() === 'no' || o.value.toLowerCase() === 'no');
            if (opt && select.value !== opt.value) {
              select.value = opt.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              count++;
            }
          }
          else if (meta.includes('authorized') || meta.includes('legally')) {
            const opt = options.find(o => o.text.toLowerCase().trim() === 'yes' || o.value.toLowerCase() === 'yes');
            if (opt && select.value !== opt.value) {
              select.value = opt.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              count++;
            }
          }
          // Gender Dropdown
          else if (meta.includes('gender')) {
            const opt = options.find(o => o.text.toLowerCase().includes('male'));
            if (opt && select.value !== opt.value) {
              select.value = opt.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              count++;
            }
          }
          // Country Dropdown
          else if (meta.includes('country')) {
            const opt = options.find(o => o.text.toLowerCase().includes('india'));
            if (opt && select.value !== opt.value) {
              select.value = opt.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              count++;
            }
          }
        }

        return count;
      }, PROFILE);

      filledTotal += count || 0;
    } catch (e) {
      // Ignore evaluation errors on cross-domain frames
    }
  }

  // Handle File Upload if CV is provided
  if (cvFilePath && fs.existsSync(cvFilePath)) {
    try {
      for (const frame of page.frames()) {
        const fileInputs = await frame.locator('input[type="file"]').all();
        for (const input of fileInputs) {
          try {
            const hasFiles = await input.evaluate(el => el.files && el.files.length > 0);
            if (!hasFiles) {
              await input.setInputFiles(cvFilePath);
              log(`[AUTOFILL] Successfully attached CV (${path.basename(cvFilePath)}) to frame: ${frame.url()}`);
              filledTotal++;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  const gates = await detectSecurityGates(page);
  if (gates.otpRequired || gates.captchaDetected) {
    setAutomationState('Awaiting User Review', {
      url: page.url(),
      otpRequired: gates.otpRequired,
      captchaDetected: gates.captchaDetected
    });
    log(`[GATE] Paused for manual intervention (OTP=${gates.otpRequired}, CAPTCHA=${gates.captchaDetected})`);
  }

  if (filledTotal > 0) {
    log(`[AUTOFILL] Populated ${filledTotal} field(s)/actions on ${page.url()}`);
    if (!gates.otpRequired && !gates.captchaDetected) {
      setAutomationState('Ready for Submission', { url: page.url(), filledFields: filledTotal });
    }
    // Approval Guard: highlight final submit button for human review, never auto-submit
    try {
      await page.evaluate(() => {
        const submitBtns = document.querySelectorAll('button[type="submit"], #btn-submit, button[data-qa="btn-submit"], input[type="submit"]');
        submitBtns.forEach(btn => {
          btn.style.outline = '3px dashed #f59e0b';
          btn.style.outlineOffset = '3px';
          btn.title = 'CareerPilot: Review pre-filled details and click to submit';
        });
      });
    } catch (e) {}
  }

  return filledTotal;
}

// CLI entry point
const args = process.argv.slice(2);
const targetUrl = args[0] || "https://fa-etvl-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/jobsearch/job/153961";
const cvFilePath = args[1] || path.join(ROOT_DIR, 'cv', 'Vijay_Kumar_Senior_QA_CV.pdf');

runAutoFill(targetUrl, cvFilePath).catch(err => {
  log(`[FATAL] AutoFill exited with error: ${err.message}`);
});
