# Task Management REST API (MongoDB + Mongoose)

A production-grade, modular Express.js REST API for task management, backed by **MongoDB** via **Mongoose**, with schema validation and clean architecture.

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
│      Task.js           Mongoose schema + pre-save hook
│
├── routes/
│      taskRoutes.js
│
├── controllers/
│      taskController.js
│
├── middleware/
│      logger.js
│      errorHandler.js   Global error handler (Mongoose-aware)
│      validateJson.js
│      validateObjectId.js
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
npm install
cp .env.example .env    # then edit .env with your own MONGO_URI
npm run dev              # or: node server.js
```

The server starts on `http://localhost:5000` (or your configured `PORT`).

### `.env.example`

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/task-manager
```

### Sample MongoDB Atlas connection string

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/task-manager?retryWrites=true&w=majority
```

> Never commit `.env` — it's already excluded via `.gitignore`. Only `.env.example` (with placeholder values) is committed.

---

## 2. Task Schema (`models/Task.js`)

| Field         | Type     | Rules                                                     |
|---------------|----------|------------------------------------------------------------|
| `title`       | String   | required, trimmed                                          |
| `description` | String   | optional, trimmed                                           |
| `completed`   | Boolean  | default `false`                                             |
| `priority`    | String   | enum: `low`, `medium`, `high` — default `medium`            |
| `createdAt`   | Date     | default `Date.now`                                           |

A `pre('save')` hook trims `title` before persisting.

---

## 3. API Endpoints

| Method | Endpoint | Description | Body | Success | Error |
|--------|----------|--------------|------|---------|-------|
| GET | `/tasks` | Get all tasks | — | `200` | `500` |
| GET | `/tasks/:id` | Get task by ID | — | `200` | `400`, `404`, `500` |
| POST | `/tasks` | Create a task | `{ title, description?, completed?, priority? }` | `201` | `400`, `415`, `500` |
| PUT | `/tasks/:id` | Update a task | any subset of the above fields | `200` | `400`, `404`, `415`, `500` |
| DELETE | `/tasks/:id` | Delete a task | — | `200` | `400`, `404`, `500` |

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
    "title": "Title is required"
  }
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

## 4. Postman Test Cases

Import these as a collection or run manually against `http://localhost:5000`.

1. **Create Task** — `POST /tasks`, body `{ "title": "Write tests", "priority": "high" }` → expect `201`.
2. **Get All Tasks** — `GET /tasks` → expect `200` with `data` array.
3. **Get Task by ID** — `GET /tasks/<id from step 1>` → expect `200`.
4. **Update Task** — `PUT /tasks/<id>`, body `{ "completed": true }` → expect `200`, `completed: true`.
5. **Delete Task** — `DELETE /tasks/<id>` → expect `200`, then re-GET the same id → expect `404`.
6. **Validation Error Case** — `POST /tasks`, body `{}` (no title) → expect `400` with `details.title`.

---

## 5. Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `MongoDB Connection error: connect ECONNREFUSED` | No MongoDB instance running / wrong URI | Start `mongod` locally, or verify Atlas URI + IP allowlist |
| `Validation Error` on POST | Missing required `title` | Include a non-empty `title` in the request body |
| `Invalid task id` (400) | `:id` isn't a valid 24-char hex ObjectId | Use a real ObjectId returned from a previous create/list call |
| `415 Unsupported Media Type` | Missing `Content-Type: application/json` header on POST/PUT | Set the header in your client/Postman request |
| Server exits right after "Connection error" log | `connectDB()` calls `process.exit(1)` on failure by design | Fix `MONGO_URI` in `.env` and restart |

---

## 6. Why This Design

### Why a schema in MongoDB, even though it's schema-less?
MongoDB itself doesn't enforce structure — any document shape can go into a collection. Mongoose schemas add a **contract** at the application layer: they define what fields exist, their types, and their rules (required, enum, default). Without this, malformed or inconsistent documents (missing fields, wrong types, typos in field names) can silently enter the database, causing bugs that are hard to trace later. The schema turns "anything goes" into "only valid tasks get saved," which keeps the codebase predictable as it grows.

### Why is backend validation critical?
Client-side validation (browser forms, frontend JS) can always be bypassed — via direct API calls (Postman, curl), a modified frontend, or a malicious actor. The backend is the last line of defense before data is persisted. Backend validation guarantees data integrity regardless of which client sent the request, and it's also where security-sensitive checks belong, since anything enforced only in the browser is not really enforced at all.

### What happens internally when Mongoose validation fails?
When `.save()` or `.create()` is called, Mongoose runs each field's validators (`required`, `enum`, custom validators, etc.) before touching the database. If any fail, Mongoose immediately rejects the operation with a `ValidationError` — no write happens. That error object contains an `errors` map keyed by field name, each with a `.message` describing the failure. In `middleware/errorHandler.js`, this is caught via `err.name === 'ValidationError'`, and the field-level messages are extracted into a clean `details` object returned to the client as `400 Bad Request`, matching the exact shape requested by the spec.

---

## 7. Middleware Architecture

1. **`logger.js`** — logs timestamp + method + URL for every request.
2. **`validateJson.js`** — enforces `Content-Type: application/json` on POST/PUT.
3. **`validateObjectId.js`** — rejects malformed `:id` params (`400`) before hitting the database.
4. **`notFound.js`** — catch-all for undefined routes (`404`).
5. **`errorHandler.js`** — final middleware; translates Mongoose `ValidationError`/`CastError`/duplicate-key errors and generic exceptions into structured JSON responses.
