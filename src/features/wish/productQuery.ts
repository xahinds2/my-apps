import Product from "@/features/wish/models/Product";
import type { PipelineStage } from "mongoose";

export const ALLOWED_STORES = new Set(["amazon", "flipkart", "myntra", "nykaa", "croma"]);
export const STORE_LIST = [...ALLOWED_STORES];

// Words that carry no search signal — stripped from tokens so "case FOR iphone"
// does not force a match on "for".
const STOP_WORDS = new Set([
  "with", "for", "the", "from", "new", "pack", "set", "combo",
  "of", "in", "and", "to", "by", "a", "an",
]);

// Colors do not change what product it is (pricing rarely differs by color) —
// dropped from the canonical key so "Blue Titanium" and "Black" of the same
// model/capacity collapse to one key.
const COLOR_WORDS = new Set([
  "black", "white", "blue", "red", "green", "gold", "silver", "grey", "gray",
  "titanium", "purple", "pink", "yellow", "orange", "graphite", "midnight",
  "starlight", "natural", "desert", "teal", "ultramarine", "space", "cosmic",
  "phantom", "lavender", "mint", "cream",
]);

// Marketing / spec-noise tokens that do not identify the product. Stripped from
// the canonical key on top of STOP_WORDS so store-specific title padding does
// not fragment the grouping.
const CANONICAL_STOP = new Set([
  ...STOP_WORDS,
  "smartphone", "mobile", "phone", "cellphone", "edition", "model", "latest",
  "brand", "ram", "rom", "storage", "dual", "sim", "official", "genuine",
  "unlocked", "international",
]);

// Accessory terms. A product whose title contains one of these is penalised in
// ranking UNLESS the query itself asked for it (so "iphone case" still works).
const ACCESSORY_WORDS = [
  "case", "cover", "charger", "cable", "screen protector", "protector",
  "tempered", "glass", "skin", "pouch", "guard", "holder", "stand", "adapter",
];
const ACCESSORY_REGEX = ACCESSORY_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

export function normalizeWhitespace(text: string): string {
  return (text || "").replace(/\s+/g, " ").trim();
}

// Glue "256 gb" -> "256gb" so a spaced title and an unspaced query ("256gb")
// tokenize identically. Applied to BOTH titles (deriveSearch) and queries
// (buildSearchFilter) so search terms and stored tokens always agree on
// capacity. Expects an already-lowercased string.
function glueCapacity(lower: string): string {
  return lower.replace(/(\d+)\s?(gb|tb)\b/g, "$1$2");
}

// Server-side derivation of search fields from a product title. This is the ONLY
// source of search tokens — scraper-sent keywords are ignored.
export function deriveSearch(title: string): { searchText: string; titleTokens: string[] } {
  const searchText = glueCapacity(normalizeWhitespace(title).toLowerCase());
  const tokens = searchText
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
  return { searchText, titleTokens: [...new Set(tokens)] };
}

// Cross-store product identity: brand | sorted-model-tokens | capacity.
// Two listings of the SAME product from different stores collapse to the same
// key despite title formatting, brand casing, color, capacity spacing, and word
// order. Capacity is kept IN the key (strict) so 256GB and 128GB are treated as
// different products. Returns "" when it cannot confidently canonicalize — the
// caller then falls back to token search. Derived server-side, never trusted
// from the client.
export function deriveCanonicalKey(title: string, brandHint?: string): string {
  const norm = normalizeWhitespace(title).toLowerCase();

  // capacity: first "<n> gb|tb" (space optional)
  const cap = norm.match(/(\d+)\s?(gb|tb)\b/);
  const capacity = cap ? `${cap[1]}${cap[2]}` : "";

  // strip capacity substrings so 256 does not survive as a model token
  const rest = norm.replace(/(\d+)\s?(gb|tb)\b/g, " ").replace(/[^a-z0-9\s]/g, " ");
  const tokens = rest.split(/\s+/).filter(Boolean);

  const brand = (brandHint ? normalizeWhitespace(brandHint).toLowerCase() : (tokens[0] || "")).split(/\s+/)[0];

  const model = [...new Set(
    tokens.filter((t) => t !== brand && !COLOR_WORDS.has(t) && !CANONICAL_STOP.has(t))
  )].sort();

  if (!brand || model.length === 0) return "";
  return [brand, model.join("-"), capacity].filter(Boolean).join("|");
}

export interface SearchQueryParts {
  filter: Record<string, unknown>;
  terms: string[];
  phrase: string;
}

