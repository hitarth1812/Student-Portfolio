# Task Management REST API (MongoDB + Mongoose + JWT)

A production-grade, modular Express.js REST API for task management, backed by **MongoDB Atlas** via **Mongoose**, with schema validation, JWT authentication and a layered middleware pipeline.

All `/tasks` routes are **protected** — every request must carry a valid bearer token, and each user only ever sees their own tasks.

---

## Folder Structure

```text
task-manager-api/
│
├── package.json
├── server.js
├── .env                 (not committed)
├── .env.example
│
├── config/
│      db.js             MongoDB connection
│
├── models/
│      Task.js           Mongoose schema + pre-save hook + owner ref
│      User.js           Email + bcrypt password hash
│
├── routes/
│      taskRoutes.js     Protected (router.use(auth))
│      authRoutes.js     register / login / me / logout
│
├── controllers/
│      taskController.js
│      authController.js Hashing, token signing, /me
│
├── middleware/
│      logger.js
│      errorHandler.js       Global error handler (Mongoose-aware)
│      auth.js               Verifies the JWT, sets req.user
│      validateJson.js
│      validateObjectId.js
│      validateTask.js       Required fields / types on task payloads
│      validateAuthInput.js  Email + password rules on credentials
│      notFound.js
│
└── README.md
```

---

## 1. Installation & Setup

### Prerequisites
- Node.js v18+
- A running MongoDB instance — either:
  - **Local**: install MongoDB Community Server and run `mongod`, or
  - **Atlas**: create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas) and grab a connection string.

### Steps

```bash
cd task-manager-api
npm install             # includes bcryptjs + jsonwebtoken
cp .env.example .env    # then edit .env with your own MONGO_URI and JWT_SECRET
npm run dev              # or: node server.js
```

The server starts on `http://localhost:5000` (or your configured `PORT`).

### `.env.example`

```env
PORT=5000

# MongoDB Atlas connection string (Database > Connect > Drivers)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/task-manager?retryWrites=true&w=majority

# Secret used to sign and verify JWTs - generate your own, never commit the real value
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=1h
```

Generate a strong secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Never commit `.env` — it's already excluded via `.gitignore`. Only `.env.example` (with placeholder values) is committed. `server.js` refuses to start if `JWT_SECRET` is missing, so a misconfigured environment fails at boot rather than at the first login.

---

## 2. User Schema (`models/User.js`)

| Field       | Type   | Rules                                                        |
|-------------|--------|--------------------------------------------------------------|
| `name`      | String | optional, trimmed                                            |
| `email`     | String | required, unique, lowercased, format-checked                 |
| `password`  | String | required, min 6 chars, stores a **bcrypt hash**, `select: false` |
| `createdAt` | Date   | default `Date.now`                                           |

`select: false` means the hash is excluded from every query by default — the login
route is the only place that asks for it explicitly, with `.select('+password')`.

The `Task` schema gains a `user` field (`ObjectId`, ref `User`, indexed) so every
task query is scoped to its owner.

---

## 3. Authentication Endpoints

| Method | Endpoint | Auth | Description | Body | Success | Error |
|--------|----------|------|-------------|------|---------|-------|
| POST | `/auth/register` | public | Create an account | `{ name?, email, password }` | `201` + token | `400`, `409`, `415` |
| POST | `/auth/login` | public | Exchange credentials for a JWT | `{ email, password }` | `200` + token | `400`, `401`, `415` |
| GET | `/auth/me` | **Bearer** | Details of the logged-in user | — | `200` | `401`, `404` |
| POST | `/auth/logout` | **Bearer** | Signals the client to discard its token | — | `200` | `401` |

### Example: POST `/auth/register`
```json
{ "name": "Hitarth", "email": "hitarth@example.com", "password": "secret123" }
```
Response `201 Created`:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "6a969578ae5a94b65366dbd8",
    "name": "Hitarth",
    "email": "hitarth@example.com",
    "createdAt": "2026-09-01T09:06:01.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
The response never contains the password or its hash.

### Example: POST `/auth/login` with a wrong password
Response `401 Unauthorized`:
```json
{ "success": false, "error": "Invalid email or password" }
```
The same message is returned for an unknown email, so the API cannot be used to
enumerate which addresses are registered.

