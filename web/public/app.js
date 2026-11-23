let allJobs = [];
const selectedCompareIds = new Set();

// Toast helper
function showToast(msg, isSuccess = true) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 28px;
      z-index: 9999;
      background: #0f172a;
      color: #fff;
      border: 1px solid rgba(56, 189, 248, 0.4);
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.25s ease;
      opacity: 0;
      transform: translateY(-10px);
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>${isSuccess ? '⚡' : '⚠️'}</span> <span>${escapeHtml(msg)}</span>`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
  }, 4000);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupSearch();
  setupModals();
  setupAiToolkit();
  fetchJobs();
  fetchSchedulerStatus();
  setInterval(fetchSchedulerStatus, 30000);

  // Application Filter Tabs
  document.querySelectorAll('.app-filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.app-filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTableFilter = btn.getAttribute('data-filter') || 'all';
      renderTable();
    });
  });

  // Date Filter Dropdown
  const filterDateSelect = document.getElementById('filter-date-select');
  if (filterDateSelect) {
    filterDateSelect.addEventListener('change', () => {
      renderTable();
    });
  }

  // Pipeline Kanban Role Filter
  const filterRoleSelect = document.getElementById('filter-role-select');
  if (filterRoleSelect) {
    filterRoleSelect.addEventListener('change', () => {
      renderDashboardKanban();
    });
  }

  // Topbar New Job Search Button
  const btnTopNew = document.getElementById('btn-topbar-new-search');
  if (btnTopNew) {
    btnTopNew.addEventListener('click', () => {
      const addModal = document.getElementById('add-modal');
      if (addModal) addModal.classList.add('open');
    });
  }

  // Quick Action Buttons
  const qaScan = document.getElementById('qa-btn-scan');
  if (qaScan) {
    qaScan.addEventListener('click', async () => {
      qaScan.disabled = true;
      qaScan.innerHTML = '<span>⏳</span> Scanning Portals & ATS...';
      showToast('Scheduled scraper running: Fetching new roles from career portals & ATS...', true);

      try {
        const res = await fetch('/api/scheduler/trigger', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          const drafted = data.state?.lastDraftedCount || 0;
          if (drafted > 0) {
            showToast(`⚡ Scraper finished: ${drafted} new high-fit roles tailored & ready to submit!`, true);
          } else {
            showToast('⚡ Scraper scan finished: All positions up to date.', true);
          }
          await fetchJobs();
          await fetchSchedulerStatus();
        } else {
          showToast(`Scraper error: ${data.error || 'Check logs'}`, false);
        }
      } catch (err) {
        showToast('Scraper error: ' + err.message, false);
      } finally {
        qaScan.disabled = false;
        qaScan.innerHTML = '<span>🔍</span> Scan for New Jobs';
      }
    });
  }

  const qaResume = document.getElementById('qa-btn-resume');
  if (qaResume) {
    qaResume.addEventListener('click', () => {
      // Find top ready CV or master CV
      const topReady = allJobs.find(j => j.cv_file);
      const cvFile = topReady ? topReady.cv_file : 'cv/Vijay_Kumar_Senior_QA_CV.pdf';
      const label = topReady ? `${topReady.company} - Tailored CV` : 'Vijay Kumar - Master CV';
      viewDoc(cvFile, label);
    });
  }

  const qaCoverLetter = document.getElementById('qa-btn-cover-letter');
  if (qaCoverLetter) {
    qaCoverLetter.addEventListener('click', () => {
      // Find top ready cover letter or master cover letter
      const topReady = allJobs.find(j => j.cover_letter_file);
      const clFile = topReady ? topReady.cover_letter_file : 'cover_letters/Vijay_Kumar_Cover_Letter.pdf';
      const label = topReady ? `${topReady.company} - Tailored Cover Letter` : 'Vijay Kumar - Master Cover Letter';
      viewDoc(clFile, label);
    });
  }

  const qaAiToolkit = document.getElementById('qa-btn-ai-toolkit');
  if (qaAiToolkit) {
    qaAiToolkit.addEventListener('click', () => {
      const aiBtn = document.getElementById('nav-btn-ai-toolkit');
      if (aiBtn) aiBtn.click();
    });
  }

  const qaInterview = document.getElementById('qa-btn-interview');
  if (qaInterview) {
    qaInterview.addEventListener('click', () => {
      const aiBtn = document.getElementById('nav-btn-ai-toolkit');
      if (aiBtn) aiBtn.click();
      switchSubtool('interview');
      showToast('🎙️ Switched to AI Interview Simulator & STAR Coach!', true);
    });
  }

  const qaAnalytics = document.getElementById('qa-btn-analytics');
  if (qaAnalytics) {
    qaAnalytics.addEventListener('click', () => {
      const analyticsEl = document.querySelector('.middle-grid');
      if (analyticsEl) {
        analyticsEl.scrollIntoView({ behavior: 'smooth' });
        showToast('📊 Viewing Job Search Analytics: 92% average profile demand!', true);
      }
    });
  }

  // View Toggles: Kanban vs List
  const btnToggleKanban = document.getElementById('btn-toggle-kanban');
  const btnToggleList = document.getElementById('btn-toggle-list');
  if (btnToggleKanban && btnToggleList) {
    btnToggleKanban.addEventListener('click', () => {
      btnToggleKanban.classList.add('active');
      btnToggleList.classList.remove('active');
      const dashTab = document.querySelector('.nav-btn[data-tab="dashboard"]');
      if (dashTab) dashTab.click();
    });
    btnToggleList.addEventListener('click', () => {
      btnToggleList.classList.add('active');
      btnToggleKanban.classList.remove('active');
      const appTab = document.querySelector('.nav-btn[data-tab="applications"]');
      if (appTab) appTab.click();
    });
  }

  // Comparison Dock Controls
  const btnDockCompare = document.getElementById('btn-dock-compare');
  if (btnDockCompare) {
    btnDockCompare.addEventListener('click', () => {
      const navBtn = document.getElementById('nav-btn-compare');
      if (navBtn) navBtn.click();
    });
  }

  const btnDockClear = document.getElementById('btn-dock-clear');
  if (btnDockClear) btnDockClear.addEventListener('click', clearCompare);

  const btnClearAll = document.getElementById('btn-clear-compare-all');
  if (btnClearAll) btnClearAll.addEventListener('click', clearCompare);

  const btnQuickTop = document.getElementById('btn-quick-compare-top');
  if (btnQuickTop) btnQuickTop.addEventListener('click', quickCompareTop);

  const btnEmptyQuick = document.getElementById('btn-empty-quick-compare');
  if (btnEmptyQuick) btnEmptyQuick.addEventListener('click', quickCompareTop);

  // Table Autopilot & Refresh buttons
  const btnAutopilotTable = document.getElementById('btn-autopilot-table');
  if (btnAutopilotTable) {
    btnAutopilotTable.addEventListener('click', async () => {
      btnAutopilotTable.disabled = true;
      btnAutopilotTable.innerText = '⚡ Hunting...';
      showToast('Autopilot running: Scanning, scoring & tailoring applications...', true);
      try {
        const res = await fetch('/api/autopilot/run', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`⚡ Autopilot finished: ${data.newlyDraftedCount || 0} applications drafted!`, true);
          await fetchJobs();
          await fetchSchedulerStatus();
        }
      } catch (err) {
        showToast('Autopilot error: ' + err.message, false);
      } finally {
        btnAutopilotTable.disabled = false;
        btnAutopilotTable.innerText = '⚡ Run Autopilot';
      }
    });
  }

  const btnRefreshTable = document.getElementById('btn-refresh-table');
  if (btnRefreshTable) {
    btnRefreshTable.addEventListener('click', () => {
      fetchJobs();
      fetchSchedulerStatus();
      showToast('Pipeline & scheduler data refreshed.', true);
    });
  }

  // Company Research Controls
  const compSelector = document.getElementById('company-research-selector');
  if (compSelector) {
    compSelector.addEventListener('change', () => {
      renderCompanyIntel(compSelector.value);
    });
  }

  const btnAnalyzeComp = document.getElementById('btn-analyze-company');
  if (btnAnalyzeComp) {
    btnAnalyzeComp.addEventListener('click', () => {
      const comp = compSelector ? compSelector.value : '';
      if (comp) {
        renderCompanyIntel(comp);
        showToast(`🔍 Refreshed intelligence dossier for ${comp}!`, true);
      }
    });
  }

  const btnCompOutreach = document.getElementById('btn-company-outreach');
  if (btnCompOutreach) {
    btnCompOutreach.addEventListener('click', () => {
      const comp = compSelector ? compSelector.value : '';
      const aiBtn = document.getElementById('nav-btn-ai-toolkit');
      if (aiBtn) aiBtn.click();
      switchSubtool('outreach');
      const outreachComp = document.getElementById('outreach-input-company');
      if (outreachComp && comp) outreachComp.value = comp;
      showToast(`✉️ Loaded Recruiter Outreach for ${comp}!`, true);
    });
  }

  const btnCompStrategy = document.getElementById('btn-company-strategy');
  if (btnCompStrategy) {
    btnCompStrategy.addEventListener('click', () => {
      const comp = compSelector ? compSelector.value : '';
      const aiBtn = document.getElementById('nav-btn-ai-toolkit');
      if (aiBtn) aiBtn.click();
      switchSubtool('strategist');
      showToast(`🧭 Loaded Application Strategist for ${comp}!`, true);
    });
  }

  // Settings Controls
  const btnSettingsScan = document.getElementById('btn-settings-trigger-scan');
  if (btnSettingsScan) {
    btnSettingsScan.addEventListener('click', async () => {
      btnSettingsScan.disabled = true;
      btnSettingsScan.innerText = '⏳ Scanning Portals & ATS...';
      showToast('Scanning official ATS portals (Greenhouse, Lever, Oracle Cloud, etc.)...', true);
      try {
        const res = await fetch('/api/scheduler/trigger', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('⚡ Scraper finished: Positions up to date!', true);
          await fetchJobs();
          await fetchSchedulerStatus();
        } else {
          showToast('Scraper error: ' + (data.error || 'Check logs'), false);
        }
      } catch (e) {
        showToast('Error: ' + e.message, false);
      } finally {
        btnSettingsScan.disabled = false;
        btnSettingsScan.innerText = '⚡ Scan Portals Now';
      }
    });
  }

  const btnSettingsRefresh = document.getElementById('btn-settings-refresh-all');
  if (btnSettingsRefresh) {
    btnSettingsRefresh.addEventListener('click', async () => {
      await fetchJobs();
      await fetchSchedulerStatus();
      showToast('Pipeline data & scheduler refreshed successfully!', true);
    });
  }
});

// Scheduler Status Fetcher
async function fetchSchedulerStatus() {
  try {
    const res = await fetch('/api/scheduler/status');
    const data = await res.json();
    if (!data.success) return;

    const sidebarDot = document.getElementById('sidebar-auto-dot');
    const sidebarText = document.getElementById('sidebar-auto-text');
    const sidebarTimer = document.getElementById('sidebar-auto-timer');
    const heroUpdated = document.getElementById('hero-last-updated');

    if (sidebarDot && sidebarText) {
      if (data.status === 'running') {
        sidebarDot.style.background = '#38bdf8';
        sidebarDot.style.boxShadow = '0 0 8px #38bdf8';
        sidebarText.innerText = 'Scanning Live Jobs...';
      } else if (data.active) {
        sidebarDot.style.background = '#10b981';
        sidebarDot.style.boxShadow = '0 0 8px #10b981';
        sidebarText.innerText = 'Automation Active';
      } else {
        sidebarDot.style.background = '#f59e0b';
        sidebarDot.style.boxShadow = '0 0 8px #f59e0b';
        sidebarText.innerText = 'Automation Paused';
      }
    }

    if (sidebarTimer && data.nextRun) {
      const d = new Date(data.nextRun);
      const diffMin = Math.round((d.getTime() - Date.now()) / (1000 * 60));
      if (diffMin > 0) {
        const hrs = Math.floor(diffMin / 60);
        const mins = diffMin % 60;
        sidebarTimer.innerText = `Next scan in ${hrs > 0 ? hrs + 'h ' : ''}${mins}m`;
      } else {
        sidebarTimer.innerText = 'Scan imminent...';
      }
    }

    if (heroUpdated && data.lastRun) {
      const d = new Date(data.lastRun);
      heroUpdated.innerText = 'Last updated: ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } catch (err) {
    console.warn('Failed to fetch scheduler status:', err.message);
  }
}

// Setup Navigation Tabs
function setupTabs() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');

      if (targetTab === 'resume') {
        const topReady = allJobs.find(j => j.cv_file);
        const cvFile = topReady ? topReady.cv_file : 'cv/Vijay_Kumar_Senior_QA_CV.pdf';
        const label = topReady ? `${topReady.company} - Tailored CV (PDF)` : 'Vijay Kumar - Master CV';
        viewDoc(cvFile, label);
        return;
      }

      if (targetTab === 'cover-letter') {
        const topReady = allJobs.find(j => j.cover_letter_file);
        const clFile = topReady ? topReady.cover_letter_file : 'cover_letters/Vijay_Kumar_Cover_Letter.pdf';
        const label = topReady ? `${topReady.company} - Tailored Cover Letter (PDF)` : 'Vijay Kumar - Master Cover Letter';
        viewDoc(clFile, label);
        return;
      }

      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      let activePaneId = `tab-${targetTab}`;
      // Map Search to Applications table tab and default to All positions
      if (targetTab === 'search') {
        activePaneId = 'tab-applications';
        setTableFilter('all');
      }
      if (targetTab === 'applications') {
        activePaneId = 'tab-applications';
        const interviewCount = allJobs.filter(j => (j.status || '').toLowerCase() === 'interview').length;
        if (currentTableFilter === 'interview' && interviewCount === 0) {
          setTableFilter('all');
        } else {
          renderTable();
        }
      }
      if (targetTab === 'analytics') activePaneId = 'tab-dashboard';
      if (targetTab === 'interviews') {
        activePaneId = 'tab-ai-toolkit';
        switchSubtool('interview');
      }

      const activePane = document.getElementById(activePaneId);
      if (activePane) {
        activePane.classList.add('active');
      } else {
        const fallback = document.getElementById('tab-dashboard');
        if (fallback) fallback.classList.add('active');
      }

      if (targetTab === 'compare') {
        renderCompareMatrix();
      }
      if (targetTab === 'ai-toolkit') {
        loadSubtoolData();
      }
      if (targetTab === 'ai-agent') {
        initAgentModule();
      }
      if (targetTab === 'company') {
        populateCompanyResearch();
      }
    });
  });
}

// Set active table filter pill and re-render
function setTableFilter(filter = 'all') {
  currentTableFilter = filter;
  document.querySelectorAll('.app-filter-pill').forEach(btn => {
    if (btn.getAttribute('data-filter') === filter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderTable();
}
window.setTableFilter = setTableFilter;

// Helper to switch to applications list
function switchToListTab(status) {
  const appNav = document.querySelector('.nav-btn[data-tab="applications"]');
  if (appNav) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    appNav.classList.add('active');
  }

  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const activePane = document.getElementById('tab-applications');
  if (activePane) activePane.classList.add('active');

  let filter = 'all';
  if (status === 'applied') {
    filter = 'applied';
  } else if (status === 'interview') {
    filter = 'interview';
  } else if (['ready', 'drafted', 'discovered', 'shortlisted'].includes(status)) {
    filter = 'pending';
  }

  setTableFilter(filter);
}
window.switchToListTab = switchToListTab;

// Fetch Jobs from API
async function fetchJobs() {
  try {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    if (data.success) {
      allJobs = data.jobs;
      renderAll();
    }
  } catch (err) {
    console.error('Failed to load jobs:', err);
  }
}

// Dynamic Match By Role Breakdown for Vijay Kumar (Automation + Manual + SDET + Lead)
function updateMatchByRole() {
  if (!allJobs || allJobs.length === 0) return;

  let qaCount = 0;
  let manualCount = 0;
  let sdetCount = 0;
  let leadCount = 0;

  allJobs.forEach(job => {
    const role = (job.role || '').toLowerCase();
    const notes = (job.notes || '').toLowerCase();
    if (role.includes('manual') || notes.includes('manual testing') || notes.includes('manual qa') || role.includes('functional test')) {
      manualCount++;
    } else if (role.includes('sdet')) {
      sdetCount++;
    } else if (role.includes('lead') || role.includes('manager') || role.includes('architect') || role.includes('principal') || role.includes('specialist')) {
      leadCount++;
    } else {
      qaCount++;
    }
  });

  const total = allJobs.length || 1;
  const qaPct = Math.round((qaCount / total) * 100);
  const manualPct = Math.round((manualCount / total) * 100);
  const sdetPct = Math.round((sdetCount / total) * 100);
  const leadPct = Math.max(0, 100 - qaPct - manualPct - sdetPct);

  // Circumference of r=38 circle: 2 * PI * 38 ≈ 238.76
  const circ = 238.76;
  const qaLen = (qaPct / 100) * circ;
  const manualLen = (manualPct / 100) * circ;
  const sdetLen = (sdetPct / 100) * circ;
  const leadLen = (leadPct / 100) * circ;

  const seg1 = document.getElementById('donut-seg-1');
  const seg2 = document.getElementById('donut-seg-2');
  const seg3 = document.getElementById('donut-seg-3');
  const seg4 = document.getElementById('donut-seg-4');

  if (seg1) {
    seg1.setAttribute('stroke-dasharray', `${qaLen.toFixed(1)} ${(circ - qaLen).toFixed(1)}`);
    seg1.setAttribute('stroke-dashoffset', '0');
  }
  if (seg2) {
    seg2.setAttribute('stroke-dasharray', `${manualLen.toFixed(1)} ${(circ - manualLen).toFixed(1)}`);
    seg2.setAttribute('stroke-dashoffset', `-${qaLen.toFixed(1)}`);
  }
  if (seg3) {
    seg3.setAttribute('stroke-dasharray', `${sdetLen.toFixed(1)} ${(circ - sdetLen).toFixed(1)}`);
    seg3.setAttribute('stroke-dashoffset', `-${(qaLen + manualLen).toFixed(1)}`);
  }
  if (seg4) {
    seg4.setAttribute('stroke-dasharray', `${leadLen.toFixed(1)} ${(circ - leadLen).toFixed(1)}`);
    seg4.setAttribute('stroke-dashoffset', `-${(qaLen + manualLen + sdetLen).toFixed(1)}`);
  }

  const statQa = document.getElementById('donut-stat-qa');
  if (statQa) statQa.innerText = `${qaPct}% (${qaCount})`;

  const statManual = document.getElementById('donut-stat-manual');
  if (statManual) statManual.innerText = `${manualPct}% (${manualCount})`;

  const statSdet = document.getElementById('donut-stat-sdet');
  if (statSdet) statSdet.innerText = `${sdetPct}% (${sdetCount})`;

  const statLead = document.getElementById('donut-stat-lead');
  if (statLead) statLead.innerText = `${leadPct}% (${leadCount})`;
}

// Dynamic Upcoming Interviews Widget
function renderUpcomingInterviews() {
  const container = document.getElementById('dashboard-interview-list');
  if (!container) return;

  const interviewJobs = allJobs.filter(j => (j.status || '').toLowerCase() === 'interview');
  if (interviewJobs.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px 14px; text-align: center; color: var(--text-muted); background: #f8fafc; border: 1px dashed var(--border-light); border-radius: 12px; margin: 4px 0;">
        <div style="font-size: 24px; margin-bottom: 6px;">📅</div>
        <div style="font-weight: 700; font-size: 13px; color: var(--text-primary); margin-bottom: 4px;">No Interviews Scheduled Yet</div>
        <div style="font-size: 11.5px; line-height: 1.4;">When an interview is scheduled, set the job status to <strong>Interview</strong> and it will appear here.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = interviewJobs.map(j => {
    const initial = (j.company || 'C').charAt(0).toUpperCase();
    return `
      <div class="interview-item">
        <div class="interview-brand-info">
          <div class="interview-logo" style="background:#0284c7; color:#fff; font-weight:800; border-radius:8px; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">${escapeHtml(initial)}</div>
          <div class="interview-meta">
            <h4>${escapeHtml(j.company)}</h4>
            <p>${escapeHtml(j.role)}</p>
            <p style="font-size:10px; color:#94a3b8;">${escapeHtml(j.date || 'Today')} • Scheduled</p>
          </div>
        </div>
        <span class="interview-days-badge" style="background:rgba(16,185,129,0.1); color:#059669; border:1px solid rgba(16,185,129,0.25);">Active</span>
      </div>
    `;
  }).join('');
}

// Date Format Helpers
function formatDateDisplay(dStr) {
  if (!dStr) return '—';
  try {
    const parts = dStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
      const day = parseInt(parts[2], 10);
      return `${month} ${day}, ${year}`;
    }
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (e) {}
  return dStr;
}

function formatDateShort(dStr) {
  if (!dStr) return '—';
  try {
    const parts = dStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
      const day = parseInt(parts[2], 10);
      return `${month} ${day}`;
    }
  } catch (e) {}
  return dStr;
}

// Render Day-by-Day Scraping Breakdown
function renderDailyScrapingActivity() {
  const container = document.getElementById('daily-scraping-pills');
  const subtitle = document.getElementById('daily-scraping-subtitle');
  if (!container) return;

  const dailyMap = {};
  allJobs.forEach(j => {
    const d = (j.date || 'Unknown').split('T')[0];
    if (!dailyMap[d]) {
      dailyMap[d] = { date: d, count: 0, drafted: 0, applied: 0, highFit: 0 };
    }
    dailyMap[d].count++;
    if (j.status === 'drafted') dailyMap[d].drafted++;
    if (j.status === 'applied') dailyMap[d].applied++;
    if (parseInt(j.fit_rating || '0', 10) >= 90) dailyMap[d].highFit++;
  });

  const sortedDates = Object.keys(dailyMap).sort().reverse();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = dailyMap[todayStr]?.count || 0;

  if (subtitle) {
    subtitle.innerHTML = `<strong>${todayCount}</strong> scraped today • <strong>${allJobs.length}</strong> total in pipeline`;
  }

  container.innerHTML = sortedDates.map(date => {
    const stats = dailyMap[date];
    const isToday = date === todayStr;
    const label = isToday ? `Today (${formatDateShort(date)})` : formatDateDisplay(date);
    return `
      <div class="daily-pill-card" onclick="filterByScrapeDate('${date}')" title="Click to view all ${stats.count} jobs scraped on ${date}" style="cursor:pointer; background:${isToday ? 'rgba(56, 189, 248, 0.12)' : 'rgba(241, 245, 249, 0.9)'}; border:1px solid ${isToday ? 'rgba(56, 189, 248, 0.4)' : '#e2e8f0'}; padding:6px 12px; border-radius:10px; font-size:11px; display:inline-flex; align-items:center; gap:8px; transition:all 0.15s ease;">
        <span style="font-weight:700; color:${isToday ? '#0284c7' : 'var(--text-primary)'};">📅 ${label}:</span>
        <span style="background:${isToday ? '#0284c7' : '#64748b'}; color:#fff; padding:1px 6px; border-radius:10px; font-size:10px; font-weight:800;">${stats.count} scraped</span>
        <span style="color:#059669; font-size:10px; font-weight:700;">${stats.drafted} drafted</span>
      </div>
    `;
  }).join('');
}

function filterByScrapeDate(date) {
  const navBtn = document.querySelector('[data-tab="applications"]');
  if (navBtn) navBtn.click();
  const sel = document.getElementById('filter-date-select');
  if (sel) {
    let opt = Array.from(sel.options).find(o => o.value === `date:${date}`);
    if (!opt) {
      opt = document.createElement('option');
      opt.value = `date:${date}`;
      opt.innerText = `📅 Date: ${formatDateDisplay(date)}`;
      sel.appendChild(opt);
    }
    sel.value = `date:${date}`;
    renderTable();
  }
}

// Update Chart Legend with Real Metrics
function updateChartLegend(total, applied, interview) {
  const legendBox = document.getElementById('chart-legend-box');
  if (legendBox) {
    legendBox.innerHTML = `
      <span><span class="legend-dot blue"></span> Jobs Found (${total})</span>
      <span><span class="legend-dot purple"></span> Applications (${applied})</span>
      <span><span class="legend-dot green"></span> Interviews (${interview})</span>
    `;
  }
}

// Render All Components
function renderAll() {
  updateKPIs();
  updateCompareDock();
  renderDashboardKanban();
  renderDailyScrapingActivity();
  renderTable();
  renderCompareMatrix();
  populateAtsJobSelector();
  populateStratJobSelector();
  populateCompanyResearch();
}

// Update KPI Stats (matching live data from tracker)
function updateKPIs() {
  const total = allJobs.length;
  const discovered = allJobs.filter(j => (j.status || '').toLowerCase() === 'discovered').length;
  const drafted = allJobs.filter(j => (j.status || '').toLowerCase() === 'drafted').length;
  const shortlisted = allJobs.filter(j => parseInt(j.fit_rating || '0', 10) >= 90).length;
  const applied = allJobs.filter(j => (j.status || '').toLowerCase() === 'applied').length;
  const interview = allJobs.filter(j => (j.status || '').toLowerCase() === 'interview').length;
  const offers = allJobs.filter(j => (j.status || '').toLowerCase() === 'offer').length;

  const totalEl = document.getElementById('kpi-total-found');
  if (totalEl) totalEl.innerText = total;

  const badgeEl = document.getElementById('total-badge');
  if (badgeEl) badgeEl.innerText = total;

  const shortlistedEl = document.getElementById('kpi-shortlisted');
  if (shortlistedEl) shortlistedEl.innerText = shortlisted;

  const appliedEl = document.getElementById('kpi-applied');
  if (appliedEl) appliedEl.innerText = applied;

  const interviewEl = document.getElementById('kpi-interviews');
  if (interviewEl) interviewEl.innerText = interview;

  const offersEl = document.getElementById('kpi-offers');
  if (offersEl) offersEl.innerText = offers;

  // Average Match %
  const totalFit = allJobs.reduce((acc, j) => acc + (parseInt(j.fit_rating || '85', 10) || 85), 0);
  const avgFit = total > 0 ? Math.round(totalFit / total) : 92;
  const donutAvg = document.getElementById('donut-avg-match');
  if (donutAvg) donutAvg.innerText = `${avgFit}%`;

  // Update dynamic widgets
  updateMatchByRole();
  renderUpcomingInterviews();
  updateChartLegend(total, applied, interview);
}

// Render Dashboard 5-Column Mini Kanban with 100% Real Tracker Data
function renderDashboardKanban() {
  const cols = {
    discovered: document.getElementById('dash-cards-discovered'),
    shortlisted: document.getElementById('dash-cards-shortlisted'),
    ready: document.getElementById('dash-cards-ready'),
    applied: document.getElementById('dash-cards-applied'),
    interview: document.getElementById('dash-cards-interview')
  };

  if (!cols.discovered) return;

  // Role filter on pipeline header
  const roleFilter = (document.getElementById('filter-role-select')?.value || 'all').toLowerCase();

  const filteredJobs = allJobs.filter(j => {
    if (roleFilter === 'all') return true;
    const role = (j.role || '').toLowerCase();
    const notes = (j.notes || '').toLowerCase();
    if (roleFilter === 'manual') return role.includes('manual') || notes.includes('manual testing') || notes.includes('manual qa') || role.includes('functional test');
    if (roleFilter === 'qa') return (role.includes('qa') || role.includes('automation') || role.includes('tester')) && !role.includes('manual');
    if (roleFilter === 'sdet') return role.includes('sdet');
    if (roleFilter === 'lead') return role.includes('lead') || role.includes('manager') || role.includes('architect') || role.includes('principal') || role.includes('specialist');
    return true;
  });

  // Filter jobs by category
  const discoveredJobs = filteredJobs.filter(j => (j.status || '').toLowerCase() === 'discovered');
  const shortlistedJobs = filteredJobs.filter(j => parseInt(j.fit_rating || '0', 10) >= 90);
  const readyJobs = filteredJobs.filter(j => (j.status || '').toLowerCase() === 'drafted');
  const appliedJobs = filteredJobs.filter(j => (j.status || '').toLowerCase() === 'applied');
  const interviewJobs = filteredJobs.filter(j => (j.status || '').toLowerCase() === 'interview');

  // Update count badges strictly from real data
  const cDiscovered = document.getElementById('dash-count-discovered');
  if (cDiscovered) cDiscovered.innerText = discoveredJobs.length;

  const cShortlisted = document.getElementById('dash-count-shortlisted');
  if (cShortlisted) cShortlisted.innerText = shortlistedJobs.length;

  const cReady = document.getElementById('dash-count-ready');
  if (cReady) cReady.innerText = readyJobs.length;

  const cApplied = document.getElementById('dash-count-applied');
  if (cApplied) cApplied.innerText = appliedJobs.length;

  const cInterview = document.getElementById('dash-count-interview');
  if (cInterview) cInterview.innerText = interviewJobs.length;

  // Helper to render compact card
  const createMiniCard = (j) => {
    const isSelected = selectedCompareIds.has(j.id);
    const title = j.role || 'QA Engineer';
    const company = j.company || 'Tech Company';
    const matchPct = j.fit_rating || '85';
    const cvFile = j.cv_file;
    const clFile = j.cover_letter_file;
    const portalUrl = j.source;
    const scrapedDateStr = j.date ? formatDateShort(j.date) : 'Recent';
    const listedDateStr = j.posted_date ? formatDateShort(j.posted_date) : scrapedDateStr;

    return `
      <div class="mini-card" onclick="event.stopPropagation()">
        <div class="mini-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        <div class="mini-card-company">${escapeHtml(company)}</div>
        <div style="font-size:10px; color:var(--text-muted); margin: 3px 0 5px 0; display:flex; gap:6px; flex-wrap:wrap;">
          <span title="Date Scraped">📥 ${scrapedDateStr}</span>
          <span style="opacity:0.6;">•</span>
          <span title="Date Listed by Employer">🗓️ ${listedDateStr}</span>
        </div>
        <div class="mini-card-bottom">
          <span class="mini-match-pill">${matchPct}% match</span>
          <div class="mini-card-actions">
            ${cvFile ? `<a href="/api/pdf?file=${encodeURIComponent(cvFile)}&download=1" download title="Download Tailored CV PDF" style="text-decoration:none; font-size:12px;">📄</a>` : ''}
            ${clFile ? `<a href="/api/pdf?file=${encodeURIComponent(clFile)}&download=1" download title="Download Tailored Cover Letter PDF" style="text-decoration:none; font-size:12px;">✉️</a>` : ''}
            <span style="cursor:pointer; opacity:${isSelected ? '1' : '0.5'}; font-size:12px;" onclick="toggleCompare('${j.id}')" title="${isSelected ? 'Remove from Comparison' : 'Add to Side-by-Side Comparison'}">⚖️</span>
            ${portalUrl ? `<a href="${portalUrl}" target="_blank" style="text-decoration:none; color:inherit; font-size:12px;" title="Open Official Career Portal">↗</a>` : ''}
          </div>
        </div>
      </div>
    `;
  };

  const emptyMsg = (text) => `<div style="padding:14px 10px; font-size:11px; color:var(--text-muted); text-align:center; background:#f8fafc; border:1px dashed var(--border-light); border-radius:8px;">${text}</div>`;

  // 1. Populate Discovered
  cols.discovered.innerHTML = '';
  if (discoveredJobs.length > 0) {
    discoveredJobs.slice(0, 3).forEach(j => {
      cols.discovered.innerHTML += createMiniCard(j);
    });
  } else {
    cols.discovered.innerHTML = emptyMsg('No unreviewed discovered roles');
  }

  // 2. Populate Shortlisted (90%+ Match)
  cols.shortlisted.innerHTML = '';
  if (shortlistedJobs.length > 0) {
    shortlistedJobs.slice(0, 3).forEach(j => {
      cols.shortlisted.innerHTML += createMiniCard(j);
    });
  } else {
    cols.shortlisted.innerHTML = emptyMsg('No shortlisted roles');
  }

  // 3. Populate Ready to Apply (Drafted)
  cols.ready.innerHTML = '';
  if (readyJobs.length > 0) {
    readyJobs.slice(0, 3).forEach(j => {
      cols.ready.innerHTML += createMiniCard(j);
    });
  } else {
    cols.ready.innerHTML = emptyMsg('No drafted applications ready');
  }

  // 4. Populate Applied
  cols.applied.innerHTML = '';
  if (appliedJobs.length > 0) {
    appliedJobs.forEach(j => {
      cols.applied.innerHTML += createMiniCard(j);
    });
  } else {
    cols.applied.innerHTML = emptyMsg('No applied jobs yet. Click "✅ Mark Applied" in table after submitting!');
  }

  // 5. Populate Interview
  cols.interview.innerHTML = '';
  if (interviewJobs.length > 0) {
    interviewJobs.forEach(j => {
      cols.interview.innerHTML += createMiniCard(j);
    });
  } else {
    cols.interview.innerHTML = emptyMsg('No active interviews scheduled yet');
  }
}

// Render All Positions Table
let currentTableFilter = 'all';

function renderTable() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const search = (document.getElementById('global-search')?.value || '').toLowerCase();

  const allCount = allJobs.length;
  const pendingCount = allJobs.filter(j => !['applied', 'interview', 'offer', 'rejected'].includes((j.status || '').toLowerCase())).length;
  const appliedCount = allJobs.filter(j => (j.status || '').toLowerCase() === 'applied').length;
  const interviewCount = allJobs.filter(j => (j.status || '').toLowerCase() === 'interview').length;

  const elAll = document.getElementById('filter-count-all');
  if (elAll) elAll.innerText = allCount;
  const elPending = document.getElementById('filter-count-pending');
  if (elPending) elPending.innerText = pendingCount;
  const elApplied = document.getElementById('filter-count-applied');
  if (elApplied) elApplied.innerText = appliedCount;
  const elInterview = document.getElementById('filter-count-interview');
  if (elInterview) elInterview.innerText = interviewCount;

  let matchedCount = 0;

  allJobs.forEach(job => {
    const status = (job.status || 'discovered').toLowerCase();
    if (currentTableFilter === 'pending' && ['applied', 'interview', 'offer', 'rejected'].includes(status)) return;
    if (currentTableFilter === 'applied' && status !== 'applied') return;
    if (currentTableFilter === 'interview' && status !== 'interview') return;

    // Date Filter check
    const dateFilter = (document.getElementById('filter-date-select')?.value || 'all').toLowerCase();
    if (dateFilter !== 'all') {
      const today = new Date().toISOString().slice(0, 10);
      const jobDate = (job.date || '').split('T')[0];
      if (dateFilter === 'today' && jobDate !== today) return;
      if (dateFilter === 'yesterday') {
        const yest = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
        if (jobDate !== yest) return;
      }
      if (dateFilter.startsWith('date:') && jobDate !== dateFilter.replace('date:', '')) return;
    }

    const textMatch = `${job.company} ${job.role} ${job.notes}`.toLowerCase().includes(search);
    if (!textMatch) return;

    matchedCount++;

    const isApplied = status === 'applied';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center;">
        <input type="checkbox" onchange="toggleCompare('${job.id}')" ${selectedCompareIds.has(job.id) ? 'checked' : ''} style="cursor:pointer; accent-color:var(--primary);" title="Select to compare">
      </td>
      <td><span class="compare-check-pill ${parseInt(job.fit_rating || '85') >= 90 ? 'yes' : 'no'}">${job.fit_rating || '85'}%</span></td>
      <td><strong>${escapeHtml(job.company)}</strong></td>
      <td style="color:var(--primary); font-weight:700;">${escapeHtml(job.role)}</td>
      <td style="white-space:nowrap; font-size:11px;">
        <div style="font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:4px;" title="Date this job was scraped into your portal">
          <span>📥</span> <span>Scraped: ${formatDateDisplay(job.date)}</span>
        </div>
        <div style="color:var(--text-muted); font-size:10.5px; margin-top:2px; display:flex; align-items:center; gap:4px;" title="Date this job was listed by employer">
          <span>🗓️</span> <span>Listed: ${formatDateDisplay(job.posted_date || job.date)}</span>
        </div>
      </td>
      <td>
        <select class="status-select status-${status}" onchange="changeJobStatus('${job.id}', this.value)" title="Change application status">
          <option value="drafted" ${status === 'drafted' ? 'selected' : ''}>⏳ Ready to Apply</option>
          <option value="applied" ${status === 'applied' ? 'selected' : ''}>✅ Applied</option>
          <option value="interview" ${status === 'interview' ? 'selected' : ''}>🎙️ Interviewing</option>
          <option value="offer" ${status === 'offer' ? 'selected' : ''}>🎉 Offer</option>
          <option value="discovered" ${status === 'discovered' ? 'selected' : ''}>🔍 Discovered</option>
          <option value="rejected" ${status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
        </select>
      </td>
      <td style="max-width:240px; font-size:12px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(job.notes || '')}">${escapeHtml(job.notes || '—')}</td>
      <td>
        <div style="display:flex; gap:6px; align-items:center; flex-wrap:nowrap; min-width:260px;">
          ${isApplied ? `
            <span style="background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:4px 10px; border-radius:12px; font-size:11.5px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">
              ✓ Applied
            </span>
          ` : `
            <button class="btn btn-sm btn-mark-applied" onclick="markJobAsApplied('${job.id}')" style="background:#10b981; color:#fff; border:none; font-weight:700; padding:4px 10px; border-radius:6px; cursor:pointer;" title="Click to mark this role as Applied after submitting">
              ✅ Mark Applied
            </button>
          `}
          ${job.cv_file ? `
            <a href="/api/pdf?file=${encodeURIComponent(job.cv_file)}&download=1" class="btn btn-outline btn-sm" download title="Download Tailored CV (PDF)" style="text-decoration:none; font-weight:700;">📄 CV</a>
            <button class="btn btn-outline btn-sm" onclick="viewDoc('${job.cv_file}', '${escapeHtml(job.company)} - Tailored CV')" title="Preview CV PDF" style="padding:4px 6px;">👁️</button>
          ` : `
            <button class="btn btn-outline btn-sm" onclick="generateApplicationForJob('${job.id}')" title="1-Click Tailor CV & Cover Letter" style="font-size:11px; font-weight:700; color:#0284c7; border-color:#bae6fd; background:#f0f9ff; padding:4px 8px;">⚡ Draft Docs</button>
          `}
          ${job.cover_letter_file ? `
            <a href="/api/pdf?file=${encodeURIComponent(job.cover_letter_file)}&download=1" class="btn btn-outline btn-sm" download title="Download Tailored Cover Letter (PDF)" style="text-decoration:none; font-weight:700; color:#7c3aed; border-color:#ddd6fe; background:#f5f3ff;">✉️ Letter</a>
            <button class="btn btn-outline btn-sm" onclick="viewDoc('${job.cover_letter_file}', '${escapeHtml(job.company)} - Cover Letter')" title="Preview Cover Letter PDF" style="padding:4px 6px;">👁️</button>
          ` : ''}
          <button class="btn btn-sm btn-autofill-row" onclick="launchAutoFillForJob('${job.id}')" style="background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#fff; border:none; font-weight:700; padding:4px 9px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="1-Click Launch Playwright browser & Auto-Fill with Vijay's specs">
            ⚡ Auto-Fill
          </button>
          <a href="${job.source || `https://www.google.com/search?q=${encodeURIComponent(job.company + ' ' + job.role + ' careers apply')}&ibp=htl;jobs`}" onclick="handlePortalClick('${job.id}')" target="_blank" class="btn btn-primary btn-sm" style="text-decoration:none; background: linear-gradient(135deg, #0284c7, #0369a1); border:none; font-weight:700;" title="Open Official Company Career Portal">🏢 Portal ↗</a>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (matchedCount === 0) {
    const tr = document.createElement('tr');
    let title = "No Positions Found";
    let desc = "There are currently no positions matching your search or view filter.";
    let icon = "🔍";

    if (currentTableFilter === 'interview') {
      icon = "📅";
      title = "No Interview Invitations Scheduled Yet";
      desc = "You currently have 108 opportunities ready to apply and 2 submitted applications. When a company schedules an interview with you, select <strong>🎙️ Interviewing</strong> in the status column of that job, and it will be highlighted here.";
    } else if (currentTableFilter === 'applied') {
      icon = "✅";
      title = "No Applied Jobs Found";
      desc = "You haven't marked any positions as applied yet. Submit an application through the company's portal and click <strong>✅ Mark Applied</strong> to track it here.";
    }

    tr.innerHTML = `
      <td colspan="8" style="text-align:center; padding:50px 20px; background:#f8fafc; border-bottom:1px solid var(--border-light);">
        <div style="font-size:36px; margin-bottom:10px;">${icon}</div>
        <div style="font-size:16px; font-weight:800; color:#0f172a; margin-bottom:6px;">${title}</div>
        <div style="font-size:13px; color:#64748b; max-width:520px; margin:0 auto 18px; line-height:1.5;">${desc}</div>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button class="btn btn-primary btn-sm" onclick="setTableFilter('all')">View All Opportunities (${allCount})</button>
          <button class="btn btn-outline btn-sm" onclick="setTableFilter('pending')">View Ready to Apply (${pendingCount})</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

// ==========================================
// PolicyBazaar-Style Job Comparison Logic
// ==========================================

function toggleCompare(id) {
  if (selectedCompareIds.has(id)) {
    selectedCompareIds.delete(id);
  } else {
    if (selectedCompareIds.size >= 4) {
      alert('You can compare up to 4 roles simultaneously side-by-side.');
      return;
    }
    selectedCompareIds.add(id);
  }
  updateCompareDock();
  renderAll();
}

function updateCompareDock() {
  const dock = document.getElementById('comparison-dock');
  const count = selectedCompareIds.size;
  const countText = document.getElementById('dock-count-text');
  const btnCount = document.getElementById('dock-btn-count');
  const badge = document.getElementById('compare-badge');

  if (badge) badge.innerText = count;
  if (btnCount) btnCount.innerText = count;

  if (dock && countText) {
    if (count > 0) {
      dock.style.display = 'block';
      countText.innerText = `${count} Role${count > 1 ? 's' : ''} Selected for Comparison`;
    } else {
      dock.style.display = 'none';
    }
  }
}

function quickCompareTop() {
  selectedCompareIds.clear();
  // Sort by fit rating descending
  const sorted = [...allJobs].sort((a, b) => (parseInt(b.fit_rating || '0') || 0) - (parseInt(a.fit_rating || '0') || 0));
  const top3 = sorted.slice(0, 3);
  top3.forEach(j => selectedCompareIds.add(j.id));
  updateCompareDock();
  renderAll();
  const navBtnCompare = document.getElementById('nav-btn-compare');
  if (navBtnCompare) navBtnCompare.click();
  showToast('✨ PolicyBazaar View: Benchmarking top 3 high-fit opportunities!', true);
}

function clearCompare() {
  selectedCompareIds.clear();
  updateCompareDock();
  renderAll();
}

function renderCompareMatrix() {
  const container = document.getElementById('compare-matrix-container');
  const emptyState = document.getElementById('compare-empty-state');
  if (!container || !emptyState) return;

  const compareJobs = allJobs.filter(j => selectedCompareIds.has(j.id));

  if (compareJobs.length === 0) {
    emptyState.style.display = 'block';
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  emptyState.style.display = 'none';
  container.style.display = 'block';

  let html = `
    <table class="compare-table">
      <thead>
        <tr>
          <th class="feature-col">Feature / Benchmark</th>
          ${compareJobs.map(job => `
            <th class="job-col">
              <div class="compare-job-header">
                <button class="compare-remove-btn" onclick="toggleCompare('${job.id}')" title="Remove from comparison">✕</button>
                <div style="font-size:16px; font-weight:800; color:#0f172a;">${escapeHtml(job.company)}</div>
                <div style="font-size:12px; color:var(--primary); font-weight:700; line-height:1.3;">${escapeHtml(job.role)}</div>
                <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(job.sector || 'Tech')}</div>
              </div>
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
        <!-- 1. Overall Match Score -->
        <tr>
          <td class="feature-col">🎯 Match Fit Score</td>
          ${compareJobs.map(job => {
            const fit = parseInt(job.fit_rating || '85', 10);
            const isTop = fit >= 90;
            return `
              <td>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:22px; font-weight:800; color:${isTop ? 'var(--accent-green)' : 'var(--primary)'};">${fit}%</span>
                  <span class="compare-check-pill ${isTop ? 'yes' : 'no'}">${isTop ? '⭐ Top Tier' : 'Strong Fit'}</span>
                </div>
                <div style="width:100%; height:6px; background:#e2e8f0; border-radius:3px; margin-top:6px; overflow:hidden;">
                  <div style="width:${fit}%; height:100%; background:${isTop ? 'var(--accent-green)' : 'var(--primary)'}; border-radius:3px;"></div>
                </div>
              </td>
            `;
          }).join('')}
        </tr>

        <!-- 2. Application Pipeline Status -->
        <tr>
          <td class="feature-col">📋 Pipeline Status</td>
          ${compareJobs.map(job => `
            <td>
              <span class="status-tag status-${job.status || 'discovered'}" style="text-transform:uppercase; font-size:10px; font-weight:800;">
                ${job.status || 'discovered'}
              </span>
            </td>
          `).join('')}
        </tr>

        <!-- 3. Work Mode & Location -->
        <tr>
          <td class="feature-col">📍 Work Mode & Location</td>
          ${compareJobs.map(job => {
            const text = (job.notes || '') + ' ' + (job.role || '');
            const isRemote = text.toLowerCase().includes('remote') || (job.role_type || '').toLowerCase().includes('remote');
            return `
              <td>
                <div style="font-size:12px; font-weight:700; color:#0f172a;">
                  ${isRemote ? '🌐 Remote / Hybrid' : '🏢 In-Office / Tech Hub'}
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                  ${escapeHtml(job.role_type || 'Full-time')} • India / Global ATS
                </div>
              </td>
            `;
          }).join('')}
        </tr>

        <!-- 4. Playwright & TypeScript Coverage -->
        <tr>
          <td class="feature-col">⚡ Playwright & TS Stack</td>
          ${compareJobs.map(job => {
            const text = (job.role + ' ' + (job.notes || '')).toLowerCase();
            const hasPlaywright = text.includes('playwright');
            const hasTs = text.includes('typescript') || text.includes(' ts ') || text.includes('javascript') || text.includes(' js ');
            return `
              <td>
                ${hasPlaywright ? `
                  <span class="compare-check-pill yes">✅ Playwright ${hasTs ? '+ TypeScript' : ''}</span>
                ` : `
                  <span class="compare-check-pill no">⚠️ Test Automation Stack</span>
                `}
              </td>
            `;
          }).join('')}
        </tr>

        <!-- 5. CI/CD Quality Gates -->
        <tr>
          <td class="feature-col">🔄 CI/CD & Pipelines</td>
          ${compareJobs.map(job => {
            const text = (job.role + ' ' + (job.notes || '')).toLowerCase();
            const hasCicd = text.includes('ci/cd') || text.includes('pipeline') || text.includes('jenkins') || text.includes('github actions');
            return `
              <td>
                ${hasCicd ? `
                  <span class="compare-check-pill yes">✅ Automated CI/CD Gates</span>
                ` : `
                  <span class="compare-check-pill yes">✅ Standard QA Automation</span>
                `}
              </td>
            `;
          }).join('')}
        </tr>

        <!-- 6. QA Leadership & Ownership -->
        <tr>
          <td class="feature-col">👥 Senior / Lead Scope</td>
          ${compareJobs.map(job => {
            const text = (job.role + ' ' + (job.notes || '')).toLowerCase();
            const isLead = text.includes('lead') || text.includes('senior') || text.includes('architect') || text.includes('mentor');
            return `
              <td>
                ${isLead ? `
                  <span class="compare-check-pill yes">✅ Lead / Senior QA Scope</span>
                ` : `
                  <span class="compare-check-pill no">Individual Contributor / SDET</span>
                `}
              </td>
            `;
          }).join('')}
        </tr>

        <!-- 7. Tailored ModernCV (PDF) -->
        <tr>
          <td class="feature-col">📄 Tailored 1-Page CV</td>
          ${compareJobs.map(job => `
            <td>
              ${job.cv_file ? `
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <span style="font-size:11px; color:var(--accent-green); font-weight:700;">✅ Compiled 1-Page ModernCV</span>
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <a href="/api/pdf?file=${encodeURIComponent(job.cv_file)}&download=1" class="btn btn-primary btn-sm" download style="text-decoration:none;">📥 Download PDF</a>
                    <button class="btn btn-outline btn-sm" onclick="viewDoc('${job.cv_file}', '${escapeHtml(job.company)} - CV')">👁️ View</button>
                  </div>
                </div>
              ` : `
                <button class="btn btn-primary btn-sm" onclick="generateApp('${job.id}')">⚡ Generate CV (PDF)</button>
              `}
            </td>
          `).join('')}
        </tr>

        <!-- 8. Tailored Cover Letter (PDF) -->
        <tr>
          <td class="feature-col">✉️ Tailored Cover Letter</td>
          ${compareJobs.map(job => `
            <td>
              ${job.cover_letter_file ? `
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <span style="font-size:11px; color:var(--accent-green); font-weight:700;">✅ Tailored Letter Ready</span>
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <a href="/api/pdf?file=${encodeURIComponent(job.cover_letter_file)}&download=1" class="btn btn-outline btn-sm" download style="text-decoration:none;">📥 Download PDF</a>
                    <button class="btn btn-outline btn-sm" onclick="viewDoc('${job.cover_letter_file}', '${escapeHtml(job.company)} - Cover Letter')">👁️ View</button>
                  </div>
                </div>
              ` : `
                <span style="color:var(--text-dim); font-size:11px;">Will generate on click</span>
              `}
            </td>
          `).join('')}
        </tr>

        <!-- 9. Direct Official Career Portal -->
        <tr>
          <td class="feature-col">🏢 Official Career Portal</td>
          ${compareJobs.map(job => {
            const fallbackSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(job.company + ' ' + job.role + ' careers apply')}&ibp=htl;jobs`;
            const targetUrl = job.source || fallbackSearchUrl;
            let domain = 'Official Portal';
            try {
              if (job.source) domain = new URL(job.source).hostname.replace(/^www\./, '');
            } catch (e) {}

            return `
              <td>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <span style="font-size:10px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:0.4px;">
                    🌐 ${domain}
                  </span>
                  <a href="${targetUrl}" target="_blank" class="btn btn-primary btn-sm" style="text-decoration:none; background:linear-gradient(135deg, #10b981, #059669); border:none; justify-content:center; font-weight:700;" title="Apply directly on company portal">
                    🏢 Apply on Portal ↗
                  </a>
                </div>
              </td>
            `;
          }).join('')}
        </tr>
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// Modal Setup
function setupModals() {
  const docModal = document.getElementById('doc-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const doneBtn = document.getElementById('btn-close-modal');

  if (closeBtn) closeBtn.addEventListener('click', () => docModal.classList.remove('open'));
  if (doneBtn) doneBtn.addEventListener('click', () => docModal.classList.remove('open'));

  const btnToggleLatex = document.getElementById('btn-toggle-latex');
  if (btnToggleLatex) {
    btnToggleLatex.addEventListener('click', () => {
      const pdfContainer = document.getElementById('modal-pdf-container');
      const latexContainer = document.getElementById('modal-latex-container');
      if (pdfContainer.style.display === 'none') {
        pdfContainer.style.display = 'flex';
        latexContainer.style.display = 'none';
        btnToggleLatex.innerText = '{ } LaTeX';
      } else {
        pdfContainer.style.display = 'none';
        latexContainer.style.display = 'block';
        btnToggleLatex.innerText = '📄 Show PDF';
      }
    });
  }

  // Add Job Modal
  const addModal = document.getElementById('add-modal');
  const addClose = document.getElementById('add-modal-close');
  const addCancel = document.getElementById('add-modal-cancel');
  if (addClose) addClose.addEventListener('click', () => addModal.classList.remove('open'));
  if (addCancel) addCancel.addEventListener('click', () => addModal.classList.remove('open'));

  const addForm = document.getElementById('add-job-form');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        company: document.getElementById('add-company').value,
        role: document.getElementById('add-role').value,
        source: document.getElementById('add-url').value,
        fit_rating: document.getElementById('add-fit').value,
        notes: document.getElementById('add-notes').value
      };

      try {
        const res = await fetch('/api/jobs/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          addModal.classList.remove('open');
          addForm.reset();
          fetchJobs();
          showToast(`Saved ${payload.company} to pipeline!`, true);
        }
      } catch (err) {
        alert('Error adding job: ' + err.message);
      }
    });
  }

  // Fast-Track 50-Job Modal Wiring
  const ftClose = document.getElementById('fast-track-close-btn');
  const btnFastTrackQa = document.getElementById('qa-btn-fast-track');
  const btnFastTrackTable = document.getElementById('btn-fast-track-table');

  if (ftClose) ftClose.addEventListener('click', closeFastTrackModal);
  if (btnFastTrackQa) btnFastTrackQa.addEventListener('click', openFastTrackModal);
  if (btnFastTrackTable) btnFastTrackTable.addEventListener('click', openFastTrackModal);

  const ftBtnPrev = document.getElementById('ft-btn-prev');
  const ftBtnSkip = document.getElementById('ft-btn-skip');
  const ftBtnMarkNext = document.getElementById('ft-btn-mark-next');

  if (ftBtnPrev) {
    ftBtnPrev.addEventListener('click', () => {
      if (fastTrackIndex > 0) {
        fastTrackIndex--;
        renderFastTrackCard();
      }
    });
  }
  if (ftBtnSkip) {
    ftBtnSkip.addEventListener('click', () => {
      fastTrackIndex++;
      renderFastTrackCard();
    });
  }
  if (ftBtnMarkNext) {
    ftBtnMarkNext.addEventListener('click', async () => {
      const currentJob = fastTrackQueue[fastTrackIndex];
      if (currentJob) {
        await markJobAsApplied(currentJob.id);
        showToast(`✓ Marked ${currentJob.company} as Applied! Moving to next...`, true);
      }
      fastTrackIndex++;
      renderFastTrackCard();
    });
  }

  const ftBtnSubmitCode = document.getElementById('ft-btn-submit-code');
  if (ftBtnSubmitCode) {
    ftBtnSubmitCode.addEventListener('click', async () => {
      const input = document.getElementById('ft-input-code');
      const code = (input?.value || '').trim();
      const statusEl = document.getElementById('ft-code-status');
      if (!code) {
        showToast('Please enter the 6-digit verification code.', false);
        return;
      }
      ftBtnSubmitCode.disabled = true;
      ftBtnSubmitCode.innerText = 'Submitting...';
      try {
        const res = await fetch('/api/jobs/submit-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const d = await res.json();
        if (d.success) {
          if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.innerText = `✓ Code ${code} injected! Verification proceeding...`;
          }
          showToast('Verification code injected into browser!', true);
        } else {
          showToast('Failed to submit code: ' + d.error, false);
        }
      } catch (e) {
        showToast('Error: ' + e.message, false);
      } finally {
        ftBtnSubmitCode.disabled = false;
        ftBtnSubmitCode.innerText = '⚡ Send Code to Browser';
      }
    });
  }

  // Floating Dock Controls
  const floatClose = document.getElementById('float-close-dock');
  const floatBtnStop = document.getElementById('float-btn-stop');
  const floatBtnMark = document.getElementById('float-btn-mark-applied');
  const floatBtnCode = document.getElementById('float-btn-submit-code');

  if (floatClose) {
    floatClose.addEventListener('click', () => {
      const dock = document.getElementById('floating-autofill-dock');
      if (dock) dock.style.display = 'none';
    });
  }
  if (floatBtnStop) {
    floatBtnStop.addEventListener('click', async () => {
      try {
        await fetch('/api/jobs/stop-autofill', { method: 'POST' });
        const dock = document.getElementById('floating-autofill-dock');
        if (dock) dock.style.display = 'none';
        showToast('Auto-fill session ended.', true);
      } catch (e) {}
    });
  }
  if (floatBtnMark) {
    floatBtnMark.addEventListener('click', async () => {
      if (activeAutofillJob) {
        await markJobAsApplied(activeAutofillJob.id);
        const dock = document.getElementById('floating-autofill-dock');
        if (dock) dock.style.display = 'none';
      }
    });
  }
  if (floatBtnCode) {
    floatBtnCode.addEventListener('click', async () => {
      const input = document.getElementById('float-input-code');
      const code = (input?.value || '').trim();
      const msg = document.getElementById('float-code-msg');
      if (!code) return;
      try {
        const res = await fetch('/api/jobs/submit-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const d = await res.json();
        if (d.success) {
          if (msg) {
            msg.style.display = 'block';
            msg.innerText = `✓ Code ${code} injected!`;
          }
          showToast(`Code ${code} injected into browser!`, true);
        }
      } catch (e) {}
    });
  }
}

