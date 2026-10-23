const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const auth = require('../middleware/auth');
const { subscribeAll, getHistory, getBindings, getTelemetry } = require('../events/eventBus');
const { getNotifications, getActivity } = require('../events/subscribers');
const { getQueueStats } = require('../jobs/jobQueue');

/**
 * Event routes (Practical 10)
 * EventSource cannot send an Authorization header, and putting the JWT in the
 * URL would leak it into logs.csv. So the client first exchanges its JWT for a
 * one-time, 30-second stream ticket and opens the SSE stream with that.
 */
const TICKET_TTL_MS = 30 * 1000;
const tickets = new Map();

// Open SSE responses, so a graceful shutdown can end them instead of waiting
const openStreams = new Set();

const isElevated = (user) => user.role === 'admin' || user.role === 'manager';
const visibleTo = (user) => (event) => isElevated(user) || String(event.userId) === String(user.id);

// POST /api/events/ticket - protected: issue a single-use SSE ticket
router.post('/ticket', auth, (req, res) => {
  const ticket = crypto.randomBytes(24).toString('hex');
  tickets.set(ticket, { user: req.user, expiresAt: Date.now() + TICKET_TTL_MS });
  res.status(201).json({ success: true, ticket, expiresInMs: TICKET_TTL_MS });
});

// GET /api/events/stream?ticket=... - Server-Sent Events push channel
router.get('/stream', (req, res) => {
  const entry = tickets.get(req.query.ticket);
  tickets.delete(req.query.ticket);

  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(401).json({ success: false, error: 'Invalid or expired stream ticket' });
  }

  const { user } = entry;
  const canSee = visibleTo(user);

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  const send = (eventName, data, id) => {
    if (id) res.write(`id: ${id}\n`);
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send('connected', { message: 'SSE stream connected', user: user.email });
  openStreams.add(res);

  const unsubscribe = subscribeAll((event) => {
    if (canSee(event)) {
      send('domain-event', event, event.id);
    }
  });

  // Comment lines keep proxies from closing an idle connection
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);

  console.log(`[SSE] client connected: ${user.email}`);

  req.on('close', () => {
    openStreams.delete(res);
    clearInterval(heartbeat);
    unsubscribe();
    console.log(`[SSE] client disconnected: ${user.email}`);
  });
});

// GET /api/events/history - recent events visible to the caller
router.get('/history', auth, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const events = getHistory(200).filter(visibleTo(req.user)).slice(0, limit);
  res.status(200).json({ success: true, count: events.length, data: events });
});

// GET /api/events/stats - telemetry, topic bindings, queue and notification stats
router.get('/stats', auth, (req, res) => {
  const notifications = getNotifications().filter(
    (n) => isElevated(req.user) || String(n.userId) === String(req.user.id)
  );

  res.status(200).json({
    success: true,
    data: {
      telemetry: getTelemetry(),
      bindings: getBindings(),
      queue: getQueueStats(),
      activity: getActivity(),
      notificationsSent: notifications.length,
      recentNotifications: notifications.slice(0, 10)
    }
  });
});

// Called on SIGTERM: EventSource clients reconnect on their own once the server is back
router.closeAllStreams = () => {
  openStreams.forEach((res) => res.end());
  return openStreams.size;
};

module.exports = router;
