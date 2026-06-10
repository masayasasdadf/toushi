import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analyze";
import { fetchQuotes } from "@/lib/fetchQuotes";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const symbolRaw = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbolRaw) {
    return NextResponse.json({ error: "銘柄コードを入力してください" }, { status: 400 });
  }

  // 数字4桁のみなら日本株とみなして .T を付ける
  const symbol = /^\d{4}$/.test(symbolRaw) ? `${symbolRaw}.T` : symbolRaw.toUpperCase();

  try {
    const q = await fetchQuotes(symbol);

    if (q.closes.length < 80) {
      return NextResponse.json(
        { error: "データが不足しています(上場直後の銘柄は分析できません)" },
        { status: 422 }
      );
    }

    const analysis = analyze(
      q.symbol,
      q.name,
      q.currency,
      q.timestamps,
      q.opens,
      q.highs,
      q.lows,
      q.closes,
      q.volumes
    );

    return NextResponse.json(analysis);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          "株価データを取得できませんでした。銘柄コードを確認してください(日本株は「7203」のように4桁、米国株は「AAPL」のようにティッカー)。",
      },
      { status: 502 }
    );
  }
}
