// StudyOS — Gamification System
import store from './store.js';

const LEVELS = [
  { level: 1, title: 'Beginner', minXP: 0 },
  { level: 2, title: 'Learner', minXP: 50 },
  { level: 3, title: 'Studious', minXP: 150 },
  { level: 4, title: 'Focused', minXP: 300 },
  { level: 5, title: 'Dedicated', minXP: 500 },
  { level: 6, title: 'Scholar', minXP: 800 },
  { level: 7, title: 'Academic', minXP: 1200 },
  { level: 8, title: 'Expert', minXP: 1800 },
  { level: 9, title: 'Master', minXP: 2500 },
  { level: 10, title: 'Legendary', minXP: 3500 },
];

class Gamification {
  constructor() {}

  /**
   * Check if gamification is unlocked
   * Condition: All 6 courses have at least 3 topics marked as Studied
   */
  checkUnlockCondition() {
    const courses = store.get('courses') || {};
    const courseCodes = Object.keys(courses);
    if (courseCodes.length < 6) return false;

    return courseCodes.every(code => {
      const course = courses[code];
      let studiedCount = 0;
      for (const ch of course.chapters) {
        for (const t of ch.topics) {
          if (t.status === 'studied') studiedCount++;
        }
      }
      return studiedCount >= 3;
    });
  }

  /**
   * Maybe unlock gamification (call after topic status changes)
   */
  maybeUnlock() {
    const gam = store.get('gamification');
    if (gam.unlocked) return false;

    if (this.checkUnlockCondition()) {
      store.set('gamification.unlocked', true);
      return true; // Just unlocked!
    }
    return false;
  }

  get isUnlocked() {
    return store.get('gamification.unlocked') === true;
  }

  /**
   * Add XP for a study session
   * 1 XP per 5 minutes
   */
  addStudyXP(durationMinutes) {
    if (!this.isUnlocked) return;
    const xp = Math.floor(durationMinutes / 5);
    if (xp <= 0) return;

    const current = store.get('gamification.xp') || 0;
    store.set('gamification.xp', current + xp);
    this._updateLevel();
    return xp;
  }

  /**
   * Get current XP
   */
  get xp() {
    return store.get('gamification.xp') || 0;
  }

  /**
   * Get current level info
   */
  get levelInfo() {
    const xp = this.xp;
    let current = LEVELS[0];
    let next = LEVELS[1];

    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].minXP) {
        current = LEVELS[i];
        next = LEVELS[i + 1] || null;
        break;
      }
    }

    return {
      level: current.level,
      title: current.title,
      xp,
      nextLevelXP: next?.minXP || null,
      progress: next
        ? Math.round(((xp - current.minXP) / (next.minXP - current.minXP)) * 100)
        : 100,
    };
  }

  /**
   * Check per-course completion badges
   */
  getCourseBadges() {
    const courses = store.get('courses') || {};
    const badges = [];

    for (const [code, course] of Object.entries(courses)) {
      let total = 0;
      let studied = 0;
      for (const ch of course.chapters) {
        for (const t of ch.topics) {
          total++;
          if (t.status === 'studied') studied++;
        }
      }
      if (total > 0 && studied === total) {
        badges.push({
          courseCode: code,
          courseName: course.name,
          earned: true,
        });
      }
    }

    return badges;
  }

  /**
   * Get weekly challenge
   */
  getWeeklyChallenge() {
    return {
      title: 'Study 3 different subjects this week',
      description: 'Log study sessions for at least 3 different courses',
      target: 3,
      current: this._getDistinctSubjectsThisWeek(),
    };
  }

  _getDistinctSubjectsThisWeek() {
    const sessions = store.get('studySessions') || [];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const subjects = new Set();
    sessions.forEach(s => {
      if (new Date(s.timestamp) >= weekStart) {
        subjects.add(s.courseCode);
      }
    });
    return subjects.size;
  }

  _updateLevel() {
    const info = this.levelInfo;
    store.set('gamification.level', info.level);
  }

  /**
   * Show gamification elements in the UI
   */
  showElements() {
    document.querySelectorAll('.gamification-element').forEach(el => {
      el.style.display = '';
      el.classList.add('visible');
      el.style.animation = 'fadeIn 500ms ease forwards';
    });
  }

  /**
   * Hide gamification elements
   */
  hideElements() {
    document.querySelectorAll('.gamification-element').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('visible');
    });
  }
}

export const gamification = new Gamification();
export default gamification;
