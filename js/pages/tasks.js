// StudyOS — Tasks & Deadlines Page
import store from '../store.js';
import { uid, formatDate, formatRelativeDate, today, COURSE_COLORS, TASK_TYPE_COLORS } from '../utils.js';
import googleTasks from '../google-tasks.js';
import googleCalendar from '../google-calendar.js';
import googleAuth from '../google-auth.js';

let activeTab = 'exam';

export function renderTasks() {
  const page = document.getElementById('page-tasks');
  if (!page) return;

  const tasks = store.get('tasks') || [];
  const lastSynced = store.get('googleSync.lastSynced');

  page.innerHTML = `
    <div class="tasks-header">
      <div class="tasks-header-left">
        <h1 class="page-title" style="margin-bottom:0">Tasks & Deadlines</h1>
      </div>
      <div class="tasks-header-right">
        ${googleAuth.isConnected ? `
          <div class="sync-status">
            <div class="sync-dot"></div>
            <span>Last synced: ${lastSynced ? timeSince(lastSynced) : 'Never'}</span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="window.StudyOS.syncTasks()">
            <i data-lucide="refresh-cw" style="width:14px;height:14px"></i> Sync
          </button>
        ` : `
          <div class="google-prompt">
            <i data-lucide="cloud-off" style="width:14px;height:14px"></i>
            <span><a href="#settings">Connect Google</a> to sync tasks</span>
          </div>
        `}
      </div>
    </div>

    <div class="tabs">
      <button class="tab ${activeTab === 'exam' ? 'active' : ''}" onclick="window.StudyOS.setTaskTab('exam')">
        <i data-lucide="file-text" style="width:14px;height:14px"></i> Exams
      </button>
      <button class="tab ${activeTab === 'assignment' ? 'active' : ''}" onclick="window.StudyOS.setTaskTab('assignment')">
        <i data-lucide="clipboard" style="width:14px;height:14px"></i> Assignments
      </button>
      <button class="tab ${activeTab === 'goal' ? 'active' : ''}" onclick="window.StudyOS.setTaskTab('goal')">
        <i data-lucide="target" style="width:14px;height:14px"></i> Personal Goals
      </button>
    </div>

    <div class="tasks-list" id="tasks-list">
      ${renderTasksList(tasks)}
    </div>

    <div style="margin-top:var(--space-4)">
      <button class="btn btn-primary" onclick="window.StudyOS.showAddTask()">
        <i data-lucide="plus" style="width:16px;height:16px"></i> Add ${activeTab === 'exam' ? 'Exam' : activeTab === 'assignment' ? 'Assignment' : 'Goal'}
      </button>
    </div>

    ${renderAddTaskBottomSheet()}
  `;

  if (window.lucide) lucide.createIcons();
}

function renderTasksList(tasks) {
  const filtered = tasks.filter(t => t.type === activeTab);
  const todayStr = today();

  if (filtered.length === 0) {
    const icon = activeTab === 'exam' ? 'file-text' : activeTab === 'assignment' ? 'clipboard' : 'target';
    const label = activeTab === 'exam' ? 'exams' : activeTab === 'assignment' ? 'assignments' : 'goals';
    return `
      <div class="empty-state">
        <i data-lucide="${icon}" class="empty-state-icon"></i>
        <div class="empty-state-title">No ${label} yet</div>
        <div class="empty-state-text">Add your ${label} to keep track of deadlines</div>
      </div>
    `;
  }

  // Sort: active first (by due date), then done
  const sorted = [...filtered].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return 0;
  });

  return sorted.map(t => {
    const isOverdue = !t.done && t.dueDate && t.dueDate < todayStr;
    const isDueSoon = !t.done && t.dueDate && !isOverdue && daysBetween(todayStr, t.dueDate) <= 2;
    const courseColor = t.course ? COURSE_COLORS[t.course] || '#888' : null;

    return `
      <div class="task-card ${t.done ? 'done' : ''} task-card-${t.type}">
        <div class="checkbox task-checkbox ${t.done ? 'checked' : ''}" onclick="window.StudyOS.toggleTask('${t.id}')"></div>
        <div class="task-content">
          <div class="task-title">${t.title}</div>
          ${t.description ? `<div class="task-description">${t.description}</div>` : ''}
          <div class="task-meta">
            ${t.course ? `<span class="course-pill" data-course="${t.course}">${t.course}</span>` : ''}
            ${t.dueDate ? `
              <span class="task-due ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}">
                <i data-lucide="calendar" style="width:12px;height:12px"></i>
                ${formatDate(t.dueDate, { month: 'short', day: 'numeric' })} · ${formatRelativeDate(t.dueDate)}
              </span>
            ` : ''}
            <span class="task-priority priority-${t.priority || 'medium'}">${(t.priority || 'medium').charAt(0).toUpperCase() + (t.priority || 'medium').slice(1)}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-ghost btn-icon" onclick="window.StudyOS.deleteTask('${t.id}')" title="Delete">
            <i data-lucide="trash-2" style="width:14px;height:14px;color:var(--color-red)"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderAddTaskBottomSheet() {
  const courses = store.get('courses') || {};
  const courseOptions = Object.keys(courses).map(c => `<option value="${c}">${c} — ${courses[c].name}</option>`).join('');

  return `
    <div class="bottom-sheet-overlay" id="add-task-overlay" onclick="window.StudyOS.hideAddTask()"></div>
    <div class="bottom-sheet" id="add-task-sheet">
      <div class="bottom-sheet-handle"></div>
      <h3 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-5)">Add Task</h3>
      <div class="add-task-form">
        <div class="form-group">
          <label class="form-label">Type</label>
          <div class="add-task-type-selector">
            <button class="type-pill ${activeTab === 'exam' ? 'active' : ''}" data-type="exam" onclick="this.parentNode.querySelectorAll('.type-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active')">📝 Exam</button>
            <button class="type-pill ${activeTab === 'assignment' ? 'active' : ''}" data-type="assignment" onclick="this.parentNode.querySelectorAll('.type-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active')">📋 Assignment</button>
            <button class="type-pill ${activeTab === 'goal' ? 'active' : ''}" data-type="goal" onclick="this.parentNode.querySelectorAll('.type-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active')">🎯 Goal</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" class="form-input" id="task-title" placeholder="e.g., Midterm Exam">
        </div>
        <div class="form-group">
          <label class="form-label">Course</label>
          <select class="form-input form-select" id="task-course">
            <option value="">Select course...</option>
            ${courseOptions}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" class="form-input" id="task-due-date">
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select class="form-input form-select" id="task-priority">
              <option value="high">🔴 High</option>
              <option value="medium" selected>🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description (optional)</label>
          <textarea class="form-input" id="task-description" placeholder="Add details..." rows="3"></textarea>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0">
          <label class="form-label" style="margin:0">Auto-create Google Calendar event</label>
          <label class="toggle">
            <input type="checkbox" id="task-auto-calendar" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2)">
          <button class="btn btn-primary flex-1" onclick="window.StudyOS.submitTask()">Add Task</button>
          <button class="btn btn-secondary" onclick="window.StudyOS.hideAddTask()">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

