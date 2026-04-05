// StudyOS — Study Logger Page
import store from '../store.js';
import { uid, formatDate, formatDuration, formatTime, COURSE_COLORS } from '../utils.js';
import { createRevisionSchedule } from '../spaced-repetition.js';
import gamification from '../gamification.js';

let stopwatchInterval = null;
let stopwatchSeconds = 0;
let stopwatchRunning = false;

export function renderLogger() {
  const page = document.getElementById('page-logger');
  if (!page) return;

  const courses = store.get('courses') || {};
  const sessions = store.get('studySessions') || [];
  const courseOptions = Object.entries(courses).map(([code, c]) => `<option value="${code}">${code} — ${c.name}</option>`).join('');

  // Check for pre-fill from courses page
  const preFill = sessionStorage.getItem('loggerPreFill');
  let preFillData = null;
  if (preFill) {
    try { preFillData = JSON.parse(preFill); } catch (e) {}
    sessionStorage.removeItem('loggerPreFill');
  }

  page.innerHTML = `
    <h1 class="page-title">Study Logger</h1>
    <p class="page-subtitle">Record your study sessions and track your progress</p>

    <div class="logger-layout">
      <div class="logger-form">
        <div class="logger-form-title">Log a Session</div>
        <div class="logger-fields">
          <div class="form-group">
            <label class="form-label">Course</label>
            <select class="form-input form-select" id="logger-course" onchange="window.StudyOS.onLoggerCourseChange()">
              <option value="">Select course...</option>
              ${courseOptions}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Chapter</label>
            <select class="form-input form-select" id="logger-chapter" onchange="window.StudyOS.onLoggerChapterChange()" disabled>
              <option value="">Select chapter...</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Topics Covered</label>
            <div class="topic-chips-container" id="logger-topics">
              <div style="color:var(--text-muted);font-size:var(--text-sm);padding:var(--space-2)">Select a course and chapter first</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Duration</label>
            <div class="duration-input-wrapper">
              <input type="number" class="form-input" id="logger-duration" placeholder="Minutes" min="1" max="600" style="width:120px">
              <span style="color:var(--text-muted);font-size:var(--text-sm)">minutes</span>
              <span style="color:var(--text-muted);font-size:var(--text-xs);margin-left:auto">or use the stopwatch →</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notes (optional)</label>
            <textarea class="form-input" id="logger-notes" placeholder="Any notes about this session..." rows="2"></textarea>
          </div>

          <div style="display:flex;gap:var(--space-3)">
            <button class="btn btn-primary flex-1" onclick="window.StudyOS.logSession()">
              <i data-lucide="save" style="width:16px;height:16px"></i> Log Session
            </button>
          </div>
        </div>
      </div>

      <div class="stopwatch-container">
        <div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-4);font-weight:500">STOPWATCH</div>
        <div class="stopwatch-display" id="stopwatch-display">${formatTime(stopwatchSeconds)}</div>
        <div class="stopwatch-controls">
          <button class="stopwatch-btn ${stopwatchRunning ? 'stop' : 'start'}" id="stopwatch-toggle" onclick="window.StudyOS.toggleStopwatch()">
            <i data-lucide="${stopwatchRunning ? 'pause' : 'play'}" style="width:20px;height:20px"></i>
          </button>
          <button class="stopwatch-btn" onclick="window.StudyOS.resetStopwatch()">
            <i data-lucide="rotate-ccw" style="width:18px;height:18px"></i>
          </button>
        </div>
        <div class="stopwatch-label">${stopwatchRunning ? 'Timer running...' : 'Click to start timing'}</div>
      </div>
    </div>

    <div class="session-history">
      <div class="section-header">
        <h2 class="session-history-title">Session History</h2>
        <span style="font-size:var(--text-sm);color:var(--text-muted)">${sessions.length} sessions</span>
      </div>
      <div class="session-list" id="session-list">
        ${renderSessionList(sessions)}
      </div>
    </div>
  `;

  // Apply pre-fill if available
  if (preFillData) {
    const courseSelect = document.getElementById('logger-course');
    if (courseSelect) {
      courseSelect.value = preFillData.courseCode;
      onLoggerCourseChange();
      setTimeout(() => {
        const chapterSelect = document.getElementById('logger-chapter');
        if (chapterSelect) {
          chapterSelect.selectedIndex = preFillData.chIdx + 1;
          onLoggerChapterChange();
        }
      }, 50);
    }
  }

  if (window.lucide) lucide.createIcons();
}

