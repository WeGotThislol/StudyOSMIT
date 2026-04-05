// StudyOS — Progress & Stats Page
import store from '../store.js';
import { getCourseStats } from '../course-data.js';
import { getRevisionStats } from '../spaced-repetition.js';
import { calculateStreak, getStudyMinutes, getWeekStart, getWeekEnd, formatDuration, today, COURSE_COLORS } from '../utils.js';

export function renderProgress() {
  const page = document.getElementById('page-progress');
  if (!page) return;

  const sessions = store.get('studySessions') || [];
  const courses = store.get('courses') || {};
  const revStats = getRevisionStats();

  page.innerHTML = `
    <h1 class="page-title">Progress & Stats</h1>
    <p class="page-subtitle">Your academic performance at a glance</p>

    <div class="progress-page-grid">
      <!-- Heatmap -->
      <div class="heatmap-container">
        <div class="heatmap-header">
          <span class="section-title">Study Streak Calendar</span>
          <div class="heatmap-streaks">
            <div class="heatmap-streak">
              <span class="heatmap-streak-value">${calculateStreak(sessions)}</span>
              <span class="heatmap-streak-label">Current Streak</span>
            </div>
            <div class="heatmap-streak">
              <span class="heatmap-streak-value">${calculateLongestStreak(sessions)}</span>
              <span class="heatmap-streak-label">Longest Streak</span>
            </div>
          </div>
        </div>
        <div id="heatmap-grid">${renderHeatmap(sessions)}</div>
        <div class="heatmap-legend">
          <span>Less</span>
          <div class="heatmap-legend-cell" style="background:rgba(255,255,255,0.04)"></div>
          <div class="heatmap-legend-cell heatmap-cell level-1" style="width:12px;height:12px"></div>
          <div class="heatmap-legend-cell heatmap-cell level-2" style="width:12px;height:12px"></div>
          <div class="heatmap-legend-cell heatmap-cell level-3" style="width:12px;height:12px"></div>
          <span>More</span>
        </div>
      </div>

      <div class="stats-row">
        <!-- Time by Subject -->
        <div class="time-chart-container">
          <div class="section-header">
            <span class="section-title">Time by Subject (This Week)</span>
          </div>
          <canvas id="time-chart" class="time-chart-canvas"></canvas>
        </div>

        <!-- Revision Compliance -->
        <div class="revision-compliance">
          <div class="section-header">
            <span class="section-title">Revision Compliance</span>
          </div>
          <div class="compliance-stat">
            <span class="compliance-number">${revStats.completedOnTime}</span>
            <div>
              <div class="compliance-label">out of ${revStats.totalDue} revision sessions</div>
              <div class="compliance-label" style="color:var(--text-muted)">completed on time this semester</div>
            </div>
          </div>
          <div class="compliance-bar" style="margin-top:var(--space-3)">
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width:${revStats.compliancePercent}%"></div>
            </div>
            <div style="text-align:right;font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-1)">${revStats.compliancePercent}%</div>
          </div>
        </div>
      </div>

      <!-- Course Completion Rings -->
      <div class="completion-rings-container">
        <div class="section-header">
          <span class="section-title">Completion by Course</span>
        </div>
        <div class="completion-rings-grid">
          ${Object.entries(courses).map(([code, course]) => {
            const stats = getCourseStats(course);
            const color = COURSE_COLORS[code] || '#7c3aed';
            return `
              <div class="completion-ring-item">
                <div class="completion-ring-svg">
                  ${renderRingSVG(stats.completionPercent, 72, color)}
                </div>
                <div class="completion-ring-label">${code}</div>
                <div class="completion-ring-percent">${stats.studied}/${stats.total}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Session Timeline -->
      <div class="session-timeline">
        <div class="section-header">
          <span class="section-title">Weekly Session Timeline</span>
        </div>
        <div id="session-timeline-grid">${renderTimeline(sessions)}</div>
      </div>
    </div>
  `;

  // Render Chart.js bar chart
  setTimeout(() => renderTimeChart(sessions, courses), 100);
  if (window.lucide) lucide.createIcons();
}

function renderHeatmap(sessions) {
  const semesterStart = new Date(store.get('profile.semesterStart') || '2026-01-06');
  const todayDate = new Date();
  const cells = [];

  // Generate cells for ~16 weeks (semester length)
  const startDate = new Date(semesterStart);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Align to Sunday

  const dayMap = {};
  sessions.forEach(s => {
    const day = s.timestamp?.split('T')[0];
    if (day) {
      dayMap[day] = (dayMap[day] || 0) + (s.duration || 0);
    }
  });

  const weeks = 18;
  let html = '<div style="display:grid;grid-template-columns:repeat(' + weeks + ',1fr);gap:3px;">';

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + (w * 7) + d);
      const dateStr = date.toISOString().split('T')[0];
      const minutes = dayMap[dateStr] || 0;

      let level = '';
      if (minutes > 0 && minutes < 60) level = 'level-1';
      else if (minutes >= 60 && minutes < 120) level = 'level-2';
      else if (minutes >= 120) level = 'level-3';

      const isFuture = date > todayDate;
      const opacity = isFuture ? 'opacity:0.2;' : '';

      html += `<div class="heatmap-cell ${level}" style="${opacity}" title="${dateStr}: ${minutes}min"></div>`;
    }
  }
  html += '</div>';
  return html;
}

function renderTimeline(sessions) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = [];
  for (let h = 6; h <= 23; h++) {
    hours.push(h);
  }

  // Get sessions for the last 7 days
  const weekStart = getWeekStart();
  const weekSessions = sessions.filter(s => new Date(s.timestamp) >= weekStart);

  // Map sessions to day/hour
  const sessionMap = {};
  weekSessions.forEach(s => {
    const d = new Date(s.timestamp);
    const dayIdx = (d.getDay() + 6) % 7; // Mon=0
    const hour = d.getHours();
    const key = `${dayIdx}-${hour}`;
    sessionMap[key] = true;
  });

  let html = '<div class="timeline-grid">';
  // Header
  html += '<div class="timeline-header-cell"></div>';
  dayNames.forEach(d => {
    html += `<div class="timeline-header-cell">${d}</div>`;
  });

  // Grid
  hours.forEach(h => {
    html += `<div class="timeline-time-label">${h}:00</div>`;
    for (let d = 0; d < 7; d++) {
      const has = sessionMap[`${d}-${h}`];
      html += `<div class="timeline-cell ${has ? 'has-session' : ''}"></div>`;
    }
  });

  html += '</div>';
  return html;
}

function renderTimeChart(sessions, courses) {
  const canvas = document.getElementById('time-chart');
  if (!canvas || !window.Chart) return;

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  const dataMap = {};
  Object.keys(courses).forEach(code => { dataMap[code] = 0; });

  sessions.forEach(s => {
    const d = new Date(s.timestamp);
    if (d >= weekStart && d <= weekEnd) {
      dataMap[s.courseCode] = (dataMap[s.courseCode] || 0) + (s.duration || 0);
    }
  });

  const labels = Object.keys(dataMap);
  const data = labels.map(l => dataMap[l]);
  const colors = labels.map(l => COURSE_COLORS[l] || '#7c3aed');

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + '40'),
        borderColor: colors,
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw} minutes`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#666', font: { family: "'JetBrains Mono', monospace", size: 11 } },
          title: { display: true, text: 'Minutes', color: '#666' },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#888', font: { family: "'Inter', sans-serif", size: 12 } },
        },
      },
    },
  });
}

function renderRingSVG(percent, size, color) {
  const strokeWidth = 5;
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
        style="transition: stroke-dashoffset 0.8s ease" />
      <text x="${center}" y="${center}" text-anchor="middle" dy="0.35em"
        fill="var(--text-primary)" font-size="14" font-weight="600" font-family="var(--font-mono)">
        ${percent}%
      </text>
    </svg>
  `;
}

function calculateLongestStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;

  const days = new Set();
  sessions.forEach(s => {
    if (s.timestamp) days.add(s.timestamp.split('T')[0]);
  });

  const sortedDays = Array.from(days).sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return sortedDays.length > 0 ? longest : 0;
}

export default { renderProgress };