// View Document (PDF + LaTeX)
async function viewDoc(filePath, title) {
  const modal = document.getElementById('doc-modal');
  document.getElementById('modal-title').innerText = title;

  const pdfFrame = document.getElementById('modal-pdf-frame');
  const pdfContainer = document.getElementById('modal-pdf-container');
  const latexContainer = document.getElementById('modal-latex-container');
  const btnToggleLatex = document.getElementById('btn-toggle-latex');
  const downloadBtn = document.getElementById('btn-download-pdf-modal');
  const fullscreenBtn = document.getElementById('btn-open-pdf-modal');

  pdfContainer.style.display = 'flex';
  latexContainer.style.display = 'none';
  if (btnToggleLatex) btnToggleLatex.innerText = '{ } LaTeX';

  const pdfUrl = `/api/pdf?file=${encodeURIComponent(filePath)}`;
  pdfFrame.src = pdfUrl;
  if (downloadBtn) downloadBtn.href = `${pdfUrl}&download=1`;
  if (fullscreenBtn) fullscreenBtn.href = pdfUrl;

  try {
    const res = await fetch(`/api/document?file=${encodeURIComponent(filePath)}`);
    const text = await res.text();
    document.getElementById('modal-doc-text').value = text;
  } catch (err) {
    document.getElementById('modal-doc-text').value = 'LaTeX source inspection not available.';
  }

  modal.classList.add('open');
}