function renderSessionList(sessions) {
  if (sessions.length === 0) {
    return `
      <div class="empty-state">
        <i data-lucide="clock" class="empty-state-icon"></i>
        <div class="empty-state-title">No sessions logged yet</div>
        <div class="empty-state-text">Start logging your study sessions to track progress</div>
      </div>
    `;
  }

  const sorted = [...sessions].reverse();
  return sorted.map((s, i) => {
    const color = COURSE_COLORS[s.courseCode] || '#888';
    const topics = (s.topics || []).join(', ');
    const actualIdx = sessions.length - 1 - i;

    return `
      <div class="session-item">
        <div class="session-item-icon" style="background:${color}20;color:${color}">
          <i data-lucide="book-open" style="width:18px;height:18px"></i>
        </div>
        <div class="session-item-content">
          <div class="session-item-title">
            <span class="course-pill" data-course="${s.courseCode}">${s.courseCode}</span>
            ${s.chapter || ''}
          </div>
          <div class="session-item-meta">
            ${topics ? `<span>${topics.length > 80 ? topics.substring(0, 80) + '...' : topics}</span>` : ''}
            <span>· ${formatDate(s.timestamp)}</span>
            ${s.notes ? `<span>· ${s.notes.substring(0, 40)}${s.notes.length > 40 ? '...' : ''}</span>` : ''}
          </div>
        </div>
        <div class="session-item-duration">${formatDuration(s.duration)}</div>
        <button class="btn btn-ghost btn-icon session-item-delete" onclick="window.StudyOS.deleteSession(${actualIdx})" title="Delete">
          <i data-lucide="trash-2" style="width:14px;height:14px;color:var(--color-red)"></i>
        </button>
      </div>
    `;
  }).join('');
}

// --- Actions ---

export function onLoggerCourseChange() {
  const courseCode = document.getElementById('logger-course')?.value;
  const chapterSelect = document.getElementById('logger-chapter');
  const topicsContainer = document.getElementById('logger-topics');

  if (!courseCode) {
    chapterSelect.innerHTML = '<option value="">Select chapter...</option>';
    chapterSelect.disabled = true;
    topicsContainer.innerHTML = '<div style="color:var(--text-muted);font-size:var(--text-sm);padding:var(--space-2)">Select a course first</div>';
    return;
  }

  const courses = store.get('courses');
  const course = courses[courseCode];
  if (!course) return;

  chapterSelect.disabled = false;
  chapterSelect.innerHTML = '<option value="">Select chapter...</option>' +
    course.chapters.map((ch, i) => `<option value="${i}">${ch.name}</option>`).join('');

  topicsContainer.innerHTML = '<div style="color:var(--text-muted);font-size:var(--text-sm);padding:var(--space-2)">Select a chapter to see topics</div>';
}

export function onLoggerChapterChange() {
  const courseCode = document.getElementById('logger-course')?.value;
  const chIdx = document.getElementById('logger-chapter')?.value;
  const topicsContainer = document.getElementById('logger-topics');

  if (!courseCode || chIdx === '') {
    topicsContainer.innerHTML = '<div style="color:var(--text-muted);font-size:var(--text-sm);padding:var(--space-2)">Select a chapter</div>';
    return;
  }

  const courses = store.get('courses');
  const chapter = courses[courseCode]?.chapters[parseInt(chIdx)];
  if (!chapter) return;

  topicsContainer.innerHTML = chapter.topics.map((t, i) => `
    <button class="topic-chip" data-topic-idx="${i}" onclick="this.classList.toggle('selected')">
      ${t.name}
    </button>
  `).join('');
}

