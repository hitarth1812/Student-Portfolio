# Deployment: Vercel (frontend + backend)

The repository becomes **two Vercel projects**, one per folder:

| Part | Vercel project | Root directory | Config |
|---|---|---|---|
| React portfolio (Vite, static) | e.g. `hitarth-portfolio` | `Student_Portfolio` | `Student_Portfolio/vercel.json` |
| Task Manager API (Express, serverless function) | e.g. `hitarth-task-api` | `task-manager-api` | `task-manager-api/vercel.json` + `api/index.js` |
| Database | MongoDB Atlas | - | `MONGO_URI` |

How the backend runs on Vercel: every request is rewritten to `api/index.js`, which opens the MongoDB
connection once per warm instance, then hands the request to the same Express `app` used locally and in
Docker. `server.js` (with `app.listen`) is not used on Vercel. The static output of the backend project is
`public/` (only a `robots.txt`), so no source file is ever served directly.

The order matters: the backend URL has to exist before the frontend is built, and the frontend URL has to
be added to the backend's CORS allow-list afterwards.

## 1. MongoDB Atlas

1. Create a free cluster and a database user.
2. **Network Access → Add IP Address → `0.0.0.0/0`**. Vercel functions have no fixed outbound IPs.
3. Copy the connection string (Database → Connect → Drivers) and add the database name before the `?`:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/task-manager?retryWrites=true&w=majority`

## 2. Backend project

Dashboard: **Add New → Project** → import the repository → **Root Directory `task-manager-api`** →
Framework Preset *Other* (the rest comes from `vercel.json`) → add the variables below → Deploy.

Variables can also be added from the CLI (inside `task-manager-api/`, once linked with `vercel link`):

```bash
vercel env add MONGO_URI production
vercel env add GEMINI_API_KEY production    # optional; without it the rule-based fallback is used
```

Variables only apply to new builds: push to `main`, or Dashboard → Deployments → latest → ⋯ → **Redeploy**.
Do not run `vercel deploy` from inside the folder: with Root Directory set, Vercel resolves
`task-manager-api/task-manager-api` and fails. Deploys come from GitHub (step 6).

| Variable | Value |
|---|---|
| `MONGO_URI` | Atlas string from step 1 (secret) |
| `JWT_SECRET` | long random string, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (secret) |
| `CORS_ORIGINS` | set in step 4 |
| `GEMINI_API_KEY` | optional (secret) |
| `GEMINI_MODEL` | `gemini-2.5-flash` (default if unset) |

Check `https://<backend>.vercel.app/health` → `{"status":"ok","db":"connected"}`.
If a variable is missing the API answers `500 Server misconfigured: ... not set`; if Atlas is unreachable, `503`.

## 3. Frontend project

Dashboard: **Add New → Project** → same repository → **Root Directory `Student_Portfolio`** →
**Environment Variables**: `VITE_API_URL` = the backend URL from step 2 → Deploy.

(CLI: `vercel env add VITE_API_URL production` inside `Student_Portfolio/`, then push to `main` or Redeploy from the dashboard.)

The build stops with an error if `VITE_API_URL` is missing, so the site can never point at `localhost`.
Changing it later requires a redeploy, because Vite bakes it into the bundle.

## 4. Connect them (CORS)

Backend project → **Settings → Environment Variables** → `CORS_ORIGINS` = the frontend URL(s), comma-separated,
then redeploy the backend:

```
https://hitarth-portfolio.vercel.app,https://hitarth-portfolio-*.vercel.app
```

`*` matches one subdomain label, which covers preview deployments. Any other website is refused by the browser.
When `CORS_ORIGINS` is empty (local dev, Docker) every origin is allowed.

## 5. Smoke test

Open the frontend → register → log in → create a task → try **✨ AI Suggest**.
Refresh on `/tasks` to confirm deep links work (rewrite in `Student_Portfolio/vercel.json`).

## 6. Continuous deployment from GitHub

Both projects are connected to the GitHub repository, each with its own **Root Directory**
(Settings → Build and Deployment). Every push builds both projects:

- a push to **`main`** (the production branch) updates the production URLs;
- a push to any other branch creates **preview** deployments (frontend previews use the Preview `VITE_API_URL`).

If a build fails with *Missing script: "build"* or *No Express entrypoint found*, the Root Directory is not set.

## Serverless limits (what behaves differently from Docker)

Vercel may run several short-lived instances of the API, and they share nothing except MongoDB:

| Feature | On Vercel |
|---|---|
| Auth, tasks, users, roles, AI suggestions | Work normally (state is in MongoDB / the JWT) |
| Response cache, AI rate limit | Per instance, so hit ratios are lower and the limit is approximate |
| Live events (SSE, Practical 10) | Best effort: the stream ticket and event bus are in memory, so a stream only sees events handled by the same instance, and it is cut at the 60 s function limit (the UI reconnects) |
| Background jobs and CSV exports | Best effort: the queue lives in memory and files go to the instance's temp dir, so a job status or download can 404 on another instance |
| `logs.csv`, `logs/events.csv` | Written to the temp dir and discarded; use the Vercel dashboard's **Logs** tab |

For the full real-time and job behaviour, use the Docker Compose stack (`docker compose up`).