function setupSearch() {
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderTable();
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==========================================================================
// AI CAREER TOOLKIT (AIApply.co Style)
// ==========================================================================

let activeSubtool = 'ats';
let activeInterviewCat = 'all';
let activeOutreachType = 'hiring_manager';

function switchSubtool(subtoolName) {
  activeSubtool = subtoolName;
  document.querySelectorAll('.toolkit-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-subtool') === subtoolName);
  });
  document.querySelectorAll('.toolkit-panel').forEach(panel => {
    panel.style.display = panel.id === `subtool-${subtoolName}` ? 'block' : 'none';
    panel.classList.toggle('active', panel.id === `subtool-${subtoolName}`);
  });
  loadSubtoolData();
}

function loadSubtoolData() {
  if (activeSubtool === 'interview') {
    loadInterviewQuestions();
  } else if (activeSubtool === 'outreach') {
    const bodyBox = document.getElementById('outreach-body-box');
    if (bodyBox && !bodyBox.value) {
      generateOutreach();
    }
  } else if (activeSubtool === 'autofill') {
    loadAutoFillSnippets();
  } else if (activeSubtool === 'strategist') {
    loadStrategistData();
  }
}

function populateAtsJobSelector() {
  const sel = document.getElementById('ats-job-selector');
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">-- Choose a tracked position or enter custom below --</option>';

  const sorted = [...allJobs].sort((a, b) => (parseInt(b.fit_rating || 0) - parseInt(a.fit_rating || 0)));
  sorted.forEach(job => {
    const opt = document.createElement('option');
    opt.value = job.id;
    opt.innerText = `${job.company} — ${job.role} (${job.fit_rating || 85}% Match)`;
    sel.appendChild(opt);
  });

  if (currentVal) sel.value = currentVal;
}

