# Wish App — Product API

Routes under `src/app/api/products/`. Companion to [db_schema.md](./db_schema.md).

- **Source of truth:** `src/app/api/products/**` + `src/features/wish/productQuery.ts`
- **Model:** `src/features/wish/models/Product.ts` · schemaVersion 2
- **Tests:** `tests/products_api.sh`
- **Status:** IMPLEMENTED

Every route sends permissive CORS (`Access-Control-Allow-Origin: *`) and answers
`OPTIONS` preflight with 204. All read semantics — tokenization, AND-match,
displayable filter, relevance score, and the cross-store canonical key — live in
`productQuery.ts`, the single source shared by every read route.

---

## `GET /api/products`

Paginated product search. `?q=&page=1&limit=48&store=amazon`

- `q` — free text; tokenized server-side, AND-match on `titleTokens`.
- `store` — optional; one of amazon | flipkart | myntra | nykaa | croma.
- `page` — default 1; non-numeric input (`?page=abc`) falls back to 1, never NaN.
- `limit` — default 48, clamped to 1..200.
- No `store`: fetches `page*limit` per store, round-robin interleaves the full
  set, then slices the page — so one store cannot fill the first page, and pages
  neither overlap nor drop rows. With `store`: single-store path.
- Sort is `score` desc, then `updatedAt` desc, with `_id` as a final tiebreaker
  so equal-scoring rows keep a stable order across page requests.
- Returns `{ data, total, page, limit, hasMore }`. `hasMore` is derived from
  `total`, independent of the interleave.

## `GET /api/products/meta`

`?q=` — lightweight per-store counts for a query. Returns `{ storeCounts, total }`.
No product bodies.

## `GET /api/products/summary`

`?q=` — stateless cheapest-price summary for local-storage / unauthenticated
users. Does not write.

- Requires `q` (400 otherwise).
- Uses the `requireDisplayable` filter — the cheapest match and `productCount`
  reflect only renderable products (title/price/image/url present).
- Applies the same `scoreStage` relevance as GET search and drops accessories
  (negative score — e.g. a "case for X" when the query is not itself an
  accessory) BEFORE picking cheapest, so a cheap case never outranks the real
  product on price alone.
- Returns `{ latestPrice, latestStore, currency, productCount, alternatives[] }`.
- `alternatives` (max 4) fill in when exact matches are sparse (`< 3` and the
  query has more than one term); they require the displayable fields and are
  accessory-filtered too.

## `GET /api/products/compare`

`?key=<canonicalKey>` · `?q=<free text>` — the same real-world product across
stores, cheapest-first. Grouping is by the server-derived `canonicalKey`
(`brand|model|capacity`), so only genuine matches of the SAME variant are
compared — not "any title containing the words".

- `?key=` — primary path; the UI already knows a product's stored key.
- `?q=` — convenience. Does NOT derive a key from the query text (user queries
  omit the brand that titles include, so a derived key would never match a
  stored one). Instead runs the normal relevance search and adopts the
  `canonicalKey` of the best-scoring match, resolving the query to a real key.
- 400 if neither `key` nor `q` is given. An unresolvable `q` → 200 with empty
  offers.
- Returns `{ key, productCount, cheapest, offers[] }` — `productCount` = number
  of stores carrying the product; `offers` = one entry per store, cheapest-first
  (`{ store, price, mrp, currency, title, url, image, availability }`).

## `POST /api/products`

Bulk upsert of scraped products from the extension.

- Accepts `{ products: [...] }` or a single product object.
- Auth: `Authorization: Bearer $SCRAPER_TOKEN` when the env var is set; open in
  dev when it is unset (401 on a wrong/absent header when set).
- Batch cap `MAX_BATCH = 500` → 413 if exceeded (reject, not truncate).
- Body `schemaVersion` > server version → the whole raw item is stashed in `raw`
  so nothing from a newer client shape is lost.
- Invalid JSON body → 400.
- Returns `{ saved, skipped, softMissing }`.

### Upsert semantics (write-path rules)

Key = `{ store, storeProductId }` (unique).

- **Idempotent bulk upsert** — `bulkWrite` of `updateOne + upsert:true`,
  `ordered:false`; re-scraping updates in place, never duplicates.
- **HARD-required** per item: `store` (in enum), `storeProductId`, `url`,
  `title`. Missing any → item skipped (counted in `skipped`).
- **Soft fields** (price, image, brand, rating, reviews, mrp) — absence is
  recorded in `fieldsMissing` and aggregated into `softMissing`, never a reason
  to drop the item.
- **Price coercion** — `toNumber` drops digit-group commas then extracts the
  first number token, so `"Rs. 1,34,900.00" → 134900` and `"₹64,499" → 64499`.
  Stored as a plain `Number` (`13412312`); decimals preserved (`1499.50 → 1499.5`).
  Currency symbols / comma grouping are a display concern only.
