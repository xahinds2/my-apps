import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Product from "@/features/wish/models/Product";
import { STORE_LIST, buildSearchFilter } from "@/features/wish/productQuery";

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

// GET /api/products/meta?q=<query>
// Per-store counts and total for the given query. Lightweight — no product data.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  await connectToDatabase();

  const { filter } = buildSearchFilter(q);

  const counts = await Promise.all(
    STORE_LIST.map((s) => Product.countDocuments({ ...filter, store: s }))
  );

  const storeCounts = Object.fromEntries(STORE_LIST.map((s, i) => [s, counts[i]]));
  const total = counts.reduce((a, b) => a + b, 0);

  return NextResponse.json({ storeCounts, total }, { headers: corsHeaders() });
}
