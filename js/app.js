// StudyOS — Main Application Entry Point
import store from './store.js';
import router from './router.js';
import googleAuth from './google-auth.js';
import googleTasks from './google-tasks.js';
import googleCalendar from './google-calendar.js';
import gamification from './gamification.js';
import { initializeCourses } from './course-data.js';
import { markRevisionReviewed, handleMissedRevision, getRevisionsDueToday } from './spaced-repetition.js';

import { renderSidebar, updateSidebarProfile, renderMobileNav, toggleFocusMode } from './components/sidebar.js';
import { showOnboarding } from './components/onboarding.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderCourses, cycleTopicStatus, addChapter, addTopic, addTopicToLog } from './pages/courses.js';
import { renderTasks, setTaskTab, showCompletedTab, showAddTask, hideAddTask, submitTask, toggleTask, deleteTask, clearCompleted, syncTasks } from './pages/tasks.js';
import { renderLogger, onLoggerCourseChange, onLoggerChapterChange, toggleStopwatch, resetStopwatch, logSession, deleteSession } from './pages/logger.js';
import { renderProgress } from './pages/progress.js';
import { renderCalendar, calendarPrev, calendarNext, calendarToday, setCalendarView, calendarDayClick, calendarSlotClick } from './pages/calendar.js';
import { renderSettings, updateSetting, setAccentColor, applyAccentColor, setFontSize, connectGoogle, disconnectGoogle, saveClientId, exportData, resetData } from './pages/settings.js';

// Expose global API for inline event handlers
window.StudyOS = {
  // Navigation
  toggleFocusMode,

  // Dashboard
  toggleTask,

  // Courses
  cycleTopicStatus,
  addChapter,
  addTopic,
  addTopicToLog,

  // Tasks
  setTaskTab,
  showCompletedTab,
  showAddTask,
  hideAddTask,
  submitTask,
  deleteTask,
  clearCompleted,
  syncTasks: async () => {
    await syncTasks();
  },

  // Logger
  onLoggerCourseChange,
  onLoggerChapterChange,
  toggleStopwatch,
  resetStopwatch,
  logSession,
  deleteSession,

  // Calendar
  calendarPrev,
  calendarNext,
  calendarToday,
  setCalendarView,
  calendarDayClick,
  calendarSlotClick,

  // Settings
  updateSetting,
  setAccentColor,
  setFontSize,
  connectGoogle,
  disconnectGoogle,
  saveClientId,
  exportData,
  resetData,

  // Spaced Repetition
  markRevisionReviewed: (scheduleId) => {
    markRevisionReviewed(scheduleId);
    renderDashboard();
    showToast('Revision marked as reviewed ✓', 'success');
  },
  blockInCalendar: async (scheduleId) => {
    const revisions = getRevisionsDueToday();
    const rev = revisions.find(r => r.scheduleId === scheduleId);
    if (!rev) return;

    if (!googleAuth.isConnected) {
      showToast('Connect Google Calendar in Settings to use this feature', 'info');
      return;
    }

    showToast('Finding free slot...', 'info');
    const result = await googleCalendar.createRevisionBlock(
      rev.topicName, rev.courseCode, rev.revisionNumber, rev.totalRevisions, rev.studiedDate
    );

    if (result) {
      showToast('Revision session blocked in Google Calendar! 📅', 'success');
    } else {
      showToast('Could not find a free slot in the next 3 days. Try manually.', 'warning');
    }
  },

  // Spaced rep reference for focus mode
  spacedRep: { getRevisionsDueToday },

  // Init for post-onboarding
  init: () => initApp(),
};

async function initApp() {
  // Apply saved settings
  const profile = store.get('profile');
  if (profile.accentColor) applyAccentColor(profile.accentColor);
  if (profile.fontSize) document.documentElement.dataset.fontSize = profile.fontSize;

  // Check onboarding
  if (!store.isOnboardingComplete) {
    showOnboarding();
    return;
  }

  // Ensure courses are initialized
  initializeCourses(store);

  // Render sidebar
  renderSidebar();
  renderMobileNav();

  // Initialize Google Auth
  const customClientId = localStorage.getItem('studyos_google_client_id');
  if (customClientId) {
    // Override client ID if user provided one in settings
    window._studyos_client_id = customClientId;
  }
  await googleAuth.init();

  // Listen to auth changes
  googleAuth.onAuthChange((connected, profile) => {
    updateSidebarProfile();
    if (connected) {
      googleTasks.syncTasks();
    }
  });

  // Register routes
  router.register('dashboard', () => renderDashboard());
  router.register('calendar', () => renderCalendar());
  router.register('courses', (route) => renderCourses(route));
  router.register('tasks', () => renderTasks());
  router.register('logger', () => renderLogger());
  router.register('progress', () => renderProgress());
  router.register('settings', () => renderSettings());

  // Initialize router
  router.init();

  // Check gamification
  if (gamification.isUnlocked) {
    gamification.showElements();
  }

  // Check for overdue revisions
  checkOverdueRevisions();
}

function checkOverdueRevisions() {
  const allRevisions = store.get('revisions') || [];
  const todayStr = new Date().toISOString().split('T')[0];
  let overdueCount = 0;

  for (const schedule of allRevisions) {
    if (!schedule.active) continue;
    const currentIdx = schedule.currentRevision;
    if (currentIdx >= schedule.revisions.length) continue;

    const revision = schedule.revisions[currentIdx];
    if (!revision.completed && revision.dueDate < todayStr) {
      overdueCount++;
    }
  }

  if (overdueCount > 0) {
    setTimeout(() => {
      showToast(`⚠️ You have ${overdueCount} overdue revision${overdueCount > 1 ? 's' : ''}. Check your dashboard!`, 'warning');
    }, 1500);
  }
}

function showToast(message, type = 'info') {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <span class="toast-close" onclick="this.parentNode.remove()" style="cursor:pointer;padding:4px">✕</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 4000);
}

// Boot the app
document.addEventListener('DOMContentLoaded', initApp);
