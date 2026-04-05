// StudyOS — Onboarding Component
import store from '../store.js';
import { initializeCourses } from '../course-data.js';
import googleAuth from '../google-auth.js';

let currentStep = 1;

export function showOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.classList.remove('hiding');
  renderStep(1);
}

export function hideOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;
  overlay.classList.add('hiding');
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 500);
}

function renderStep(step) {
  currentStep = step;

  // Update progress dots
  document.querySelectorAll('.onboarding-progress-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i + 1 === step) dot.classList.add('active');
    else if (i + 1 < step) dot.classList.add('done');
  });

  // Show correct step
  document.querySelectorAll('.onboarding-step').forEach((s, i) => {
    s.classList.toggle('active', i + 1 === step);
  });

  // Rebind step-specific handlers
  if (step === 2) bindStep2();
  if (step === 3) bindStep3();

  if (window.lucide) lucide.createIcons();
}

function bindStep2() {
  const nextBtn = document.getElementById('onboarding-step2-next');
  nextBtn?.addEventListener('click', () => {
    const name = document.getElementById('onboarding-name')?.value?.trim();
    const semesterStart = document.getElementById('onboarding-semester-start')?.value;
    const finalsEnd = document.getElementById('onboarding-finals-end')?.value;

    if (!name) {
      document.getElementById('onboarding-name')?.focus();
      return;
    }

    store.set('profile.name', name);
    if (semesterStart) store.set('profile.semesterStart', semesterStart);
    if (finalsEnd) store.set('profile.finalsEnd', finalsEnd);

    renderStep(3);
  });
}

function bindStep3() {
  const connectBtn = document.getElementById('onboarding-google-connect');
  const skipBtn = document.getElementById('onboarding-skip-google');
  const finishBtn = document.getElementById('onboarding-finish');

  connectBtn?.addEventListener('click', () => {
    if (googleAuth.isConfigured) {
      googleAuth.connect();
      googleAuth.onAuthChange((connected) => {
        if (connected) {
          connectBtn.textContent = '✓ Connected';
          connectBtn.disabled = true;
          connectBtn.className = 'btn btn-secondary btn-lg';
        }
      });
    } else {
      showToast('Google Client ID not configured. You can set this up later in Settings.', 'info');
    }
  });

  skipBtn?.addEventListener('click', finishOnboarding);
  finishBtn?.addEventListener('click', finishOnboarding);
}

function finishOnboarding() {
  // Initialize courses
  initializeCourses(store);

  // Mark onboarding complete
  store.set('profile.onboardingComplete', true);

  // Hide overlay and refresh
  hideOnboarding();

  // Trigger app reload after animation
  setTimeout(() => {
    if (window.StudyOS?.init) {
      window.StudyOS.init();
    } else {
      window.location.reload();
    }
  }, 600);
}

function showToast(message, type = 'info') {
  // Simple inline toast if the toast system isn't loaded yet
  const container = document.querySelector('.toast-container') || document.body;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

export function renderOnboardingHTML() {
  return `
    <div class="onboarding-overlay" id="onboarding-overlay" style="display:none;">
      <div class="onboarding-container">
        <div class="onboarding-progress">
          <div class="onboarding-progress-dot active"></div>
          <div class="onboarding-progress-dot"></div>
          <div class="onboarding-progress-dot"></div>
        </div>

        <!-- Step 1: Welcome -->
        <div class="onboarding-step active" id="onboarding-step-1">
          <div class="onboarding-icon">
            <i data-lucide="book-open" style="width:28px;height:28px"></i>
          </div>
          <h1 class="onboarding-title">Welcome to StudyOS</h1>
          <p class="onboarding-subtitle">Your academic operating system for Semester 2. Track your studies, manage deadlines, and ace your exams — all in one place.</p>
          <div class="onboarding-actions">
            <button class="btn btn-primary btn-lg" onclick="document.querySelectorAll('.onboarding-step').forEach(s=>s.classList.remove('active'));document.getElementById('onboarding-step-2').classList.add('active');document.querySelectorAll('.onboarding-progress-dot').forEach((d,i)=>{d.classList.remove('active','done');if(i===1)d.classList.add('active');if(i<1)d.classList.add('done')});">
              Get Started
              <i data-lucide="arrow-right" style="width:16px;height:16px"></i>
            </button>
          </div>
        </div>

        <!-- Step 2: Setup -->
        <div class="onboarding-step" id="onboarding-step-2">
          <div class="onboarding-icon">
            <i data-lucide="user" style="width:28px;height:28px"></i>
          </div>
          <h1 class="onboarding-title">Let's set up</h1>
          <p class="onboarding-subtitle">Tell us a bit about your semester so StudyOS can personalize your experience.</p>
          <div class="onboarding-form">
            <div class="form-group">
              <label class="form-label">What's your name?</label>
              <input type="text" class="form-input" id="onboarding-name" placeholder="Enter your name" autofocus>
            </div>
            <div class="form-group">
              <label class="form-label">Semester start date</label>
              <input type="date" class="form-input" id="onboarding-semester-start" value="2026-01-06">
            </div>
            <div class="form-group">
              <label class="form-label">Finals week end date</label>
              <input type="date" class="form-input" id="onboarding-finals-end" value="2026-05-15">
            </div>
          </div>
          <div class="onboarding-actions">
            <button class="btn btn-primary btn-lg" id="onboarding-step2-next">
              Continue
              <i data-lucide="arrow-right" style="width:16px;height:16px"></i>
            </button>
          </div>
        </div>

        <!-- Step 3: Google Connect -->
        <div class="onboarding-step" id="onboarding-step-3">
          <div class="onboarding-icon">
            <i data-lucide="cloud" style="width:28px;height:28px"></i>
          </div>
          <h1 class="onboarding-title">Connect Google</h1>
          <p class="onboarding-subtitle">Sync your tasks and calendar for a seamless study experience.</p>
          <div class="onboarding-google-card">
            <div style="font-size:var(--text-sm);font-weight:500;margin-bottom:var(--space-2)">StudyOS will access:</div>
            <div class="onboarding-google-perms">
              <div class="onboarding-google-perm">
                <i data-lucide="check-square" class="onboarding-google-perm-icon"></i>
                <span>Google Tasks — to sync your deadlines</span>
              </div>
              <div class="onboarding-google-perm">
                <i data-lucide="calendar" class="onboarding-google-perm-icon"></i>
                <span>Google Calendar — to schedule study sessions</span>
              </div>
            </div>
          </div>
          <div class="onboarding-actions">
            <button class="btn btn-primary btn-lg" id="onboarding-google-connect">
              Connect Google Account
            </button>
            <button class="btn btn-ghost" id="onboarding-skip-google">Skip for now</button>
          </div>
          <div style="margin-top:var(--space-4)">
            <button class="btn btn-primary btn-lg w-full" id="onboarding-finish" style="display:none">
              Launch StudyOS 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export default { showOnboarding, hideOnboarding, renderOnboardingHTML };