### Using the token
Every protected request needs this header — note the single space after `Bearer`:

```http
Authorization: Bearer <token>
```

### Token failure modes

| Situation | Response |
|-----------|----------|
| Header missing or not `Bearer <token>` | `401` `"Not authorized: missing or malformed Authorization header"` |
| Signature tampered with / wrong secret | `401` `"Not authorized: invalid token"` |
| Token past its 1-hour expiry | `401` `"Session expired, please log in again"` |

`jwt.verify()` **throws** in the last two cases, so it is wrapped in `try/catch`.
Without that, an invalid token would crash the process instead of returning `401`.

---

## 4. Task Schema (`models/Task.js`)

| Field         | Type     | Rules                                                     |
|---------------|----------|------------------------------------------------------------|
| `title`       | String   | required, trimmed                                          |
| `description` | String   | optional, trimmed                                           |
| `completed`   | Boolean  | default `false`                                             |
| `priority`    | String   | enum: `low`, `medium`, `high` — default `medium`            |
| `createdAt`   | Date     | default `Date.now`                                           |

A `pre('save')` hook trims `title` before persisting.

---

## 5. Task Endpoints (all protected)

Every route below requires `Authorization: Bearer <token>` and operates only on
tasks owned by the token's user. Requesting another user's task returns `404`,
not `403` — the API does not confirm that someone else's task exists.

| Method | Endpoint | Description | Body | Success | Error |
|--------|----------|--------------|------|---------|-------|
| GET | `/tasks` | Get the caller's tasks | — | `200` | `401`, `500` |
| GET | `/tasks/:id` | Get one of the caller's tasks | — | `200` | `400`, `401`, `404`, `500` |
| POST | `/tasks` | Create a task | `{ title, description?, completed?, priority? }` | `201` | `400`, `401`, `415`, `500` |
| PUT | `/tasks/:id` | Update a task | any subset of the above fields | `200` | `400`, `401`, `404`, `415`, `500` |
| DELETE | `/tasks/:id` | Delete a task | — | `200` | `400`, `401`, `404`, `500` |

The owner is taken from the verified token (`req.user.id`), never from the
request body — a client cannot create or move a task onto another account.

### Example: POST `/tasks`
Request:
```json
{
  "title": "  Learn Mongoose  ",
  "priority": "high"
}
```
Response `201 Created`:
```json
{
  "success": true,
  "data": {
    "_id": "66b8f1e2a1c4d2f9a8b3c123",
    "title": "Learn Mongoose",
    "completed": false,
    "priority": "high",
    "createdAt": "2026-08-10T10:15:00.000Z",
    "__v": 0
  }
}
```

### Example: Validation Error (missing title)
Request:
```json
{ "priority": "high" }
```
Response `400 Bad Request`:
```json
{
  "success": false,
  "error": "Validation Error",
  "details": {
    "title": "Title is required and must be a non-empty string"
  }
}
```
This is rejected by `validateTask` **before** the controller runs, so the
database is never touched for an obviously malformed payload.

### Example: No token
`GET /tasks` with no `Authorization` header → `401 Unauthorized`
```json
{
  "success": false,
  "error": "Not authorized: missing or malformed Authorization header"
}
```

### Example: Invalid ObjectId
`GET /tasks/not-a-valid-id` → `400 Bad Request`
```json
{
  "success": false,
  "error": "Invalid task id"
}
```

### Example: Task not found
`GET /tasks/66b8f1e2a1c4d2f9a8b3ffff` (valid format, no match) → `404 Not Found`
```json
{
  "success": false,
  "error": "Task not found"
}
```

---

## 6. Postman Test Cases

Import `Task-Manager-API.postman_collection.json`. The collection uses
**collection-level bearer auth** with a `{{token}}` variable; the Register and
Login requests have a test script that saves the returned token into it
automatically, so protected requests just work after you log in once.

Run in this order:

