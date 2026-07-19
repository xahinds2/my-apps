# my-apps

A personal software suite — a growing collection of minimal apps built for everyday life.

Live at: [xahinds2.vercel.app](https://xahinds2.vercel.app)

---

## Apps

| App | Status | Description |
|-----|--------|-------------|
| **wish me** | Live | Write what you want, search real products, buy from Amazon/Flipkart |
| **flex-card** | Soon | Manage credit cards, track benefits and cashback |
| **healthify** | Soon | Upload blood reports, track health markers over time |
| **finance** | Soon | Monthly income/expense tracker with savings goals |
| **travel** | Soon | Plan trips, save destinations, organise itineraries |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 — App Router, Turbopack |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Clerk (with demo-mode fallback) |
| Database | MongoDB via Mongoose |
| Icons | Lucide React |
| Package manager | pnpm |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx          # Landing hub
│   ├── wish/page.tsx     # wish me app
│   └── api/
│       └── wishes/       # Wishes CRUD
├── components/           # UI components
├── lib/
│   ├── db.ts             # MongoDB connection
│   └── authHelper.ts     # Auth with demo-mode fallback
├── models/               # Mongoose schemas
└── middleware.ts         # Clerk auth middleware
```

---

## Local setup

```bash
cp .env.sample .env.local
# fill in your keys, then:
pnpm install
pnpm dev
```

Built as a hobby · always evolving.