// --- Actions ---

export function setTaskTab(tab) {
  activeTab = tab;
  renderTasks();
}

export function showAddTask() {
  document.getElementById('add-task-overlay')?.classList.add('active');
  document.getElementById('add-task-sheet')?.classList.add('active');
  document.getElementById('task-title')?.focus();
}

export function hideAddTask() {
  document.getElementById('add-task-overlay')?.classList.remove('active');
  document.getElementById('add-task-sheet')?.classList.remove('active');
}

export async function submitTask() {
  const title = document.getElementById('task-title')?.value?.trim();
  if (!title) {
    document.getElementById('task-title')?.focus();
    return;
  }

  const typeBtn = document.querySelector('.type-pill.active');
  const type = typeBtn?.dataset?.type || activeTab;

  const task = {
    id: uid(),
    title,
    type,
    course: document.getElementById('task-course')?.value || null,
    dueDate: document.getElementById('task-due-date')?.value || null,
    priority: document.getElementById('task-priority')?.value || 'medium',
    description: document.getElementById('task-description')?.value?.trim() || '',
    done: false,
    googleTaskId: null,
    createdAt: new Date().toISOString(),
  };

  store.push('tasks', task);

  // Sync to Google Tasks
  if (googleAuth.isConnected) {
    const googleId = await googleTasks.createTask(task);
    if (googleId) {
      const tasks = store.get('tasks');
      const idx = tasks.findIndex(t => t.id === task.id);
      if (idx >= 0) {
        tasks[idx].googleTaskId = googleId;
        store.set('tasks', tasks);
      }
    }
  }

  // Auto-create calendar event
  const autoCalendar = document.getElementById('task-auto-calendar')?.checked;
  if (autoCalendar && task.dueDate && googleAuth.isConnected) {
    await googleCalendar.createDeadlineEvent(task);
  }

  hideAddTask();
  renderTasks();
  showToast('Task added successfully', 'success');
}

export async function toggleTask(taskId) {
  const tasks = store.get('tasks') || [];
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return;

  tasks[idx].done = !tasks[idx].done;
  tasks[idx].completedDate = tasks[idx].done ? new Date().toISOString() : null;
  store.set('tasks', tasks);

  // Sync to Google Tasks
  if (googleAuth.isConnected && tasks[idx].googleTaskId) {
    await googleTasks.updateTaskStatus(tasks[idx].googleTaskId, tasks[idx].done);
  }

  renderTasks();
  // Also refresh dashboard if visible
  if (document.getElementById('page-dashboard')?.classList.contains('page-active')) {
    const { renderDashboard } = await import('./dashboard.js');
    renderDashboard();
  }
}

export async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;

  const tasks = store.get('tasks') || [];
  const task = tasks.find(t => t.id === taskId);

  // Delete from Google Tasks
  if (googleAuth.isConnected && task?.googleTaskId) {
    await googleTasks.deleteTask(task.googleTaskId);
  }

  store.removeWhere('tasks', t => t.id === taskId);
  renderTasks();
  showToast('Task deleted', 'info');
}

export async function syncTasks() {
  showToast('Syncing tasks...', 'info');
  await googleTasks.syncTasks();
  renderTasks();
  showToast('Tasks synced', 'success');
}

// --- Helpers ---

function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function timeSince(dateStr) {
  const d = new Date(dateStr);
  const seconds = Math.floor((Date.now() - d) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function showToast(message, type = 'info') {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <span class="toast-close" onclick="this.parentNode.remove()">✕</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

export default { renderTasks, setTaskTab, showAddTask, hideAddTask, submitTask, toggleTask, deleteTask, syncTasks };
