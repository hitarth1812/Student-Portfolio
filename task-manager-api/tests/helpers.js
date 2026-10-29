// Shared test setup: must run before any app module is required
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-test-secret';
// Tests must never call the real AI provider (cost, flakiness, data leaving the machine)
delete process.env.GEMINI_API_KEY;
delete process.env.GOOGLE_API_KEY;

/**
 * Minimal Express-like response double that records what a middleware sent.
 */
const mockRes = () => {
  const res = { statusCode: 200, body: undefined, headers: {} };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.set = (key, value) => { res.headers[key] = value; return res; };
  return res;
};

/**
 * Runs a middleware and reports whether it called next() or answered itself.
 */
const runMiddleware = (middleware, req) =>
  new Promise((resolve) => {
    const res = mockRes();
    const originalJson = res.json;
    res.json = (body) => {
      originalJson(body);
      resolve({ nextCalled: false, res, req });
      return res;
    };
    middleware(req, res, (err) => resolve({ nextCalled: true, err, res, req }));
  });

module.exports = { mockRes, runMiddleware };
