import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Product from "@/features/wish/models/Product";
import { buildSearchFilter, scoreStage } from "@/features/wish/productQuery";
import type { PipelineStage } from "mongoose";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// GET /api/products/compare?key=<canonicalKey>
//     GET /api/products/compare?q=<free text>       (resolves to a key)
//
// Same real-world product across stores, cheapest-first. Grouping is by the
// server-derived canonicalKey (brand|model|capacity), so only genuine matches
// of the SAME variant are compared — not "any title containing the words".
//
// ?key= is the primary path (the UI already knows a product's stored key).
// ?q= is a convenience: we DO NOT derive a key from the query text (user
// queries omit the brand that titles include, so a derived key would never
// match a stored one). Instead we run the normal relevance search and adopt the
// canonicalKey of the best-matching product — resolving the query to a real,
// stored key.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyParam = searchParams.get("key")?.trim() || "";
  const q = searchParams.get("q")?.trim() || "";

  if (!keyParam && !q) {
    return NextResponse.json(
      { error: "A canonical key (?key=) or a query (?q=) is required" },
      { status: 400, headers: corsHeaders() }
    );
  }

  const db = await connectToDatabase();
  if (!db) {
    return NextResponse.json({ key: keyParam, productCount: 0, offers: [] }, { headers: corsHeaders() });
  }

  // Resolve ?q= to a stored canonicalKey via the best-scoring match.
  let key = keyParam;
  if (!key) {
    const { filter, terms, phrase } = buildSearchFilter(q, { requireDisplayable: true });
    (filter as Record<string, unknown>).canonicalKey = { $exists: true, $ne: "" };
    const best = await Product.aggregate([
      { $match: filter },
      scoreStage(phrase, terms) as PipelineStage.AddFields,
      { $sort: { score: -1, price: 1 } },
      { $limit: 1 },
      { $project: { canonicalKey: 1 } },
    ]);
    key = best[0]?.canonicalKey || "";
    if (!key) {
      return NextResponse.json(
        { key: "", query: q, productCount: 0, cheapest: null, offers: [] },
        { headers: corsHeaders() }
      );
    }
  }

  // Displayable-only, priced products for this exact product, cheapest first.
  const filter: Record<string, unknown> = {
    canonicalKey: key,
    price: { $exists: true, $gt: 0 },
    image: { $exists: true, $ne: "" },
    url: { $exists: true, $regex: "^https?://" },
  };

  const matches = await Product.find(filter).sort({ price: 1 }).lean();

  // One offer per store — the cheapest listing at each store for this product.
  const perStore = new Map<string, (typeof matches)[number]>();
  for (const m of matches) {
    if (!perStore.has(m.store)) perStore.set(m.store, m); // matches are price-sorted, first per store is cheapest
  }

  const offers = [...perStore.values()]
    .sort((a, b) => (a.price! - b.price!))
    .map((p) => ({
      store: p.store,
      price: p.price!,
      mrp: p.mrp ?? null,
      currency: p.currency ?? "INR",
      title: p.title,
      url: p.url,
      image: p.image ?? "",
      availability: p.availability,
    }));

  const cheapest = offers[0] ?? null;

  return NextResponse.json(
    {
      key,
      productCount: offers.length,      // number of stores carrying it
      cheapest,
      offers,                           // cheapest-first, one per store
    },
    { headers: corsHeaders() }
  );
}
