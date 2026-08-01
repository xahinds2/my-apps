import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthUser } from '@/lib/authHelper';
import BudgetPlan from '@/features/finance/models/BudgetPlan';

export async function GET(req: Request) {
  try {
    const { userId } = await getAuthUser(req);
    const url = new URL(req.url);
    const yearsParam = url.searchParams.get('years');

    if (!yearsParam) {
      return NextResponse.json({ error: 'years query parameter is required' }, { status: 400 });
    }

    const years = yearsParam
      .split(',')
      .map(y => parseInt(y.trim(), 10))
      .filter(y => !isNaN(y) && y >= 2020 && y <= 2100);

    if (years.length === 0) {
      return NextResponse.json({ error: 'No valid years provided' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const plans = await BudgetPlan.find({ userId, year: { $in: years } }).lean();
    return NextResponse.json({ data: plans });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getAuthUser(req);
    const body = await req.json();
    const { year, categories, incomes } = body;

    if (typeof year !== 'number' || year < 2020 || year > 2100) {
      return NextResponse.json({ error: 'Year must be a number between 2020 and 2100' }, { status: 400 });
    }

    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'categories must be an array' }, { status: 400 });
    }

    if (categories.length > 30) {
      return NextResponse.json({ error: 'Maximum 30 categories allowed' }, { status: 400 });
    }

    const sanitizedCategories = categories.map((cat: Record<string, unknown>) => ({
      id: String(cat.id ?? '').slice(0, 40),
      name: String(cat.name ?? '').trim().slice(0, 80),
      color: ['blue', 'green', 'red', 'purple', 'yellow', 'gray'].includes(String(cat.color))
        ? cat.color
        : 'blue',
      order: typeof cat.order === 'number' ? cat.order : 0,
      items: Array.isArray(cat.items)
        ? (cat.items as Record<string, unknown>[]).slice(0, 60).map(item => ({
            id: String(item.id ?? '').slice(0, 40),
            name: String(item.name ?? '').trim().slice(0, 80),
            order: typeof item.order === 'number' ? item.order : 0,
            amounts: Array.isArray(item.amounts)
              ? item.amounts.slice(0, 12).map(a => (typeof a === 'number' && a >= 0 ? Math.round(a) : 0))
              : Array(12).fill(0),
          }))
        : [],
    }));

    const sanitizedIncomes = Array.isArray(incomes)
      ? incomes.slice(0, 12).map(a => (typeof a === 'number' && a >= 0 ? Math.round(a) : 0))
      : Array(12).fill(0);

    // Pad to 12 if short
    while (sanitizedIncomes.length < 12) sanitizedIncomes.push(0);

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json(
        {
          source: 'mock',
          data: { userId, year, categories: sanitizedCategories, incomes: sanitizedIncomes },
        },
        { status: 200 }
      );
    }

    const plan = await BudgetPlan.findOneAndUpdate(
      { userId, year },
      { $set: { categories: sanitizedCategories, incomes: sanitizedIncomes } },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ data: plan });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