1. **Register** — `POST /auth/register`, body `{ "email": "you@example.com", "password": "secret123" }` → `201`, token saved.
2. **Login** — `POST /auth/login`, same credentials → `200`, token refreshed.
3. **Get Me** — `GET /auth/me` → `200` with your `id` and `email`, no password field.
4. **Get All Tasks** — `GET /tasks` → `200` with an empty `data` array for a new account.
5. **Create Task** — `POST /tasks`, body `{ "title": "Write tests", "priority": "high" }` → `201`.
6. **Update Task** — `PUT /tasks/<id>`, body `{ "completed": true }` → `200`, other fields untouched.
7. **Delete Task** — `DELETE /tasks/<id>` → `200`, then re-GET the same id → `404`.

Negative cases worth demonstrating:

| Test | Expected |
|------|----------|
| `GET /tasks` with the Authorization header removed | `401` |
| `GET /tasks` with a character appended to the token | `401` invalid token |
| `GET /tasks` with a token signed with `expiresIn: '-10s'` | `401` session expired |
| `POST /auth/register` with `{ "email": "nope", "password": "123" }` | `400` with both field errors |
| `POST /auth/register` with an email that already exists | `409` |
| `POST /auth/login` with the wrong password | `401` `"Invalid email or password"` |
| `POST /tasks` with `{ "description": "no title" }` | `400` `details.title` |
| `POST /tasks` with `{ "title": "x", "priority": "urgent" }` | `400` `details.priority` |
| User B requesting User A's task id | `404` |

All of the above were run against this implementation and returned the responses listed.

---

## 7. Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `MongoDB Connection error: connect ECONNREFUSED` | No MongoDB instance running / wrong URI | Start `mongod` locally, or verify Atlas URI + IP allowlist |
| `Validation Error` on POST | Missing required `title` | Include a non-empty `title` in the request body |
| `Invalid task id` (400) | `:id` isn't a valid 24-char hex ObjectId | Use a real ObjectId returned from a previous create/list call |
| `415 Unsupported Media Type` | Missing `Content-Type: application/json` header on POST/PUT | Set the header in your client/Postman request |
| Server exits right after "Connection error" log | `connectDB()` calls `process.exit(1)` on failure by design | Fix `MONGO_URI` in `.env` and restart |
| `401` on every protected request | Authorization header missing or malformed | Send exactly `Authorization: Bearer <token>` — the space matters |
| `JWT_SECRET is missing` at startup | `.env` not loaded or key name mismatch | Ensure `dotenv.config()` runs first (it is the first line of `server.js`) and the key is spelled `JWT_SECRET` |
| Login fails with the correct password | Comparing plain text to a hash with `===` | Use `bcrypt.compare(plainPassword, user.password)` |
| `user.password` is `undefined` in the login controller | The schema sets `select: false` | Query with `.select('+password')` |
| Server crashes on a tampered token | `jwt.verify()` throws and nothing catches it | `middleware/auth.js` wraps it in `try/catch` and returns `401` |

---

## 8. Why This Design

### Why a schema in MongoDB, even though it's schema-less?
MongoDB itself doesn't enforce structure — any document shape can go into a collection. Mongoose schemas add a **contract** at the application layer: they define what fields exist, their types, and their rules (required, enum, default). Without this, malformed or inconsistent documents (missing fields, wrong types, typos in field names) can silently enter the database, causing bugs that are hard to trace later. The schema turns "anything goes" into "only valid tasks get saved," which keeps the codebase predictable as it grows.

### Why is backend validation critical?
Client-side validation (browser forms, frontend JS) can always be bypassed — via direct API calls (Postman, curl), a modified frontend, or a malicious actor. The backend is the last line of defense before data is persisted. Backend validation guarantees data integrity regardless of which client sent the request, and it's also where security-sensitive checks belong, since anything enforced only in the browser is not really enforced at all.

### Why must passwords be hashed before storage, even in a lab project?
A hash is one-way: `bcrypt.hash()` produces a value that cannot be reversed back
into the password. If the database is ever dumped, leaked in a screenshot, or
committed to a public repo, plain-text passwords hand the attacker every account
immediately — and because people reuse passwords, they also hand over accounts on
unrelated services. A lab database is *more* likely to leak than a production one,
not less: it lives in a public GitHub repo, on a shared Atlas cluster, in
screenshots pasted into reports.