function populateStratJobSelector() {
  const sel = document.getElementById('strat-job-selector');
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">-- Choose tracked job or enter details below --</option>';

  const sorted = [...allJobs].sort((a, b) => (parseInt(b.fit_rating || 0) - parseInt(a.fit_rating || 0)));
  sorted.forEach(job => {
    const opt = document.createElement('option');
    opt.value = job.id;
    opt.innerText = `${job.company} — ${job.role} (${job.fit_rating || 85}% Match)`;
    sel.appendChild(opt);
  });

  if (currentVal) sel.value = currentVal;
}

function copyToClipboard(text, label = 'Content') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`📋 Copied ${label} to clipboard!`, true);
    }).catch(() => fallbackCopy(text, label));
  } else {
    fallbackCopy(text, label);
  }
}

function fallbackCopy(text, label) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(`📋 Copied ${label} to clipboard!`, true);
  } catch (e) {
    showToast(`Failed to copy: ${e.message}`, false);
  }
  document.body.removeChild(ta);
}

function setupAiToolkit() {
  // Sub-Navigation Tabs
  document.querySelectorAll('.toolkit-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.getAttribute('data-subtool');
      if (sub) switchSubtool(sub);
    });
  });

  // SUBTOOL 1: ATS Scanner Controls
  const jobSelector = document.getElementById('ats-job-selector');
  if (jobSelector) {
    jobSelector.addEventListener('change', () => {
      const selectedId = jobSelector.value;
      if (!selectedId) return;
      const job = allJobs.find(j => j.id === selectedId);
      if (job) {
        document.getElementById('ats-input-role').value = job.role || 'Senior QA Automation Engineer';
        document.getElementById('ats-input-company').value = job.company || 'Tech Company';
        document.getElementById('ats-input-jd').value = `Company: ${job.company}\nRole: ${job.role}\nSector: ${job.sector || 'Software'}\nKey Requirements: ${job.notes || 'Playwright, TypeScript, CI/CD pipeline automation, test framework design, API validation'}\nStatus: ${job.status || 'Active'}`;
        runAtsScan();
      }
    });
  }

  const btnLoadSampleJd = document.getElementById('btn-load-sample-jd');
  if (btnLoadSampleJd) {
    btnLoadSampleJd.addEventListener('click', () => {
      document.getElementById('ats-input-role').value = 'Senior SDET / QA Automation Lead';
      document.getElementById('ats-input-company').value = 'Willware Technologies';
      document.getElementById('ats-input-jd').value = `We are looking for a Senior SDET / QA Automation Lead to drive the quality assurance and test automation strategy for our high-scale cloud platforms.
Responsibilities:
- Architect and maintain end-to-end test automation frameworks using Playwright and TypeScript/JavaScript.
- Integrate automated regression suites into CI/CD pipelines (Jenkins, GitHub Actions) to gate pull requests.
- Lead and mentor junior QA engineers in writing clean test scripts and adhering to Page Object Model (POM) architecture.
- Conduct robust API testing using Postman/REST and validate microservices communication under high load.
- Collaborate with developers and product managers to streamline defect triage in JIRA and maintain zero-defect releases.
- Implement cross-browser and cross-device testing strategies using BrowserStack.
Requirements:
- 4-7 years of software test automation experience.
- Deep expertise in Playwright or modern JavaScript/TypeScript test tools.
- Proven experience establishing automated quality gates in continuous deployment environments.
- Excellent communication and defect triage skills. Knowledge of Docker, Kubernetes, and performance testing is a plus.`;
      showToast('Loaded sample SDET job description!', true);
      runAtsScan();
    });
  }

  const btnRunAts = document.getElementById('btn-run-ats-scan');
  if (btnRunAts) {
    btnRunAts.addEventListener('click', runAtsScan);
  }

  const btnAtsCv = document.getElementById('btn-ats-view-cv');
  if (btnAtsCv) {
    btnAtsCv.addEventListener('click', () => {
      const topReady = allJobs.find(j => j.cv_file);
      const cvFile = topReady ? topReady.cv_file : 'cv/Vijay_Kumar_Senior_QA_CV.pdf';
      viewDoc(cvFile, 'Tailored 1-Page ModernCV (PDF)');
    });
  }

  const btnAtsCl = document.getElementById('btn-ats-view-cl');
  if (btnAtsCl) {
    btnAtsCl.addEventListener('click', () => {
      const topReady = allJobs.find(j => j.cover_letter_file);
      const clFile = topReady ? topReady.cover_letter_file : 'cover_letters/Vijay_Kumar_Cover_Letter.pdf';
      viewDoc(clFile, 'Tailored Executive Cover Letter (PDF)');
    });
  }

  // SUBTOOL 2: Interview Simulator Controls
  document.querySelectorAll('.interview-cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.interview-cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeInterviewCat = btn.getAttribute('data-cat') || 'all';
      loadInterviewQuestions();
    });
  });

  // SUBTOOL 3: Recruiter Outreach Controls
  document.querySelectorAll('.outreach-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.outreach-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeOutreachType = btn.getAttribute('data-type') || 'hiring_manager';
      generateOutreach();
    });
  });

  const btnGenOutreach = document.getElementById('btn-generate-outreach');
  if (btnGenOutreach) {
    btnGenOutreach.addEventListener('click', generateOutreach);
  }

  const btnCopyOutreach = document.getElementById('btn-copy-outreach');
  if (btnCopyOutreach) {
    btnCopyOutreach.addEventListener('click', () => {
      const body = document.getElementById('outreach-body-box').value;
      copyToClipboard(body, 'Outreach Message');
    });
  }

  const btnCopySubject = document.getElementById('btn-copy-subject');
  if (btnCopySubject) {
    btnCopySubject.addEventListener('click', () => {
      const subj = document.getElementById('outreach-subject-box').value;
      copyToClipboard(subj, 'Subject Line');
    });
  }

  // SUBTOOL 4: Auto-Apply Portal Launcher
  const urlInput = document.getElementById('autofill-portal-url');
  const quickOpenBtn = document.getElementById('btn-quick-open-portal');
  if (urlInput && quickOpenBtn) {
    const updateQuickOpen = () => {
      const u = (urlInput.value || '').trim();
      if (u.startsWith('http://') || u.startsWith('https://')) {
        quickOpenBtn.href = u;
        quickOpenBtn.style.display = 'inline-flex';
      } else {
        quickOpenBtn.style.display = 'none';
      }
    };
    urlInput.addEventListener('input', updateQuickOpen);
    urlInput.addEventListener('change', updateQuickOpen);
    urlInput.addEventListener('paste', () => setTimeout(updateQuickOpen, 50));
    updateQuickOpen();
  }

  const btnLaunchBot = document.getElementById('btn-launch-autofill-bot');
  if (btnLaunchBot) {
    btnLaunchBot.addEventListener('click', async () => {
      const urlInput = document.getElementById('autofill-portal-url');
      const url = (urlInput.value || '').trim();
      if (!url) {
        showToast('Please enter an official career portal URL first.', false);
        urlInput.focus();
        return;
      }

      btnLaunchBot.disabled = true;
      btnLaunchBot.innerText = '⚡ Launching Bot...';
      showToast('Launching Playwright desktop automation with Vijay\'s profile...', true);

      try {
        const res = await fetch('/api/jobs/autofill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url,
            cv_file: 'cv/Vijay_Kumar_Senior_QA_CV.pdf'
          })
        });
        const d = await res.json();
        if (d.success) {
          showToast('🚀 Playwright browser launched! Check your desktop window.', true);
          const statusBox = document.getElementById('autofill-status-box');
          if (statusBox) {
            const isOracle = url.includes('oraclecloud.com');
            statusBox.style.display = 'block';
            statusBox.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <strong style="color:#1d4ed8; font-size:13.5px; display:flex; align-items:center; gap:6px;">
                  <span>🖥️</span> Browser Automation Active Session
                </strong>
                <span style="font-size:11px; background:#dbeafe; color:#1e40af; font-weight:700; padding:2px 8px; border-radius:10px;">Active Session</span>
              </div>
              <p style="margin:0 0 10px 0; color:#334155; font-size:12.5px;">
                Playwright browser opened for: <strong style="color:#1e40af;">${escapeHtml(url.slice(0, 65))}...</strong>
              </p>

              <!-- PROMINENT ACTIONS SECTION -->
              <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:14px; margin-bottom:12px; box-shadow:0 1px 4px rgba(59,130,246,0.06);">
                <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                  <span>⚡</span> Live Application Actions
                </div>

                ${isOracle ? `
                  <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:6px; padding:12px; margin-bottom:12px; color:#92400e;">
                    <div style="font-weight:800; font-size:12px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                      <span>🔐</span> Oracle Identity Verification Required:
                    </div>
                    <div style="font-size:12px; line-height:1.5;">Oracle sent a 6-digit confirmation code to <strong>vijaychuhan007@gmail.com</strong>. Enter it below to submit it directly to the automated browser:</div>
                    <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                      <input type="text" id="input-autofill-code" placeholder="Enter 6-digit code e.g. 123456" maxlength="8" style="padding:8px 12px; border:2px solid #f59e0b; border-radius:6px; font-weight:700; font-size:13px; width:220px; outline:none; background:#fff;">
                      <button class="btn btn-primary btn-sm" id="btn-submit-code" style="background:#d97706; border:none; font-weight:700; padding:8px 16px; cursor:pointer;">
                        ⚡ Submit Code &amp; Continue Auto-Fill
                      </button>
                    </div>
                    <div id="code-status-msg" style="font-size:11.5px; margin-top:6px; display:none;"></div>
                  </div>
                ` : `
                  <p style="margin:0 0 10px 0; color:#334155; font-size:12px;">
                    CareerPilot is automatically advancing through the application form and pre-filling your details.
                  </p>
                `}

                <!-- Direct Action Buttons Row -->
                <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                  <a href="${escapeHtml(url)}" target="_blank" class="btn btn-primary btn-sm" style="background:linear-gradient(135deg, #0284c7, #0369a1); font-weight:700; text-decoration:none; padding:8px 14px; display:inline-flex; align-items:center; gap:5px;" title="Open this career portal in your current browser tab">
                    🏢 Open Portal Tab ↗
                  </a>
                  <a href="/api/pdf?file=cv/Vijay_Kumar_Senior_QA_CV.pdf&download=1" class="btn btn-outline btn-sm" download style="font-weight:700; padding:8px 12px; display:inline-flex; align-items:center; gap:5px;" title="Download CV PDF">
                    📄 Download CV (PDF)
                  </a>
                  <a href="/api/pdf?file=cover_letters/Vijay_Kumar_Cover_Letter.pdf&download=1" class="btn btn-outline btn-sm" download style="font-weight:700; padding:8px 12px; color:#7c3aed; border-color:#ddd6fe; background:#f5f3ff; display:inline-flex; align-items:center; gap:5px;" title="Download Cover Letter PDF">
                    ✉️ Download Cover Letter
                  </a>
                  <button class="btn btn-outline btn-sm" id="btn-stop-bot" style="font-weight:700; color:#dc2626; border-color:#fca5a5; background:#fff; padding:8px 12px; margin-left:auto; cursor:pointer;">
                    ⏹️ Stop Session
                  </button>
                </div>
              </div>

              <div style="font-size:11.5px; color:#64748b;">
                💡 <em>Prefer manual submission? Click <strong>Open Portal Tab ↗</strong> and copy any field in one click from the form answers below.</em>
              </div>
            `;

            // Wire Submit Code Button
            const btnSubmitCode = document.getElementById('btn-submit-code');
            if (btnSubmitCode) {
              btnSubmitCode.addEventListener('click', async () => {
                const codeInput = document.getElementById('input-autofill-code');
                const code = (codeInput?.value || '').trim();
                const statusMsg = document.getElementById('code-status-msg');
                if (!code) {
                  showToast('Please enter the verification code first.', false);
                  return;
                }
                btnSubmitCode.disabled = true;
                btnSubmitCode.innerText = '⏳ Submitting...';
                try {
                  const sRes = await fetch('/api/jobs/submit-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: code })
                  });
                  const sData = await sRes.json();
                  if (sData.success) {
                    showToast('✓ Verification code sent to automated browser!', true);
                    if (statusMsg) {
                      statusMsg.style.display = 'block';
                      statusMsg.style.color = '#059669';
                      statusMsg.style.fontWeight = '700';
                      statusMsg.innerText = `✓ Code ${code} sent to browser. Continuing auto-fill...`;
                    }
                  } else {
                    showToast('Failed to send code: ' + sData.error, false);
                  }
                } catch (e) {
                  showToast('Error: ' + e.message, false);
                } finally {
                  btnSubmitCode.disabled = false;
                  btnSubmitCode.innerText = '⚡ Submit Code & Continue Auto-Fill';
                }
              });
            }

            // Wire Stop Bot Button
            const btnStopBot = document.getElementById('btn-stop-bot');
            if (btnStopBot) {
              btnStopBot.addEventListener('click', async () => {
                try {
                  await fetch('/api/jobs/stop-autofill', { method: 'POST' });
                  statusBox.style.display = 'none';
                  showToast('Auto-fill session ended.', true);
                } catch (e) {}
              });
            }
          }
        } else {
          showToast(`Launcher error: ${d.error || 'Check server logs'}`, false);
        }
      } catch (err) {
        showToast('Error: ' + err.message, false);
      } finally {
        btnLaunchBot.disabled = false;
        btnLaunchBot.innerText = '⚡ Launch Auto-Fill Bot';
      }
    });
  }

  // SUBTOOL 5: Job Application Strategist Controls
  const stratSelector = document.getElementById('strat-job-selector');
  if (stratSelector) {
    stratSelector.addEventListener('change', () => {
      const selectedId = stratSelector.value;
      if (!selectedId) return;
      const job = allJobs.find(j => j.id === selectedId);
      if (job) {
        document.getElementById('strat-input-role').value = job.role || 'Senior QA Automation Engineer';
        document.getElementById('strat-input-company').value = job.company || 'Tech Company';
        document.getElementById('strat-input-jd').value = `Company: ${job.company}\nRole: ${job.role}\nSector: ${job.sector || 'Software'}\nKey Requirements: ${job.notes || 'Playwright, TypeScript, CI/CD pipeline automation, test framework design, API validation'}`;
        generateStrategy();
      }
    });
  }

  const btnGenStrat = document.getElementById('btn-generate-strategy');
  if (btnGenStrat) {
    btnGenStrat.addEventListener('click', generateStrategy);
  }
}

// 1. Run ATS Scan
async function runAtsScan() {
  const btn = document.getElementById('btn-run-ats-scan');
  const role = document.getElementById('ats-input-role').value;
  const company = document.getElementById('ats-input-company').value;
  const jd = document.getElementById('ats-input-jd').value;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Analyzing ATS Match...';
  }

  try {
    const res = await fetch('/api/ai/ats-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, company, jobDescription: jd })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('ats-result-score').innerText = `${data.matchScore}%`;
      const verdict = document.getElementById('ats-verdict-badge');
      if (verdict) {
        verdict.innerText = data.matchScore >= 90 ? 'Strong ATS Pass' : (data.matchScore >= 80 ? 'Good Fit' : 'Moderate Match');
      }

      // Matched keywords
      const matchedContainer = document.getElementById('ats-chips-matched');
      matchedContainer.innerHTML = '';
      (data.matchingKeywords || []).forEach(kw => {
        const chip = document.createElement('span');
        chip.className = 'kw-chip matched';
        chip.innerText = kw;
        matchedContainer.appendChild(chip);
      });
      document.getElementById('ats-count-matched').innerText = (data.matchingKeywords || []).length;

      // Missing keywords
      const missingContainer = document.getElementById('ats-chips-missing');
      missingContainer.innerHTML = '';
      (data.missingKeywords || []).forEach(kw => {
        const chip = document.createElement('span');
        chip.className = 'kw-chip missing';
        chip.innerText = kw;
        missingContainer.appendChild(chip);
      });
      document.getElementById('ats-count-missing').innerText = (data.missingKeywords || []).length;

      // Recommendations
      const recList = document.getElementById('ats-recommendations-list');
      recList.innerHTML = '';
      (data.recommendations || []).forEach(rec => {
        const li = document.createElement('li');
        li.innerText = rec;
        recList.appendChild(li);
      });

      showToast(`🎯 ATS Fit Evaluated: ${data.matchScore}% Match!`, true);
    }
  } catch (err) {
    showToast('ATS scan error: ' + err.message, false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>⚡</span> Analyze ATS Match &amp; Keywords';
    }
  }
}

// 2. Load Interview Questions
async function loadInterviewQuestions() {
  const container = document.getElementById('interview-cards-container');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">Loading calibrated interview questions...</div>';

  try {
    const res = await fetch(`/api/ai/interview-prep?category=${encodeURIComponent(activeInterviewCat)}`);
    const data = await res.json();
    if (data.success && data.questions) {
      container.innerHTML = '';
      data.questions.forEach(q => {
        const card = document.createElement('div');
        card.className = 'interview-card';
        card.id = `q-card-${q.id}`;

        const isAskInterviewer = q.category === 'questions_to_ask';

        card.innerHTML = `
          <div class="interview-card-header">
            <div>
              <span style="font-size:11px; font-weight:700; color:var(--primary); margin-bottom:4px; display:inline-block;">${escapeHtml(q.categoryLabel)}</span>
              <div class="interview-card-title">${escapeHtml(q.question)}</div>
            </div>
            <button class="btn btn-outline btn-sm btn-toggle-star" data-id="${q.id}" style="font-weight:700; white-space:nowrap;">
              👁️ Reveal STAR Answer
            </button>
          </div>

          <div class="star-grid" id="star-detail-${q.id}" style="display:none;">
            ${isAskInterviewer ? `
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
                <h5 style="font-size:12px; font-weight:800; color:var(--text-main); margin-bottom:8px;">🙋‍♂️ Recommended Questions to Ask:</h5>
                <ul style="margin:0; padding-left:18px; font-size:12.5px; line-height:1.6; color:#334155;">
                  ${q.keyTalkingPoints.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
                </ul>
              </div>
            ` : `
              <div class="star-row">
                <span class="star-badge s">S</span>
                <div><strong>Situation:</strong> ${escapeHtml(q.situation)}</div>
              </div>
              <div class="star-row">
                <span class="star-badge t">T</span>
                <div><strong>Task:</strong> ${escapeHtml(q.task)}</div>
              </div>
              <div class="star-row">
                <span class="star-badge a">A</span>
                <div><strong>Action:</strong> ${escapeHtml(q.action)}</div>
              </div>
              <div class="star-row">
                <span class="star-badge r">R</span>
                <div><strong>Result:</strong> ${escapeHtml(q.result)}</div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                  ${(q.keyTalkingPoints || []).map(tp => `<span class="kw-chip matched" style="font-size:10.5px;">✓ ${escapeHtml(tp)}</span>`).join('')}
                </div>
                <button class="btn btn-primary btn-sm btn-copy-star" data-id="${q.id}" style="font-size:11px;">
                  📋 Copy STAR Answer
                </button>
              </div>
            `}
          </div>
        `;

        container.appendChild(card);
      });

      // Bind toggle buttons
      container.querySelectorAll('.btn-toggle-star').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const detail = document.getElementById(`star-detail-${id}`);
          if (detail) {
            const isShown = detail.style.display !== 'none';
            detail.style.display = isShown ? 'none' : 'flex';
            btn.innerText = isShown ? '👁️ Reveal STAR Answer' : '🙈 Hide STAR Answer';
          }
        });
      });

      // Bind copy buttons
      container.querySelectorAll('.btn-copy-star').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const q = data.questions.find(item => item.id === id);
          if (q) {
            const starText = `Q: ${q.question}\n\nSituation: ${q.situation}\nTask: ${q.task}\nAction: ${q.action}\nResult: ${q.result}`;
            copyToClipboard(starText, 'STAR Answer');
          }
        });
      });
    }
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444; font-size:13px;">Error loading questions: ${err.message}</div>`;
  }
}

// 3. Generate Outreach Message
async function generateOutreach() {
  const company = document.getElementById('outreach-input-company').value || 'Tech Company';
  const recipientName = document.getElementById('outreach-input-recipient').value || 'Hiring Manager';
  const role = document.getElementById('outreach-input-role').value || 'Senior QA Automation Engineer';

  const btn = document.getElementById('btn-generate-outreach');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Drafting Message...';
  }

  try {
    const res = await fetch('/api/ai/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, recipientName, role, type: activeOutreachType })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('outreach-subject-box').value = data.subject || '';
      const bodyBox = document.getElementById('outreach-body-box');
      bodyBox.value = data.body || '';
      document.getElementById('outreach-char-count').innerText = `${(data.body || '').length} characters`;
      document.getElementById('outreach-type-pill').innerText = data.typeLabel || 'Message';
      showToast('✨ Tailored outreach message drafted!', true);
    }
  } catch (err) {
    showToast('Outreach error: ' + err.message, false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>✨</span> Generate Tailored Message';
    }
  }
}

