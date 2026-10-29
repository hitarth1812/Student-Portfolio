/**
 * Practical 13 demo: AI Task Assistant through the running stack.
 * Usage: node scripts/demo-ai.js [baseUrl]   (default http://localhost:8080/backend)
 * Uses a local test account (override with DEMO_EMAIL / DEMO_PASSWORD).
 */
const BASE = process.argv[2] || 'http://localhost:8080/backend';
const EMAIL = process.env.DEMO_EMAIL || 'p13.ai@example.test';
const PASSWORD = process.env.DEMO_PASSWORD || 'Practical13!ai';
let token;

const call = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
};

const show = (label, r) => {
  const d = r.body?.data;
  if (!d || !d.priority) {
    console.log(`   ${label} -> HTTP ${r.status} ${JSON.stringify(r.body)}`);
    return;
  }
  console.log(`   ${label} -> HTTP ${r.status} | source=${d.source}${d.source === 'gemini' ? ` (${d.model})` : ''} | ${d.latencyMs} ms${d.cached ? ' | cached' : ''}`);
  console.log(`      priority=${d.priority}  due=${d.dueDate} (+${d.dueInDays}d)  redacted=[${d.redacted.join(', ')}]`);
  console.log(`      description: ${d.description}`);
  d.steps.forEach((s, i) => console.log(`      step ${i + 1}: ${s}`));
  if (d.fallbackReason) console.log(`      fallbackReason: ${d.fallbackReason}`);
};

(async () => {
  console.log(`=== Practical 13 AI Task Assistant demo against ${BASE} ===`);
  let auth = await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  if (auth.status !== 200) auth = await call('POST', '/auth/register', { name: 'P13 AI', email: EMAIL, password: PASSWORD });
  token = auth.body.token;
  console.log(`1. Authenticated as ${EMAIL} (HTTP ${auth.status})`);

  const status = await call('GET', '/api/ai/status');
  console.log(`2. GET /api/ai/status -> ${JSON.stringify(status.body.data)}`);

  console.log('3. POST /api/ai/suggest - real Gemini suggestion');
  show('"Prepare slides for the AWDF viva"', await call('POST', '/api/ai/suggest', {
    title: 'Prepare slides for the AWDF viva',
    description: 'Cover Docker, CI/CD and the AI assistant'
  }));

  console.log('4. Personal data is redacted before it leaves the server');
  show('"Email results to mentor@charusat.edu.in, call 9876543210"', await call('POST', '/api/ai/suggest', {
    title: 'Email lab results to mentor@charusat.edu.in',
    description: 'Call 9876543210 if the server password: Hunter2! does not work'
  }));

  console.log('5. Identical prompt is answered from the cache (no second paid API call)');
  show('repeat of step 3', await call('POST', '/api/ai/suggest', {
    title: 'Prepare slides for the AWDF viva',
    description: 'Cover Docker, CI/CD and the AI assistant'
  }));

  console.log('6. Input validation');
  const bad = await call('POST', '/api/ai/suggest', { title: 'x' });
  console.log(`   title "x" -> HTTP ${bad.status} ${bad.body.error}`);

  console.log('7. Rate limit: 10 requests per user per minute');
  let limited;
  for (let i = 0; i < 10; i++) {
    const r = await call('POST', '/api/ai/suggest', { title: 'Prepare slides for the AWDF viva', description: 'Cover Docker, CI/CD and the AI assistant' });
    if (r.status === 429) { limited = r; break; }
  }
  console.log(limited
    ? `   -> HTTP 429 after the limit, Retry-After=${limited.headers.get('retry-after')}s: ${limited.body.error}`
    : '   -> limit not reached');
})().catch((err) => { console.error('Demo failed:', err); process.exit(1); });
