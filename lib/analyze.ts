import { sma, rsi, macd, bollinger, atr } from "./indicators";

export type Signal = {
  name: string;
  score: number; // -2(強い売り) 〜 +2(強い買い)
  summary: string; // 初心者向けの一文
  detail: string;
};

export type Verdict =
  | "強い買いシグナル"
  | "買い検討"
  | "様子見"
  | "売り検討・新規購入は見送り"
  | "強い売りシグナル・購入禁止";

export type AnalysisResult = {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  prevClose: number;
  changePct: number;
  verdict: Verdict;
  totalScore: number;
  maxScore: number;
  confidence: "高" | "中" | "低";
  signals: Signal[];
  risk: {
    atr: number | null;
    stopLoss: number | null; // 推奨損切りライン
    target: number | null; // 利益目標(リスクリワード比2:1)
  };
  range52w: { high: number; low: number; positionPct: number };
  history: { date: string; close: number }[];
};

export function analyze(
  symbol: string,
  name: string,
  currency: string,
  timestamps: number[],
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): AnalysisResult {
  const price = closes[closes.length - 1];
  const prevClose = closes[closes.length - 2];
  const signals: Signal[] = [];

  // --- 移動平均(トレンド) ---
  const sma25 = sma(closes, 25);
  const sma75 = sma(closes, 75);
  const s25 = sma25[sma25.length - 1];
  const s75 = sma75[sma75.length - 1];
  const s25prev = sma25[sma25.length - 6];
  if (s25 !== null && s75 !== null) {
    if (price > s25 && s25 > s75) {
      signals.push({
        name: "トレンド(移動平均)",
        score: 2,
        summary: "上昇トレンドです",
        detail: `株価が25日線(${fmt(s25)})と75日線(${fmt(s75)})の両方より上にあり、短期線が長期線の上にあります。教科書的な上昇トレンドの形です。`,
      });
    } else if (price < s25 && s25 < s75) {
      signals.push({
        name: "トレンド(移動平均)",
        score: -2,
        summary: "下降トレンドです",
        detail: `株価が25日線・75日線の両方より下にあります。下落の流れの中で買うのは「落ちてくるナイフを掴む」行為で、初心者が最も損をしやすいパターンです。`,
      });
    } else if (price > s75) {
      signals.push({
        name: "トレンド(移動平均)",
        score: 1,
        summary: "やや上向きです",
        detail: `長期(75日線)では上向きですが、短期では調整中です。`,
      });
    } else {
      signals.push({
        name: "トレンド(移動平均)",
        score: -1,
        summary: "方向感が不明瞭です",
        detail: `移動平均線がもみ合っており、トレンドがはっきりしません。`,
      });
    }
  }

  // 25日線の傾き
  if (s25 !== null && s25prev != null) {
    const slope = ((s25 - s25prev) / s25prev) * 100;
    signals.push({
      name: "勢い(移動平均の傾き)",
      score: slope > 0.5 ? 1 : slope < -0.5 ? -1 : 0,
      summary: slope > 0.5 ? "上昇の勢いがあります" : slope < -0.5 ? "下落の勢いがあります" : "横ばいです",
      detail: `25日移動平均線は直近5日間で${slope >= 0 ? "+" : ""}${slope.toFixed(2)}%変化しています。`,
    });
  }

  // --- RSI(買われすぎ・売られすぎ) ---
  const rsiArr = rsi(closes, 14);
  const r = rsiArr[rsiArr.length - 1];
  if (r !== null) {
    let score = 0;
    let summary = "過熱感はありません";
    let detail = `RSIは${r.toFixed(1)}で中立圏(30〜70)です。`;
    if (r >= 75) {
      score = -2;
      summary = "買われすぎです(高値掴み注意)";
      detail = `RSIが${r.toFixed(1)}と非常に高く、短期的に買われすぎです。ここで買うと高値掴みになるリスクが高い状態です。`;
    } else if (r >= 70) {
      score = -1;
      summary = "やや買われすぎです";
      detail = `RSIが${r.toFixed(1)}で買われすぎ圏に入っています。新規購入は慎重に。`;
    } else if (r <= 25) {
      score = 1;
      summary = "売られすぎです(ただし注意)";
      detail = `RSIが${r.toFixed(1)}と非常に低く売られすぎです。反発の可能性はありますが、下降トレンド中の売られすぎは「まだ下がる」こともあるため、トレンドと合わせて判断してください。`;
    } else if (r <= 30) {
      score = 1;
      summary = "売られすぎ圏です";
      detail = `RSIが${r.toFixed(1)}で売られすぎ圏です。反発を待つ価値があります。`;
    }
    signals.push({ name: "過熱感(RSI)", score, summary, detail });
  }

  // --- MACD ---
  const { macdLine, signalLine, histogram } = macd(closes);
  const h = histogram[histogram.length - 1];
  const hPrev = histogram[histogram.length - 2];
  const m = macdLine[macdLine.length - 1];
  if (h !== null && hPrev !== null && m !== null) {
    let score = 0;
    let summary = "中立です";
    let detail = "MACDに明確なシグナルは出ていません。";
    if (hPrev <= 0 && h > 0) {
      score = 2;
      summary = "買いシグナルが出ました";
      detail = "MACDがシグナル線を下から上に抜けました(ゴールデンクロス)。上昇転換のサインです。";
    } else if (hPrev >= 0 && h < 0) {
      score = -2;
      summary = "売りシグナルが出ました";
      detail = "MACDがシグナル線を上から下に抜けました(デッドクロス)。下落転換のサインです。";
    } else if (h > 0) {
      score = 1;
      summary = "上昇の流れが続いています";
      detail = "MACDがシグナル線の上にあり、買いの勢いが継続中です。";
    } else {
      score = -1;
      summary = "下落の流れが続いています";
      detail = "MACDがシグナル線の下にあり、売りの勢いが継続中です。";
    }
    signals.push({ name: "転換点(MACD)", score, summary, detail });
  }

  // --- ボリンジャーバンド ---
  const bb = bollinger(closes, 20, 2);
  const bu = bb.upper[bb.upper.length - 1];
  const bl = bb.lower[bb.lower.length - 1];
  if (bu !== null && bl !== null) {
    const pos = (price - bl) / (bu - bl); // 0=下限, 1=上限
    let score = 0;
    let summary = "通常の値動きの範囲内です";
    let detail = `株価はボリンジャーバンドの${(pos * 100).toFixed(0)}%の位置にあります。`;
    if (pos > 1) {
      score = -1;
      summary = "急騰しすぎています";
      detail = "株価がボリンジャーバンドの上限を超えています。統計的に行き過ぎた水準で、反落しやすい状態です。";
    } else if (pos < 0) {
      score = 1;
      summary = "急落しすぎています";
      detail = "株価がボリンジャーバンドの下限を割っています。統計的に売られすぎで、反発しやすい状態です。";
    }
    signals.push({ name: "値動きの幅(ボリンジャーバンド)", score, summary, detail });
  }

  // --- 出来高 ---
  const volSma = sma(volumes, 20);
  const v = volumes[volumes.length - 1];
  const vAvg = volSma[volSma.length - 1];
  if (vAvg !== null && vAvg > 0) {
    const ratio = v / vAvg;
    const up = price >= prevClose;
    let score = 0;
    let summary = "出来高は平常です";
    let detail = `直近の出来高は20日平均の${ratio.toFixed(1)}倍です。`;
    if (ratio > 1.8) {
      score = up ? 1 : -1;
      summary = up ? "買いの勢いが強いです" : "売りの勢いが強いです";
      detail = `出来高が平均の${ratio.toFixed(1)}倍に急増しており、${up ? "買い" : "売り"}注文が殺到しています。値動きに信頼性があります。`;
    }
    signals.push({ name: "市場の注目度(出来高)", score, summary, detail });
  }

  // --- 52週レンジ ---
  const lookback = Math.min(252, closes.length);
  const recent = closes.slice(-lookback);
  const high52 = Math.max(...recent);
  const low52 = Math.min(...recent);
  const posPct = ((price - low52) / (high52 - low52)) * 100;

  // --- 総合判定 ---
  const totalScore = signals.reduce((a, s) => a + s.score, 0);
  const maxScore = signals.length * 2;
  const ratio = totalScore / maxScore;

  let verdict: Verdict;
  if (ratio >= 0.5) verdict = "強い買いシグナル";
  else if (ratio >= 0.2) verdict = "買い検討";
  else if (ratio > -0.2) verdict = "様子見";
  else if (ratio > -0.5) verdict = "売り検討・新規購入は見送り";
  else verdict = "強い売りシグナル・購入禁止";

  // シグナルの一致度で信頼度を決める
  const agreement =
    signals.filter((s) => Math.sign(s.score) === Math.sign(totalScore) && s.score !== 0).length /
    signals.length;
  const confidence = agreement >= 0.6 ? "高" : agreement >= 0.4 ? "中" : "低";

  // --- リスク管理(ATRベース) ---
  const atrValue = atr(highs, lows, closes, 14);
  const stopLoss = atrValue !== null ? price - 2 * atrValue : null;
  const target = atrValue !== null ? price + 4 * atrValue : null;

  const history = timestamps.slice(-120).map((t, i) => ({
    date: new Date(t * 1000).toISOString().slice(0, 10),
    close: closes[closes.length - Math.min(120, closes.length) + i],
  }));

  return {
    symbol,
    name,
    currency,
    price,
    prevClose,
    changePct: ((price - prevClose) / prevClose) * 100,
    verdict,
    totalScore,
    maxScore,
    confidence,
    signals,
    risk: { atr: atrValue, stopLoss, target },
    range52w: { high: high52, low: low52, positionPct: posPct },
    history,
  };
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