// 4. Load Auto-Fill Snippets
async function loadAutoFillSnippets() {
  const container = document.getElementById('autofill-snippets-list');
  if (!container) return;
  if (container.children.length > 0) return; // already loaded

  try {
    const res = await fetch('/api/ai/autofill-shortcuts');
    const data = await res.json();
    if (data.success) {
      container.innerHTML = '';

      // Standard field chips
      const candidate = data.candidate;
      const quickFields = [
        { label: 'Full Legal Name', val: candidate.name },
        { label: 'Primary Email', val: candidate.email },
        { label: 'Direct Phone', val: candidate.phone },
        { label: 'Notice Period', val: candidate.noticePeriod },
        { label: 'Current Location', val: candidate.location },
        { label: 'LinkedIn URL', val: candidate.linkedin },
        { label: 'GitHub Portfolio', val: candidate.github },
        { label: 'Playwright Framework Demo', val: candidate.demoRepo }
      ];

      quickFields.forEach(f => {
        const card = document.createElement('div');
        card.className = 'snippet-card';
        card.innerHTML = `
          <div class="snippet-card-header">
            <span class="snippet-label">${escapeHtml(f.label)}</span>
            <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${escapeHtml(f.val)}', '${escapeHtml(f.label)}')" style="font-size:11px; padding:3px 8px;">
              📋 Copy
            </button>
          </div>
          <div class="snippet-content" style="font-family:'JetBrains Mono', monospace; font-size:11.5px;">${escapeHtml(f.val)}</div>
        `;
        container.appendChild(card);
      });

      // Long essay fields
      (data.portalAnswers || []).forEach(ans => {
        const card = document.createElement('div');
        card.className = 'snippet-card';
        card.style.gridColumn = 'span 2';
        card.innerHTML = `
          <div class="snippet-card-header">
            <span class="snippet-label">${escapeHtml(ans.label)}</span>
            <button class="btn btn-primary btn-sm btn-copy-essay" data-id="${ans.id}" style="font-size:11px; padding:4px 10px;">
              📋 Copy Essay Answer
            </button>
          </div>
          <div class="snippet-content" id="essay-text-${ans.id}" style="max-height:120px;">${escapeHtml(ans.text)}</div>
        `;
        container.appendChild(card);
      });

      container.querySelectorAll('.btn-copy-essay').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const ans = (data.portalAnswers || []).find(a => a.id === id);
          if (ans) {
            copyToClipboard(ans.text, ans.label);
          }
        });
      });
    }
  } catch (err) {
    container.innerHTML = `<div style="color:#ef4444; font-size:12px;">Error loading shortcuts: ${err.message}</div>`;
  }
}

