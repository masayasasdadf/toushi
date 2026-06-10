// 分析エンジンの動作確認用スクリプト(合成データ)
// 実行: node --experimental-strip-types scripts/test-engine.ts
import { analyze } from "../lib/analyze.ts";

function makeSeries(days: number, gen: (i: number) => number) {
  const closes = Array.from({ length: days }, (_, i) => gen(i));
  const ts = closes.map((_, i) => 1700000000 + i * 86400);
  const highs = closes.map((c) => c * 1.01);
  const lows = closes.map((c) => c * 0.99);
  const opens = closes.map((c, i) => (i > 0 ? closes[i - 1] : c));
  const vols = closes.map(() => 1_000_000);
  return { ts, opens, highs, lows, closes, vols };
}

function run(label: string, gen: (i: number) => number) {
  const s = makeSeries(250, gen);
  const r = analyze("TEST.T", label, "JPY", s.ts, s.opens, s.highs, s.lows, s.closes, s.vols);
  console.log(
    `${label}: verdict=${r.verdict} score=${r.totalScore}/${r.maxScore} ` +
      `price=${r.price.toFixed(1)} stop=${r.risk.stopLoss?.toFixed(1)} signals=${r.signals.length}`
  );
  for (const sig of r.signals) console.log(`   [${sig.score >= 0 ? "+" : ""}${sig.score}] ${sig.name}: ${sig.summary}`);
}

// 一貫した上昇トレンド → 買い寄りの判定が出るはず
run("上昇トレンド", (i) => 1000 + i * 5 + Math.sin(i / 7) * 12);
// 一貫した下降トレンド → 売り寄りの判定が出るはず
run("下降トレンド", (i) => 2500 - i * 5 + Math.sin(i / 7) * 12);
// 横ばい → 様子見が出るはず
run("横ばい", (i) => 1500 + Math.sin(i / 11) * 25);
