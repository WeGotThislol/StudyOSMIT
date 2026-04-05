// StudyOS — Google Calendar API Wrapper
import googleAuth from './google-auth.js';

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';

class GoogleCalendar {
  constructor() {}

  get isAvailable() {
    return googleAuth.isConnected;
  }

  /**
   * Get events for a date range
   */
  async getEvents(startDate, endDate, calendarId = 'primary') {
    if (!this.isAvailable) return [];

    try {
      const timeMin = new Date(startDate).toISOString();
      const timeMax = new Date(endDate).toISOString();
      const url = `${CALENDAR_BASE}/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`;

      const res = await googleAuth.fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.items || [];
      }
    } catch (e) {
      console.error('GoogleCalendar: Failed to fetch events.', e);
    }

    return [];
  }

  /**
   * Create a calendar event
   */
  async createEvent(event, calendarId = 'primary') {
    if (!this.isAvailable) return null;

    try {
      const res = await googleAuth.fetch(`${CALENDAR_BASE}/calendars/${calendarId}/events`, {
        method: 'POST',
        body: JSON.stringify(event),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('GoogleCalendar: Failed to create event.', e);
    }

    return null;
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId, calendarId = 'primary') {
    if (!this.isAvailable) return false;

    try {
      const res = await googleAuth.fetch(
        `${CALENDAR_BASE}/calendars/${calendarId}/events/${eventId}`,
        { method: 'DELETE' }
      );
      return res.ok;
    } catch (e) {
      console.error('GoogleCalendar: Failed to delete event.', e);
      return false;
    }
  }

  /**
   * Create a deadline event
   */
  async createDeadlineEvent(task) {
    const colorId = task.type === 'exam' ? '11' : task.type === 'assignment' ? '5' : '3';

    const event = {
      summary: `${task.type === 'exam' ? '📝' : '📋'} ${task.title}`,
      description: `Course: ${task.course || 'N/A'}\nType: ${task.type}\nCreated by StudyOS`,
      start: { date: task.dueDate },
      end: { date: task.dueDate },
      colorId,
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 30 }],
      },
      source: { title: 'StudyOS', url: '' },
    };

    return this.createEvent(event);
  }

  /**
   * Create a revision study block
   */
  async createRevisionBlock(topicName, courseCode, revisionNumber, totalRevisions, studiedDate) {
    if (!this.isAvailable) return null;

    // Find next free 45-minute slot
    const slot = await this._findFreeSlot(45);
    if (!slot) return null;

    const event = {
      summary: `📚 Revise: ${topicName} — ${courseCode}`,
      description: `Spaced repetition revision session.\nOriginal study date: ${studiedDate}\nRevision #${revisionNumber} of ${totalRevisions}.\n\nCreated by StudyOS`,
      start: { dateTime: slot.start.toISOString() },
      end: { dateTime: slot.end.toISOString() },
      colorId: '3', // Grape/lavender for revision
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 10 }],
      },
      source: { title: 'StudyOS', url: '' },
    };

    return this.createEvent(event);
  }

  /**
   * Find next free slot of given duration (minutes) in calendar
   * Checks next 3 days
   */
  async _findFreeSlot(durationMinutes) {
    const now = new Date();
    const endSearch = new Date(now);
    endSearch.setDate(endSearch.getDate() + 3);

    const events = await this.getEvents(now.toISOString(), endSearch.toISOString());

    // Build list of busy times
    const busy = events
      .filter(e => e.start?.dateTime && e.end?.dateTime)
      .map(e => ({
        start: new Date(e.start.dateTime),
        end: new Date(e.end.dateTime),
      }))
      .sort((a, b) => a.start - b.start);

    // Try slots from next whole hour, in 30-min increments
    const candidate = new Date(now);
    candidate.setMinutes(Math.ceil(candidate.getMinutes() / 30) * 30, 0, 0);
    if (candidate <= now) candidate.setMinutes(candidate.getMinutes() + 30);

    // Only check reasonable hours (8 AM - 10 PM)
    while (candidate < endSearch) {
      const hour = candidate.getHours();
      if (hour >= 8 && hour < 22) {
        const slotEnd = new Date(candidate);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

        // Check if slot is free
        const conflict = busy.some(
          b => candidate < b.end && slotEnd > b.start
        );

        if (!conflict && slotEnd.getHours() <= 22) {
          return { start: new Date(candidate), end: slotEnd };
        }
      }

      candidate.setMinutes(candidate.getMinutes() + 30);
    }

    return null; // No free slot found
  }

  /**
   * Check for conflicts in a time window
   */
  async checkConflicts(startTime, endTime) {
    const events = await this.getEvents(startTime, endTime);
    return events.filter(e => {
      if (!e.start?.dateTime) return false;
      const eStart = new Date(e.start.dateTime);
      const eEnd = new Date(e.end.dateTime);
      return new Date(startTime) < eEnd && new Date(endTime) > eStart;
    });
  }

  /**
   * Get user's calendar list (for settings)
   */
  async getCalendarList() {
    if (!this.isAvailable) return [];

    try {
      const res = await googleAuth.fetch(`${CALENDAR_BASE}/users/me/calendarList`);
      if (res.ok) {
        const data = await res.json();
        return data.items || [];
      }
    } catch (e) {
      console.error('GoogleCalendar: Failed to fetch calendar list.', e);
    }

    return [];
  }
}

export const googleCalendar = new GoogleCalendar();
export default googleCalendar;
