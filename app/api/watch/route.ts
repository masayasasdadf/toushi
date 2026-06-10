import { NextRequest, NextResponse } from "next/server";
import { fetchQuotes } from "@/lib/fetchQuotes";
import { analyze } from "@/lib/analyze";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Alert = { level: "danger" | "warn" | "good" | "info"; message: string };

export async function POST(req: NextRequest) {
  const { holdings } = (await req.json()) as {
    holdings: { symbol: string; buyPrice: number }[];
  };
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return NextResponse.json({});
  }

  const results: Record<
    string,
    { price: number; name: string; change: number; verdict?: string; stopLoss?: number; alerts: Alert[] }
  > = {};

  await Promise.all(
    holdings.map(async ({ symbol, buyPrice }) => {
      try {
        const q = await fetchQuotes(symbol);
        const closes = q.closes;
        const price = closes[closes.length - 1];
        const prev = closes[closes.length - 2] ?? price;
        const change = prev > 0 ? ((price - prev) / prev) * 100 : 0;

        const alerts: Alert[] = [];
        const pnlPct = buyPrice > 0 ? ((price - buyPrice) / buyPrice) * 100 : 0;

        // 購入価格に対するルールベースの判定（初心者向けの機械的なルール)
        if (pnlPct <= -10) {
          alerts.push({
            level: "danger",
            message: `購入価格から${Math.abs(pnlPct).toFixed(1)}%下落しています。損切りを真剣に検討してください。下がった理由を調べ、回復の根拠がなければ売るのが鉄則です。`,
          });
        } else if (pnlPct <= -5) {
          alerts.push({
            level: "warn",
            message: `購入価格から${Math.abs(pnlPct).toFixed(1)}%下落しています。-10%に達したら損切りする心の準備をしておきましょう。`,
          });
        } else if (pnlPct >= 20) {
          alerts.push({
            level: "good",
            message: `購入価格から${pnlPct.toFixed(1)}%上昇しています。利益確定、または半分だけ売って利益を確保することを検討するタイミングです。`,
          });
        }

        // テクニカル分析による売りシグナルの検出
        let verdict: string | undefined;
        let stopLoss: number | undefined;
        if (closes.length >= 80) {
          try {
            const a = analyze(symbol, q.name, q.currency, q.timestamps, q.opens, q.highs, q.lows, closes, q.volumes);
            verdict = a.verdict;
            stopLoss = a.risk.stopLoss ?? undefined;
            if (a.verdict.includes("売り") && pnlPct > -5) {
              alerts.push({
                level: "warn",
                message: "テクニカル指標が売りサインを示しています。利益が出ているなら一部売却を検討する場面です。",
              });
            }
            if (stopLoss && price < stopLoss) {
              alerts.push({
                level: "danger",
                message: `株価が損切りの目安ライン（¥${Math.round(stopLoss).toLocaleString()}）を下回っています。`,
              });
            }
          } catch {}
        }

        results[symbol] = { price, name: q.name, change, verdict, stopLoss, alerts };
      } catch {
        results[symbol] = { price: 0, name: symbol, change: 0, alerts: [] };
      }
    })
  );

  return NextResponse.json(results);
}