bcrypt specifically, rather than SHA-256, for two reasons:
- **It salts automatically.** Every hash embeds a random salt, so two users with
  the same password get different hashes and a precomputed rainbow table is useless.
- **It is deliberately slow,** with a tunable cost factor (`10` here, meaning
  2^10 key-expansion rounds). SHA-256 is designed to be fast, which is exactly
  what an attacker brute-forcing a stolen hash wants. bcrypt turns billions of
  guesses per second into a few thousand.

The stored value looks like `$2b$10$7i7p7fcXp...` — the `$2b$` marks the bcrypt
variant, `10` is the cost factor, and the rest is the salt plus the digest.

### What does the auth middleware actually verify?
`jwt.verify(token, process.env.JWT_SECRET)` recomputes the token's HMAC signature
from its header and payload using the server's secret and compares it to the
signature the client sent. That proves two things: the token was issued by *this*
server (nobody else has the secret), and not one byte of the payload has been
altered since. It then checks the `exp` claim against the current time.

It does **not** hit the database — the whole point of a JWT is that the payload is
self-contained, which is why the token stays valid until it expires even if the
user "logs out".

If the header is missing or does not start with `Bearer `, the middleware returns
`401` before touching `jwt.verify()`. If the token is tampered with, `verify`
throws `JsonWebTokenError`; if it is past `exp`, it throws `TokenExpiredError`.
Both are caught and converted into a `401`, with a distinct message for expiry so
the frontend can tell the user to log in again rather than showing a generic error.
An uncaught throw here would take down the whole server, which is why the
`try/catch` is not optional.

### Why validate on the server when the frontend already validates?
Because the frontend is not a security boundary — it is a convenience. The React
form's `required` attribute and length check only run in the browser session that
loaded that page. Anyone can bypass all of it with `curl`, Postman, browser
devtools, or a script that calls the API directly; the server has no way to tell
those apart from the real frontend. Client-side validation exists to give fast
feedback and save a round trip. Server-side validation is what actually protects
the database, and it is the only copy that cannot be turned off by the client.

That is also why `validateTask` runs *before* the controller: rejecting a bad
payload in middleware means no Mongoose call, no round trip to Atlas, and one
consistent `400` shape regardless of which route was hit.

### What happens internally when Mongoose validation fails?
When `.save()` or `.create()` is called, Mongoose runs each field's validators (`required`, `enum`, custom validators, etc.) before touching the database. If any fail, Mongoose immediately rejects the operation with a `ValidationError` — no write happens. That error object contains an `errors` map keyed by field name, each with a `.message` describing the failure. In `middleware/errorHandler.js`, this is caught via `err.name === 'ValidationError'`, and the field-level messages are extracted into a clean `details` object returned to the client as `400 Bad Request`, matching the exact shape requested by the spec.

---

## 9. Middleware Architecture

The pipeline is ordered cheapest-check-first, so a request is rejected as early
as possible and the controller only ever sees an authenticated, well-formed request.

```text
Client request (Authorization: Bearer <token>)
        |
        v
  cors + express.json()      parse the body
        |
        v
  logger.js                  timestamp + method + URL
        |
        v
  auth.js                    verify JWT -> req.user   (401 on missing/invalid/expired)
        |
        v
  validateObjectId.js        :id is a real ObjectId   (400)
        |
        v
  validateJson.js            Content-Type is JSON     (415)
        |
        v
  validateTask.js            required fields + types  (400)
        |
        v
  taskController             scoped by req.user.id
        |
        v
  errorHandler.js            anything thrown -> structured JSON
```

1. **`logger.js`** — logs timestamp + method + URL for every request.
2. **`auth.js`** — verifies the bearer token and attaches `req.user`; applied to the whole task router via `router.use(auth)` so a new route cannot accidentally be left public.
3. **`validateObjectId.js`** — rejects malformed `:id` params (`400`) before hitting the database.
4. **`validateJson.js`** — enforces `Content-Type: application/json` on POST/PUT (`415`).
5. **`validateTask.js`** — a middleware *factory*: `validateTask()` requires a title for POST, `validateTask({ partial: true })` only checks the fields actually sent for PUT. Also trims the strings it is about to persist.
6. **`validateAuthInput.js`** — same factory pattern for credentials; `requireMinLength` is off on login, since password-length rules belong to registration and enforcing them on login leaks information about stored passwords.
7. **`notFound.js`** — catch-all for undefined routes (`404`).
8. **`errorHandler.js`** — final middleware; translates Mongoose `ValidationError`/`CastError`/duplicate-key errors and generic exceptions into structured JSON responses.

