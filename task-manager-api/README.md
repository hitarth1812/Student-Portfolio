# Task Management REST API

A production-grade, highly modular Express.js REST API built following clean architecture and industry best practices.

---

## 📁 Folder Structure

```text
task-manager-api/
│
├── package.json
├── server.js
│
├── routes/
│      taskRoutes.js
│
├── controllers/
│      taskController.js
│
├── middleware/
│      logger.js
│      errorHandler.js
│      validateJson.js
│      validateTaskId.js
│      notFound.js
│
├── data/
│      tasks.js
│
└── README.md
```

---

## ⚙️ Installation & Usage

### 1. Installation

Navigate to the project folder and install dependencies:

```bash
cd task-manager-api
npm install
```

### 2. Run Server

Start the production server:

```bash
node server.js
```

Or start with live reload (Node.js v18+ built-in watch mode):

```bash
npm run dev
```

The server will start listening at: `http://localhost:5000`

---

## 🚀 API Endpoints

| Method | Endpoint | Description | Request Body | Success Status | Error Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/tasks` | Retrieve all tasks | *None* | `200 OK` | `500` |
| **GET** | `/tasks/:id` | Retrieve task by ID | *None* | `200 OK` | `400`, `404`, `500` |
| **POST** | `/tasks` | Create a new task | `{ "title": "String" }` | `201 Created` | `400`, `415`, `500` |
| **PUT** | `/tasks/:id` | Update title and/or completed status | `{ "title"?: "String", "completed"?: boolean }` | `200 OK` | `400`, `404`, `415`, `500` |
| **DELETE**| `/tasks/:id` | Delete task by ID | *None* | `200 OK` | `400`, `404`, `500` |

---

## 📬 Example Requests & Responses

### 1. GET `/tasks`
- **Request**: `GET http://localhost:5000/tasks`
- **Response**: `200 OK`
```json
[
  {
    "id": 1,
    "title": "Learn Node.js",
    "completed": true
  },
  {
    "id": 2,
    "title": "Master Express.js Middleware",
    "completed": false
  }
]
```

### 2. GET `/tasks/:id`
- **Request**: `GET http://localhost:5000/tasks/1`
- **Response**: `200 OK`
```json
{
  "id": 1,
  "title": "Learn Node.js",
  "completed": true
}
```

### 3. POST `/tasks`
- **Header**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "title": "Learn Express"
}
```
- **Response**: `201 Created`
```json
{
  "id": 4,
  "title": "Learn Express",
  "completed": false
}
```

### 4. PUT `/tasks/:id`
- **Header**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "title": "Learn Express & Middleware",
  "completed": true
}
```
- **Response**: `200 OK`
```json
{
  "id": 4,
  "title": "Learn Express & Middleware",
  "completed": true
}
```

### 5. DELETE `/tasks/:id`
- **Request**: `DELETE http://localhost:5000/tasks/4`
- **Response**: `200 OK`
```json
{
  "message": "Task deleted successfully",
  "task": {
    "id": 4,
    "title": "Learn Express & Middleware",
    "completed": true
  }
}
```

---

## 🚦 Status Codes Standard

- `200 OK`: Request succeeded (GET, PUT, DELETE).
- `201 Created`: Resource successfully created (POST).
- `400 Bad Request`: Validation failure (missing title, invalid parameter format).
- `404 Not Found`: Target endpoint or task ID does not exist.
- `415 Unsupported Media Type`: Request missing `Content-Type: application/json` header on POST/PUT.
- `500 Internal Server Error`: Unhandled application error caught by global error middleware.

---

## 🛡️ Middleware Architecture

1. **`logger.js`**: Global logging middleware attached via `app.use(logger)`. Logs ISO timestamp and request method/URL to stdout.
2. **`validateJson.js`**: Route-level middleware attached to POST and PUT endpoints. Validates that incoming payload headers specify `Content-Type: application/json`.
3. **`validateTaskId.js`**: Route-level middleware attached to routes with `:id`. Guarantees parameter is a valid positive integer before invoking controller handlers.
4. **`notFound.js`**: Catch-all 404 middleware positioned after router definitions to intercept undefined HTTP endpoints.
5. **`errorHandler.js`**: Express error-handling middleware (`(err, req, res, next)`). Positioned as the final middleware in `server.js` to catch unhandled application exceptions safely.
