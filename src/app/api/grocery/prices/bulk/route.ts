import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StorePriceEntry, { STORES } from '@/features/grocery/models/StorePriceEntry';

interface ScrapedProduct {
  name: string;
  price: number;
  unit?: string;
  productName?: string;
  productUrl?: string;
  imageUrl?: string;
}

export async function POST(req: Request) {
  try {
    const db = await connectToDatabase();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const body = await req.json();
    const store = STORES.includes(body?.store) ? body.store : null;
    if (!store) return NextResponse.json({ error: 'Invalid store' }, { status: 400 });

    const products: ScrapedProduct[] = Array.isArray(body?.products) ? body.products : [];
    if (products.length === 0) return NextResponse.json({ saved: 0 });

    const upserts: Promise<unknown>[] = [];

    for (const product of products) {
      const scrapedName = typeof product.name === 'string' ? product.name.trim() : '';
      if (!scrapedName) continue;

      const productName = product.productName || scrapedName;
      const unit = product.unit ?? '';
      const price = typeof product.price === 'number' ? product.price : null;

      upserts.push(
        StorePriceEntry.findOneAndUpdate(
          { store, productName, unit },
          {
            $set: {
              price,
              unit,
              productName,
              productUrl: product.productUrl ?? undefined,
              imageUrl: product.imageUrl || undefined,
              scrapedAt: new Date(),
            },
          },
          { upsert: true, returnDocument: 'after' }
        )
      );
    }

    await Promise.all(upserts);
    return NextResponse.json({ saved: upserts.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
