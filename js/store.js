// StudyOS — localStorage Store
// All app data is persisted here. OAuth tokens are kept in-memory only.

const STORE_KEY = 'studyos_data';
const SCHEMA_VERSION = 1;

const defaultData = () => ({
  _schemaVersion: SCHEMA_VERSION,
  profile: {
    name: '',
    semesterStart: '2026-01-06',
    finalsEnd: '2026-05-15',
    accentColor: 'violet',
    fontSize: 'comfortable',
    profilePhoto: null,
    onboardingComplete: false,
  },
  courses: {},        // keyed by courseCode
  studySessions: [],  // array of session objects
  tasks: [],          // array of task objects
  revisions: [],      // array of spaced-rep revision objects
  gamification: {
    xp: 0,
    level: 1,
    unlocked: false,
    completedChallenges: [],
    weeklyChallenge: null,
  },
  googleSync: {
    taskListId: null,
    lastSynced: null,
    calendarId: 'primary',
  },
});

class Store {
  constructor() {
    this._data = null;
    this._listeners = new Map();
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        this._data = JSON.parse(raw);
        if (this._data._schemaVersion !== SCHEMA_VERSION) {
          this._migrate();
        }
      } else {
        this._data = defaultData();
        this._save();
      }
    } catch (e) {
      console.error('Store: Failed to load data, resetting.', e);
      this._data = defaultData();
      this._save();
    }
  }

  _save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this._data));
    } catch (e) {
      console.error('Store: Failed to save data.', e);
    }
  }

  _migrate() {
    // Future migrations go here
    this._data._schemaVersion = SCHEMA_VERSION;
    this._save();
  }

  _notify(key) {
    if (this._listeners.has(key)) {
      this._listeners.get(key).forEach(fn => fn(this.get(key)));
    }
    // Also notify wildcard listeners
    if (this._listeners.has('*')) {
      this._listeners.get('*').forEach(fn => fn(key, this.get(key)));
    }
  }

  get(key) {
    if (!key) return structuredClone(this._data);
    const keys = key.split('.');
    let val = this._data;
    for (const k of keys) {
      if (val == null) return undefined;
      val = val[k];
    }
    return structuredClone(val);
  }

  set(key, value) {
    const keys = key.split('.');
    let obj = this._data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] == null) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = structuredClone(value);
    this._save();
    this._notify(keys[0]);
  }

  update(key, updater) {
    const current = this.get(key);
    const updated = updater(current);
    this.set(key, updated);
  }

  push(key, item) {
    const arr = this.get(key) || [];
    arr.push(item);
    this.set(key, arr);
    return arr.length - 1;
  }

  removeAt(key, index) {
    const arr = this.get(key) || [];
    arr.splice(index, 1);
    this.set(key, arr);
  }

  removeWhere(key, predicate) {
    const arr = this.get(key) || [];
    const filtered = arr.filter(item => !predicate(item));
    this.set(key, filtered);
  }

  on(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(callback);
    return () => this._listeners.get(key)?.delete(callback);
  }

  export() {
    return JSON.stringify(this._data, null, 2);
  }

  import(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      this._data = data;
      this._save();
      this._notify('*');
      return true;
    } catch (e) {
      console.error('Store: Import failed.', e);
      return false;
    }
  }

  reset() {
    this._data = defaultData();
    this._save();
    this._notify('*');
  }

  get isOnboardingComplete() {
    return this._data.profile?.onboardingComplete === true;
  }
}

export const store = new Store();
export default store;
