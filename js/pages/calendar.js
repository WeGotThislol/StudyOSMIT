// StudyOS — Calendar View Page
import store from '../store.js';
import { formatDate, today, TASK_TYPE_COLORS } from '../utils.js';
import googleCalendar from '../google-calendar.js';
import googleAuth from '../google-auth.js';
import { getUpcomingRevisions } from '../spaced-repetition.js';

let currentDate = new Date();
let viewMode = 'month'; // 'month' or 'week'
let googleEvents = [];

export function renderCalendar() {
  const page = document.getElementById('page-calendar');
  if (!page) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  page.innerHTML = `
    <div class="calendar-header">
      <div class="calendar-nav">
        <button class="calendar-nav-btn" onclick="window.StudyOS.calendarPrev()">
          <i data-lucide="chevron-left" style="width:16px;height:16px"></i>
        </button>
        <span class="calendar-current-month">${monthName}</span>
        <button class="calendar-nav-btn" onclick="window.StudyOS.calendarNext()">
          <i data-lucide="chevron-right" style="width:16px;height:16px"></i>
        </button>
        <button class="btn btn-ghost btn-sm calendar-today-btn" onclick="window.StudyOS.calendarToday()">Today</button>
      </div>
      <div class="calendar-view-toggle">
        <button class="calendar-view-btn ${viewMode === 'month' ? 'active' : ''}" onclick="window.StudyOS.setCalendarView('month')">Month</button>
        <button class="calendar-view-btn ${viewMode === 'week' ? 'active' : ''}" onclick="window.StudyOS.setCalendarView('week')">Week</button>
      </div>
    </div>

    <div id="calendar-grid">
      ${viewMode === 'month' ? renderMonthView(year, month) : renderWeekView()}
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  // Fetch Google Calendar events if connected
  if (googleAuth.isConnected) {
    fetchGoogleEvents();
  }
}

function renderMonthView(year, month) {
  const todayStr = today();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay(); // 0=Sunday

  const tasks = store.get('tasks') || [];
  const revisions = getUpcomingRevisions(60);

  // Build calendar events map
  const eventMap = {};
  tasks.forEach(t => {
    if (t.dueDate) {
      if (!eventMap[t.dueDate]) eventMap[t.dueDate] = [];
      eventMap[t.dueDate].push({
        title: t.title,
        type: t.type,
        className: `calendar-event ${t.type}`,
      });
    }
  });

  revisions.forEach(r => {
    if (!eventMap[r.dueDate]) eventMap[r.dueDate] = [];
    eventMap[r.dueDate].push({
      title: `📚 ${r.topicName}`,
      type: 'revision',
      className: 'calendar-event revision',
    });
  });

  // Add Google events
  googleEvents.forEach(e => {
    const date = e.start?.date || e.start?.dateTime?.split('T')[0];
    if (date) {
      if (!eventMap[date]) eventMap[date] = [];
      eventMap[date].push({
        title: e.summary || 'Untitled',
        type: 'google',
        className: 'calendar-event google',
      });
    }
  });

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let html = '<div class="calendar-month-grid">';

  // Day headers
  dayHeaders.forEach(d => {
    html += `<div class="calendar-day-header">${d}</div>`;
  });

  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    const prevDate = new Date(year, month, -(startDay - i - 1));
    html += `<div class="calendar-day-cell other-month"><span class="calendar-day-number">${prevDate.getDate()}</span></div>`;
  }

  // Days of month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const events = eventMap[dateStr] || [];

    html += `
      <div class="calendar-day-cell ${isToday ? 'today' : ''}" onclick="window.StudyOS.calendarDayClick('${dateStr}')">
        <span class="calendar-day-number">${d}</span>
        <div class="calendar-day-events">
          ${events.slice(0, 3).map(e => `<div class="${e.className}" title="${e.title}">${e.title}</div>`).join('')}
          ${events.length > 3 ? `<div style="font-size:9px;color:var(--text-muted)">+${events.length - 3} more</div>` : ''}
        </div>
      </div>
    `;
  }

  // Empty cells after last day
  const totalCells = startDay + lastDay.getDate();
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="calendar-day-cell other-month"><span class="calendar-day-number">${i}</span></div>`;
  }

  html += '</div>';
  return html;
}

