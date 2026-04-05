// StudyOS — Utility Functions

/**
 * Get time-aware greeting
 */
export function getGreeting(name) {
  const hour = new Date().getHours();
  let greeting;
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else greeting = 'Good evening';
  return name ? `${greeting}, ${name}` : greeting;
}

/**
 * Calculate current semester week
 */
export function getSemesterWeek(semesterStart) {
  const start = new Date(semesterStart);
  const now = new Date();
  const diffMs = now - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.max(1, week);
}

/**
 * Format date to readable string
 */
export function formatDate(date, options = {}) {
  const d = new Date(date);
  const defaults = { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString('en-US', { ...defaults, ...options });
}

/**
 * Format date as relative ("2 days away", "Yesterday", "Today")
 */
export function formatRelativeDate(date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `${diffDays} days away`;
  return `${Math.abs(diffDays)} days ago`;
}

/**
 * Format duration in minutes to human-readable
 */
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Format time (seconds) to MM:SS or HH:MM:SS
 */
export function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = n => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
export function today() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get day of week name
 */
export function getDayName(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Create a unique ID
 */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Animate a number counting up
 */
export function animateNumber(element, target, duration = 400) {
  const start = 0;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);
    element.textContent = current;
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

/**
 * Debounce
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle
 */
export function throttle(fn, limit = 100) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Create an HTML element with attributes and children
 */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.assign(element.dataset, value);
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else {
      element.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

/**
 * Get study streak (consecutive days)
 */
export function calculateStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;

  const days = new Set();
  sessions.forEach(s => {
    days.add(new Date(s.timestamp).toISOString().split('T')[0]);
  });

  const sortedDays = Array.from(days).sort().reverse();
  const todayStr = today();
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday
  if (sortedDays[0] !== todayStr && sortedDays[0] !== yesterdayStr) return 0;

  let streak = 1;
  for (let i = 0; i < sortedDays.length - 1; i++) {
    const curr = new Date(sortedDays[i]);
    const prev = new Date(sortedDays[i + 1]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

/**
 * Get total study minutes for a date range
 */
export function getStudyMinutes(sessions, startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return sessions
    .filter(s => {
      const d = new Date(s.timestamp);
      return d >= start && d <= end;
    })
    .reduce((sum, s) => sum + (s.duration || 0), 0);
}

/**
 * Get start of current week (Monday)
 */
export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of current week (Sunday)
 */
export function getWeekEnd(date = new Date()) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Course colors (assigned to each course)
 */
export const COURSE_COLORS = {
  'MAT1272': '#7c3aed', // Violet
  'PHY1072': '#3b82f6', // Blue
  'ECE1072': '#10b981', // Emerald
  'MIE1072': '#f59e0b', // Amber
  'ICT1271': '#ef4444', // Red
  'DSE1271': '#ec4899', // Pink
};

/**
 * Get color for task type
 */
export const TASK_TYPE_COLORS = {
  exam: '#ef4444',
  assignment: '#f59e0b',
  goal: '#7c3aed',
};

/**
 * Accent color presets
 */
export const ACCENT_PRESETS = {
  violet: { primary: '#7c3aed', light: '#8b5cf6', dark: '#6d28d9' },
  blue:   { primary: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
  green:  { primary: '#10b981', light: '#34d399', dark: '#059669' },
  rose:   { primary: '#f43f5e', light: '#fb7185', dark: '#e11d48' },
  amber:  { primary: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
};
