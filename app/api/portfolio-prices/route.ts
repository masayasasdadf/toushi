import { NextRequest, NextResponse } from "next/server";
import { fetchQuotes } from "@/lib/fetchQuotes";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { symbols } = await req.json();
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json({});
  }

  const results: Record<string, { price: number; name: string; change: number }> = {};

  await Promise.all(
    (symbols as string[]).map(async (symbol) => {
      try {
        const q = await fetchQuotes(symbol);
        const closes = q.closes;
        const price = closes[closes.length - 1];
        const prev = closes[closes.length - 2] ?? price;
        const change = prev > 0 ? ((price - prev) / prev) * 100 : 0;
        results[symbol] = { price, name: q.name, change };
      } catch {
        results[symbol] = { price: 0, name: symbol, change: 0 };
      }
    })
  );

  return NextResponse.json(results);
}