function renderWeekView() {
  const todayStr = today();
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const tasks = store.get('tasks') || [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = [];
  for (let h = 7; h <= 22; h++) hours.push(h);

  let html = '<div class="calendar-week-grid">';

  // Header row
  html += '<div class="calendar-week-header">Time</div>';
  for (let d = 0; d < 7; d++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    html += `<div class="calendar-week-header ${isToday ? 'today-col' : ''}">${dayNames[d]}<br><span style="font-size:var(--text-lg);font-weight:600">${date.getDate()}</span></div>`;
  }

  // Time slots
  hours.forEach(h => {
    html += `<div class="calendar-week-time">${h}:00</div>`;
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];
      html += `<div class="calendar-week-slot" onclick="window.StudyOS.calendarSlotClick('${dateStr}','${h}')"></div>`;
    }
  });

  html += '</div>';
  return html;
}

async function fetchGoogleEvents() {
  const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  end.setHours(23, 59, 59);

  googleEvents = await googleCalendar.getEvents(start.toISOString(), end.toISOString());
  // Re-render to include events
  const gridEl = document.getElementById('calendar-grid');
  if (gridEl) {
    gridEl.innerHTML = viewMode === 'month'
      ? renderMonthView(currentDate.getFullYear(), currentDate.getMonth())
      : renderWeekView();
  }
}

// --- Actions ---

export function calendarPrev() {
  if (viewMode === 'month') {
    currentDate.setMonth(currentDate.getMonth() - 1);
  } else {
    currentDate.setDate(currentDate.getDate() - 7);
  }
  renderCalendar();
}

export function calendarNext() {
  if (viewMode === 'month') {
    currentDate.setMonth(currentDate.getMonth() + 1);
  } else {
    currentDate.setDate(currentDate.getDate() + 7);
  }
  renderCalendar();
}

export function calendarToday() {
  currentDate = new Date();
  renderCalendar();
}

export function setCalendarView(mode) {
  viewMode = mode;
  renderCalendar();
}

export function calendarDayClick(dateStr) {
  // Show options: Add Deadline or Block Study Time
  const existing = document.querySelector('.calendar-popover');
  if (existing) existing.remove();

  const popover = document.createElement('div');
  popover.className = 'popover calendar-popover';
  popover.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:600;min-width:240px;';
  popover.innerHTML = `
    <div style="margin-bottom:var(--space-3);font-weight:500">${formatDate(dateStr)}</div>
    <button class="btn btn-primary btn-sm w-full" style="margin-bottom:var(--space-2)" onclick="window.location.hash='#tasks';document.querySelector('.calendar-popover')?.remove()">
      <i data-lucide="plus" style="width:14px;height:14px"></i> Add Deadline
    </button>
    <button class="btn btn-secondary btn-sm w-full" onclick="window.location.hash='#logger';document.querySelector('.calendar-popover')?.remove()">
      <i data-lucide="clock" style="width:14px;height:14px"></i> Block Study Time
    </button>
    <button class="btn btn-ghost btn-sm w-full" style="margin-top:var(--space-2)" onclick="document.querySelector('.calendar-popover')?.remove()">Cancel</button>
  `;
  document.body.appendChild(popover);
  if (window.lucide) lucide.createIcons();

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!popover.contains(e.target)) {
        popover.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 100);
}

export function calendarSlotClick(dateStr, hour) {
  calendarDayClick(dateStr);
}

export default { renderCalendar, calendarPrev, calendarNext, calendarToday, setCalendarView, calendarDayClick, calendarSlotClick };
