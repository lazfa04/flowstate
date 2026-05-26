# Deploy FlowState (Vercel + Supabase)

FlowState runs as one Vercel project: the React app is static, and `/api/*` is handled by the Express server as a serverless function. **Supabase** provides PostgreSQL (not Supabase Auth — the app still uses its own JWT login).

## 1. Supabase (database)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → Database**.
3. Copy two connection strings (replace `[PASSWORD]` with your DB password):
   - **Transaction pooler** (port **6543**, mode *Transaction*) → `DATABASE_URL`
   - **Session / direct** (port **5432**) → `DIRECT_URL`

Example shape:

```env
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

4. Apply the schema (from your machine, once):

```bash
cd server
cp .env.example .env
# paste DATABASE_URL and DIRECT_URL into .env
npm install
npx prisma migrate deploy
```

## 2. Vercel (app + API)

1. Import the GitHub repo at [vercel.com](https://vercel.com) → **Add New Project**.
2. Leave **Root Directory** as the repo root (where `vercel.json` lives).
3. Framework preset: **Other** (Vercel reads `vercel.json`).
4. Add **Environment variables** (Production + Preview):

| Name | Value |
|------|--------|
| `DATABASE_URL` | Supabase pooler URL (6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct URL (5432) |
| `JWT_SECRET` | Long random string (32+ characters) |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` (your production URL) |

Optional: leave `VITE_API_URL` **unset** on Vercel so the client calls `/api` on the same domain.

5. Deploy. The build runs `prisma migrate deploy`, compiles the API, and builds the client.

## 3. After deploy

- Open `https://your-app.vercel.app/api/health` — should return `{"ok":true,...}`.
- Open the app URL → **Settings** → register / sign in.
- If login fails with CORS, set `CLIENT_ORIGIN` to the exact URL (no trailing slash) and redeploy.

## Windows + OneDrive (`EPERM` on `prisma generate`)

If `npm install` or `prisma generate` fails with **operation not permitted** on `query_engine-windows.dll.node`:

1. **Pause OneDrive** (tray icon → Pause syncing → 2 hours).
2. Close Cursor/terminals running the app.
3. Delete `server\node_modules\.prisma` (folder).
4. Run:

```bash
cd server
npx prisma generate
npx prisma migrate deploy
```

**Better long-term:** move the project out of OneDrive (e.g. `C:\dev\FlowState project`) or exclude `node_modules` from sync.

---

## Local development (with Supabase)

```bash
cd server && cp .env.example .env   # add Supabase URLs + JWT_SECRET
cd server && npm install && npm run dev

cd client && npm install && npm run dev
```

Keep `VITE_API_URL=http://localhost:4000` in `client/.env`.

## Notes

- **SQLite** is no longer used; local and production both use Postgres (Supabase).
- Preview deployments: Vercel sets `VERCEL_URL`; the API allows that origin automatically. Set `CLIENT_ORIGIN` to your production URL for stable CORS on custom domains.
- For a **custom domain**, add it in Vercel and set `CLIENT_ORIGIN` to `https://yourdomain.com`.
