// StudyOS — Settings Page
import store from '../store.js';
import googleAuth from '../google-auth.js';
import { ACCENT_PRESETS } from '../utils.js';

export function renderSettings() {
  const page = document.getElementById('page-settings');
  if (!page) return;

  const profile = store.get('profile');
  const currentAccent = profile.accentColor || 'violet';
  const currentFontSize = profile.fontSize || 'comfortable';

  page.innerHTML = `
    <h1 class="page-title">Settings</h1>
    <p class="page-subtitle">Customize your StudyOS experience</p>

    <div class="settings-sections">
      <!-- Profile -->
      <div class="settings-section">
        <div class="settings-section-title">Profile</div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Name</div>
            <div class="settings-row-description">Used in the dashboard greeting</div>
          </div>
          <input type="text" class="form-input" id="settings-name" value="${profile.name || ''}" 
                 style="width:200px" onchange="window.StudyOS.updateSetting('profile.name', this.value)">
        </div>
      </div>

      <!-- Semester Setup -->
      <div class="settings-section">
        <div class="settings-section-title">Semester Setup</div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Semester Start Date</div>
            <div class="settings-row-description">Used to calculate "Week X of Semester"</div>
          </div>
          <input type="date" class="form-input" id="settings-semester-start" value="${profile.semesterStart || '2026-01-06'}"
                 style="width:180px" onchange="window.StudyOS.updateSetting('profile.semesterStart', this.value)">
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Finals Week End Date</div>
            <div class="settings-row-description">Used for countdown displays</div>
          </div>
          <input type="date" class="form-input" id="settings-finals-end" value="${profile.finalsEnd || '2026-05-15'}"
                 style="width:180px" onchange="window.StudyOS.updateSetting('profile.finalsEnd', this.value)">
        </div>
      </div>

      <!-- Google Account -->
      <div class="settings-section">
        <div class="settings-section-title">Notifications & Sync</div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Google Account</div>
            <div class="settings-row-description">
              ${googleAuth.isConnected
                ? `Connected as ${googleAuth.userProfile?.name || 'Unknown'}`
                : googleAuth.isConfigured
                  ? 'Not connected'
                  : 'Client ID not configured'
              }
            </div>
          </div>
          <div style="display:flex;gap:var(--space-2)">
            ${googleAuth.isConnected ? `
              <button class="btn btn-danger btn-sm" onclick="window.StudyOS.disconnectGoogle()">Disconnect</button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="window.StudyOS.connectGoogle()" ${!googleAuth.isConfigured ? 'disabled' : ''}>
                Connect Google
              </button>
            `}
          </div>
        </div>
        ${!googleAuth.isConfigured ? `
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Google Client ID</div>
              <div class="settings-row-description">Enter your Google Cloud OAuth Client ID</div>
            </div>
            <div style="display:flex;gap:var(--space-2);align-items:center">
              <input type="text" class="form-input" id="settings-client-id" placeholder="your-client-id.apps.googleusercontent.com" style="width:320px;font-size:var(--text-xs)">
              <button class="btn btn-secondary btn-sm" onclick="window.StudyOS.saveClientId()">Save</button>
            </div>
          </div>
        ` : ''}
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Manual Sync</div>
            <div class="settings-row-description">Sync tasks with Google Tasks</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.StudyOS.syncTasks()" ${!googleAuth.isConnected ? 'disabled' : ''}>
            <i data-lucide="refresh-cw" style="width:14px;height:14px"></i> Sync Now
          </button>
        </div>
      </div>

      <!-- Appearance -->
      <div class="settings-section">
        <div class="settings-section-title">Appearance</div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Accent Color</div>
            <div class="settings-row-description">Primary color throughout the app</div>
          </div>
          <div class="accent-picker">
            ${Object.entries(ACCENT_PRESETS).map(([name, colors]) => `
              <div class="accent-swatch ${name === currentAccent ? 'active' : ''}"
                   style="background:${colors.primary}"
                   title="${name.charAt(0).toUpperCase() + name.slice(1)}"
                   onclick="window.StudyOS.setAccentColor('${name}')">
              </div>
            `).join('')}
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Font Size</div>
            <div class="settings-row-description">Adjust text size throughout the app</div>
          </div>
          <div style="display:flex;gap:var(--space-1);padding:2px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md)">
            <button class="btn btn-sm ${currentFontSize === 'comfortable' ? 'btn-primary' : 'btn-ghost'}" 
                    onclick="window.StudyOS.setFontSize('comfortable')">Comfortable</button>
            <button class="btn btn-sm ${currentFontSize === 'compact' ? 'btn-primary' : 'btn-ghost'}" 
                    onclick="window.StudyOS.setFontSize('compact')">Compact</button>
          </div>
        </div>
      </div>

      <!-- Data -->
      <div class="settings-section">
        <div class="settings-section-title">Data</div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Export Data</div>
            <div class="settings-row-description">Download all your StudyOS data as JSON</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.StudyOS.exportData()">
            <i data-lucide="download" style="width:14px;height:14px"></i> Export JSON
          </button>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Reset All Data</div>
            <div class="settings-row-description" style="color:var(--color-red)">This will delete all your data permanently</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="window.StudyOS.resetData()">
            <i data-lucide="trash-2" style="width:14px;height:14px"></i> Reset
          </button>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

// --- Actions ---

export function updateSetting(key, value) {
  store.set(key, value);
  // Update sidebar if name changed
  if (key === 'profile.name') {
    import('../components/sidebar.js').then(m => m.updateSidebarProfile());
  }
}

export function setAccentColor(color) {
  store.set('profile.accentColor', color);
  applyAccentColor(color);
  renderSettings();
}

export function applyAccentColor(color) {
  const preset = ACCENT_PRESETS[color];
  if (!preset) return;

  document.documentElement.style.setProperty('--accent', preset.primary);
  document.documentElement.style.setProperty('--accent-light', preset.light);
  document.documentElement.style.setProperty('--accent-dark', preset.dark);
  document.documentElement.style.setProperty('--accent-bg', `${preset.primary}1f`);
  document.documentElement.style.setProperty('--accent-bg-hover', `${preset.primary}33`);
}

export function setFontSize(size) {
  store.set('profile.fontSize', size);
  document.documentElement.dataset.fontSize = size;
  renderSettings();
}

export function connectGoogle() {
  if (googleAuth.isConfigured) {
    googleAuth.connect();
  }
}

export function disconnectGoogle() {
  if (confirm('Disconnect your Google account?')) {
    googleAuth.disconnect();
    renderSettings();
  }
}

export function saveClientId() {
  const input = document.getElementById('settings-client-id');
  const clientId = input?.value?.trim();
  if (!clientId) return;

  // Store in localStorage for persistence
  localStorage.setItem('studyos_google_client_id', clientId);
  alert('Client ID saved! Please reload the page for changes to take effect.');
  window.location.reload();
}

export function exportData() {
  const data = store.export();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `studyos-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function resetData() {
  if (!confirm('Are you sure you want to reset all data? This cannot be undone.')) return;
  if (!confirm('This will delete ALL your courses, tasks, study sessions, and settings. Are you absolutely sure?')) return;
  store.reset();
  window.location.reload();
}

export default { renderSettings, updateSetting, setAccentColor, applyAccentColor, setFontSize, connectGoogle, disconnectGoogle, saveClientId, exportData, resetData };
