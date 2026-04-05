// StudyOS — Courses Page
import store from '../store.js';
import { COURSES, getCourseStats } from '../course-data.js';
import { COURSE_COLORS, formatDate, uid } from '../utils.js';
import { createRevisionSchedule, getNextRevisionDate } from '../spaced-repetition.js';
import router from '../router.js';
import gamification from '../gamification.js';

let currentCourseView = null;

export function renderCourses(route) {
  const page = document.getElementById('page-courses');
  if (!page) return;

  if (route?.params?.length > 0) {
    renderCourseDetail(page, route.params[0]);
  } else {
    renderCourseGrid(page);
  }
}

function renderCourseGrid(page) {
  currentCourseView = null;
  const courses = store.get('courses') || {};

  page.innerHTML = `
    <h1 class="page-title">My Courses</h1>
    <p class="page-subtitle">Semester 2 — 6 courses, ${getTotalTopics(courses)} topics</p>
    <div class="courses-grid">
      ${Object.entries(courses).map(([code, course]) => {
        const stats = getCourseStats(course);
        const color = COURSE_COLORS[code] || '#7c3aed';
        const chapterCount = course.chapters.length;
        return `
          <div class="course-card" onclick="window.location.hash='#courses/${code}'">
            <div class="course-card-header">
              <div>
                <div class="course-card-code" style="color:${color}">${code}</div>
                <div class="course-card-name">${course.name}</div>
              </div>
              <div class="course-card-credits">[${course.credits}]</div>
            </div>
            <div class="course-card-progress">
              <div class="course-card-ring">
                ${renderProgressRingSVG(stats.completionPercent, 44, color)}
              </div>
              <div class="course-card-stats">
                <div class="course-card-percent">${stats.completionPercent}%</div>
                <div class="course-card-count">${stats.studied}/${stats.total} topics</div>
              </div>
            </div>
            <div class="course-card-footer">
              <span class="course-card-topics">${chapterCount} chapters</span>
              <span class="course-card-arrow">→</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function renderCourseDetail(page, courseCode) {
  currentCourseView = courseCode;
  const courses = store.get('courses') || {};
  const course = courses[courseCode];
  if (!course) {
    renderCourseGrid(page);
    return;
  }

  const stats = getCourseStats(course);
  const color = COURSE_COLORS[courseCode] || '#7c3aed';

  page.innerHTML = `
    <div class="course-view">
      <div class="course-view-header">
        <button class="course-back-btn" onclick="window.location.hash='#courses'">
          <i data-lucide="arrow-left" style="width:16px;height:16px"></i> Back to Courses
        </button>
        <div class="course-view-title">
          <h1 class="page-title" style="margin-bottom:0">${course.name}</h1>
          <span class="course-card-credits" style="color:${color}">[${course.credits}]</span>
        </div>
        <div class="course-view-code">${courseCode}</div>

        <div class="course-view-progress" style="margin-top:var(--space-4)">
          <div class="course-view-progress-label">
            <span>Overall Progress</span>
            <span class="mono">${stats.completionPercent}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${stats.completionPercent}%;background:${color}"></div>
          </div>
        </div>

        <div class="course-quick-stats">
          <div class="course-quick-stat">
            <span class="course-quick-stat-value">${stats.total}</span>
            <span class="course-quick-stat-label">Total Topics</span>
          </div>
          <div class="course-quick-stat">
            <span class="course-quick-stat-value" style="color:var(--color-green)">${stats.studied}</span>
            <span class="course-quick-stat-label">Studied</span>
          </div>
          <div class="course-quick-stat">
            <span class="course-quick-stat-value" style="color:var(--color-amber)">${stats.inProgress}</span>
            <span class="course-quick-stat-label">In Progress</span>
          </div>
          <div class="course-quick-stat">
            <span class="course-quick-stat-value" style="color:var(--text-muted)">${stats.notStarted}</span>
            <span class="course-quick-stat-label">Not Started</span>
          </div>
        </div>
      </div>

      <div id="course-chapters">
        ${course.chapters.map((chapter, chIdx) => renderChapterAccordion(courseCode, chapter, chIdx)).join('')}
      </div>

      <div class="add-inline" style="margin-top:var(--space-3)">
        <button class="add-inline-btn" onclick="window.StudyOS.addChapter('${courseCode}')">
          <i data-lucide="plus" style="width:14px;height:14px"></i> Add Chapter
        </button>
      </div>
    </div>
  `;

  // Bind chapter toggle events
  page.querySelectorAll('.chapter-header').forEach(header => {
    header.addEventListener('click', () => {
      const accordion = header.closest('.chapter-accordion');
      accordion.classList.toggle('open');
    });
  });

  if (window.lucide) lucide.createIcons();
}

function renderChapterAccordion(courseCode, chapter, chIdx) {
  const topicsDone = chapter.topics.filter(t => t.status === 'studied').length;
  const totalTopics = chapter.topics.length;
  const percent = totalTopics > 0 ? Math.round((topicsDone / totalTopics) * 100) : 0;

  return `
    <div class="chapter-accordion">
      <div class="chapter-header">
        <i data-lucide="chevron-right" class="chapter-chevron"></i>
        <span class="chapter-name">${chapter.name}</span>
        <div class="chapter-progress-mini">
          <div class="chapter-progress-bar">
            <div class="chapter-progress-fill" style="width:${percent}%"></div>
          </div>
          <span class="chapter-progress-text">${topicsDone}/${totalTopics}</span>
        </div>
      </div>
      <div class="chapter-content">
        <div class="chapter-topics">
          ${chapter.topics.map((topic, tIdx) => renderTopicRow(courseCode, chapter.id, topic, chIdx, tIdx)).join('')}
          <div style="padding-top:var(--space-2)">
            <button class="add-inline-btn" onclick="window.StudyOS.addTopic('${courseCode}', ${chIdx})">
              <i data-lucide="plus" style="width:12px;height:12px"></i> Add Topic
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTopicRow(courseCode, chapterId, topic, chIdx, tIdx) {
  const statusClass = topic.status === 'studied' ? 'status-studied' : topic.status === 'in-progress' ? 'status-in-progress' : 'status-not-started';
  const statusLabel = topic.status === 'studied' ? 'Studied' : topic.status === 'in-progress' ? 'In Progress' : 'Not Started';
  const nextRev = topic.status === 'studied' ? getNextRevisionDate(courseCode, topic.name) : null;

  return `
    <div class="topic-row">
      <span class="status-indicator ${statusClass}" 
            onclick="window.StudyOS.cycleTopicStatus('${courseCode}', ${chIdx}, ${tIdx})"
            title="Click to change status">
        ${statusLabel}
      </span>
      <span class="topic-name ${topic.status === 'studied' ? 'studied' : ''}">${topic.name}</span>
      <div class="topic-dates">
        ${topic.studiedDate ? `<span title="Studied on">📖 ${formatDate(topic.studiedDate, { month: 'short', day: 'numeric' })}</span>` : ''}
        ${nextRev ? `<span title="Next revision">🔄 ${formatDate(nextRev, { month: 'short', day: 'numeric' })}</span>` : ''}
      </div>
      <div class="topic-actions">
        <button class="btn btn-ghost btn-sm" onclick="window.StudyOS.addTopicToLog('${courseCode}', ${chIdx}, ${tIdx})" title="Add to today's log">
          <i data-lucide="plus-circle" style="width:14px;height:14px"></i>
        </button>
      </div>
    </div>
  `;
}

// --- Actions ---

export function cycleTopicStatus(courseCode, chIdx, tIdx) {
  const courses = store.get('courses');
  const topic = courses[courseCode].chapters[chIdx].topics[tIdx];
  const todayStr = new Date().toISOString().split('T')[0];

  if (topic.status === 'not-started') {
    topic.status = 'in-progress';
  } else if (topic.status === 'in-progress') {
    topic.status = 'studied';
    topic.studiedDate = todayStr;
    // Create spaced repetition schedule
    createRevisionSchedule(courseCode, courses[courseCode].chapters[chIdx].id, topic.name, todayStr);
    // Check gamification unlock
    store.set('courses', courses);
    const justUnlocked = gamification.maybeUnlock();
    if (justUnlocked) {
      showUnlockModal();
    }
  } else {
    topic.status = 'not-started';
    topic.studiedDate = null;
  }

  store.set('courses', courses);

  // Re-render
  const route = router.currentRoute;
  const page = document.getElementById('page-courses');
  renderCourseDetail(page, courseCode);
}

export function addChapter(courseCode) {
  const name = prompt('Enter chapter name:');
  if (!name?.trim()) return;

  const courses = store.get('courses');
  courses[courseCode].chapters.push({
    id: `custom-${uid()}`,
    name: name.trim(),
    topics: [],
  });
  store.set('courses', courses);

  const page = document.getElementById('page-courses');
  renderCourseDetail(page, courseCode);
}

export function addTopic(courseCode, chIdx) {
  const name = prompt('Enter topic name:');
  if (!name?.trim()) return;

  const courses = store.get('courses');
  courses[courseCode].chapters[chIdx].topics.push({
    name: name.trim(),
    status: 'not-started',
    studiedDate: null,
    lastReviewedDate: null,
  });
  store.set('courses', courses);

  const page = document.getElementById('page-courses');
  renderCourseDetail(page, courseCode);
}

export function addTopicToLog(courseCode, chIdx, tIdx) {
  // Navigate to logger with pre-filled course/chapter/topic
  window.location.hash = `#logger`;
  // Store selection for logger to pick up
  sessionStorage.setItem('loggerPreFill', JSON.stringify({ courseCode, chIdx, tIdx }));
}

function showUnlockModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal" style="text-align:center">
      <div style="font-size:48px;margin-bottom:var(--space-4)">🏆</div>
      <h2 class="modal-title">You've unlocked Study Mode!</h2>
      <p style="color:var(--text-secondary);margin-bottom:var(--space-4)">XP tracking and achievements are now active. Keep up the great work!</p>
      <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Awesome!</button>
    </div>
  `;
  document.body.appendChild(overlay);
  gamification.showElements();
}

// --- Helpers ---

function getTotalTopics(courses) {
  let count = 0;
  for (const c of Object.values(courses)) {
    for (const ch of c.chapters) {
      count += ch.topics.length;
    }
  }
  return count;
}

function renderProgressRingSVG(percent, size, color) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const center = size / 2;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${strokeWidth}" />
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 ${center} ${center})"
        style="transition: stroke-dashoffset 0.5s ease" />
      <text x="${center}" y="${center}" text-anchor="middle" dy="0.35em"
        fill="var(--text-primary)" font-size="11" font-weight="600" font-family="var(--font-mono)">
        ${percent}%
      </text>
    </svg>
  `;
}

export default { renderCourses, cycleTopicStatus, addChapter, addTopic, addTopicToLog };
