// StudyOS — Spaced Repetition Engine
import store from './store.js';
import { uid, today } from './utils.js';

const INTERVALS = [1, 3, 7, 14, 30, 60]; // days after study date

/**
 * Create a spaced repetition schedule for a topic
 */
export function createRevisionSchedule(courseCode, chapterId, topicName, studiedDate) {
  const scheduleId = uid();
  const studyDate = new Date(studiedDate || today());

  const revisions = INTERVALS.map((interval, index) => {
    const dueDate = new Date(studyDate);
    dueDate.setDate(dueDate.getDate() + interval);
    return {
      revisionNumber: index + 1,
      interval,
      dueDate: dueDate.toISOString().split('T')[0],
      completed: false,
      completedDate: null,
    };
  });

  const schedule = {
    id: scheduleId,
    courseCode,
    chapterId,
    topicName,
    studiedDate: studyDate.toISOString().split('T')[0],
    revisions,
    currentRevision: 0, // index in revisions array
    active: true,
  };

  store.push('revisions', schedule);
  return schedule;
}

/**
 * Mark a revision as reviewed
 */
export function markRevisionReviewed(scheduleId) {
  const allRevisions = store.get('revisions') || [];
  const idx = allRevisions.findIndex(r => r.id === scheduleId);
  if (idx === -1) return;

  const schedule = allRevisions[idx];
  const currentIdx = schedule.currentRevision;

  if (currentIdx < schedule.revisions.length) {
    const revision = schedule.revisions[currentIdx];
    const todayStr = today();
    const dueDate = revision.dueDate;

    // Check if reviewed on time (on or before due date)
    const isOnTime = todayStr <= dueDate;

    revision.completed = true;
    revision.completedDate = todayStr;
    revision.onTime = isOnTime;

    // Move to next revision
    schedule.currentRevision = currentIdx + 1;

    // If all revisions completed, mark as inactive
    if (schedule.currentRevision >= schedule.revisions.length) {
      schedule.active = false;
    }

    allRevisions[idx] = schedule;
    store.set('revisions', allRevisions);
  }
}

/**
 * Handle missed revision — reset interval
 */
export function handleMissedRevision(scheduleId) {
  const allRevisions = store.get('revisions') || [];
  const idx = allRevisions.findIndex(r => r.id === scheduleId);
  if (idx === -1) return;

  const schedule = allRevisions[idx];
  const todayStr = today();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Reset: create new revisions starting from tomorrow
  schedule.revisions = INTERVALS.map((interval, index) => {
    const dueDate = new Date(tomorrow);
    if (index > 0) {
      dueDate.setDate(dueDate.getDate() + INTERVALS[index] - 1);
    }
    return {
      revisionNumber: index + 1,
      interval,
      dueDate: dueDate.toISOString().split('T')[0],
      completed: false,
      completedDate: null,
    };
  });

  schedule.currentRevision = 0;
  schedule.resetDate = todayStr;
  schedule.active = true;

  allRevisions[idx] = schedule;
  store.set('revisions', allRevisions);
}

/**
 * Get all revisions due today (or overdue)
 */
export function getRevisionsDueToday() {
  const allRevisions = store.get('revisions') || [];
  const todayStr = today();
  const due = [];

  for (const schedule of allRevisions) {
    if (!schedule.active) continue;

    const currentIdx = schedule.currentRevision;
    if (currentIdx >= schedule.revisions.length) continue;

    const revision = schedule.revisions[currentIdx];
    if (!revision.completed && revision.dueDate <= todayStr) {
      due.push({
        ...revision,
        scheduleId: schedule.id,
        courseCode: schedule.courseCode,
        chapterId: schedule.chapterId,
        topicName: schedule.topicName,
        studiedDate: schedule.studiedDate,
        isOverdue: revision.dueDate < todayStr,
        totalRevisions: schedule.revisions.length,
      });
    }
  }

  return due;
}

/**
 * Get all upcoming revisions (next 7 days)
 */
export function getUpcomingRevisions(days = 7) {
  const allRevisions = store.get('revisions') || [];
  const todayDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  const endStr = endDate.toISOString().split('T')[0];
  const todayStr = today();
  const upcoming = [];

  for (const schedule of allRevisions) {
    if (!schedule.active) continue;

    const currentIdx = schedule.currentRevision;
    if (currentIdx >= schedule.revisions.length) continue;

    const revision = schedule.revisions[currentIdx];
    if (!revision.completed && revision.dueDate >= todayStr && revision.dueDate <= endStr) {
      upcoming.push({
        ...revision,
        scheduleId: schedule.id,
        courseCode: schedule.courseCode,
        topicName: schedule.topicName,
        studiedDate: schedule.studiedDate,
        totalRevisions: schedule.revisions.length,
      });
    }
  }

  return upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/**
 * Get revision compliance stats
 */
export function getRevisionStats() {
  const allRevisions = store.get('revisions') || [];
  let totalCompleted = 0;
  let completedOnTime = 0;
  let totalDue = 0;

  for (const schedule of allRevisions) {
    for (const rev of schedule.revisions) {
      if (rev.completed) {
        totalCompleted++;
        totalDue++;
        if (rev.onTime) completedOnTime++;
      } else if (rev.dueDate <= today()) {
        totalDue++;
      }
    }
  }

  return {
    totalCompleted,
    completedOnTime,
    totalDue,
    compliancePercent: totalDue > 0 ? Math.round((completedOnTime / totalDue) * 100) : 100,
  };
}

/**
 * Get next revision date for a topic
 */
export function getNextRevisionDate(courseCode, topicName) {
  const allRevisions = store.get('revisions') || [];
  const schedule = allRevisions.find(
    r => r.courseCode === courseCode && r.topicName === topicName && r.active
  );
  if (!schedule) return null;

  const currentIdx = schedule.currentRevision;
  if (currentIdx >= schedule.revisions.length) return null;

  return schedule.revisions[currentIdx].dueDate;
}

export default {
  createRevisionSchedule,
  markRevisionReviewed,
  handleMissedRevision,
  getRevisionsDueToday,
  getUpcomingRevisions,
  getRevisionStats,
  getNextRevisionDate,
};
