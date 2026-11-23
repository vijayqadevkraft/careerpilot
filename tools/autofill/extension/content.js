// CareerPilot — Zero-Click Job Application AutoFill
// Candidate: Vijay Kumar (Senior QA Engineer & QA Lead)

const DEFAULT_PROFILE = {
  enabled: true,
  firstName: "Vijay",
  lastName: "Kumar",
  fullName: "Vijay Kumar",
  email: "vijaychuhan007@gmail.com",
  phone: "+91 7696122634",
  phoneDigits: "7696122634",
  linkedIn: "https://www.linkedin.com/in/vijay-007",
  github: "https://github.com/vijayqadevkraft",
  portfolio: "https://github.com/vijayqadevkraft",
  location: "India",
  city: "Punjab",
  country: "India",
  currentCompany: "XianInfotech LLP",
  currentTitle: "Senior QA Engineer",
  yearsExperience: "5",
  noticePeriod: "15",
  noticePeriodFull: "15 days",
  workAuthorization: "Yes",
  requireSponsorship: "No",
  degree: "B.Tech in Computer Science & Engineering",
  university: "CT Group of Institutions",
  gradYear: "2019",
  summary: "Senior QA Automation Engineer & QA Lead with 5+ years specializing in Playwright, TypeScript/JavaScript test automation, API testing, and CI/CD pipelines."
};

let currentProfile = { ...DEFAULT_PROFILE };

// Load user overrides from storage if available
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
  chrome.storage.sync.get('profile', (res) => {
    if (res && res.profile) {
      currentProfile = { ...DEFAULT_PROFILE, ...res.profile };
    }
  });
}

// React/Vue/Angular friendly value setter
function setFieldValue(elem, value) {
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

  // Visual highlight indicator
  elem.style.transition = 'background-color 0.4s ease, border-color 0.4s ease';
  const originalBorder = elem.style.borderColor;
  const originalBg = elem.style.backgroundColor;
  elem.style.borderColor = '#10b981';
  elem.style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
  setTimeout(() => {
    elem.style.borderColor = originalBorder;
    elem.style.backgroundColor = originalBg;
  }, 2500);

  return true;
}

// Extract rich context including labels, placeholder, aria tags, and parent text
function getMetaWithLabel(input) {
  let text = `${input.name || ''} ${input.id || ''} ${input.placeholder || ''} ${input.getAttribute('aria-label') || ''} ${input.className || ''}`;

  // 1. Associated <label for="id">
  if (input.id) {
    try {
      const lbl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      if (lbl) text += ' ' + lbl.innerText;
    } catch (e) {}
  }

  // 2. Parent or surrounding label / container
  const parentLabel = input.closest('label');
  if (parentLabel) text += ' ' + parentLabel.innerText;

  const container = input.closest('.field, .form-group, .form-field, .input-container, div');
  if (container) {
    const lbl = container.querySelector('label, .label, span[class*="label"], p[class*="label"]');
    if (lbl) text += ' ' + lbl.innerText;
  }

  // 3. aria-labelledby
  const labelledBy = input.getAttribute('aria-labelledby');
  if (labelledBy) {
    const el = document.getElementById(labelledBy);
    if (el) text += ' ' + el.innerText;
  }

  return text.toLowerCase();
}

