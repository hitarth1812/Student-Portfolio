/**
 * Practical 10 end-to-end demo: event-driven flow + async jobs.
 * Opens the SSE stream, performs task actions, enqueues background jobs and
 * prints every event that arrives, plus the 202 response time vs job duration.
 *
 * Usage: node scripts/demo-events.js [baseUrl]
 * Uses a local test account (override with DEMO_EMAIL / DEMO_PASSWORD).
 */
const BASE = process.argv[2] || 'http://localhost:5000';
const EMAIL = process.env.DEMO_EMAIL || 'p10.demo@example.test';
const PASSWORD = process.env.DEMO_PASSWORD || 'Practical10!demo';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let token;

const call = async (method, path, body) => {
  const start = process.hrtime.bigint();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => null);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { status: res.status, ms, body: json, location: res.headers.get('location') };
};

const openStream = async (received) => {
  const { body } = await call('POST', '/api/events/ticket');
  const res = await fetch(`${BASE}/api/events/stream?ticket=${body.ticket}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  (async () => {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let split;
      while ((split = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const name = (frame.match(/^event: (.*)$/m) || [])[1];
        const data = (frame.match(/^data: (.*)$/m) || [])[1];
        if (!data) continue;
        const parsed = JSON.parse(data);
        if (name === 'domain-event') {
          received.push(parsed);
          console.log(`  [SSE] ${parsed.topic.padEnd(26)} ${JSON.stringify(parsed.payload)}`);
        } else {
          console.log(`  [SSE] ${name}: ${parsed.message}`);
        }
      }
    }
  })();

  return () => reader.cancel();
};

const waitForJob = async (id) => {
  for (;;) {
    const { body } = await call('GET', `/api/jobs/${id}`);
    if (body.data.status === 'completed' || body.data.status === 'failed') return body.data;
    await sleep(250);
  }
};

(async () => {
  console.log(`\n=== Practical 10 demo against ${BASE} ===\n`);

  let auth = await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  if (auth.status !== 200) {
    auth = await call('POST', '/auth/register', { name: 'P10 Demo', email: EMAIL, password: PASSWORD });
  }
  token = auth.body.token;
  console.log(`1. Authenticated as ${EMAIL} (HTTP ${auth.status})`);

  const received = [];
  const close = await openStream(received);
  await sleep(300);

  console.log('\n2. Task actions (each publishes domain events)');
  const created = await call('POST', '/tasks', {
    title: 'Practical 10 - Event Driven Architecture',
    description: 'Pub/sub event bus, async jobs and SSE',
    priority: 'high'
  });
  console.log(`   POST /tasks -> ${created.status} in ${created.ms.toFixed(1)} ms`);
  const id = created.body.data._id;

  const updated = await call('PUT', `/tasks/${id}`, { status: 'completed' });
  console.log(`   PUT /tasks/:id (status=completed) -> ${updated.status} in ${updated.ms.toFixed(1)} ms`);

  const temp = await call('POST', '/tasks', { title: 'Temporary task to delete', priority: 'low' });
  const deleted = await call('DELETE', `/tasks/${temp.body.data._id}`);
  console.log(`   DELETE /tasks/:id -> ${deleted.status} in ${deleted.ms.toFixed(1)} ms`);
  await sleep(500);

  console.log('\n3. Async jobs (HTTP 202 Accepted, processed by background workers)');
  const results = [];
  for (const type of ['export_csv', 'task_report', 'simulate_failure']) {
    const accepted = await call('POST', '/api/jobs', { type });
    console.log(`   POST /api/jobs {type:${type}} -> ${accepted.status} in ${accepted.ms.toFixed(1)} ms, Location: ${accepted.location}`);
    results.push({ type, accepted });
  }

  for (const { type, accepted } of results) {
    const job = await waitForJob(accepted.body.data.id);
    console.log(
      `   ${type.padEnd(17)} ${job.status.toUpperCase().padEnd(9)} attempts=${job.attempts} ` +
      `| 202 returned in ${accepted.ms.toFixed(1)} ms vs job ran ${job.durationMs} ms` +
      (job.error ? ` | error: ${job.error}` : '')
    );
    if (type === 'task_report') console.log(`     report: ${JSON.stringify(job.result)}`);
  }
  await sleep(500);

  const exportJob = results[0].accepted.body.data.id;
  const download = await fetch(`${BASE}/api/jobs/${exportJob}/download`, { headers: { Authorization: `Bearer ${token}` } });
  const csv = await download.text();
  console.log(`\n4. GET /api/jobs/:id/download -> ${download.status}, ${csv.trim().split('\n').length - 1} CSV rows`);

  const dlq = await call('GET', '/api/jobs/dlq');
  console.log(`5. GET /api/jobs/dlq -> ${dlq.body.count} job(s) in the Dead Letter Queue`);

  const stats = await call('GET', '/api/events/stats');
  const { telemetry, queue, notificationsSent, activity } = stats.body.data;
  console.log(`6. GET /api/events/stats -> emitted=${telemetry.totalEmitted}, avgHandlerMs=${telemetry.avgHandlerMs}, ` +
    `notifications=${notificationsSent}, dlq=${queue.dlqCount}, subscriberErrors=${telemetry.subscriberErrors}`);
  console.log(`   activity: ${JSON.stringify(activity)}`);

  console.log(`\nSSE events received by this client: ${received.length}`);
  close();
  process.exit(0);
})().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
