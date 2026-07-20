# Wish App — DB Schema

MongoDB (Mongoose). Two collections, loosely coupled: a Wish is linked to
products by SEARCH QUERY at read time, not by a stored foreign key.

Source of truth: `src/features/wish/models/`.

---

## `wish`  —  the user's need (first-class, durable)
Model: `models/Wish.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | String | required, indexed |
| text | String | required, trimmed — the wish text |
| createdAt | Date | default now |
| priceSnapshot | Object | latest computed price (denormalized for list render) |
| priceSnapshot.latestPrice | Number | |
| priceSnapshot.latestStore | String | |
| priceSnapshot.currency | String | default `INR` |
| priceSnapshot.productCount | Number | matches found at last check |
| priceSnapshot.checkedAt | Date | |
| priceHistory[] | Array | DEPRECATED — superseded by `wish.pricePoint`; kept until snapshot route + UI migrate off it |
| priceHistory[].price | Number | required |
| priceHistory[].store | String | required |
| priceHistory[].date | Date | default now |

Indexes: `{ userId: 1, createdAt: -1 }` — sorted list render (newest-first) without an in-memory sort

---

## `wish.product`  —  scraped catalog (disposable evidence, refreshed daily)
Model: `models/Product.ts` · schemaVersion 1

Identity / upsert key: `{ store, storeProductId }` (unique).

| Group | Field | Type | Notes |
|-------|-------|------|-------|
| identity | store | Enum | amazon \| flipkart \| myntra \| nykaa \| croma |
| identity | storeProductId | String | required |
| identity | url | String | required — PDP link |
| display | title | String | required, trimmed |
| display | brand | String | optional |
| display | image | String | optional |
| pricing | price | Number | flat, optional |
| pricing | mrp | Number | optional |
| pricing | discountPct | Number | optional |
| pricing | currency | String | default `INR` |
| pricing | availability | Enum | in_stock \| out_of_stock \| unknown (default unknown) |
| social | rating | Number | optional |
| social | reviews | Number | optional |
| search | searchText | String | DERIVED server-side from title |
| search | titleTokens | [String] | DERIVED server-side (AND-match) |
| provenance | source.query | String | page search context |
| provenance | source.pageUrl | String | |
| provenance | source.scrapedAt | Date | |
| compat | fieldsMissing | [String] | soft fields that failed to parse |
| compat | schemaVersion | Number | default 1 |
| compat | raw | Mixed | stash for unknown/newer client shapes |
| freshness | firstSeenAt | Date | default now |
| freshness | lastSeenAt | Date | default now — drives TTL |
| time | createdAt / updatedAt | Date | timestamps |

Indexes:
- `{ store, storeProductId }` unique — upsert key
- `{ titleTokens: 1 }` — AND-match ($all)
- `{ searchText: "text" }` — phrase search
- `{ store, updatedAt: -1 }` — per-store facet + recency sort
- `{ store, price: 1 }` — cheapest-in-store
- `{ brand: 1 }`
- `{ lastSeenAt: 1 }` TTL — expires after 6 hours (STALE_HOURS). Catalog is refreshed every 3h; the 6h buffer keeps products alive if a refresh run is late or fails, so reads never hit an empty catalog. Stale scrapes self-clean.

Derived search fields (`productQuery.ts` `deriveSearch()`): searchText =
lowercased/normalized title; titleTokens = words ≥2 chars, stop-words removed,
deduped. Never trusted from the client.


---

## `wish.pricePoint`  —  price history (time-series, the tracking asset)
Model: `models/PricePoint.ts`

MongoDB **time-series** collection. ONE point per wish per 3-hour refresh
window (append-only). Replaces the capped embedded `priceHistory[]` so tracking, insights, and
future price alerts scale without the 16MB doc ceiling.

- timeField: `date`
- metaField: `meta` (`{ wishId, userId }`)
- granularity: `hours`
- TTL: expires after ~2 years (bounded, room for year-over-year insights)

| Group | Field | Type | Notes |
|-------|-------|------|-------|
| time | date | Date | required — start of the 3-hour window the price was captured |
| meta | meta.wishId | ObjectId | ref Wish, required |
| meta | meta.userId | String | required |
| price | lowestPrice | Number | required — cheapest matching product that day |
| price | lowestStore | String | required |
| price | currency | String | default `INR` |
| price | productCount | Number | matches found that day |
| price | perStore[] | Array | optional `{ store, price }` breakdown |

Note: time-series collections do not support unique indexes; one-point-per-window
is enforced at the app layer (upsert by wishId + 3-hour window bucket).
Retention TTL: ~2 years (history is kept; only the catalog expires at 3h).