// Main AutoFill function
function scanAndFill() {
  if (!currentProfile.enabled) return 0;

  const p = currentProfile;
  let count = 0;

  // 1. Text & Email & Phone Inputs
  const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea'));

  for (const input of inputs) {
    // Skip if already filled
    if (input.value && input.value.trim().length > 0) continue;

    const meta = getMetaWithLabel(input);

    // First Name
    if (meta.includes('first_name') || meta.includes('firstname') || meta.includes('first name') || meta.includes('fname') || meta.includes('givenname') || (meta.includes('first') && meta.includes('name'))) {
      if (setFieldValue(input, p.firstName)) count++;
    }
    // Last Name
    else if (meta.includes('last_name') || meta.includes('lastname') || meta.includes('last name') || meta.includes('lname') || meta.includes('surname') || meta.includes('familyname') || (meta.includes('last') && meta.includes('name'))) {
      if (setFieldValue(input, p.lastName)) count++;
    }
    // Full Name
    else if (meta.includes('candidate_name') || meta.includes('fullname') || meta.includes('full name') || (meta.includes('name') && !meta.includes('company') && !meta.includes('user') && !meta.includes('file') && !meta.includes('skill') && !meta.includes('job') && !meta.includes('first') && !meta.includes('last'))) {
      if (setFieldValue(input, p.fullName)) count++;
    }
    // Email
    else if (input.type === 'email' || meta.includes('email') || meta.includes('e-mail')) {
      if (setFieldValue(input, p.email)) count++;
    }
    // Phone / Mobile
    else if (input.type === 'tel' || meta.includes('phone') || meta.includes('mobile') || meta.includes('contact_number') || meta.includes('cell')) {
      const phoneVal = (meta.includes('dial') || meta.includes('national')) ? p.phoneDigits : p.phone;
      if (setFieldValue(input, phoneVal)) count++;
    }
    // LinkedIn Profile
    else if (meta.includes('linkedin')) {
      if (setFieldValue(input, p.linkedIn)) count++;
    }
    // GitHub / Portfolio / Website URL
    else if (meta.includes('github') || meta.includes('portfolio') || meta.includes('website') || meta.includes('url')) {
      if (setFieldValue(input, p.github)) count++;
    }
    // Location / City / Address
    else if (meta.includes('location') || meta.includes('city') || meta.includes('address') || meta.includes('residence')) {
      if (setFieldValue(input, p.location)) count++;
    }
    // Current Company
    else if (meta.includes('company') || meta.includes('employer') || meta.includes('organization') || meta.includes('current_company')) {
      if (setFieldValue(input, p.currentCompany)) count++;
    }
    // Current Title / Role
    else if (meta.includes('current_title') || meta.includes('designation') || meta.includes('current title') || meta.includes('headline') || meta.includes('job title')) {
      if (setFieldValue(input, p.currentTitle)) count++;
    }
    // Total Years of Experience
    else if (meta.includes('years_of_experience') || meta.includes('total experience') || (meta.includes('experience') && !meta.includes('level'))) {
      if (setFieldValue(input, p.yearsExperience)) count++;
    }
    // Notice Period
    else if (meta.includes('notice') || meta.includes('notice_period') || meta.includes('availability')) {
      if (setFieldValue(input, p.noticePeriodFull)) count++;
    }
    // Summary / Cover Letter Note / Bio
    else if (input.tagName === 'TEXTAREA' && (meta.includes('cover') || meta.includes('summary') || meta.includes('note') || meta.includes('about') || meta.includes('bio'))) {
      if (setFieldValue(input, p.summary)) count++;
    }
  }

  // 2. Dropdown Select Elements
  const selects = Array.from(document.querySelectorAll('select'));
  for (const select of selects) {
    const meta = getMetaWithLabel(select);
    const options = Array.from(select.options);

    // Country Dropdown
    if (meta.includes('country') || meta.includes('dial') || meta.includes('prefix')) {
      const opt = options.find(o => o.text.toLowerCase().includes('india') || o.value.toLowerCase().includes('in') || o.text.includes('+91'));
      if (opt && select.value !== opt.value) {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        count++;
      }
    }
    // Notice Period Dropdown
    else if (meta.includes('notice')) {
      const opt = options.find(o => o.text.includes('15') || o.text.toLowerCase().includes('immediate') || o.text.includes('1 month'));
      if (opt && select.value !== opt.value) {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        count++;
      }
    }
    // Visa Sponsorship Dropdown (No)
    else if (meta.includes('sponsor') || meta.includes('visa')) {
      const opt = options.find(o => o.text.toLowerCase().trim() === 'no' || o.value.toLowerCase() === 'no');
      if (opt && select.value !== opt.value) {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        count++;
      }
    }
    // Authorized to Work (Yes)
    else if (meta.includes('authorized') || meta.includes('legally')) {
      const opt = options.find(o => o.text.toLowerCase().trim() === 'yes' || o.value.toLowerCase() === 'yes');
      if (opt && select.value !== opt.value) {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        count++;
      }
    }
  }

  // 3. Show badge if fields were auto-filled
  if (count > 0) {
    showFloatingBadge(count);
  }

  return count;
}

// Show a floating indicator badge on the active page
function showFloatingBadge(count) {
  let badge = document.getElementById('careerpilot-auto-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'careerpilot-auto-badge';
    badge.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      z-index: 2147483647 !important;
      background: #0f172a !important;
      border: 1px solid #10b981 !important;
      color: #ffffff !important;
      padding: 10px 16px !important;
      border-radius: 10px !important;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 13px !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      transition: all 0.3s ease !important;
    `;
    document.body.appendChild(badge);
  }

  badge.innerHTML = `
    <span style="color:#10b981; font-weight:700; font-size:15px;">⚡</span>
    <span><strong>CareerPilot:</strong> Auto-filled <strong>${count}</strong> field${count > 1 ? 's' : ''}!</span>
    <button id="cp-badge-refill" style="background:#1e293b; border:1px solid #475569; color:#38bdf8; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;">Re-Fill</button>
    <button id="cp-badge-close" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer; line-height:1;">&times;</button>
  `;

  document.getElementById('cp-badge-refill')?.addEventListener('click', () => {
    scanAndFill();
  });

  document.getElementById('cp-badge-close')?.addEventListener('click', () => {
    badge.remove();
  });

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (badge && badge.parentNode) {
      badge.style.opacity = '0';
      badge.style.transform = 'translateY(10px)';
      setTimeout(() => badge.remove(), 400);
    }
  }, 5000);
}

// Zero-Click Execution Trigger
// 1. Initial scan after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(scanAndFill, 400);
  });
} else {
  setTimeout(scanAndFill, 400);
}

// 2. Debounced MutationObserver: Detects dynamic forms (LinkedIn Easy Apply, Greenhouse modal, Workday steps)
let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    scanAndFill();
  }, 600);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 3. Listen for manual fill messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'FILL_NOW') {
      const filled = scanAndFill();
      sendResponse({ success: true, count: filled });
    }
  });
}
