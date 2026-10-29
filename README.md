# Student-Portfolio

This repository contains the Student Portfolio web application built using React and Vite.

## Project Structure

- `Student_Portfolio/`: The main portfolio application directory.
- `task-manager-api/`: Express + MongoDB REST API used by the Tasks page.
- `docker-compose.yml`: Runs MongoDB, the API and the frontend together.

## Deploy (Vercel + Railway)

Frontend on Vercel, backend on Railway, database on MongoDB Atlas. Step-by-step guide: [DEPLOYMENT.md](DEPLOYMENT.md).

## Run with Docker

```bash
docker compose up -d --build
```

Open http://localhost:8080 (frontend). The API is also on http://localhost:5000 and MongoDB on port 27018.
`task-manager-api/.env` must define `JWT_SECRET` (see `task-manager-api/.env.example`).
Stop with `docker compose down` (add `-v` to delete the database volume).