---

## 10. Frontend Integration

The React app (`../Student_Portfolio`) consumes this API:

- **`src/api.js`** — one `request()` wrapper attaches `Authorization: Bearer <token>` from `localStorage` to every call and converts any non-2xx response into an `ApiError` carrying its status code.
- **`src/context/AuthContext.jsx`** — holds the session. On load it exchanges a stored token for the user via `GET /auth/me`; a stale token 401s and is cleared.
- **401 handling** — `api.js` calls a single registered handler on *any* 401, which clears the token, resets the user and sets "Your session expired. Please log in again." `ProtectedRoute` then redirects to `/login`, remembering the attempted path so login can send the user back.
- **Logout** — `POST /auth/logout` then discard the token. Since a JWT is stateless the server cannot revoke it, which is exactly why the 1-hour expiry matters: the window in which a stolen token is useful is bounded.

---

## 11. Role-Based Access Control (RBAC) & Task Status Segregation

### System Roles
- **`user`**: Normal user. Can create, read, update, change status, and delete their own tasks.
- **`manager`**: Elevated role. Can view team tasks, manage tasks across users, and view the user directory.
- **`admin`**: Full administrative access. Can manage all tasks, view users, change user roles, and delete user accounts.

### Role Permission Matrix

| Action | USER | MANAGER | ADMIN |
| :--- | :---: | :---: | :---: |
| Login / Register | YES | YES | YES |
| View own tasks | YES | YES | YES |
| Create own task | YES | YES | YES |
| Update own task | YES | YES | YES |
| Delete own task | YES | YES | YES |
| Change task status | YES | YES | YES |
| View other users' tasks | NO | YES | YES |
| Manage other users' tasks | NO | YES | YES |
| View users (`GET /users`) | NO | YES | YES |
| Change user role (`PUT /users/:id/role`) | NO | NO | YES |
| Delete users (`DELETE /users/:id`) | NO | NO | YES |

### Task Status Lifecycle & Backward Compatibility
Tasks now support three explicit states:
- **`pending`**: Task created but work has not started.
- **`incomplete`**: Task is actively in progress or paused.
- **`completed`**: Task has been finished.

**Backward Compatibility**:
Existing documents with boolean `completed` values are automatically migrated on server startup:
- `completed === true` maps to `completed`.
- `completed === false` maps to `pending`.
- `completed` boolean and `status` string are kept synchronized by schema pre-save hooks and controllers so existing API consumers never break.

