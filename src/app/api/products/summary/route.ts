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

// GET /api/products/summary?q=<query>
// Cheapest current price, store, product count, and alternatives for a wish query.
// Stateless — does not write to DB. Used for unauthenticated / local-storage users.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q) {
    return NextResponse.json({ error: "Query is required" }, { status: 400, headers: corsHeaders() });
  }

  const db = await connectToDatabase();
  if (!db) {
    return NextResponse.json({ productCount: 0, alternatives: [] }, { headers: corsHeaders() });
  }

  // requireDisplayable so the cheapest match and the productCount reflect only
  // products the UI can actually render (title/price/image/url present) — the
  // same strictness GET /api/products and /meta use for this query.
  const { filter, terms, phrase } = buildSearchFilter(q, { requireDisplayable: true });

  // Apply the same relevance score GET search uses, then drop accessories
  // (negative score, e.g. a "case for iphone" when the query is not itself an
  // accessory) BEFORE picking cheapest — otherwise a cheap case outranks the
  // actual product on price alone.
  const scored: PipelineStage[] = [
    { $match: filter },
    scoreStage(phrase, terms),
    { $match: { score: { $gte: 0 } } },
  ];

  const [cheapestArr, countArr] = await Promise.all([
    Product.aggregate([...scored, { $sort: { price: 1 } }, { $limit: 1 }]),
    Product.aggregate([...scored, { $count: "n" }]),
  ]);

  const cheapest = cheapestArr[0] ?? null;
  const productCount = countArr[0]?.n ?? 0;

  // When few exact matches, broaden to any product containing a single query
  // term. Still require the displayable fields, and still drop accessories, so
  // alternatives render cleanly and stay on-topic.
  let alternatives: { title: string; price: number; store: string; url: string; image: string }[] = [];
  if (productCount < 3 && terms.length > 1) {
    const broader = await Product.aggregate([
      {
        $match: {
          price: { $exists: true, $gt: 0 },
          image: { $exists: true, $ne: "" },
          url: { $exists: true, $regex: "^https?://" },
          titleTokens: { $in: terms },
        },
      },
      scoreStage(phrase, terms),
      { $match: { score: { $gte: 0 } } },
      { $sort: { price: 1 } },
      { $limit: 6 },
    ]);

    alternatives = broader
      .filter((p) => String(p._id) !== String(cheapest?._id))
      .slice(0, 4)
      .map((p) => ({
        title: p.title,
        price: p.price!,
        store: p.store,
        url: p.url,
        image: p.image ?? "",
      }));
  }

  if (!cheapest) {
    return NextResponse.json({ productCount: 0, alternatives }, { headers: corsHeaders() });
  }

  return NextResponse.json(
    {
      latestPrice: cheapest.price,
      latestStore: cheapest.store,
      currency: cheapest.currency ?? "INR",
      productCount,
      alternatives,
    },
    { headers: corsHeaders() }
  );
}