- **`searchText` / `titleTokens`** derived server-side (`deriveSearch`) on every
  write; scraper-sent search terms are ignored.
- **`canonicalKey`** derived server-side (`deriveCanonicalKey`) on every write;
  stored only when non-empty so the sparse `{ canonicalKey, price }` index stays
  clean.
- **`lastSeenAt` bumped on every write** (`$set`) — the TTL index (6h) watches
  this, so an actively re-scraped product never expires.
- **`firstSeenAt` set only on insert** via `$setOnInsert`, so a re-scrape never
  resets it.
- **In-batch dedupe** by `store::storeProductId` (last write wins) before
  building ops.
- **Duplicate-key retry** — a concurrent-insert race (code 11000) is retried
  with the same upsert ops (the row now exists, so they resolve to updates); no
  genuinely-new item is dropped.

---

## Cross-store identity (`canonicalKey`)

`deriveCanonicalKey(title, brand)` in `productQuery.ts` collapses the same
product across stores to one key: `brand | sorted-model-tokens | capacity`
(e.g. `apple|17-iphone-pro|256gb`).

- Brand casing normalized; color words dropped; capacity kept IN the key
  (256GB and 128GB are DIFFERENT products); model tokens sorted so word order
  does not matter; marketing / spec-noise tokens stripped.
- Capacity is glued (`"256 gb" → "256gb"`) by the shared `glueCapacity`, applied
  to BOTH titles (`deriveSearch`) and queries (`buildSearchFilter`), so search
  terms and stored tokens agree regardless of spacing.
- Returns `""` when it cannot confidently canonicalize; those rows fall back to
  token search and are excluded from the sparse index.
- Heuristic and phone-tuned today. Other categories (shoes/sizes, laptops/
  RAM+SSD) will need extra spec extractors in `deriveCanonicalKey`.

---

## Tests

`tests/products_api.sh` — curl-based regression, no test framework. Run against
a live server (default `http://localhost:3000`; `BASE=` to override, `TOKEN=` if
`SCRAPER_TOKEN` is set). Seeds a fictional brand ("Zephyrion") so assertions are
deterministic regardless of real catalog contents; teardown deletes by id prefix
when `MONGODB_URI` is exported, else the seed self-expires via the 6h TTL.

```bash
cd /Users/xahinds2/quick-shop      # app must be running on :3000
MONGODB_URI=$(grep '^MONGODB_URI' .env.local | cut -d= -f2- | tr -d '"') bash tests/products_api.sh
```

Covered — 29 assertions, all passing:

- **POST** — bulk save; single (unwrapped) object body; price coercion
  (`"Rs. 1,34,900.00" → 134900`); validation skip (bad store / empty title /
  missing url / non-object); soft-missing tracking; in-batch dedupe
  (last-write-wins); `schemaVersion` > server stashes `raw`; 400 invalid JSON;
  413 oversized batch; re-scrape idempotency (no duplicate, `lastSeenAt` bumped,
  `firstSeenAt` frozen, price updated).
- **GET** — search total; `store=` filter returns only that store; `limit` clamp
  (`9999 → 200`); NaN page guard (`?page=abc → 1`); pagination returns no
  overlapping/dropped ids across pages.
- **GET /meta** — per-store counts.
- **GET /summary** — cheapest excludes accessories (returns the phone, not the
  case); 400 on missing `q`.
- **GET /compare** — `?key=` (5-store group, cheapest-first); `?q=` resolves to
  key and excludes other variants + accessory; 400 on no params.
- **CORS/OPTIONS** — 204 preflight; `Access-Control-Allow-Origin: *` on GET.

Not covered (hard to exercise deterministically):

- **Auth 401** — the script runs in open dev mode; needs `SCRAPER_TOKEN` set
  server-side plus a wrong/absent header to trigger.
- **500 path and the duplicate-key retry branch** — require an induced DB error
  or a concurrent-insert race.

Note: the re-scrape idempotency check runs LAST because it mutates `QTEST-A`'s
price, which the compare assertions depend on.

---

## Known limitations / TODO

- **canonicalKey is heuristic and phone-tuned.** Other categories (shoes/sizes,
  laptops/RAM+SSD) will need extra spec extractors in `deriveCanonicalKey`.
- **Prod CORS:** `Origin: *` on the token-authed POST is fine for dev; tighten
  for production.
- **PricePoint ingestion (open question):** does POST also (re)compute the Wish
  `priceSnapshot` and append a `PricePoint`, or is that a separate refresh step?
  PricePoint is a MongoDB time-series collection and does NOT support `upsert` —
  one-point-per-3h-window must be enforced by query-then-insert / dedupe, not an
  upsert.
