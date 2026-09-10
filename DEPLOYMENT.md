# Deploying NOVA

Three pieces: a **PostgreSQL database**, the **API** and the **web app**. All three
have a free tier, and the whole thing takes about 15 minutes.

The recommended split is **Neon** (database) + **Render** (API) + **Vercel** (web).

---

## 0. Push the repository to GitHub

```bash
git add -A
git commit -m "NOVA — full-stack project management platform"
git branch -M main
git remote add origin https://github.com/<your-username>/nova.git
git push -u origin main
```

> Nothing in this repository is pushed anywhere until you run these commands.
> `.env` files are git-ignored; only `.env.example` is committed.

---

## 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech) (no card required).
2. Create a project; pick the region closest to where the API will run.
3. Copy the **pooled** connection string. It looks like:

   ```
   postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```

Supabase and Render's own PostgreSQL work identically — any Postgres 14+ is fine.

---

## 2. API — Render

### Option A: the blueprint (recommended)

1. In Render, choose **New → Blueprint** and select your repository.
2. Render reads [`render.yaml`](./render.yaml): it provisions a PostgreSQL
   instance, wires `DATABASE_URL`, generates both JWT secrets, runs
   `prisma migrate deploy` on start and health-checks `/api/v1/health`.
3. Two variables are marked `sync: false` because they depend on the web app's URL.
   Fill them in after step 3:
   - `CORS_ORIGINS` → `https://your-app.vercel.app`
   - `WEB_APP_URL` → `https://your-app.vercel.app`

### Option B: manual web service

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm ci && npm run build:shared && npm run build:api` |
| Start command | `npm run db:deploy --workspace @nova/api && npm run start:api` |
| Health check path | `/api/v1/health` |

Environment variables:

```ini
NODE_ENV=production
DATABASE_URL=<your Postgres connection string>

# Generate each with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_ACCESS_SECRET=<64+ random hex characters>
JWT_REFRESH_SECRET=<a DIFFERENT 64+ random hex characters>

ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d

CORS_ORIGINS=https://your-app.vercel.app
WEB_APP_URL=https://your-app.vercel.app

# Required when the web app is on a different domain — see "Cookies" below.
COOKIE_SECURE=true
COOKIE_SAME_SITE=none

LOG_LEVEL=info
```

The API refuses to boot on an invalid configuration and prints exactly which
variable is wrong, so a typo fails at deploy time rather than on first request.

Verify: `https://nova-api.onrender.com/api/v1/health` should return
`{"success":true,"data":{"status":"ok","database":"connected",…}}`.

---

## 3. Web app — Vercel

1. **Add New → Project**, import the repository.
2. Leave the root directory as the repository root — [`vercel.json`](./vercel.json)
   already sets the monorepo build:

   ```
   Install:  npm ci
   Build:    npm run build:shared && npm run build:web
   Output:   apps/web/.next
   ```

3. Environment variable:

   ```ini
   NEXT_PUBLIC_API_BASE_URL=https://nova-api.onrender.com/api/v1
   ```

4. Deploy, then go back and set `CORS_ORIGINS` and `WEB_APP_URL` on Render to the
   Vercel URL and redeploy the API.

---

## 4. Seed the production database (optional)

To give a reviewer something to look at immediately:

```bash
DATABASE_URL="<your production connection string>" npm run db:seed
```

This creates the Nova Labs demo workspace. It is safe to re-run — it clears and
rebuilds that workspace. **Skip it if the database holds real data.**

---

## Cookies across domains

`nova.vercel.app` and `nova-api.onrender.com` are different *sites*, so the auth
cookies are cross-site. Browsers only send those when they are marked
`Secure; SameSite=None` — hence `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`.

The API validates this pairing at boot and refuses to start with
`SameSite=None` without `Secure`, because that combination silently never
persists a session.

### Alternative: keep the cookies first-party

Some privacy modes (Safari ITP, Brave) block cross-site cookies regardless. To
avoid the issue entirely, proxy the API through the web app so the browser only
ever talks to one origin:

**On Vercel**, set:

```ini
API_PROXY_TARGET=https://nova-api.onrender.com
# and remove NEXT_PUBLIC_API_BASE_URL, or set it to the relative path:
NEXT_PUBLIC_API_BASE_URL=/api/v1
```

`next.config.ts` then rewrites `/api/v1/*` to the API. **On Render**, set
`COOKIE_SECURE=true` and `COOKIE_SAME_SITE=lax` — same-origin again.

Trade-off: every request takes an extra hop through Vercel. Fine for a demo,
and it is the more robust option if you want the deployment to work in every
browser.

---

## Deploying the API elsewhere

The API is a plain Node process with no platform-specific code, so anything that
runs Node 20+ works — Railway, Fly.io, a VPS. The contract is:

```bash
npm ci
npm run build:shared && npm run build:api
npm run db:deploy --workspace @nova/api
npm run start:api            # honours PORT
```

`app.set('trust proxy', 1)` is already configured, which is what makes `req.ip`
and `Secure` cookies correct behind a TLS-terminating proxy.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Sign-in succeeds but you are bounced back to `/login` | Cookies rejected as cross-site | Set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`, or use the proxy approach |
| `Origin … is not allowed by CORS` | `CORS_ORIGINS` does not match | Use the exact scheme + host, no trailing slash. Comma-separate several |
| API exits at boot with a config list | A required variable is missing or invalid | The output names the exact variable and why |
| `/health` returns 503 | Database unreachable | Check `DATABASE_URL`; Neon needs `sslmode=require` |
| First request after idle is slow | Render free tier sleeps | Expected; it wakes in ~30s |
| Web build fails on `@nova/shared` | The shared package was not built first | The build command must run `build:shared` before `build:web` |