// Single source of truth for what "matches a query" means. AND semantics: every
// query term must be present in the product title tokens.
export function buildSearchFilter(
  q: string,
  { requireDisplayable = true }: { requireDisplayable?: boolean } = {}
): SearchQueryParts {
  const phrase = glueCapacity(normalizeWhitespace(q).toLowerCase());
  const terms = phrase.split(/\s+/).filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

  const filter: Record<string, unknown> = requireDisplayable
    ? {
        title: { $exists: true, $ne: "" },
        price: { $exists: true, $gt: 0 },
        image: { $exists: true, $ne: "" },
        url: { $exists: true, $regex: "^https?://" },
      }
    : {};

  if (terms.length) {
    filter.titleTokens = { $all: terms };
  }

  return { filter, terms, phrase };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A relevance-score $addFields stage. Higher = more likely the main subject.
export function scoreStage(phrase: string, terms: string[]): PipelineStage.AddFields {
  const phraseEsc = escapeRegex(phrase);
  const queryHasAccessory = terms.some((t) => ACCESSORY_WORDS.includes(t));

  const additions: Record<string, unknown>[] = [
    { $cond: [{ $eq: ["$searchText", phrase] }, 120, 0] },
    { $cond: [{ $regexMatch: { input: "$searchText", regex: "^" + phraseEsc } }, 80, 0] },
    { $cond: [{ $regexMatch: { input: "$searchText", regex: phraseEsc } }, 40, 0] },
  ];

  if (!queryHasAccessory) {
    additions.push({
      $cond: [{ $regexMatch: { input: "$searchText", regex: ACCESSORY_REGEX } }, -90, 0],
    });
  }

  return { $addFields: { score: { $add: additions } } };
}

export interface SearchResult {
  data: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Shared search entry point used by GET /api/products. Handles both the
// single-store path and the cross-store round-robin interleave.
export async function searchProducts({
  q,
  store,
  page,
  limit,
}: {
  q: string;
  store: string;
  page: number;
  limit: number;
}): Promise<SearchResult> {
  const { filter, terms, phrase } = buildSearchFilter(q);
  const skip = (page - 1) * limit;
  // _id is a deterministic final tiebreaker: without it, ties in (score,
  // updatedAt) order arbitrarily, so two page requests (which fetch different
  // $limit sizes) can return overlapping or dropped rows across pages.
  const sort: PipelineStage.Sort = { $sort: { score: -1, updatedAt: -1, _id: 1 } };

  if (store && ALLOWED_STORES.has(store)) {
    const storeFilter = { ...filter, store };
    const [data, total] = await Promise.all([
      Product.aggregate([
        { $match: storeFilter },
        scoreStage(phrase, terms),
        sort,
        { $skip: skip },
        { $limit: limit },
      ]),
      Product.countDocuments(storeFilter),
    ]);
    return { data, total, page, limit, hasMore: skip + data.length < total };
  }

  // No store filter: interleave stores round-robin so the most recently scraped
  // store does not fill the entire first page. Each store fetches enough rows to
  // cover the whole window up to this page (page*limit), we interleave the full
  // set, then slice the global page. Interleaving before slicing is why per-store
  // skip cannot be used — a fixed per-store skip would drop items whenever stores
  // have uneven counts.
  const need = page * limit;

  const facetStages: Record<string, PipelineStage.FacetPipelineStage[]> = {};
  for (const s of STORE_LIST) {
    facetStages[s] = [
      { $match: { ...filter, store: s } },
      scoreStage(phrase, terms) as PipelineStage.FacetPipelineStage,
      sort as PipelineStage.FacetPipelineStage,
      { $limit: need },
    ];
  }

  const [facetResult, storeCountArr] = await Promise.all([
    Product.aggregate<Record<string, Record<string, unknown>[]>>([{ $facet: facetStages }]),
    Promise.all(STORE_LIST.map((s) => Product.countDocuments({ ...filter, store: s }))),
  ]);

  const total = storeCountArr.reduce((a, b) => a + b, 0);

  const buckets = STORE_LIST.map((s) => facetResult[0]?.[s] ?? []);
  const mixed: Record<string, unknown>[] = [];
  const maxLen = Math.max(...buckets.map((b) => b.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const bucket of buckets) {
      if (i < bucket.length) mixed.push(bucket[i]);
    }
  }

  const data = mixed.slice(skip, skip + limit);
  // total is the source of truth for whether more pages exist — independent of
  // the interleave, so it never under-reports.
  return { data, total, page, limit, hasMore: skip + data.length < total };
}
