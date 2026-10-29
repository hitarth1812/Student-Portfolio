const fs = require('fs');
const path = require('path');
const { TOPICS, subscribe, publish } = require('./eventBus');

/**
 * Subscribers (Practical 10)
 * Each subscriber reacts to events independently. None of them is called by the
 * controllers directly - adding or removing one never touches the request code.
 */
const { LOG_DIR } = require('../config/paths');
const EVENT_LOG = path.join(LOG_DIR, 'events.csv');
const NOTIFICATION_LOG = path.join(LOG_DIR, 'notifications.log');

fs.mkdirSync(LOG_DIR, { recursive: true });
if (!fs.existsSync(EVENT_LOG)) {
  fs.writeFileSync(EVENT_LOG, 'timestamp,event_id,topic,actor,payload\n');
}

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const notifications = [];
const activity = { tasksCreated: 0, tasksUpdated: 0, tasksDeleted: 0, tasksCompleted: 0, logins: 0 };

const DOMAIN_TOPICS = Object.values(TOPICS).filter(
  (topic) => topic !== TOPICS.AUDIT_LOGGED && topic !== TOPICS.JOB_PROGRESS
);

// Security-relevant actions also announce that their audit row was written
const SECURITY_TOPICS = new Set([TOPICS.USER_REGISTERED, TOPICS.USER_LOGGED_IN, TOPICS.TASK_DELETED]);

/* 1. Audit Logger - appends every domain event to logs/events.csv */
DOMAIN_TOPICS.forEach((topic) => {
  subscribe(topic, 'auditLogger', async (event) => {
    const row = [event.timestamp, event.id, event.topic, event.actor, JSON.stringify(event.payload)]
      .map(csvCell)
      .join(',');
    await fs.promises.appendFile(EVENT_LOG, row + '\n');

    if (SECURITY_TOPICS.has(topic)) {
      publish(TOPICS.AUDIT_LOGGED, { sourceEvent: event.id, topic }, { actor: 'auditLogger', userId: event.userId });
    }
  });
});

/* 2. Notification Service - simulated email / push for events a user cares about */
const notify = (channel, to, message, sourceEvent) => {
  const userId = sourceEvent.userId;
  const notification = { channel, to, message, sourceEvent: sourceEvent.id, userId, sentAt: new Date().toISOString() };
  notifications.unshift(notification);
  if (notifications.length > 100) notifications.pop();

  fs.appendFile(
    NOTIFICATION_LOG,
    `[${notification.sentAt}] ${channel.toUpperCase()} -> ${to}: ${message}\n`,
    () => {}
  );
  publish(TOPICS.NOTIFICATION_DISPATCHED, { channel, to, message }, { actor: 'notificationService', userId });
};

subscribe(TOPICS.USER_REGISTERED, 'notificationService', (event) => {
  notify('email', event.payload.email, `Welcome aboard, ${event.payload.name}!`, event);
});

subscribe(TOPICS.TASK_HIGH_PRIORITY, 'notificationService', (event) => {
  notify('push', event.actor, `High priority task: "${event.payload.title}"`, event);
});

subscribe(TOPICS.TASK_STATUS_CHANGED, 'notificationService', (event) => {
  if (event.payload.to === 'completed') {
    notify('push', event.actor, `Task "${event.payload.title}" marked completed`, event);
  }
});

subscribe(TOPICS.JOB_COMPLETED, 'notificationService', (event) => {
  notify('email', event.actor, `Your ${event.payload.type} job finished in ${event.payload.durationMs} ms`, event);
});

subscribe(TOPICS.JOB_FAILED, 'notificationService', (event) => {
  notify('email', event.actor, `Job ${event.payload.jobId} failed after ${event.payload.attempts} attempts and was moved to the DLQ`, event);
});

/* 3. Activity Metrics - running counters used by the telemetry endpoint */
subscribe(TOPICS.TASK_CREATED, 'activityMetrics', () => { activity.tasksCreated++; });
subscribe(TOPICS.TASK_UPDATED, 'activityMetrics', () => { activity.tasksUpdated++; });
subscribe(TOPICS.TASK_DELETED, 'activityMetrics', () => { activity.tasksDeleted++; });
subscribe(TOPICS.USER_LOGGED_IN, 'activityMetrics', () => { activity.logins++; });
subscribe(TOPICS.TASK_STATUS_CHANGED, 'activityMetrics', (event) => {
  if (event.payload.to === 'completed') activity.tasksCompleted++;
});

/* 4. Console Monitor - prints a one-line summary for job lifecycle and audit events */
[TOPICS.JOB_STARTED, TOPICS.JOB_PROGRESS, TOPICS.AUDIT_LOGGED, TOPICS.NOTIFICATION_DISPATCHED].forEach((topic) => {
  subscribe(topic, 'consoleMonitor', (event) => {
    console.log(`[Monitor] ${event.topic} ${JSON.stringify(event.payload)}`);
  });
});

module.exports = {
  getNotifications: () => [...notifications],
  getActivity: () => ({ ...activity }),
  EVENT_LOG
};
