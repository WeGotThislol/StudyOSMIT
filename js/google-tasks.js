// StudyOS — Google Tasks API Wrapper
import googleAuth from './google-auth.js';
import store from './store.js';
import { uid } from './utils.js';

const TASKS_BASE = 'https://tasks.googleapis.com/tasks/v1';

class GoogleTasks {
  constructor() {
    this._syncing = false;
  }

  get isAvailable() {
    return googleAuth.isConnected;
  }

  /**
   * Get or create the StudyOS task list
   */
  async getOrCreateTaskList() {
    if (!this.isAvailable) return null;

    const existingId = store.get('googleSync.taskListId');
    if (existingId) {
      try {
        const res = await googleAuth.fetch(`${TASKS_BASE}/users/@me/lists/${existingId}`);
        if (res.ok) return existingId;
      } catch (e) { /* list may have been deleted */ }
    }

    // Fetch all lists
    try {
      const res = await googleAuth.fetch(`${TASKS_BASE}/users/@me/lists`);
      if (res.ok) {
        const data = await res.json();
        const existing = data.items?.find(l => l.title === 'StudyOS Tasks');
        if (existing) {
          store.set('googleSync.taskListId', existing.id);
          return existing.id;
        }
      }
    } catch (e) { /* continue to create */ }

    // Create new list
    try {
      const res = await googleAuth.fetch(`${TASKS_BASE}/users/@me/lists`, {
        method: 'POST',
        body: JSON.stringify({ title: 'StudyOS Tasks' }),
      });
      if (res.ok) {
        const data = await res.json();
        store.set('googleSync.taskListId', data.id);
        return data.id;
      }
    } catch (e) {
      console.error('GoogleTasks: Failed to create task list.', e);
    }

    return null;
  }

  /**
   * Full two-way sync: pull remote changes, push local changes
   */
  async syncTasks() {
    if (!this.isAvailable || this._syncing) return;
    this._syncing = true;

    try {
      const listId = await this.getOrCreateTaskList();
      if (!listId) return;

      const res = await googleAuth.fetch(
        `${TASKS_BASE}/lists/${listId}/tasks?showCompleted=true&showHidden=true&maxResults=100`
      );
      if (!res.ok) return;

      const data = await res.json();
      const remoteTasks = data.items || [];
      const localTasks = store.get('tasks') || [];

      // Build lookup maps
      const remoteById = new Map();
      remoteTasks.forEach(r => remoteById.set(r.id, r));

      const localByGoogleId = new Map();
      localTasks.forEach((t, i) => {
        if (t.googleTaskId) localByGoogleId.set(t.googleTaskId, i);
      });

      // 1. Update existing local tasks with remote status changes
      for (const remote of remoteTasks) {
        const localIdx = localByGoogleId.get(remote.id);

        if (localIdx !== undefined) {
          // Task exists locally — sync status both ways
          const local = localTasks[localIdx];
          const isRemoteDone = remote.status === 'completed';

          // Remote was completed (e.g., on phone) → mark local done
          if (isRemoteDone && !local.done) {
            localTasks[localIdx].done = true;
            localTasks[localIdx].completedDate = remote.completed || new Date().toISOString();
          }

          // Remote was uncompleted → mark local undone
          if (!isRemoteDone && local.done) {
            localTasks[localIdx].done = false;
            localTasks[localIdx].completedDate = null;
          }

          // Update title if changed remotely
          if (remote.title && remote.title !== local.title) {
            localTasks[localIdx].title = remote.title;
          }

          // Update due date if changed remotely
          const remoteDue = remote.due?.split('T')[0] || null;
          if (remoteDue !== local.dueDate) {
            localTasks[localIdx].dueDate = remoteDue;
          }
        } else {
          // Check by title+date match (for tasks created before sync)
          const titleMatch = localTasks.findIndex(
            t => !t.googleTaskId && t.title === remote.title && t.dueDate === (remote.due?.split('T')[0] || null)
          );

          if (titleMatch >= 0) {
            localTasks[titleMatch].googleTaskId = remote.id;
            const isRemoteDone = remote.status === 'completed';
            if (isRemoteDone) {
              localTasks[titleMatch].done = true;
              localTasks[titleMatch].completedDate = remote.completed || new Date().toISOString();
            }
          } else {
            // New task from Google — add to local
            localTasks.push({
              id: uid(),
              googleTaskId: remote.id,
              title: remote.title || 'Untitled',
              description: remote.notes || '',
              dueDate: remote.due?.split('T')[0] || null,
              done: remote.status === 'completed',
              completedDate: remote.status === 'completed' ? (remote.completed || new Date().toISOString()) : null,
              type: 'goal', // Default type for imported tasks
              course: null,
              priority: 'medium',
              createdAt: remote.updated || new Date().toISOString(),
            });
          }
        }
      }

      // 2. Push local tasks that don't have a googleTaskId yet
      for (let i = 0; i < localTasks.length; i++) {
        const local = localTasks[i];
        if (!local.googleTaskId) {
          try {
            const body = {
              title: local.title,
              notes: local.description || '',
              status: local.done ? 'completed' : 'needsAction',
            };
            if (local.dueDate) {
              body.due = new Date(local.dueDate).toISOString();
            }

            const createRes = await googleAuth.fetch(`${TASKS_BASE}/lists/${listId}/tasks`, {
              method: 'POST',
              body: JSON.stringify(body),
            });

            if (createRes.ok) {
              const created = await createRes.json();
              localTasks[i].googleTaskId = created.id;
            }
          } catch (e) {
            console.warn('GoogleTasks: Failed to push local task:', local.title, e);
          }
        }
      }

      store.set('tasks', localTasks);
      store.set('googleSync.lastSynced', new Date().toISOString());
    } catch (e) {
      console.error('GoogleTasks: Sync failed.', e);
    } finally {
      this._syncing = false;
    }
  }

  /**
   * Create a task in Google Tasks
   */
  async createTask(task) {
    if (!this.isAvailable) return null;

    const listId = await this.getOrCreateTaskList();
    if (!listId) return null;

    try {
      const body = {
        title: task.title,
        notes: task.description || '',
        status: task.done ? 'completed' : 'needsAction',
      };

      if (task.dueDate) {
        body.due = new Date(task.dueDate).toISOString();
      }

      const res = await googleAuth.fetch(`${TASKS_BASE}/lists/${listId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (e) {
      console.error('GoogleTasks: Failed to create task.', e);
    }

    return null;
  }

  /**
   * Update task status in Google Tasks
   */
  async updateTaskStatus(googleTaskId, done) {
    if (!this.isAvailable || !googleTaskId) return;

    const listId = store.get('googleSync.taskListId');
    if (!listId) return;

    try {
      await googleAuth.fetch(`${TASKS_BASE}/lists/${listId}/tasks/${googleTaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: done ? 'completed' : 'needsAction',
        }),
      });
    } catch (e) {
      console.error('GoogleTasks: Failed to update task.', e);
    }
  }

  /**
   * Delete a task from Google Tasks
   */
  async deleteTask(googleTaskId) {
    if (!this.isAvailable || !googleTaskId) return;

    const listId = store.get('googleSync.taskListId');
    if (!listId) return;

    try {
      await googleAuth.fetch(`${TASKS_BASE}/lists/${listId}/tasks/${googleTaskId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('GoogleTasks: Failed to delete task.', e);
    }
  }
}

export const googleTasks = new GoogleTasks();
export default googleTasks;
