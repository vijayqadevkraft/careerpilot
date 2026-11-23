import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const PROFILE = {
  firstName: "Vijay",
  lastName: "Kumar",
  fullName: "Vijay Kumar",
  email: "vijaychuhan007@gmail.com",
  phone: "+91 7696122634",
  linkedIn: "https://www.linkedin.com/in/vijay-007",
  github: "https://github.com/vijayqadevkraft",
  location: "India",
  currentCompany: "XianInfotech LLP",
  currentTitle: "Senior QA Engineer"
};

async function testAutoFill() {
  console.log("=== STARTING PLAYWRIGHT AUTO-FILL TEST ===");
  const browserPath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;
  console.log(`Using Browser: ${browserPath}`);

  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true
  });

  const page = await browser.newPage();
  const filePath = path.resolve('web/public/test_form.html');
  const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
  console.log(`Navigating to ${fileUrl}...`);
  
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

  // Check initial values (all empty)
  const initialFirstName = await page.locator('#first_name').inputValue();
  console.log(`Initial #first_name value: "${initialFirstName}" (should be empty)`);

  // Run the autofill logic inside page
  console.log("Executing auto-fill algorithm...");
  await page.evaluate((p) => {
    function setVal(el, val) {
      if (!el) return;
      const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (desc && desc.set) { desc.set.call(el, val); } else { el.value = val; }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]), textarea'));
    inputs.forEach(input => {
      const meta = `${input.name || ''} ${input.id || ''} ${input.placeholder || ''}`.toLowerCase();
      if (meta.includes('first_name') || meta.includes('firstname')) setVal(input, p.firstName);
      else if (meta.includes('last_name') || meta.includes('lastname')) setVal(input, p.lastName);
      else if (input.type === 'email' || meta.includes('email')) setVal(input, p.email);
      else if (input.type === 'tel' || meta.includes('phone')) setVal(input, p.phone);
      else if (meta.includes('linkedin')) setVal(input, p.linkedIn);
      else if (meta.includes('github')) setVal(input, p.github);
      else if (meta.includes('location') || meta.includes('city')) setVal(input, p.location);
      else if (meta.includes('company')) setVal(input, p.currentCompany);
      else if (meta.includes('title')) setVal(input, p.currentTitle);
    });
  }, PROFILE);

  // Extract filled values
  const results = {
    firstName: await page.locator('#first_name').inputValue(),
    lastName: await page.locator('#last_name').inputValue(),
    email: await page.locator('#email').inputValue(),
    phone: await page.locator('#phone').inputValue(),
    linkedIn: await page.locator('#linkedin').inputValue(),
    github: await page.locator('#github').inputValue(),
    company: await page.locator('#company').inputValue(),
    title: await page.locator('#title').inputValue(),
    location: await page.locator('#location').inputValue(),
  };

  console.log("\n=== VERIFICATION RESULTS ===");
  console.log(`First Name:     "${results.firstName}"  --> ${results.firstName === PROFILE.firstName ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Last Name:      "${results.lastName}"   --> ${results.lastName === PROFILE.lastName ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Email:          "${results.email}"      --> ${results.email === PROFILE.email ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Phone:          "${results.phone}"      --> ${results.phone === PROFILE.phone ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`LinkedIn:       "${results.linkedIn}"   --> ${results.linkedIn === PROFILE.linkedIn ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`GitHub:         "${results.github}"     --> ${results.github === PROFILE.github ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Company:        "${results.company}"    --> ${results.company === PROFILE.currentCompany ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Title:          "${results.title}"      --> ${results.title === PROFILE.currentTitle ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Location:       "${results.location}"   --> ${results.location === PROFILE.location ? '✅ PASS' : '❌ FAIL'}`);

  // Save screenshot
  const screenshotPath = path.resolve('reports/test_form_autofilled.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`\nScreenshot captured at: ${screenshotPath}`);

  await browser.close();
  console.log("\n=== TEST COMPLETED SUCCESSFULLY ===");
}

testAutoFill().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
