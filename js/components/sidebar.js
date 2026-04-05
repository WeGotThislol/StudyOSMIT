// StudyOS — Sidebar Component
import store from '../store.js';
import router from '../router.js';
import googleAuth from '../google-auth.js';
import gamification from '../gamification.js';

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
  { id: 'calendar', icon: 'calendar', label: 'Calendar View' },
  { id: 'courses', icon: 'book-open', label: 'My Courses' },
  { id: 'tasks', icon: 'check-square', label: 'Tasks & Deadlines' },
  { id: 'logger', icon: 'timer', label: 'Study Logger' },
  { id: 'progress', icon: 'bar-chart-3', label: 'Progress & Stats' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

export function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const profile = store.get('profile');
  const name = profile?.name || 'Student';
  const initial = name.charAt(0).toUpperCase();

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">📖</div>
        <span>StudyOS</span>
      </div>
      <button class="focus-mode-btn" id="focus-mode-toggle">
        <i data-lucide="zap" style="width:14px;height:14px"></i>
        Focus Mode
      </button>
    </div>

    <nav class="sidebar-nav">
      ${NAV_ITEMS.map(item => `
        <button class="nav-item" data-page="${item.id}" id="nav-${item.id}">
          <i data-lucide="${item.icon}" class="nav-item-icon"></i>
          <span>${item.label}</span>
        </button>
      `).join('')}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-xp gamification-element" id="sidebar-xp">
        <i data-lucide="sparkles" style="width:14px;height:14px"></i>
        <span id="sidebar-xp-value">0 XP</span>
      </div>
      <div class="sidebar-profile">
        <div class="sidebar-profile-avatar" id="sidebar-avatar">
          ${initial}
        </div>
        <div class="sidebar-profile-info">
          <div class="sidebar-profile-name">${name}</div>
          <div class="sidebar-profile-status sidebar-level gamification-element" id="sidebar-level"></div>
          <div class="sidebar-profile-status" id="sidebar-connection-status">
            ${googleAuth.isConnected ? '● Connected' : 'Not connected'}
          </div>
        </div>
      </div>
    </div>
  `;

  // Set up event listeners
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      router.navigate(item.dataset.page);
    });
  });

  // Focus mode toggle
  document.getElementById('focus-mode-toggle').addEventListener('click', toggleFocusMode);

  // Render icons
  if (window.lucide) lucide.createIcons();

  // Update gamification if unlocked
  updateGamificationUI();
}

export function toggleFocusMode() {
  const body = document.body;
  const btn = document.getElementById('focus-mode-toggle');
  body.classList.toggle('focus-mode');
  btn?.classList.toggle('active');

  if (body.classList.contains('focus-mode')) {
    renderFocusModeView();
  }
}

function renderFocusModeView() {
  const container = document.getElementById('focus-mode-content');
  if (!container) return;

  const { getRevisionsDueToday } = window.StudyOS?.spacedRep || {};
  const tasks = (store.get('tasks') || []).filter(t => !t.done && t.dueDate === new Date().toISOString().split('T')[0]);
  const revisions = getRevisionsDueToday ? getRevisionsDueToday() : [];

  container.innerHTML = `
    <div class="focus-header">
      <h2 style="font-size:var(--text-xl);font-weight:600;">Focus Mode</h2>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('focus-mode-toggle').click()">
        <i data-lucide="x" style="width:16px;height:16px"></i> Exit
      </button>
    </div>

    <div class="focus-section">
      <div class="focus-section-title">Today's Tasks</div>
      ${tasks.length > 0 ? tasks.map(t => `
        <div class="focus-task-item">
          <div class="checkbox" data-task-id="${t.id}"></div>
          <span style="font-size:var(--text-base)">${t.title}</span>
        </div>
      `).join('') : '<div class="empty-state" style="padding:var(--space-4)"><span style="color:var(--text-muted);font-size:var(--text-sm)">No tasks for today</span></div>'}
    </div>

    <div class="focus-section">
      <div class="focus-section-title">Revisions Due</div>
      ${revisions.length > 0 ? revisions.slice(0, 3).map(r => `
        <div class="focus-task-item">
          <span style="font-size:var(--text-base)">${r.topicName}</span>
          <span class="course-pill" data-course="${r.courseCode}">${r.courseCode}</span>
        </div>
      `).join('') : '<div class="empty-state" style="padding:var(--space-4)"><span style="color:var(--text-muted);font-size:var(--text-sm)">You\'re all caught up! 🎉</span></div>'}
    </div>

    <div class="focus-timer">
      <div class="focus-section-title">Study Timer</div>
      <div class="focus-timer-display" id="focus-timer-display">00:00</div>
      <div style="display:flex;gap:var(--space-3);justify-content:center">
        <button class="btn btn-primary" id="focus-timer-start">Start</button>
        <button class="btn btn-secondary" id="focus-timer-reset">Reset</button>
      </div>
    </div>
  `;

  // Simple focus timer
  let focusSeconds = 0;
  let focusInterval = null;

  const display = document.getElementById('focus-timer-display');
  const startBtn = document.getElementById('focus-timer-start');
  const resetBtn = document.getElementById('focus-timer-reset');

  startBtn?.addEventListener('click', () => {
    if (focusInterval) {
      clearInterval(focusInterval);
      focusInterval = null;
      startBtn.textContent = 'Start';
    } else {
      focusInterval = setInterval(() => {
        focusSeconds++;
        const m = String(Math.floor(focusSeconds / 60)).padStart(2, '0');
        const s = String(focusSeconds % 60).padStart(2, '0');
        if (display) display.textContent = `${m}:${s}`;
      }, 1000);
      startBtn.textContent = 'Pause';
    }
  });

  resetBtn?.addEventListener('click', () => {
    clearInterval(focusInterval);
    focusInterval = null;
    focusSeconds = 0;
    if (display) display.textContent = '00:00';
    if (startBtn) startBtn.textContent = 'Start';
  });

  if (window.lucide) lucide.createIcons();
}

export function updateSidebarProfile() {
  const profile = store.get('profile');
  const nameEl = document.querySelector('.sidebar-profile-name');
  const avatarEl = document.getElementById('sidebar-avatar');

  if (nameEl) nameEl.textContent = profile?.name || 'Student';
  if (avatarEl) {
    if (googleAuth.isConnected && googleAuth.userProfile?.picture) {
      avatarEl.innerHTML = `<img src="${googleAuth.userProfile.picture}" alt="Profile">`;
    } else {
      avatarEl.textContent = (profile?.name || 'S').charAt(0).toUpperCase();
    }
  }

  const statusEl = document.getElementById('sidebar-connection-status');
  if (statusEl) {
    statusEl.textContent = googleAuth.isConnected ? '● Connected' : 'Not connected';
    statusEl.style.color = googleAuth.isConnected ? 'var(--color-green)' : 'var(--text-muted)';
  }
}

export function updateGamificationUI() {
  if (gamification.isUnlocked) {
    const xpEl = document.getElementById('sidebar-xp');
    const xpValEl = document.getElementById('sidebar-xp-value');
    const levelEl = document.getElementById('sidebar-level');

    if (xpEl) xpEl.classList.add('visible');
    if (xpValEl) xpValEl.textContent = `${gamification.xp} XP`;
    if (levelEl) {
      const info = gamification.levelInfo;
      levelEl.textContent = `Level ${info.level} — ${info.title}`;
      levelEl.classList.add('visible');
    }
  }
}

export function renderMobileNav() {
  const mobileNav = document.getElementById('mobile-nav');
  if (!mobileNav) return;

  const mobileItems = [
    { id: 'dashboard', icon: 'layout-dashboard', label: 'Home' },
    { id: 'courses', icon: 'book-open', label: 'Courses' },
    { id: 'logger', icon: 'timer', label: 'Logger' },
    { id: 'tasks', icon: 'check-square', label: 'Tasks' },
    { id: 'progress', icon: 'bar-chart-3', label: 'Stats' },
  ];

  mobileNav.innerHTML = mobileItems.map(item => `
    <button class="mobile-nav-item" data-page="${item.id}">
      <i data-lucide="${item.icon}" class="mobile-nav-item-icon"></i>
      <span>${item.label}</span>
    </button>
  `).join('');

  mobileNav.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      router.navigate(item.dataset.page);
      mobileNav.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  if (window.lucide) lucide.createIcons();
}

export default { renderSidebar, updateSidebarProfile, renderMobileNav, toggleFocusMode };