// 5. Job Application Strategist
let currentStrategy = null;

async function generateStrategy() {
  const comp = (document.getElementById('strat-input-company').value || '').trim() || 'Target Company';
  const role = (document.getElementById('strat-input-role').value || '').trim() || 'Senior QA Automation Engineer';
  const jd = (document.getElementById('strat-input-jd').value || '').trim() || '';

  const btn = document.getElementById('btn-generate-strategy');
  if (btn) {
    btn.disabled = true;
    btn.innerText = '⏳ Formulating Strategy...';
  }

  // Update headings & external search links
  const heading = document.getElementById('strat-heading');
  if (heading) heading.innerHTML = `<span>🎯</span> Strategic Playbook • ${escapeHtml(comp)}`;
  const subHeading = document.getElementById('strat-subheading');
  if (subHeading) subHeading.innerText = `${comp} • ${role}`;

  const linkGoogle = document.getElementById('strat-link-google');
  if (linkGoogle) linkGoogle.href = `https://www.google.com/search?q=${encodeURIComponent(comp + ' careers ' + role)}`;
  const linkAts = document.getElementById('strat-link-ats');
  if (linkAts) linkAts.href = `https://www.google.com/search?q=${encodeURIComponent('(site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com OR site:myworkdayjobs.com) "' + comp + '"')}`;

  try {
    const res = await fetch('/api/ai/strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: comp, role: role, jobDescription: jd })
    });
    const data = await res.json();
    if (data.success) {
      currentStrategy = data;
      renderStrategyUI(data);
      showToast(`🎯 Formulated career page strategy for ${comp}!`, true);
    } else {
      showToast('Error generating strategy: ' + (data.error || 'Server error'), false);
    }
  } catch (err) {
    showToast('Failed to connect to strategy engine: ' + err.message, false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '🧭 Formulate High-Conversion Strategy';
    }
  }
}

function renderStrategyUI(data) {
  const body = document.getElementById('strat-content-body');
  if (!body) return;

  let html = `
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:#15803d; font-size:13.5px;">⭐ High-Conversion Strategy Protocol</strong>
          <p style="color:#166534; font-size:12px; margin:2px 0 0 0;">Focusing on direct company career pages bypasses aggregator clutter and increases interview callback rates by up to 3x.</p>
        </div>
      </div>
    </div>

    <!-- 5 Strategy Pillars -->
    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
  `;

  (data.strategyPillars || []).forEach(p => {
    html += `
      <div style="background:#fff; border:1px solid var(--border-light); border-radius:8px; padding:12px 14px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <strong style="font-size:13px; color:var(--text-main);">
            <span style="display:inline-block; width:22px; height:22px; border-radius:50%; background:var(--primary); color:#0b0f19; font-size:11px; font-weight:800; line-height:22px; text-align:center; margin-right:6px;">${p.step}</span>
            ${escapeHtml(p.title)}
          </strong>
          <span style="font-size:10.5px; font-weight:700; color:#0369a1; background:#e0f2fe; padding:2px 8px; border-radius:10px;">${escapeHtml(p.tag)}</span>
        </div>
        <p style="font-size:12px; color:var(--text-main); margin:4px 0 6px 28px; line-height:1.5;">${escapeHtml(p.detail)}</p>
        <div style="margin-left:28px; font-size:11.5px; color:#475569; background:#f8fafc; padding:6px 10px; border-radius:6px; border-left:3px solid var(--primary);">
          <strong>Action:</strong> ${escapeHtml(p.action)}
        </div>
      </div>
    `;
  });

  html += `</div>`;

  // Networking Script Box
  if (data.networkingTemplate) {
    html += `
      <div style="background:#fff; border:1px solid var(--border-light); border-radius:8px; padding:14px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div>
            <strong style="font-size:13px; color:var(--text-main);">🤝 LinkedIn Employee / Peer Connection Note</strong>
            <span style="display:block; font-size:11px; color:var(--text-muted);">${escapeHtml(data.networkingTemplate.limit)}</span>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-copy-strat-network" style="font-size:11px; padding:3px 8px;">📋 Copy Note</button>
        </div>
        <textarea id="strat-network-text" readonly rows="3" style="width:100%; padding:8px 10px; font-size:12px; background:#f8fafc; border:1px solid var(--border-light); border-radius:6px; resize:none;">${escapeHtml(data.networkingTemplate.text)}</textarea>
      </div>
    `;
  }

  // Follow-up Script Box
  if (data.followUpTemplate) {
    html += `
      <div style="background:#fff; border:1px solid var(--border-light); border-radius:8px; padding:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div>
            <strong style="font-size:13px; color:var(--text-main);">⏳ 5–7 Day Career Page Application Follow-up</strong>
            <span style="display:block; font-size:11px; color:var(--text-muted);">${escapeHtml(data.followUpTemplate.subject)}</span>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-copy-strat-followup" style="font-size:11px; padding:4px 10px;">📋 Copy Follow-Up</button>
        </div>
        <textarea id="strat-followup-text" readonly rows="7" style="width:100%; padding:8px 10px; font-size:12px; line-height:1.5; background:#f8fafc; border:1px solid var(--border-light); border-radius:6px; resize:none;">${escapeHtml(data.followUpTemplate.body)}</textarea>
      </div>
    `;
  }

  body.innerHTML = html;

  // Attach copy listeners
  const btnCopyNet = document.getElementById('btn-copy-strat-network');
  if (btnCopyNet && data.networkingTemplate) {
    btnCopyNet.addEventListener('click', () => {
      copyToClipboard(data.networkingTemplate.text, 'LinkedIn Connection Note');
    });
  }

  const btnCopyFollow = document.getElementById('btn-copy-strat-followup');
  if (btnCopyFollow && data.followUpTemplate) {
    btnCopyFollow.addEventListener('click', () => {
      copyToClipboard(data.followUpTemplate.body, 'Follow-up Email');
    });
  }
}

function loadStrategistData() {
  const body = document.getElementById('strat-content-body');
  if (body && (!body.innerHTML.trim() || body.children.length === 0)) {
    generateStrategy();
  }
}

async function generateApplicationForJob(jobId) {
  showToast('⚡ Tailoring CV & Cover Letter for this role...', true);
  try {
    const res = await fetch('/api/generate-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: jobId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('✓ Tailored CV and Cover Letter created successfully!', true);
      await fetchJobs();
    } else {
      showToast(`Error: ${data.error || 'Failed to generate'}`, false);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, false);
  }
}

async function changeJobStatus(jobId, newStatus) {
  try {
    const res = await fetch('/api/jobs/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: jobId, status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      const job = allJobs.find(j => j.id === jobId);
      if (job) job.status = newStatus;
      showToast(`Status updated to "${newStatus}"!`, true);
      renderAll();
    } else {
      showToast('Error updating status: ' + data.error, false);
    }
  } catch (err) {
    showToast('Failed to update status: ' + err.message, false);
  }
}

async function markJobAsApplied(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  const company = job ? job.company : 'Company';
  await changeJobStatus(jobId, 'applied');
  showToast(`🎉 Marked ${company} as Applied! Moved to your Applied list.`, true);
}

function handlePortalClick(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (job && (job.status || '').toLowerCase() !== 'applied') {
    setTimeout(() => {
      showToast(`🏢 Opened ${job.company}'s portal! Once submitted, click "✅ Mark Applied" in table.`, true);
    }, 1200);
  }
}

window.copyToClipboard = copyToClipboard;
window.switchSubtool = switchSubtool;
window.generateApplicationForJob = generateApplicationForJob;
window.changeJobStatus = changeJobStatus;
window.markJobAsApplied = markJobAsApplied;
window.handlePortalClick = handlePortalClick;