### Protected RBAC Endpoints

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/tasks` | Authenticated | Get own tasks (or all tasks for manager/admin if `?all=true`) |
| `GET` | `/tasks/:id` | Authenticated | Get task by ID (enforces ownership for `user`, elevated access for `manager`/`admin`) |
| `POST` | `/tasks` | Authenticated | Create a new task (strictly owned by authenticated user) |
| `PUT` | `/tasks/:id` | Authenticated | Update task (status transitions, priority, content) |
| `DELETE`| `/tasks/:id` | Authenticated | Delete task (ownership enforced for normal users) |
| `GET` | `/users` | `authorize('admin', 'manager')` | View all registered users |
| `PUT` | `/users/:id/role`| `authorize('admin')` | Change a user's role (`user`, `manager`, `admin`) |
| `DELETE`| `/users/:id` | `authorize('admin')` | Delete user and their associated tasks |

### Security Measures & Privilege Escalation Prevention
1. **JWT Role Claim**: JWT payload contains `{ id, email, role }`.
2. **Authoritative Backend Verification**: RBAC middleware (`middleware/authorize.js`) validates authorization against the live MongoDB record to prevent stale or forged roles.
3. **Registration Hardening**: Public registration strictly sets `role: 'user'`, discarding any client-supplied role values.
4. **IDOR Prevention**: Normal users attempting to view, update, or delete other users' tasks receive `404 Not Found`.
5. **Admin Self-Protection**: Admins cannot delete their own account or demote themselves if they are the sole administrator.


---

## 12. Event-Driven Architecture & Async Jobs (Practical 10)

Controllers no longer do side work inline. They **publish domain events** on an in-process event bus
(`events/eventBus.js`, built on Node's `EventEmitter`) and respond immediately; independent
**subscribers** react on a later tick, each isolated so one failure cannot break the request or the others.

| Subscriber (`events/subscribers.js`) | Reacts to | Output |
|---|---|---|
| `auditLogger` | every domain event | `logs/events.csv` |
| `notificationService` | `user:registered`, `task:high_priority_alert`, `task:status_changed` → completed, `job:completed`, `job:failed` | `logs/notifications.log` (simulated email / push) |
| `activityMetrics` | task + login events | counters in `/api/events/stats` |
| `consoleMonitor` | job lifecycle, audit, notifications | server console |

**Async jobs** (`jobs/jobQueue.js`, `jobs/jobHandlers.js`): `POST /api/jobs` returns **202 Accepted** with a
`Location` header; background workers (`JOB_CONCURRENCY`, default 2) run the job. Failures retry with
exponential backoff (400 ms, 800 ms, ...) up to `JOB_MAX_ATTEMPTS` (default 3), then move to the **Dead Letter Queue**.
Job types: `export_csv`, `task_report`, `simulate_failure`.

**Real-time push**: the browser opens a Server-Sent Events stream. `EventSource` cannot send headers, so it first
exchanges its JWT for a single-use 30-second ticket (`POST /api/events/ticket`), keeping the JWT out of URLs and `logs.csv`.
Users only receive their own events; admins and managers receive all.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/events/ticket` | Issue a one-time SSE ticket |
| GET | `/api/events/stream?ticket=` | SSE stream of domain events |
| GET | `/api/events/history` | Recent events visible to the caller |
| GET | `/api/events/stats` | Telemetry, topic bindings, queue + notification stats |
| POST | `/api/jobs` | Enqueue a job → `202 Accepted` |
| GET | `/api/jobs` · `/api/jobs/:id` | List / poll jobs |
| GET | `/api/jobs/:id/download` | Download a finished CSV export |
| GET | `/api/jobs/dlq` | Dead Letter Queue |

Run the end-to-end demo (server must be running): `node scripts/demo-events.js`

---

## 13. Containerization with Docker & Docker Compose (Practical 11)

The whole stack runs from the repo root with one command:

```bash
docker compose up -d --build
```

| Service | Image | Host port | Notes |
|---|---|---|---|
| `mongodb` | `mongo:7.0` | 27018 | Data in the `mongo-data` named volume; `mongosh ping` healthcheck |
| `backend` | `awdf-task-manager-api:1.0` (`task-manager-api/Dockerfile`) | 5000 | `node:22-alpine`, `npm ci --omit=dev`, runs as `node` (non-root), `GET /health` healthcheck, graceful SIGTERM shutdown |
| `frontend` | `awdf-student-portfolio-web:1.0` (`Student_Portfolio/Dockerfile`) | 8080 | Multi-stage: Vite build on Node, then only `dist/` served by `nginx:1.27-alpine` (74 MB) |

- **Startup order** uses healthcheck-gated `depends_on`: backend waits for a healthy MongoDB, frontend waits for a healthy backend.
- **One origin:** Nginx proxies `/backend/*` to `http://backend:5000/*` over the Compose network (SSE unbuffered), so the browser only talks to `:8080` and needs no CORS. The frontend is built with `VITE_API_URL=/backend`.
- **Network isolation:** `backend-net` (mongodb + backend) and `frontend-net` (backend + frontend); the frontend container cannot reach the database.
- **Secrets** (`JWT_SECRET`) come from `task-manager-api/.env` via `env_file` and are never copied into an image (`.dockerignore`).

Verify the running stack (20 checks): `bash task-manager-api/scripts/docker-smoke-test.sh`
