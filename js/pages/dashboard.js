// StudyOS — Dashboard Page
import store from '../store.js';
import { getGreeting, getSemesterWeek, formatDate, formatRelativeDate, formatDuration, today, getDayName, animateNumber, getStudyMinutes, getWeekStart, getWeekEnd, calculateStreak, COURSE_COLORS, TASK_TYPE_COLORS } from '../utils.js';
import { getRevisionsDueToday } from '../spaced-repetition.js';
import { markRevisionReviewed } from '../spaced-repetition.js';
import googleCalendar from '../google-calendar.js';

export function renderDashboard() {
  const page = document.getElementById('page-dashboard');
  if (!page) return;

  const profile = store.get('profile');
  const sessions = store.get('studySessions') || [];
  const tasks = store.get('tasks') || [];
  const todayStr = today();

  // Calculate stats
  const streak = calculateStreak(sessions);
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  const weekMinutes = getStudyMinutes(sessions, weekStart, weekEnd);
  const weekHours = (weekMinutes / 60).toFixed(1);

  const weekTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d >= weekStart && d <= weekEnd && !t.done;
  });
  const overdueTasks = tasks.filter(t => !t.done && t.dueDate && t.dueDate < todayStr);

  const revisionsDue = getRevisionsDueToday();

  // Upcoming deadlines (next 7 days)
  const upcoming = tasks
    .filter(t => !t.done && t.dueDate && t.dueDate >= todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);

  // Today's session stats
  const todaySessions = sessions.filter(s => s.timestamp?.startsWith(todayStr));
  const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const todaySubjects = new Set(todaySessions.map(s => s.courseCode)).size;

  page.innerHTML = `
    <div class="dashboard-greeting">
      <div class="greeting-text">${getGreeting(profile.name)}</div>
      <div class="greeting-meta">
        <span>${getDayName(todayStr)}, ${formatDate(todayStr)}</span>
        <span class="semester-pill">Semester 2 — Week ${getSemesterWeek(profile.semesterStart)}</span>
      </div>
    </div>

    <div class="stat-cards-row">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Study Streak</span>
          <i data-lucide="flame" class="stat-card-icon" style="color:var(--color-amber)"></i>
        </div>
        <div class="stat-card-value" data-animate="${streak}">${streak}</div>
        <div class="stat-card-meta">days</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Hours This Week</span>
          <i data-lucide="clock" class="stat-card-icon"></i>
        </div>
        <div class="stat-card-value" data-animate="${weekHours}">${weekHours}</div>
        <div class="stat-card-meta">hours logged</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Tasks Due This Week</span>
          <i data-lucide="check-square" class="stat-card-icon"></i>
        </div>
        <div class="stat-card-value">${weekTasks.length}${overdueTasks.length > 0 ? `<span class="badge" style="margin-left:8px;font-size:10px">${overdueTasks.length}</span>` : ''}</div>
        <div class="stat-card-meta">${overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'on track'}</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">Revisions Due Today</span>
          <i data-lucide="brain" class="stat-card-icon" style="color:var(--accent-light)"></i>
        </div>
        <div class="stat-card-value">${revisionsDue.length}</div>
        <div class="stat-card-meta">${revisionsDue.length > 0 ? 'topics to review' : 'all caught up'}</div>
      </div>
    </div>

    <div class="dashboard-middle">
      <div class="deadlines-panel">
        <div class="card-header">
          <span class="card-title">Upcoming Deadlines</span>
          <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#tasks'">View All</button>
        </div>
        <div id="dashboard-deadlines">
          ${upcoming.length > 0 ? upcoming.map(t => {
            const dotColor = t.type === 'exam' ? 'dot-red' : t.type === 'assignment' ? 'dot-amber' : 'dot-violet';
            const courseCode = t.course || '';
            return `
              <div class="deadline-item">
                <div class="deadline-dot ${dotColor}"></div>
                <div class="deadline-info">
                  <div class="deadline-title">${t.title}</div>
                  <div class="deadline-meta">
                    ${courseCode ? `<span class="course-pill" data-course="${courseCode}">${courseCode}</span>` : ''}
                    <span>${formatRelativeDate(t.dueDate)}</span>
                  </div>
                </div>
                <div class="checkbox ${t.done ? 'checked' : ''}" data-task-id="${t.id}" onclick="window.StudyOS.toggleTask('${t.id}')"></div>
              </div>
            `;
          }).join('') : `
            <div class="empty-state">
              <i data-lucide="check-circle" class="empty-state-icon"></i>
              <div class="empty-state-title">No upcoming deadlines</div>
              <div class="empty-state-text">Add your exams and assignments to stay on track</div>
              <button class="btn btn-primary btn-sm" onclick="window.location.hash='#tasks'">
                <i data-lucide="plus" style="width:14px;height:14px"></i> Add Deadline
              </button>
            </div>
          `}
        </div>
        ${upcoming.length > 0 ? `
          <div style="margin-top:var(--space-3)">
            <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#tasks'">
              <i data-lucide="plus" style="width:14px;height:14px"></i> Add Deadline
            </button>
          </div>
        ` : ''}
      </div>

      <div class="revisions-panel">
        <div class="card-header">
          <span class="card-title">Revisions Due Today</span>
        </div>
        <div id="dashboard-revisions">
          ${revisionsDue.length > 0 ? revisionsDue.map(r => `
            <div class="revision-item">
              <div class="revision-topic">${r.topicName}</div>
              <div class="revision-meta">
                <span class="course-pill" data-course="${r.courseCode}">${r.courseCode}</span>
                <span style="margin-left:8px">Revision #${r.revisionNumber}/${r.totalRevisions}</span>
                ${r.isOverdue ? '<span style="color:var(--color-red);margin-left:8px">⚠ Overdue</span>' : ''}
              </div>
              <div class="revision-actions">
                <button class="btn btn-primary btn-sm" onclick="window.StudyOS.markRevisionReviewed('${r.scheduleId}')">
                  Mark Reviewed ✓
                </button>
                <button class="btn btn-secondary btn-sm" onclick="window.StudyOS.blockInCalendar('${r.scheduleId}')">
                  📅 Block in Calendar
                </button>
              </div>
            </div>
          `).join('') : `
            <div class="empty-state">
              <i data-lucide="party-popper" class="empty-state-icon"></i>
              <div class="empty-state-title">You're all caught up! 🎉</div>
              <div class="empty-state-text">No revisions due today. Keep studying to build your schedule.</div>
            </div>
          `}
        </div>
      </div>
    </div>

    <div class="today-log-bar">
      <div class="today-log-stats">
        <div class="today-log-stat">
          <span class="today-log-stat-value">${todaySessions.length}</span>
          <span class="today-log-stat-label">sessions today</span>
        </div>
        <div class="today-log-stat">
          <span class="today-log-stat-value">${formatDuration(todayMinutes)}</span>
          <span class="today-log-stat-label">total</span>
        </div>
        <div class="today-log-stat">
          <span class="today-log-stat-value">${todaySubjects}</span>
          <span class="today-log-stat-label">subjects</span>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="window.location.hash='#logger'">
        <i data-lucide="plus" style="width:14px;height:14px"></i> Log Session
      </button>
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  // Animate stat card numbers
  setTimeout(() => {
    page.querySelectorAll('[data-animate]').forEach(el => {
      const target = parseFloat(el.dataset.animate);
      animateNumber(el, target);
    });
  }, 100);
}

export default { renderDashboard };
