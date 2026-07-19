# quick-shop

A personal wishlist web app where you write down what you want in plain text, search for real products on demand, shortlist your favourites, and jump straight to Flipkart, Amazon, or any other seller to buy.

---

## What it does

| Step | Feature |
|------|---------|
| 1 | **Sign in** — secure auth via Clerk (Google, email, etc.) |
| 2 | **Add a wish** — free-form text, e.g. *"wireless noise-cancelling headphones under ₹3000"* |
| 3 | **Search products** — click a wish to pull live product results from e-commerce APIs |
| 4 | **Shortlist** — pick the products you like from the results and pin them under that wish |
| 5 | **Keep & review** — shortlisted products stay saved until you remove them |
| 6 | **Buy** — click a shortlisted product to open its listing on Flipkart, Amazon, or the original seller |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org) — App Router, Turbopack |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | [Clerk](https://clerk.com) — with demo-mode fallback |
| Database | MongoDB via [Mongoose](https://mongoosejs.com) |
| Icons | [Lucide React](https://lucide.dev) |
| Package manager | pnpm |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                  # Landing / home
│   ├── dashboard/page.tsx        # Main wishlist dashboard
│   ├── sign-in/[[...sign-in]]/   # Clerk sign-in
│   └── api/
│       ├── wishes/               # CRUD for wishes
│       ├── search/               # Product search proxy
│       └── shortlist/            # Shortlisted products per wish
├── components/                   # UI components
├── lib/
│   ├── db.ts                     # MongoDB connection
│   └── authHelper.ts             # Auth with demo-mode fallback
├── models/                       # Mongoose schemas (Wish, ShortlistItem)
└── middleware.ts                  # Clerk auth middleware
```

---

## Planned data models

### Wish
```ts
{
  userId: string        // from Clerk
  text: string          // raw wish text, e.g. "gaming chair under ₹10000"
  createdAt: Date
}
```

### ShortlistItem
```ts
{
  wishId: string        // linked wish
  userId: string
  title: string         // product name
  image: string         // thumbnail URL
  price: string         // e.g. "₹2,499"
  seller: string        // "amazon" | "flipkart" | ...
  buyUrl: string        // direct product link
  addedAt: Date
}
```

---

## Getting started

### 1. Clone & install

```bash
git clone <your-repo-url>
cd quick-shop
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Clerk — https://clerk.com/dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# MongoDB — https://mongodb.com/atlas (leave blank for no-DB mode)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/quick-shop
```

> **No credentials?** The app runs in demo mode — auth falls back to a `demo-user` session and the DB layer is skipped.

### 3. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

---

## Roadmap

- [ ] Wish CRUD (add, edit, delete)
- [ ] Product search (Flipkart / Amazon affiliate / scraping proxy)
- [ ] Shortlist products under a wish
- [ ] Buy link redirect
- [ ] Wish sharing (public link)
- [ ] Price drop alerts
- [ ] Mobile-responsive UI