export function toggleStopwatch() {
  if (stopwatchRunning) {
    clearInterval(stopwatchInterval);
    stopwatchRunning = false;
    // Fill duration field
    const minutes = Math.ceil(stopwatchSeconds / 60);
    const durationInput = document.getElementById('logger-duration');
    if (durationInput) durationInput.value = minutes;
  } else {
    stopwatchRunning = true;
    stopwatchInterval = setInterval(() => {
      stopwatchSeconds++;
      const display = document.getElementById('stopwatch-display');
      if (display) display.textContent = formatTime(stopwatchSeconds);
    }, 1000);
  }

  // Update button state
  const btn = document.getElementById('stopwatch-toggle');
  if (btn) {
    btn.className = `stopwatch-btn ${stopwatchRunning ? 'stop' : 'start'}`;
    btn.innerHTML = `<i data-lucide="${stopwatchRunning ? 'pause' : 'play'}" style="width:20px;height:20px"></i>`;
  }
  const label = document.querySelector('.stopwatch-label');
  if (label) label.textContent = stopwatchRunning ? 'Timer running...' : 'Click to start timing';
  if (window.lucide) lucide.createIcons();
}

export function resetStopwatch() {
  clearInterval(stopwatchInterval);
  stopwatchRunning = false;
  stopwatchSeconds = 0;

  const display = document.getElementById('stopwatch-display');
  if (display) display.textContent = '00:00';

  const btn = document.getElementById('stopwatch-toggle');
  if (btn) {
    btn.className = 'stopwatch-btn start';
    btn.innerHTML = '<i data-lucide="play" style="width:20px;height:20px"></i>';
  }
  const label = document.querySelector('.stopwatch-label');
  if (label) label.textContent = 'Click to start timing';
  if (window.lucide) lucide.createIcons();
}

export function logSession() {
  const courseCode = document.getElementById('logger-course')?.value;
  const chIdx = document.getElementById('logger-chapter')?.value;
  const duration = parseInt(document.getElementById('logger-duration')?.value) || 0;
  const notes = document.getElementById('logger-notes')?.value?.trim() || '';

  if (!courseCode) { alert('Please select a course.'); return; }
  if (duration <= 0) { alert('Please enter a duration or use the stopwatch.'); return; }

  const courses = store.get('courses');
  const course = courses[courseCode];
  const chapter = chIdx !== '' ? course?.chapters[parseInt(chIdx)] : null;

  // Get selected topics
  const selectedChips = document.querySelectorAll('#logger-topics .topic-chip.selected');
  const topicNames = [];
  const topicIndices = [];
  selectedChips.forEach(chip => {
    const idx = parseInt(chip.dataset.topicIdx);
    if (chapter && !isNaN(idx)) {
      topicNames.push(chapter.topics[idx].name);
      topicIndices.push(idx);
    }
  });

  // Create session
  const session = {
    id: uid(),
    courseCode,
    chapter: chapter?.name || '',
    chapterIdx: chIdx !== '' ? parseInt(chIdx) : null,
    topics: topicNames,
    duration,
    notes,
    timestamp: new Date().toISOString(),
  };

  store.push('studySessions', session);

  // Update topic statuses
  if (chapter && topicIndices.length > 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    topicIndices.forEach(tIdx => {
      const topic = courses[courseCode].chapters[parseInt(chIdx)].topics[tIdx];
      if (topic.status === 'not-started') {
        topic.status = 'in-progress';
      }
    });
    store.set('courses', courses);
  }

  // Add gamification XP
  const xpEarned = gamification.addStudyXP(duration);

  // Reset form
  resetStopwatch();
  showToast(`Session logged! ${duration}m of ${courseCode}${xpEarned ? ` · +${xpEarned} XP` : ''}`, 'success');
  renderLogger();
}

export function deleteSession(index) {
  if (!confirm('Delete this study session?')) return;
  store.removeAt('studySessions', index);
  renderLogger();
  showToast('Session deleted', 'info');
}

function showToast(message, type = 'info') {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-message">${message}</span><span class="toast-close" onclick="this.parentNode.remove()">✕</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

export default { renderLogger, onLoggerCourseChange, onLoggerChapterChange, toggleStopwatch, resetStopwatch, logSession, deleteSession };
