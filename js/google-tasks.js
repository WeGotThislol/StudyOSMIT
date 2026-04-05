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
   * Sync tasks: pull from Google, merge with local
   */
  async syncTasks() {
    if (!this.isAvailable || this._syncing) return;
    this._syncing = true;

    try {
      const listId = await this.getOrCreateTaskList();
      if (!listId) return;

      const res = await googleAuth.fetch(
        `${TASKS_BASE}/lists/${listId}/tasks?showCompleted=true&maxResults=100`
      );
      if (!res.ok) return;

      const data = await res.json();
      const remoteTasks = data.items || [];
      const localTasks = store.get('tasks') || [];

      // Merge: deduplication by googleTaskId or title+date
      for (const remote of remoteTasks) {
        const existingIdx = localTasks.findIndex(
          t => t.googleTaskId === remote.id ||
            (t.title === remote.title && t.dueDate === remote.due?.split('T')[0])
        );

        if (existingIdx >= 0) {
          // Update local with remote status
          const isRemoteDone = remote.status === 'completed';
          localTasks[existingIdx].googleTaskId = remote.id;
          if (isRemoteDone && !localTasks[existingIdx].done) {
            localTasks[existingIdx].done = true;
            localTasks[existingIdx].completedDate = remote.completed;
          }
        } else {
          // Add remote task to local
          localTasks.push({
            id: uid(),
            googleTaskId: remote.id,
            title: remote.title || 'Untitled',
            description: remote.notes || '',
            dueDate: remote.due?.split('T')[0] || null,
            done: remote.status === 'completed',
            type: 'goal', // Default type for imported tasks
            course: null,
            priority: 'medium',
            createdAt: remote.updated || new Date().toISOString(),
          });
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
