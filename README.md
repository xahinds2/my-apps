# My Apps

A personal software suite — a growing collection of minimal, full-stack apps built for everyday life. Each app is independently deployable, shares a common auth and database layer, and supports cross-user sharing.

Live at: [xahinds2.vercel.app](https://xahinds2.vercel.app)

---

## Apps

| App | Status | Description |
|-----|--------|-------------|
| **Manifest** | Live | Wishlist tracker — save items with store links, priorities, budgets and timelines |
| **Finance** | Live | Monthly budget planner — set income, allocate by category across 12 months |
| **Flex Cards** | Soon | Credit card manager — track benefits, limits and cashback rewards |
| **Healthify** | Soon | Health tracker — upload blood reports and monitor markers over time |
| **Travel** | Soon | Trip planner — save destinations and organise itineraries |

---

## Tech stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15 (App Router) | File-based routing, React Server Components, Turbopack |
| Language | TypeScript 5 | Strict mode throughout |
| Styling | Tailwind CSS v4 | Dark mode via `next-themes` |
| Auth | Clerk | JWT-based sessions; graceful guest-mode fallback |
| Database | MongoDB + Mongoose | Singleton connection pattern for serverless |
| Icons | Lucide React | |
| Analytics | Vercel Analytics | |
| Package manager | pnpm | |
| Deployment | Vercel | |

---

## System design

### Architecture

```
Browser
  └── Next.js (Vercel Edge / Node runtime)
        ├── App Router pages  (/manifest, /finance, …)
        ├── API Routes        (/api/*)
        └── Middleware        (auth guard + rate limiter)
              └── MongoDB (Atlas)
```

- **Rendering**: Client components for interactive UIs; API routes for all data mutations — no server actions.
- **Serverless-safe DB**: `src/lib/db.ts` caches the Mongoose connection on the Node.js global object to survive hot reloads and avoid connection exhaustion across invocations.
- **Edge middleware**: Clerk's `clerkMiddleware` runs at the edge for fast auth checks before any compute hits the origin.

### Auth & access control

- **Clerk** handles sign-up, sign-in and session tokens (JWTs).
- `src/lib/authHelper.ts` wraps `auth()` from Clerk and applies a fallback chain for environments without Clerk configured:
  1. Valid Clerk session → `userId` from JWT
  2. `X-Guest-Id` header (UUID) → scoped guest session
  3. Default → `demo-user` (local dev only)
- Protected routes (`/manifest/**`, `/finance/**`) are guarded in middleware via `auth.protect()` before the request reaches any page or API handler.

### Rate limiting

In-memory sliding-window rate limiter (`src/lib/rateLimit.ts`) applied in middleware to all `/api/*` routes:

| Operation | Limit |
|-----------|-------|
| Reads (GET) | 100 req / min per IP |
| Writes (POST, PUT, PATCH, DELETE) | 20 req / min per IP |

Responses include standard `X-RateLimit-*` and `Retry-After` headers.

### Sharing system

Two-tier sharing model supporting both simple toggles and fine-grained token-based access:

**Tier 1 — AppShare** (`src/features/common/models/AppShare.ts`)
- App-level sharing: one record per `{owner, appname}`
- Supports public toggle and an allowlist of `viewableUsers`
- Used by the Manifest share modal

**Tier 2 — ShareAccess** (`src/features/common/models/ShareAccess.ts`)
- Resource-level sharing with three visibility levels: `private` · `restricted` · `public`
- Public shares use a cryptographic token: 24 random bytes → base64url string; SHA-256 hash stored in DB
- Supports optional expiry (`expiresAt`) and instant revocation (`revokedAt`)
- `src/lib/shareEngine.ts` provides token creation/hashing, expiry checks, resource fetching and public URL building

### Data model conventions

Every feature model follows the same shape:
- `userId: string` — owner, always indexed
- Embedded sub-documents preferred over separate collections for simple 1-to-many (e.g. budget categories → items)
- `createdAt` / `updatedAt` via Mongoose timestamps
- `{ userId, year }` compound unique index on BudgetPlan to prevent duplicate plans

### Feature folder structure

Each app is self-contained under `src/features/<app>/`:

```
src/
├── app/
│   ├── page.tsx                  # Landing hub
│   ├── manifest/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # List view
│   │   ├── [id]/page.tsx         # Detail / edit view
│   │   └── shared/page.tsx       # Shared-with-me view
│   ├── finance/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── api/
│       ├── manifest/             # CRUD + sync
│       ├── budget-plan/          # CRUD + migration
│       ├── share/                # AppShare get/upsert
│       ├── shares/               # ShareAccess list, public token, incoming
│       ├── insurance/
│       └── milestones/
├── components/
│   ├── ManifestCard.tsx          # Shared card + exported types/helpers
│   ├── AuthButton.tsx
│   ├── ThemeToggle.tsx
│   └── Footer.tsx
├── features/
│   ├── manifest/models/ManifestItem.ts
│   ├── finance/models/
│   │   ├── BudgetPlan.ts
│   │   ├── UserInsurance.ts
│   │   └── UserMilestones.ts
│   └── common/models/
│       ├── AppShare.ts
│       └── ShareAccess.ts
└── lib/
    ├── db.ts                     # MongoDB singleton (serverless-safe)
    ├── authHelper.ts             # Auth with guest-mode fallback
    ├── rateLimit.ts              # In-memory sliding-window limiter
    └── shareEngine.ts            # Token crypto + share resolution
```

---

## Local setup

```bash
cp .env.sample .env.local
# Fill in MONGODB_URI, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
pnpm install
pnpm dev
```

Built as a hobby · always evolving.