// Company Research Hub
function populateCompanyResearch(selectedCompany) {
  const selector = document.getElementById('company-research-selector');
  if (!selector) return;

  const companies = [...new Set(allJobs.map(j => (j.company || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (companies.length === 0) return;

  const currentVal = selectedCompany || selector.value;
  selector.innerHTML = '<option value="">-- Choose a tracked company --</option>';

  companies.forEach(comp => {
    const opt = document.createElement('option');
    opt.value = comp;
    opt.textContent = comp;
    if (currentVal && comp.toLowerCase() === currentVal.toLowerCase()) {
      opt.selected = true;
    }
    selector.appendChild(opt);
  });

  const targetComp = selector.value || (companies.includes('Willware Technologies') ? 'Willware Technologies' : companies[0]);
  if (!selector.value && targetComp) {
    selector.value = targetComp;
  }
  renderCompanyIntel(targetComp);
}

function renderCompanyIntel(companyName) {
  if (!companyName) return;

  const nameEl = document.getElementById('company-intel-name');
  if (nameEl) nameEl.textContent = companyName;

  const matchingJobs = allJobs.filter(j => (j.company || '').trim().toLowerCase() === companyName.trim().toLowerCase());
  
  const countEl = document.getElementById('company-jobs-count');
  if (countEl) countEl.textContent = matchingJobs.length;

  const descEl = document.getElementById('company-intel-desc');
  if (descEl) {
    descEl.textContent = `Target employer tracked in your pipeline with ${matchingJobs.length} active position(s). Verified direct links to official careers page, ATS search, engineering news, and Glassdoor interview reviews.`;
  }

  // Update Direct Portal & Search links
  const portalLink = document.getElementById('company-link-portal');
  if (portalLink) {
    const jobWithUrl = matchingJobs.find(j => j.url && j.url.startsWith('http'));
    portalLink.href = jobWithUrl ? jobWithUrl.url : `https://www.google.com/search?q=${encodeURIComponent(companyName + ' careers jobs')}`;
  }

  const atsLink = document.getElementById('company-link-ats');
  if (atsLink) {
    atsLink.href = `https://www.google.com/search?q=${encodeURIComponent('(site:boards.greenhouse.io OR site:jobs.lever.co OR site:oraclecloud.com OR site:myworkdayjobs.com) "' + companyName + '"')}`;
  }

  const newsLink = document.getElementById('company-link-news');
  if (newsLink) {
    newsLink.href = `https://www.google.com/search?q=${encodeURIComponent(companyName + ' software engineering QA technology news')}`;
  }

  const gdLink = document.getElementById('company-link-glassdoor');
  if (gdLink) {
    gdLink.href = `https://www.google.com/search?q=${encodeURIComponent(companyName + ' QA software tester interview questions Glassdoor AmbitionBox')}`;
  }

  // Render open roles list
  const listEl = document.getElementById('company-jobs-list');
  if (listEl) {
    if (matchingJobs.length === 0) {
      listEl.innerHTML = `<div style="padding:12px; color:var(--text-muted); font-size:13px;">No tracked positions currently for ${companyName}.</div>`;
    } else {
      listEl.innerHTML = matchingJobs.map(job => {
        const fit = parseInt(job.fit_rating || '85', 10);
        const fitColor = fit >= 90 ? '#10b981' : fit >= 80 ? '#3b82f6' : '#f59e0b';
        const cvBtn = job.cv_file 
          ? `<button class="btn btn-outline btn-sm" onclick="viewDoc('${job.cv_file}', '${(job.company || '').replace(/'/g, "\\'")} - Tailored CV')" style="font-size:11px; padding:3px 8px;">📄 View CV</button>` 
          : '';
        const portalBtn = job.url 
          ? `<a href="${job.url}" target="_blank" class="btn btn-outline btn-sm" style="font-size:11px; padding:3px 8px; text-decoration:none; color:var(--primary);">🌐 Portal ↗</a>` 
          : '';

        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fff; border:1px solid var(--border-light); border-radius:8px; gap:8px;">
            <div style="min-width:0; flex:1;">
              <div style="font-size:13px; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${job.role || 'QA Engineer'}</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Status: <strong>${job.status || 'Discovered'}</strong> • Added: ${job.date_added || 'Today'}</div>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:11px; font-weight:800; color:${fitColor}; background:${fitColor}15; padding:2px 7px; border-radius:10px;">${fit}%</span>
              ${cvBtn}
              ${portalBtn}
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

window.populateCompanyResearch = populateCompanyResearch;
window.renderCompanyIntel = renderCompanyIntel;

// Expose globals for inline HTML event handlers
window.toggleCompare = toggleCompare;
window.quickCompareTop = quickCompareTop;
window.clearCompare = clearCompare;
window.viewDoc = viewDoc;

// ==========================================
// Fast-Track 50-Job Auto-Apply Suite & Launcher
// ==========================================
let fastTrackQueue = [];
let fastTrackIndex = 0;
let activeAutofillJob = null;

// Launch auto-fill for any individual job
async function launchAutoFillForJob(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (!job) {
    showToast('Job not found in pipeline', false);
    return;
  }
  const portalUrl = (job.source || '').trim();
  if (!portalUrl) {
    showToast('No portal URL available for this role.', false);
    return;
  }

  activeAutofillJob = job;

  // Update button in Fast Track modal or table to show progress
  const launchBtns = document.querySelectorAll(`button[onclick*="launchAutoFillForJob('${jobId}')"]`);
  launchBtns.forEach(b => {
    b.disabled = true;
    b.innerHTML = '<span>⏳</span> Opening Chrome Automation...';
  });

  showToast(`🚀 Launching Playwright browser with Vijay's specs & CV for ${job.company}...`, true);

  // Show status banner in Fast-Track modal if open
  let statusBanner = document.getElementById('ft-status-banner');
  if (!statusBanner) {
    const card = document.getElementById('ft-active-card');
    if (card) {
      statusBanner = document.createElement('div');
      statusBanner.id = 'ft-status-banner';
      card.appendChild(statusBanner);
    }
  }
  if (statusBanner) {
    statusBanner.style.display = 'block';
    statusBanner.innerHTML = `
      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-left:4px solid #3b82f6; border-radius:8px; padding:12px; margin-top:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:#1e40af; font-size:12.5px; display:flex; align-items:center; gap:6px;">
            <span>🚀</span> Chrome Desktop Automation Window Launched
          </strong>
          <span style="font-size:11px; background:#dbeafe; color:#1e40af; font-weight:700; padding:2px 8px; border-radius:10px;">Active Session</span>
        </div>
        <div style="font-size:12px; color:#334155; margin-top:5px; line-height:1.5;">
          Navigating to <strong>${escapeHtml(job.company)}</strong>, dismissing cookies, opening the application form, and attaching Vijay's tailored CV.<br>
          <span style="color:#64748b; font-size:11px;">📌 <em>If Chrome opened behind this window, check your Windows taskbar or click <strong>Open Portal Tab ↗</strong> to view it directly in this browser tab.</em></span>
        </div>
      </div>
    `;
  }

  // Show Floating Dock
  const dock = document.getElementById('floating-autofill-dock');
  if (dock) {
    dock.style.display = 'block';
    const titleEl = document.getElementById('float-job-title');
    const urlEl = document.getElementById('float-job-url');
    const linkPortal = document.getElementById('float-link-portal');
    const otpSec = document.getElementById('float-otp-section');
    const codeMsg = document.getElementById('float-code-msg');

    if (titleEl) titleEl.innerText = `${job.company} — ${job.role}`;
    if (urlEl) urlEl.innerText = portalUrl;
    if (linkPortal) linkPortal.href = portalUrl;
    if (codeMsg) codeMsg.style.display = 'none';

    // Show OTP input if Oracle Cloud or enterprise identity check
    const isOracle = portalUrl.includes('oraclecloud.com') || portalUrl.includes('myworkdayjobs.com');
    if (otpSec) otpSec.style.display = isOracle ? 'block' : 'none';
  }

  // Trigger Playwright process on server
  try {
    const res = await fetch('/api/jobs/autofill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: portalUrl,
        cv_file: job.cv_file || 'cv/Vijay_Kumar_Senior_QA_CV.pdf'
      })
    });
    const d = await res.json();
    if (d.success) {
      showToast(`⚡ Chrome window active! Pre-filling ${job.company}'s application...`, true);
      launchBtns.forEach(b => {
        b.disabled = false;
        b.innerHTML = '<span>⚡</span> 1-Click Launch &amp; Auto-Fill';
      });
    } else {
      showToast(`Launcher note: ${d.error || 'Check server logs'}`, false);
      launchBtns.forEach(b => {
        b.disabled = false;
        b.innerHTML = '<span>⚡</span> 1-Click Launch &amp; Auto-Fill';
      });
    }
  } catch (e) {
    showToast(`Error launching browser: ${e.message}`, false);
    launchBtns.forEach(b => {
      b.disabled = false;
      b.innerHTML = '<span>⚡</span> 1-Click Launch &amp; Auto-Fill';
    });
  }
}

// Open the Fast-Track 50-Job Modal
function openFastTrackModal() {
  // Filter unapplied roles sorted by fit_rating desc
  fastTrackQueue = allJobs
    .filter(j => (j.status || '').toLowerCase() !== 'applied' && (j.status || '').toLowerCase() !== 'rejected')
    .sort((a, b) => parseInt(b.fit_rating || '85', 10) - parseInt(a.fit_rating || '85', 10))
    .slice(0, 50);

  if (fastTrackQueue.length === 0) {
    showToast('All tracked positions are already marked as applied! Fantastic work.', true);
    return;
  }

  fastTrackIndex = 0;
  const modal = document.getElementById('fast-track-modal');
  if (modal) {
    modal.classList.add('open');
    renderFastTrackCard();
    populateFastTrackSnippets();
  }
}

// Render active job in Fast-Track modal
function renderFastTrackCard() {
  if (fastTrackIndex < 0) fastTrackIndex = 0;
  if (fastTrackIndex >= fastTrackQueue.length) {
    // Finished queue!
    const card = document.getElementById('ft-active-card');
    if (card) {
      card.innerHTML = `
        <div style="text-align:center; padding:30px 10px;">
          <div style="font-size:42px; margin-bottom:12px;">🎉</div>
          <h3 style="font-size:18px; font-weight:800; color:#0f172a; margin-bottom:8px;">All 50 Fast-Track Applications Completed!</h3>
          <p style="font-size:13px; color:#64748b; max-width:480px; margin:0 auto 16px;">
            You have blitzed through your ready pipeline. Check the <strong>Applications</strong> tab to review your applied positions and track interview responses.
          </p>
          <button class="btn btn-primary" onclick="closeFastTrackModal()">Return to Dashboard</button>
        </div>
      `;
    }
    return;
  }

  const job = fastTrackQueue[fastTrackIndex];
  activeAutofillJob = job;
  const total = fastTrackQueue.length;
  const currentNum = fastTrackIndex + 1;
  const percent = Math.round(((currentNum - 1) / total) * 100);

  // Update progress
  const labelEl = document.getElementById('ft-progress-label');
  const percentEl = document.getElementById('ft-progress-percent');
  const barEl = document.getElementById('ft-progress-bar');
  if (labelEl) labelEl.innerText = `Queue: Application ${currentNum} of ${total}`;
  if (percentEl) percentEl.innerText = `${percent}% Completed`;
  if (barEl) barEl.style.width = `${percent}%`;

  // Render card
  const card = document.getElementById('ft-active-card');
  if (card) {
    const fit = parseInt(job.fit_rating || '85', 10);
    const fitBadge = fit >= 90 ? '#10b981' : '#3b82f6';
    const isOracle = (job.source || '').includes('oraclecloud.com') || (job.source || '').includes('myworkdayjobs.com');
    const otpBox = document.getElementById('ft-otp-box');
    if (otpBox) otpBox.style.display = isOracle ? 'block' : 'none';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:12px; flex-wrap:wrap;">
        <div>
          <span style="font-size:11px; font-weight:800; color:${fitBadge}; background:${fitBadge}15; padding:3px 8px; border-radius:12px; display:inline-block; margin-bottom:6px;">
            ⚡ ${fit}% ATS Match
          </span>
          <h3 style="margin:0; font-size:17px; font-weight:800; color:#0f172a;">${escapeHtml(job.company)}</h3>
          <div style="font-size:14px; font-weight:700; color:var(--primary); margin-top:2px;">${escapeHtml(job.role)}</div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:11.5px; color:#64748b; font-weight:600; display:block;">Scraped: ${formatDateDisplay(job.date)}</span>
          <span style="font-size:11px; color:#94a3b8; display:block;">Posted: ${formatDateDisplay(job.posted_date || job.date)}</span>
        </div>
      </div>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:14px; font-size:12.5px; line-height:1.5;">
        <div style="margin-bottom:6px;"><strong>Target Portal:</strong> <a href="${escapeHtml(job.source || '#')}" target="_blank" style="color:#0284c7; font-weight:700; text-decoration:none;">${escapeHtml(job.source ? job.source.slice(0, 75) + '...' : 'Direct Portal Link')} ↗</a></div>
        <div><strong>Key Requirements:</strong> <span style="color:#475569;">${escapeHtml(job.notes || 'Playwright, TypeScript, CI/CD, Manual & API Testing')}</span></div>
      </div>

      <!-- Action Row -->
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="btn btn-primary" onclick="launchAutoFillForJob('${job.id}')" style="background:linear-gradient(135deg, #6366f1, #4f46e5); border:none; font-weight:800; padding:9px 16px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
          <span>⚡</span> 1-Click Launch &amp; Auto-Fill
        </button>
        <a href="${escapeHtml(job.source || '#')}" target="_blank" class="btn btn-outline" style="font-weight:700; padding:8px 14px; text-decoration:none; display:inline-flex; align-items:center; gap:5px;">
          🏢 Open Portal Tab ↗
        </a>
        ${job.cv_file ? `
          <a href="/api/pdf?file=${encodeURIComponent(job.cv_file)}&download=1" class="btn btn-outline" download style="font-weight:700; padding:8px 12px; display:inline-flex; align-items:center; gap:5px;">
            📄 Tailored CV
          </a>
        ` : ''}
        ${job.cover_letter_file ? `
          <a href="/api/pdf?file=${encodeURIComponent(job.cover_letter_file)}&download=1" class="btn btn-outline" download style="font-weight:700; padding:8px 12px; color:#7c3aed; border-color:#ddd6fe; background:#f5f3ff; display:inline-flex; align-items:center; gap:5px;">
            ✉️ Cover Letter
          </a>
        ` : ''}
      </div>
    `;
  }
}

// Populate Quick Snippets inside Fast-Track modal
function populateFastTrackSnippets() {
  const container = document.getElementById('ft-quick-snippets');
  if (!container) return;
  const snippets = [
    { label: 'Full Legal Name', val: 'Vijay Kumar' },
    { label: 'Primary Email', val: 'vijaychuhan007@gmail.com' },
    { label: 'Direct Phone', val: '+91 7696122634' },
    { label: 'Notice Period', val: '15 Days (Immediate/Short)' },
    { label: 'Total Experience', val: '5 Years' },
    { label: 'Current Location', val: 'India (Open to Remote / Major Tech Hubs)' },
    { label: 'LinkedIn Profile', val: 'https://www.linkedin.com/in/vijay-007' },
    { label: 'GitHub / Portfolio', val: 'https://github.com/vijayqadevkraft' },
    { label: 'Work Authorization', val: 'Citizen (No Sponsorship Needed for Domestic)' }
  ];
  container.innerHTML = snippets.map(s => `
    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center;">
      <div style="min-width:0; flex:1;">
        <div style="font-size:10px; text-transform:uppercase; color:#94a3b8; font-weight:700;">${s.label}</div>
        <div style="font-size:12px; font-weight:700; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.val}</div>
      </div>
      <button onclick="copyToClipboard('${s.val.replace(/'/g, "\\'")}', '${s.label}')" class="btn btn-outline btn-sm" style="padding:2px 6px; font-size:10px; margin-left:6px; cursor:pointer;" title="Copy">📋 Copy</button>
    </div>
  `).join('');
}

function closeFastTrackModal() {
  const modal = document.getElementById('fast-track-modal');
  if (modal) modal.classList.remove('open');
}

window.launchAutoFillForJob = launchAutoFillForJob;
window.openFastTrackModal = openFastTrackModal;
window.closeFastTrackModal = closeFastTrackModal;

/* ==========================================================================
   AI CAREER AGENT & CO-PILOT MODULE
   ========================================================================== */

let agentRemindersCache = [];
let agentModuleInitialized = false;

function initAgentModule() {
  populateAgentJobSelector();
  loadAgentReminders();
  loadSkillsTranslation('manual_to_automation');
  
  if (!agentModuleInitialized) {
    setupAgentEvents();
    agentModuleInitialized = true;
  }

  // Run initial tailor if empty
  const currentDiff = document.getElementById('agent-diff-body');
  if (currentDiff && currentDiff.children.length === 0) {
    runAgentTailor();
  }
}

function setupAgentEvents() {
  // Subagent navigation tabs
  document.querySelectorAll('.agent-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-subagent');
      switchSubagent(target);
    });
  });

  // Header quick chat button
  const quickChatBtn = document.getElementById('btn-agent-quick-chat');
  if (quickChatBtn) {
    quickChatBtn.addEventListener('click', () => {
      switchSubagent('copilot');
    });
  }

  // Job selector change
  const jobSel = document.getElementById('agent-tailor-job-selector');
  if (jobSel) {
    jobSel.addEventListener('change', () => {
      const val = jobSel.value;
      if (!val) return;
      const job = allJobs.find(j => j.id === val);
      if (job) {
        document.getElementById('agent-tailor-company').value = job.company || '';
        document.getElementById('agent-tailor-role').value = job.role || '';
        document.getElementById('agent-tailor-jd').value = job.notes || `${job.role} at ${job.company}. Requires test automation, quality assurance, and engineering excellence.`;
        runAgentTailor();
      }
    });
  }

  // Sample JD button
  const sampleBtn = document.getElementById('btn-agent-sample-jd');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      document.getElementById('agent-tailor-company').value = "Willware Technologies";
      document.getElementById('agent-tailor-role').value = "Senior QA Automation Lead";
      document.getElementById('agent-tailor-jd').value = `Looking for a Senior QA Engineer / SDET with 4-6 years of experience.
Must have:
- Hands-on mastery of Playwright with TypeScript/JavaScript
- Building modular Page Object Model frameworks from scratch
- CI/CD integration with GitHub Actions or Jenkins
- API testing experience with Postman or REST-Assured
- Proven ability to lead and mentor QA engineers and establish STLC standards
- Experience testing complex web & mobile platforms`;
      runAgentTailor();
    });
  }

  // Run Tailor button
  const runTailorBtn = document.getElementById('btn-run-agent-tailor');
  if (runTailorBtn) {
    runTailorBtn.addEventListener('click', runAgentTailor);
  }

  // Copy tailored text
  const copyTailorBtn = document.getElementById('btn-agent-copy-tailored-cv');
  if (copyTailorBtn) {
    copyTailorBtn.addEventListener('click', () => {
      const summaryText = document.getElementById('agent-tailored-summary-text')?.innerText || '';
      const bullets = Array.from(document.querySelectorAll('.tailored-bullet-text')).map(el => '• ' + el.innerText).join('\n');
      const allText = `PROFESSIONAL SUMMARY:\n${summaryText}\n\nKEY TAILORED HIGHLIGHTS:\n${bullets}`;
      copyToClipboard(allText, 'Tailored Resume Content');
    });
  }

  // Reminders filter pills
  document.querySelectorAll('.agent-rem-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.agent-rem-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.getAttribute('data-filter') || 'all';
      renderAgentReminders(filter);
    });
  });

  // Skills track buttons
  document.querySelectorAll('.agent-track-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.agent-track-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const track = btn.getAttribute('data-track');
      loadSkillsTranslation(track);
    });
  });

  // Co-Pilot Chat Form
  const chatForm = document.getElementById('agent-chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('agent-chat-input');
      const val = input.value.trim();
      if (!val) return;
      input.value = '';
      sendAgentChatMessage(val);
    });
  }

  // Quick prompt chips
  document.querySelectorAll('#agent-chat-quick-chips .chat-prompt-pill').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) sendAgentChatMessage(prompt);
    });
  });

  // Clear chat button
  const clearChatBtn = document.getElementById('btn-agent-clear-chat');
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
      const hist = document.getElementById('agent-chat-history');
      if (hist) {
        hist.innerHTML = `
          <div class="chat-msg agent">
            <div class="chat-avatar agent">🤖</div>
            <div class="chat-bubble">
              Chat session refreshed. How can I assist your career search today?
            </div>
          </div>
        `;
      }
    });
  }
}

function switchSubagent(subagentId) {
  document.querySelectorAll('.agent-nav-btn').forEach(btn => {
    if (btn.getAttribute('data-subagent') === subagentId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.agent-panel').forEach(panel => {
    panel.style.display = 'none';
  });

  const activePanel = document.getElementById(`subagent-${subagentId}`);
  if (activePanel) {
    activePanel.style.display = 'block';
  }

  if (subagentId === 'reminders') {
    loadAgentReminders();
  }
}

function populateAgentJobSelector() {
  const sel = document.getElementById('agent-tailor-job-selector');
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">-- Choose a tracked position or enter custom below --</option>';

  allJobs.slice(0, 50).forEach(j => {
    const opt = document.createElement('option');
    opt.value = j.id;
    opt.textContent = `${j.company} — ${j.role} (${j.fit_rating || 85}% Fit)`;
    sel.appendChild(opt);
  });
  if (currentVal) sel.value = currentVal;
}

async function runAgentTailor() {
  const company = (document.getElementById('agent-tailor-company')?.value || 'Capgemini').trim();
  const role = (document.getElementById('agent-tailor-role')?.value || 'Playwright Automation').trim();
  const jd = (document.getElementById('agent-tailor-jd')?.value || '').trim();

  const diffBody = document.getElementById('agent-diff-body');
  if (!diffBody) return;

  diffBody.innerHTML = `
    <div style="text-align:center; padding:40px; color:var(--text-muted);">
      <div class="spinner" style="margin: 0 auto 12px; width:28px; height:28px; border:3px solid #e2e8f0; border-top-color:#ec4899; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
      <p style="font-weight:700; color:#1e293b;">Generating Verified Resume Diff & Cover Letter for ${company}...</p>
    </div>
  `;

  document.getElementById('agent-diff-heading').innerHTML = `<span>⚖️</span> Resume Realignment Diff`;
  document.getElementById('agent-diff-subheading').textContent = `${company} • ${role}`;

  try {
    const res = await fetch('/api/ai/agent/tailor-diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCompany: company, targetRole: role, jobDescription: jd })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to tailor');

    renderAgentDiffResults(data, company, role);
  } catch (err) {
    diffBody.innerHTML = `
      <div style="padding:20px; color:#ef4444; background:#fef2f2; border-radius:8px; border:1px solid #fecaca;">
        <strong>Error generating diff:</strong> ${err.message}
      </div>
    `;
  }
}

function renderAgentDiffResults(data, company, role) {
  const diffBody = document.getElementById('agent-diff-body');
  if (!diffBody) return;

  let html = `
    <!-- 1. Executive Summary Diff -->
    <div style="margin-bottom:20px;">
      <h4 style="font-size:13.5px; font-weight:800; color:#0f172a; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <span>🎯</span> Professional Summary Alignment
      </h4>
      <div class="diff-grid">
        <div class="diff-col original">
          <span class="diff-tag original">Master Resume Baseline</span>
          <div class="diff-bullet-text" style="color:#64748b;">${data.summaryDiff.original}</div>
        </div>
        <div class="diff-col tailored">
          <span class="diff-tag tailored">Tailored for ${company}</span>
          <div class="diff-bullet-text" id="agent-tailored-summary-text" style="font-weight:600; color:#064e3b;">${data.summaryDiff.tailored}</div>
          <div class="diff-meta-box">
            💡 <strong>Why:</strong> ${data.summaryDiff.changeHighlight}
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Work Experience Realignment -->
    <div style="margin-bottom:20px;">
      <h4 style="font-size:13.5px; font-weight:800; color:#0f172a; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <span>🏢</span> Work Experience Bullet Realignment
      </h4>
  `;

  data.experienceDiff.forEach(exp => {
    html += `
      <div style="background:#f8fafc; border:1px solid var(--border-light); border-radius:10px; padding:14px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap;">
          <strong style="font-size:13px; color:#0f172a;">${exp.company} — ${exp.title}</strong>
          <span style="font-size:11.5px; color:#64748b; font-weight:600;">${exp.period}</span>
        </div>
    `;

    exp.bullets.forEach((b, idx) => {
      html += `
        <div style="margin-bottom:12px;">
          <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:#6366f1; margin-bottom:4px;">
            Bullet ${idx + 1}: ${b.area}
          </div>
          <div class="diff-grid">
            <div class="diff-col original">
              <span class="diff-tag original">Original</span>
              <div class="diff-bullet-text">${b.original}</div>
            </div>
            <div class="diff-col tailored">
              <span class="diff-tag tailored">Realigned</span>
              <div class="diff-bullet-text tailored-bullet-text" style="font-weight:600; color:#064e3b;">${b.tailored}</div>
              <div class="diff-meta-box">
                <div style="margin-bottom:4px;">✨ <em>${b.reason}</em></div>
                <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">
                  ${b.highlightKeywords.map(k => `<span class="kw-chip matched" style="font-size:10px; padding:1px 6px;">${k}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  });

  html += `</div>`;

  // 3. Tailored Cover Letter Box
  const safeComp = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  const clPdfPath = `cover_letters/cover_${safeComp}_qa.pdf`;

  html += `
    <div style="margin-bottom:20px; background:#fdf4ff; border:1px solid #f0abfc; border-radius:10px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
        <h4 style="font-size:13.5px; font-weight:800; color:#86198f; margin:0; display:flex; align-items:center; gap:6px;">
          <span>✉️</span> Tailored Cover Letter Draft
        </h4>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-outline btn-sm" onclick="copyToClipboard(document.getElementById('agent-cl-text').value, 'Cover Letter')" style="font-size:11.5px; background:#fff;">📋 Copy Letter</button>
          <a href="/api/pdf?file=${encodeURIComponent(clPdfPath)}&download=1" class="btn btn-primary btn-sm" download style="font-size:11.5px; background:#a855f7; border:none; text-decoration:none;">📄 Download PDF</a>
        </div>
      </div>
      <textarea id="agent-cl-text" readonly rows="8" style="width:100%; padding:10px 12px; font-family:inherit; font-size:12.5px; line-height:1.6; background:#ffffff; border:1px solid #e9d5ff; border-radius:6px; resize:vertical; color:#1e293b;">${data.tailoredCoverLetter}</textarea>
    </div>
  `;

  // 4. ATS Verification Checklist
  html += `
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:14px;">
      <h4 style="font-size:12.5px; font-weight:800; color:#166534; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:0.5px;">
        🛡️ ATS Compliance & Integrity Verification
      </h4>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        ${data.atsChecklist.map(c => `
          <div style="font-size:12px; color:#15803d; display:flex; align-items:flex-start; gap:6px;">
            <span>✅</span>
            <div><strong>${c.rule}:</strong> <span style="color:#334155;">${c.note}</span></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  diffBody.innerHTML = html;
}

async function loadAgentReminders() {
  try {
    const res = await fetch('/api/ai/agent/reminders');
    const data = await res.json();
    if (data.success) {
      agentRemindersCache = data.reminders || [];
      const badge = document.getElementById('agent-reminders-badge');
      if (badge) badge.textContent = data.remindersCount || 0;
      const countAll = document.getElementById('count-rem-all');
      if (countAll) countAll.textContent = data.remindersCount || 0;
      renderAgentReminders('all');
    }
  } catch (e) {
    console.error('Error fetching reminders:', e);
  }
}

function renderAgentReminders(filter = 'all') {
  const container = document.getElementById('agent-reminders-list');
  if (!container) return;

  let filtered = agentRemindersCache;
  if (filter !== 'all') {
    filtered = agentRemindersCache.filter(r => r.urgency === filter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); background:#f8fafc; border-radius:8px; border:1px dashed var(--border-light);">
        <span style="font-size:32px; display:block; margin-bottom:8px;">🎉</span>
        <strong style="color:var(--text-main);">No reminders for this category!</strong>
        <p style="font-size:12.5px; margin-top:4px;">All applications in this filter are up to date.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(r => {
    let badgeColor = '#3b82f6';
    let badgeBg = '#eff6ff';
    if (r.urgency === 'urgent') { badgeColor = '#ef4444'; badgeBg = '#fef2f2'; }
    if (r.urgency === 'action') { badgeColor = '#8b5cf6'; badgeBg = '#fdf4ff'; }
    if (r.urgency === 'medium') { badgeColor = '#f59e0b'; badgeBg = '#fffbeb'; }

    return `
      <div class="reminder-card-item ${r.urgency}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <h4 style="margin:0; font-size:14px; font-weight:800; color:#0f172a;">${r.company}</h4>
            <div style="font-size:12px; color:#475569; font-weight:600;">${r.role}</div>
          </div>
          <span style="background:${badgeBg}; color:${badgeColor}; font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:12px; border:1px solid ${badgeColor}40;">
            ${r.urgencyLabel}
          </span>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; font-size:12px; line-height:1.5;">
          <div style="font-weight:700; color:#1e293b; margin-bottom:2px;">📍 Milestone: ${r.milestone}</div>
          <div style="color:#64748b;">${r.recommendedAction}</div>
        </div>

        <div>
          <label style="display:block; font-size:10.5px; font-weight:800; text-transform:uppercase; color:#94a3b8; margin-bottom:2px;">Subject Line</label>
          <div style="font-size:12px; font-family:'JetBrains Mono', monospace; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.subject}</div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${r.message.replace(/'/g, "\\'").replace(/\n/g, '\\n')}', '${r.company} Message')" style="font-weight:700; font-size:11.5px;">
            📋 Copy Message Draft
          </button>
          <button class="btn btn-primary btn-sm" onclick="openFastTrackForCompany('${r.company}')" style="font-size:11.5px; font-weight:700; background:#3b82f6;">
            ⚡ View Job Card
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openFastTrackForCompany(companyName) {
  const job = allJobs.find(j => (j.company || '').toLowerCase() === companyName.toLowerCase());
  if (job) {
    launchAutoFillForJob(job.id);
  }
}

async function loadSkillsTranslation(track = 'manual_to_automation') {
  const container = document.getElementById('agent-skills-content');
  if (!container) return;

  const parts = track.split('_to_');
  const fromDomain = parts[0] || 'manual';
  const toRole = parts[1] || 'automation';

  try {
    const res = await fetch('/api/ai/agent/translate-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromDomain, toRole })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    document.getElementById('agent-skills-heading').innerHTML = `<span>🎯</span> ${data.title}`;
    document.getElementById('agent-skills-subheading').textContent = `${data.overview}`;

    let html = `
      <div style="margin-bottom:18px;">
        <h4 style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">
          ✨ Core Competency Translations
        </h4>
        <div style="display:flex; flex-direction:column; gap:10px;">
    `;

    data.mappings.forEach((m, idx) => {
      html += `
        <div style="background:#f8fafc; border:1px solid var(--border-light); border-radius:8px; padding:12px;">
          <div style="font-size:12px; margin-bottom:4px;"><strong style="color:#64748b;">Previous Task:</strong> <span style="color:#334155;">${m.from}</span></div>
          <div style="font-size:12.5px; margin-bottom:4px;"><strong style="color:#10b981;">Target Frame:</strong> <span style="font-weight:700; color:#064e3b;">${m.to}</span></div>
          <div style="font-size:11.5px; color:#6366f1;">💡 <em>${m.benefit}</em></div>
        </div>
      `;
    });

    html += `
        </div>
      </div>

      <div style="margin-bottom:18px;">
        <h4 style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">
          📄 Resume Phrasing (Before vs. After)
        </h4>
        <div style="display:flex; flex-direction:column; gap:10px;">
    `;

    data.resumePhrasing.forEach(rp => {
      html += `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
          <div style="font-size:12px; color:#ef4444; margin-bottom:4px; text-decoration:line-through;">❌ "${rp.before}"</div>
          <div style="font-size:12.5px; color:#059669; font-weight:700;">✅ "${rp.after}"</div>
        </div>
      `;
    });

    html += `
        </div>
      </div>

      <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:14px;">
        <h4 style="font-size:12.5px; font-weight:800; color:#92400e; margin:0 0 6px 0;">🎙️ Proven Interview Soundbite</h4>
        <div style="font-size:12.5px; font-style:italic; line-height:1.6; color:#78350f;">
          "${data.interviewSoundbite}"
        </div>
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="color:#ef4444; padding:16px;">Error loading translation: ${err.message}</div>`;
  }
}

async function sendAgentChatMessage(msgText) {
  const historyContainer = document.getElementById('agent-chat-history');
  if (!historyContainer) return;

  // Append user bubble
  const userMsgEl = document.createElement('div');
  userMsgEl.className = 'chat-msg user';
  userMsgEl.innerHTML = `
    <div class="chat-avatar user">VK</div>
    <div class="chat-bubble">${escapeHtml(msgText)}</div>
  `;
  historyContainer.appendChild(userMsgEl);
  historyContainer.scrollTop = historyContainer.scrollHeight;

  // Typing placeholder
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-msg agent';
  typingEl.id = 'agent-typing-indicator';
  typingEl.innerHTML = `
    <div class="chat-avatar agent">🤖</div>
    <div class="chat-bubble" style="color:var(--text-muted); font-style:italic;">
      Thinking...
    </div>
  `;
  historyContainer.appendChild(typingEl);
  historyContainer.scrollTop = historyContainer.scrollHeight;

  try {
    const res = await fetch('/api/ai/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msgText })
    });
    const data = await res.json();
    typingEl.remove();

    if (data.success) {
      const agentMsgEl = document.createElement('div');
      agentMsgEl.className = 'chat-msg agent';
      agentMsgEl.innerHTML = `
        <div class="chat-avatar agent">🤖</div>
        <div class="chat-bubble">${formatAgentMarkdown(data.reply)}</div>
      `;
      historyContainer.appendChild(agentMsgEl);
      historyContainer.scrollTop = historyContainer.scrollHeight;

      // Update quick chips if available
      if (data.quickPrompts && data.quickPrompts.length > 0) {
        const chipsContainer = document.getElementById('agent-chat-quick-chips');
        if (chipsContainer) {
          chipsContainer.innerHTML = data.quickPrompts.map(p => `
            <button class="chat-prompt-pill" data-prompt="${p}">${p}</button>
          `).join('');
          chipsContainer.querySelectorAll('.chat-prompt-pill').forEach(chip => {
            chip.addEventListener('click', () => {
              const prompt = chip.getAttribute('data-prompt');
              if (prompt) sendAgentChatMessage(prompt);
            });
          });
        }
      }
    }
  } catch (err) {
    typingEl.remove();
    const errorEl = document.createElement('div');
    errorEl.className = 'chat-msg agent';
    errorEl.innerHTML = `
      <div class="chat-avatar agent">🤖</div>
      <div class="chat-bubble" style="color:#ef4444;">Error connecting to Career Agent: ${err.message}</div>
    `;
    historyContainer.appendChild(errorEl);
  }
}

function formatAgentMarkdown(text = '') {
  let out = escapeHtml(text);
  // Bold
  out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Quotes
  out = out.replace(/^> (.*?)$/gm, '<blockquote style="margin:4px 0; padding-left:10px; border-left:3px solid #6366f1; color:#334155;">$1</blockquote>');
  // Bullets
  out = out.replace(/^[•\-] (.*?)$/gm, '<div style="margin-left:14px;">• $1</div>');
  // Numbered list
  out = out.replace(/^(\d+)\. (.*?)$/gm, '<div style="margin-left:14px; margin-top:4px;"><strong>$1.</strong> $2</div>');
  // Linebreaks
  out = out.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  return out;
}

function escapeHtml(text = '') {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

window.initAgentModule = initAgentModule;
window.runAgentTailor = runAgentTailor;
window.openFastTrackForCompany = openFastTrackForCompany;

