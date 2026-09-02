# PrcChat Connect

A real-time chat app built with React + Vite (frontend) and Node/Express + SQLite + Socket.io (backend).

## Architecture
- **Frontend** (`client/`): React + Vite + Tailwind CSS, served on port 5173 (mapped to host port 3000)
- **Backend** (`server/`): Express + better-sqlite3 + Socket.io, served on port 3001
- Vite dev server proxies `/api` and `/socket.io` to the backend, so everything is same-origin from the browser

## Running
```
docker compose -f docker-compose.base44.yml up -d
```
The app is available at http://localhost:3000. First load installs npm deps for both services (~30s).

## Features
- Email/password auth (JWT)
- Real-time group chat via Socket.io
- Profile editing (display name + status message)
- SQLite persistence (stored in a docker volume)

## No external secrets required
All data is local (SQLite in a docker volume). No external API keys needed.
