/**
 * Practical 9 sanity check: average MISS vs HIT response time.
 * Usage: TOKEN=<jwt> node scripts/benchmark-cache.js [baseUrl]
 */
const BASE = process.argv[2] || 'http://localhost:5000';
const TOKEN = process.env.TOKEN;
const HIT_RUNS = 10;

if (!TOKEN) {
  console.error('Set TOKEN to a valid JWT first.');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

const timed = async (method, path) => {
  const start = process.hrtime.bigint();
  const res = await fetch(`${BASE}${path}`, { method, headers });
  const body = await res.json();
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { ms, status: res.status, cache: res.headers.get('x-cache'), body };
};

const avg = (values) => values.reduce((a, b) => a + b, 0) / values.length;

const measure = async (label, path) => {
  await timed('DELETE', '/api/cache');
  const miss = await timed('GET', path);
  const hits = [];
  for (let i = 0; i < HIT_RUNS; i++) {
    const r = await timed('GET', path);
    if (r.cache !== 'HIT') throw new Error(`${label}: expected HIT, got ${r.cache}`);
    hits.push(r.ms);
  }
  const hitAvg = avg(hits);
  console.log(
    `${label.padEnd(16)} MISS ${miss.ms.toFixed(2).padStart(8)} ms (${miss.cache}, ${miss.status}) | ` +
    `HIT avg of ${HIT_RUNS} ${hitAvg.toFixed(2).padStart(6)} ms | speed-up ${(miss.ms / hitAvg).toFixed(1)}x`
  );
  return miss.body;
};

(async () => {
  const list = await measure('GET /tasks', '/tasks');
  const first = list.data && list.data[0];
  if (!first) {
    console.log('No tasks to benchmark GET /tasks/:id - create one first.');
    return;
  }
  await measure('GET /tasks/:id', `/tasks/${first._id}`);
  const debug = await timed('GET', '/api/cache/debug');
  console.log('debug:', JSON.stringify(debug.body.data));
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
