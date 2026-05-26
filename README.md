# FlowState

Personal productivity and project tracker — full-stack scaffold with a FlowState dark theme.

## Stack

| Layer    | Tech |
|----------|------|
| Client   | React, Vite, TypeScript, Tailwind CSS, Recharts, Zustand |
| Server   | Node.js, Express, TypeScript |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Auth     | JWT (email + password, bcrypt-hashed) |

## Repo layout

```
/client   — Vite React app
/server   — Express API + Prisma
```

## Quick start

### Deploy to production

See **[DEPLOY.md](./DEPLOY.md)** for Vercel + Supabase setup.

### 1. Server

```bash
cd server
cp .env.example .env   # Windows: copy .env.example .env
# Add Supabase DATABASE_URL, DIRECT_URL, and JWT_SECRET
npm install
npx prisma migrate deploy
npm run dev
```

API defaults to `http://localhost:4000`. Health check: `GET /api/health`.

Auth routes:

- `POST /api/auth/register` — body: `{ "email": "", "password": "" }` (password ≥ 8 chars)
- `POST /api/auth/login` — same body
- `GET /api/auth/me` — header: `Authorization: Bearer <token>`

Set `JWT_SECRET` in `server/.env` to a long random string before any real use.

### 2. Client

```bash
cd client
npm install
npm run dev
```

The client calls the API at **`http://localhost:4000`** by default (see `client/src/lib/api.ts` and `VITE_API_URL` in `client/.env.example`). Ensure the server allows your dev origin in `CLIENT_ORIGIN` (for example `http://localhost:5173`) for CORS.

### Theme (Tailwind)

Custom colors live in `client/tailwind.config.js` (`background`, `surface`, `surface2`, `accent1`–`accent5`, `text.primary`, `text.muted`, `border`). Example classes: `bg-background`, `text-text-primary`, `border-border`.

## Production build

```bash
cd server && npm run build && npm start
cd client && npm run build && npm run preview
```

Point `CLIENT_ORIGIN` in the server `.env` at your deployed client origin for CORS.
