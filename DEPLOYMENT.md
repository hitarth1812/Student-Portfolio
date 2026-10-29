# Deployment: Vercel (frontend) + Railway (backend)

| Part | Platform | Folder | Config file |
|---|---|---|---|
| React portfolio (Vite) | Vercel | `Student_Portfolio/` | `Student_Portfolio/vercel.json` |
| Task Manager API (Express) | Railway | `task-manager-api/` | `task-manager-api/railway.json` + the existing `Dockerfile` |
| Database | MongoDB Atlas | - | `MONGO_URI` |

The order matters: the backend URL has to exist before the frontend is built, and
the frontend URL has to be added to the backend's CORS allow-list afterwards.

## 1. MongoDB Atlas

1. Create a free cluster and a database user.
2. **Network Access → Add IP Address → `0.0.0.0/0`**. Railway's outbound IPs are not fixed (static IPs are a Pro feature), so a narrower list will make the API fail its health check.
3. Copy the connection string (Database → Connect → Drivers), with the database name in it:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/task-manager?retryWrites=true&w=majority`

## 2. Backend on Railway

1. Push this repository to GitHub.
2. Railway → **New Project → Deploy from GitHub repo** → choose the repository.
3. Open the service → **Settings**:
   - **Source → Root Directory**: `/task-manager-api`
   - **Config-as-code → Railway Config File**: `/task-manager-api/railway.json`
     (Railway does not look inside the root directory for this file by itself, so give the full path.)
   - **Source → Branch**: the branch to deploy, normally `main`.

   Railway then builds the production `Dockerfile` (Node 22 Alpine, non-root user) and only switches traffic
   to a new deploy once `GET /health` returns 200, which means MongoDB is connected.
4. **Variables** tab → add (Raw Editor accepts `KEY=value` lines). Secrets stay in Railway, never in git:

   ```
   MONGO_URI=<Atlas string from step 1>
   JWT_SECRET=<long random string>
   JWT_EXPIRES_IN=1h
   CORS_ORIGINS=
   GEMINI_API_KEY=
   GEMINI_MODEL=gemini-2.5-flash
   ```

   Generate `JWT_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   `GEMINI_API_KEY` is optional; without it the AI assistant uses the rule-based fallback.
   Do **not** set `PORT`: Railway injects it and the server already listens on it.
5. **Settings → Networking → Generate Domain**. Note the URL, e.g. `https://task-manager-api-production.up.railway.app`,
   and check `https://<that-url>/health`.

## 3. Frontend on Vercel

1. Vercel → **Add New → Project** → import the same repository.
2. **Root Directory: `Student_Portfolio`**. The framework (Vite), build command and output folder come from `vercel.json`.
3. **Environment Variables**: `VITE_API_URL` = the Railway URL from step 2 (Production and Preview).
   The build stops with an error if this is missing, so a deploy can never point at `localhost`.
4. Deploy and note the URL, e.g. `https://hitarth-portfolio.vercel.app`.

## 4. Connect them (CORS)

On Railway → the service → **Variables** → set `CORS_ORIGINS` to the Vercel URL(s), comma-separated:

```
https://hitarth-portfolio.vercel.app,https://hitarth-portfolio-*.vercel.app
```

`*` matches one subdomain label, which covers Vercel preview deployments. Apply the change; Railway redeploys.
Any other website is refused by the browser. When `CORS_ORIGINS` is empty (local dev, Docker) every origin is allowed.

## 5. Smoke test

Open the Vercel site → register → log in → create a task → try **✨ AI Suggest** → open the live events panel.
Refresh on `/tasks` to confirm deep links work (handled by the rewrite in `vercel.json`).

## Things to know

- **Cost**: Railway gives a one-time trial credit, then needs the Hobby plan. The service runs continuously
  (no cold starts) unless you turn on *Serverless* in the service settings to save credit.
- **Ephemeral disk**: `logs/`, `logs.csv` and job export files under `exports/` live in the container and are lost on
  every redeploy. All real data is in MongoDB Atlas.
- **Changing `VITE_API_URL`** requires a Vercel redeploy, because Vite bakes it into the bundle at build time.
- Pushing to the deployed branch redeploys both services automatically; the GitHub Actions CI pipeline still runs the tests on every push.
