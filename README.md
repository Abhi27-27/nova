# NOVA — Team Productivity Platform

**Plan. Collaborate. Deliver.**

A full-stack project management application: workspaces, projects, a drag-and-drop
Kanban board, task collaboration, role-based access control and delivery analytics.

Built for the Full Stack Development Intern assignment, covering the complete
stack — **Frontend → Backend → API → Database → Authentication → Deployment**.

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [Architecture](#architecture)
- [API](#api)
- [Data model](#data-model)
- [Testing](#testing)
- [Deployment](#deployment)
- [Scripts](#scripts)

---

## What it does

| Area | Capability |
| --- | --- |
| **Workspaces** | Multi-tenant. Create workspaces, switch between them, invite members by email, transfer ownership. Every query is scoped to the caller's workspace. |
| **Projects** | Create with an auto-derived key (`Apollo Web Platform` → `APL`), colour, status, dates and a member list. Live rollup of progress, in-flight and overdue work. |
| **Tasks** | Title, description, status, priority, assignee, labels, due date, estimate. Human-readable references (`APL-42`). Full-text search plus filtering by project, status, priority, assignee and label. |
| **Kanban board** | Five columns, drag-and-drop between and within them, optimistic updates with rollback. Ordering uses fractional indexes so two people can rearrange the same board at once. |
| **Collaboration** | Threaded comments per task, in-app notifications for assignments, status changes and replies, and a complete workspace audit trail. |
| **Analytics** | Completion rate, created-vs-completed throughput over time, status and priority breakdowns, per-member workload, upcoming deadlines — all from one aggregated endpoint. |
| **Auth** | Email + password with bcrypt, JWT access tokens and rotating refresh tokens in httpOnly cookies, replay detection, per-account rate limiting. |
| **RBAC** | Workspace roles (`OWNER > ADMIN > MEMBER`) and project roles (`LEAD > MEMBER > VIEWER`), enforced server-side on every request. |
| **UX** | Light/dark/system themes, command palette (`Ctrl/Cmd+K`), skeleton loading, empty and error states, toasts, responsive down to phone width, keyboard accessible. |

---

## Tech stack

**Frontend** — Next.js 15 (App Router) · React 19 · TypeScript (strict) ·
Tailwind CSS v4 · TanStack Query v5 · dnd-kit · Recharts · React Hook Form + Zod ·
lucide-react · next-themes · sonner

**Backend** — Node.js 22 · Express 5 · TypeScript (strict, ESM) · Prisma 6 ·
PostgreSQL 16 · Zod · jsonwebtoken · bcryptjs · Helmet · pino · Swagger UI

**Tooling** — npm workspaces monorepo · Vitest + Supertest · Prettier · GitHub Actions

---

## Repository layout

```
nova/
├── apps/
│   ├── api/                       # Express REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Data model — the source of truth for the DB
│   │   │   └── seed.ts            # Rich, deterministic demo data
│   │   ├── src/
│   │   │   ├── config/            # Env validation, logger
│   │   │   ├── lib/               # Prisma client, errors, crypto, tokens, route kernel
│   │   │   ├── middleware/        # auth, workspace context, RBAC, errors, rate limiting
│   │   │   ├── modules/           # One folder per domain
│   │   │   │   ├── auth/          # *.routes → *.controller → *.service → *.mapper
│   │   │   │   ├── users/
│   │   │   │   ├── workspaces/
│   │   │   │   ├── projects/      # includes project.access.ts — the authorization gate
│   │   │   │   ├── tasks/         # includes task.position.ts — fractional indexing
│   │   │   │   ├── comments/
│   │   │   │   ├── labels/
│   │   │   │   ├── activity/
│   │   │   │   ├── notifications/
│   │   │   │   └── analytics/
│   │   │   ├── docs/openapi.ts    # Hand-written OpenAPI 3.1 document
│   │   │   ├── routes.ts          # Router assembly + the middleware order
│   │   │   ├── app.ts             # Express app (testable without a port)
│   │   │   └── server.ts          # Process entry, graceful shutdown
│   │   └── tests/                 # Vitest — 42 tests, no database required
│   │
│   └── web/                       # Next.js client
│       └── src/
│           ├── app/               # Routes (App Router)
│           │   ├── page.tsx           # Landing page
│           │   ├── (auth)/            # Sign in / sign up
│           │   ├── app/               # Authenticated shell + screens
│           │   └── invite/[token]/    # Invitation acceptance
│           ├── components/
│           │   ├── ui/            # Design-system primitives
│           │   ├── layout/        # Sidebar, topbar, command palette, switchers
│           │   ├── dashboard/     # Stat cards, charts, workload, activity feed
│           │   ├── projects/      # Project card, forms, members
│           │   └── tasks/         # Board, cards, detail, comments, forms
│           ├── hooks/
│           └── lib/               # API client, typed endpoints, query keys, formatting
│
├── packages/
│   └── shared/                    # Contracts shared by API and web
│       └── src/
│           ├── constants/         # Enums — mirrored exactly by schema.prisma
│           ├── schemas/           # Zod schemas — used to validate on BOTH sides
│           ├── types/             # DTOs and the response envelope
│           └── utils/             # Pure helpers (slugify, key derivation, …)
│
├── docker-compose.yml             # Local PostgreSQL
├── render.yaml                    # API + database blueprint
├── vercel.json                    # Web app build config
└── DEPLOYMENT.md                  # Step-by-step deployment guide
```

---

## Quick start

**Prerequisites:** Node.js 20+ and a PostgreSQL database.

```bash
# 1. Install everything (npm workspaces links the packages together)
npm install

# 2. Start PostgreSQL
docker compose up -d
#    No Docker? Create a free database at neon.tech or supabase.com instead.

# 3. Configure the API
cp apps/api/.env.example apps/api/.env
#    The default DATABASE_URL already matches docker-compose.
#    Using a hosted database? Paste its connection string into DATABASE_URL.
#    Generate real secrets with:
#      node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Configure the web app
cp apps/web/.env.example apps/web/.env.local

# 5. Create the schema and load demo data
npm run build:shared
npm run db:migrate
npm run db:seed

# 6. Run both apps
npm run dev
```

| | |
| --- | --- |
| Web app | http://localhost:3000 |
| API | http://localhost:4000 |
| API reference (Swagger UI) | http://localhost:4000/docs |
| OpenAPI document | http://localhost:4000/api/v1/openapi.json |
| Health check | http://localhost:4000/api/v1/health |

---

## Demo accounts

`npm run db:seed` creates the **Nova Labs** workspace — 6 people, 4 projects,
50+ tasks spread realistically across every column, comments, notifications and
several weeks of activity history so the dashboard has a genuine shape.

| Email | Role | Password |
| --- | --- | --- |
| `aarav@novalabs.dev` | Owner | `Password123` |
| `meera@novalabs.dev` | Admin | `Password123` |
| `daniel@novalabs.dev` | Member | `Password123` |
| `sofia@novalabs.dev` | Member | `Password123` |
| `kenji@novalabs.dev` | Member | `Password123` |
| `priya@novalabs.dev` | Member | `Password123` |

The sign-in page has one-click buttons to fill these in.

---

## Architecture

### The shared contract package

`@nova/shared` holds the enums, Zod schemas and DTO types. The API validates
requests with those schemas; the web client reuses the *same* schemas for form
validation and imports the same DTO types for its responses. A change to the
contract therefore surfaces as a **compile error on both sides**, not as a runtime
surprise. The Prisma enums mirror `constants/enums.ts` exactly.

### Request pipeline

```
requestId → httpLogger → helmet → cors → json → cookies → rateLimit
   → authenticate()        who is calling?
   → workspaceContext()    which tenant, and are they a member of it?
   → requireWorkspaceRole() / assertProjectAccess()   may they do this?
   → controller (validates input, calls a service)
   → service (business rules, Prisma)
   → mapper (row → DTO, so passwordHash can never leak)
   → errorHandler (the single place a thrown value becomes a response)
```

Only `/health` and `/auth/*` sit outside the authenticated section.

### Multi-tenancy

`Workspace` is the tenant boundary. `workspaceContext` resolves the workspace from
the `X-Workspace-Id` header and verifies membership **once**; every query below it
filters on `req.workspace.id`. A project in another workspace returns `404`, never
`403` — the API does not confirm the existence of resources the caller cannot see.

### Board ordering

Cards carry a floating-point `position`. A drop sends the ids of the two
neighbouring cards, and the server derives the midpoint — so a move rewrites **one
row**, and two people dragging different cards do not clobber each other. When
repeated splits push neighbours closer than `0.0001`, the column is renormalised
onto clean multiples. See `apps/api/src/modules/tasks/task.position.ts` and its
tests.

### Authentication

Access tokens are short-lived JWTs; refresh tokens are opaque random strings stored
only as an HMAC digest, so a database dump cannot be replayed. Refresh **rotates**:
presenting an already-used token is treated as theft and revokes every session for
that user. The web client coalesces concurrent refreshes into one in-flight request,
because a page firing a dozen queries at once would otherwise trip that detection
against itself.

Both tokens live in httpOnly cookies (invisible to JavaScript, so XSS cannot steal
them). The access token is *also* returned in the response body so cURL, Postman and
the Swagger UI can use `Authorization: Bearer`.

---

## API

Base URL `/api/v1`. Every response is enveloped:

```jsonc
// success
{ "success": true, "data": { ... } }

// failure
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields need your attention",
    "details": { "title": ["Enter a task title"] },
    "requestId": "3f9c…"
  }
}
```

`requestId` is echoed in the `X-Request-Id` header and stamped on the matching log
line, so a screenshot of a failure is enough to find what produced it.

<details>
<summary><strong>All endpoints</strong></summary>

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service + database readiness |
| `POST` | `/auth/register` | Create account, workspace and starter labels |
| `POST` | `/auth/login` | Sign in |
| `POST` | `/auth/refresh` | Rotate the session |
| `POST` | `/auth/logout` | Sign out |
| `GET` | `/auth/session` | Current session |
| `PATCH` | `/auth/password` | Change password (revokes other sessions) |
| `GET` | `/auth/invitations/:token` | Preview an invitation without consuming it |
| `POST` | `/auth/invitations/accept` | Accept an invitation |
| `GET`/`PATCH` | `/users/me` | Profile |
| `GET` | `/users` | Workspace directory |
| `GET`/`POST` | `/workspaces` | List / create workspaces |
| `GET`/`PATCH`/`DELETE` | `/workspaces/current` | Current workspace |
| `GET`/`POST` | `/workspaces/current/members` | Members, invite |
| `PATCH`/`DELETE` | `/workspaces/current/members/:id` | Change role, remove |
| `POST` | `/workspaces/current/members/:id/transfer-ownership` | Transfer ownership |
| `GET`/`DELETE` | `/workspaces/current/invitations` | Pending invitations |
| `GET`/`POST` | `/projects` | List (search, filter, sort, paginate) / create |
| `GET`/`PATCH`/`DELETE` | `/projects/:id` | Project detail |
| `GET`/`POST`/`PATCH`/`DELETE` | `/projects/:id/members` | Project membership |
| `GET`/`POST` | `/tasks` | List (9 filters) / create |
| `GET` | `/tasks/board` | Full Kanban board for one project |
| `GET`/`PATCH`/`DELETE` | `/tasks/:id` | Task detail |
| `POST` | `/tasks/:id/move` | Drag-and-drop reposition |
| `GET`/`POST` | `/tasks/:id/comments` | Comments |
| `PATCH`/`DELETE` | `/comments/:id` | Edit / delete a comment |
| `GET`/`POST`/`PATCH`/`DELETE` | `/labels` | Workspace labels |
| `GET` | `/activity` | Audit trail |
| `GET` | `/notifications` | Notifications + unread count |
| `POST` | `/notifications/:id/read`, `/notifications/read-all` | Mark read |
| `GET` | `/analytics/dashboard` | Every dashboard aggregate in one call |

</details>

Interactive documentation with request/response schemas is served at **`/docs`**.

---

## Data model

12 models: `User`, `RefreshToken`, `Workspace`, `WorkspaceMember`, `Invitation`,
`Project`, `ProjectMember`, `Label`, `Task`, `TaskLabel`, `Comment`, `Activity`,
`Notification`.

Notable choices:

- **`Project.taskCounter`** — incremented inside the same transaction that creates a
  task, which is what makes `APL-42` references gap-free and unique under concurrent
  creates.
- **`Task.position`** — `Float`, the fractional index described above.
- **Composite indexes** on the real access patterns: `[projectId, status, position]`
  for boards, `[assigneeId, status]` for "my tasks", `[workspaceId, createdAt]` for
  the activity feed.
- **Cascades** everywhere they belong, so deleting a workspace or project cleans up
  completely; `Task.assignee` is `SetNull` so removing a person does not delete work.

---

## Testing

```bash
npm test
```

42 tests, no database required — they cover the parts where being wrong is
expensive:

- **Fractional board positions** — including the pathological repeated-split case and
  the renormalisation threshold.
- **The shared contract** — email normalisation, the password policy, why sign-in
  deliberately does *not* apply it, cross-field date rules, comma-separated filters,
  page-size caps.
- **The HTTP layer** (through Supertest) — the success envelope, aggregating every
  field error into one 422, malformed JSON becoming a 400, and that an internal
  failure never leaks its message into the response.
- **Security primitives** — password salting, refresh-token digests, tampered JWTs,
  and IPv6 rate-limit keys grouped by `/64` so rotating the host part cannot reset
  the budget.

---

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full walkthrough. In short:

| Piece | Where | How |
| --- | --- | --- |
| Database | Neon / Supabase / Render Postgres | Free tier |
| API | Render | `render.yaml` blueprint — provisions the DB, migrates, starts |
| Web | Vercel | `vercel.json` — set `NEXT_PUBLIC_API_BASE_URL` |

The one thing that catches people out: when the web app and API are on different
domains, the auth cookies are cross-site and need `COOKIE_SECURE=true` and
`COOKIE_SAME_SITE=none` on the API. `DEPLOYMENT.md` also covers the alternative —
proxying `/api/v1/*` through Next.js with `API_PROXY_TARGET` so the cookies stay
first-party.

---

## Scripts

Run from the repository root.

| Script | What it does |
| --- | --- |
| `npm run dev` | API and web together, with colour-coded output |
| `npm run build` | Build all three packages in dependency order |
| `npm test` | API test suite |
| `npm run typecheck` | TypeScript across every workspace |
| `npm run format` | Prettier |
| `npm run db:migrate` | Create/apply a migration |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Load the demo workspace |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Drop, recreate and re-seed |

---

## Licence

MIT.
