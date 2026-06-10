"use client";

import { useMemo, useState } from "react";
import type { AnalysisResult } from "@/lib/analyze";

const EXAMPLES = [
  { label: "トヨタ自動車 (7203)", value: "7203" },
  { label: "ソニーG (6758)", value: "6758" },
  { label: "任天堂 (7974)", value: "7974" },
  { label: "Apple (AAPL)", value: "AAPL" },
  { label: "NVIDIA (NVDA)", value: "NVDA" },
];

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // リスク計算機
  const [capital, setCapital] = useState(1000000);
  const [riskPct, setRiskPct] = useState(2);

  async function run(symbol: string) {
    if (!symbol.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAiText(null);
    try {
      const res = await fetch(`/api/analyze?symbol=${encodeURIComponent(symbol.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "エラーが発生しました");
        return;
      }
      setResult(data);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function runAi() {
    if (!result) return;
    setAiLoading(true);
    setAiText(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      setAiText(res.ok ? data.text : `⚠️ ${data.error}`);
    } catch {
      setAiText("⚠️ AI解説の取得に失敗しました");
    } finally {
      setAiLoading(false);
    }
  }

  const verdictClass = useMemo(() => {
    if (!result) return "";
    if (result.verdict.includes("買い")) return "verdict-buy";
    if (result.verdict.includes("売り")) return "verdict-sell";
    return "verdict-hold";
  }, [result]);

  // ポジションサイズ計算
  const positionCalc = useMemo(() => {
    if (!result || result.risk.stopLoss === null) return null;
    const riskAmount = capital * (riskPct / 100);
    const lossPerShare = result.price - result.risk.stopLoss;
    if (lossPerShare <= 0) return null;
    const shares = Math.floor(riskAmount / lossPerShare);
    const isJp = result.symbol.endsWith(".T");
    const unit = isJp ? 100 : 1;
    const adjustedShares = Math.floor(shares / unit) * unit;
    return {
      riskAmount,
      shares: adjustedShares,
      cost: adjustedShares * result.price,
      unit,
    };
  }, [result, capital, riskPct]);

  return (
    <main className="container">
      <header className="header">
        <h1>📈 カブナビ</h1>
        <p>初心者のための株式投資判断サポート — 迷わない・大失敗しないために</p>
      </header>

      <div className="search-box">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(input)}
          placeholder="銘柄コード(例: 7203)またはティッカー(例: AAPL)"
        />
        <button onClick={() => run(input)} disabled={loading}>
          {loading ? "分析中…" : "分析する"}
        </button>
      </div>
      <p className="hint">日本株は4桁の証券コード、米国株はティッカーシンボルを入力してください。</p>

      <div className="examples">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.value}
            onClick={() => {
              setInput(ex.value);
              run(ex.value);
            }}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      {result && (
        <>
          {/* 総合判定 */}
          <div className="card verdict">
            <div className="stock-name">
              {result.name}({result.symbol})
            </div>
            <div className="price">
              {result.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
              <span style={{ fontSize: "1rem" }}>{result.currency}</span>
            </div>
            <div className={result.changePct >= 0 ? "change-up" : "change-down"}>
              前日比 {result.changePct >= 0 ? "+" : ""}
              {result.changePct.toFixed(2)}%
            </div>

            <div className={`verdict-badge ${verdictClass}`}>{result.verdict}</div>
            <div className="confidence">
              シグナルの一致度:{result.confidence}(スコア {result.totalScore > 0 ? "+" : ""}
              {result.totalScore} / ±{result.maxScore})
            </div>

            <div className="score-bar-track">
              <div
                className="score-marker"
                style={{
                  left: `${((result.totalScore + result.maxScore) / (2 * result.maxScore)) * 100}%`,
                }}
              />
            </div>
            <div className="score-labels">
              <span>売り</span>
              <span>中立</span>
              <span>買い</span>
            </div>
          </div>

          {/* チャート */}
          <div className="card">
            <div className="section-title">📊 直近6ヶ月の値動き</div>
            <PriceChart history={result.history} />
            <p className="hint" style={{ marginTop: 8, marginBottom: 0 }}>
              52週レンジ:安値 {result.range52w.low.toLocaleString()} 〜 高値{" "}
              {result.range52w.high.toLocaleString()}(現在は下から{" "}
              {result.range52w.positionPct.toFixed(0)}%の位置)
            </p>
          </div>

          {/* シグナル詳細 */}
          <div className="card">
            <div className="section-title">🔍 判定の根拠({result.signals.length}つの指標)</div>
            {result.signals.map((s) => (
              <div key={s.name} className="signal">
                <div
                  className={`signal-icon ${s.score > 0 ? "pos" : s.score < 0 ? "neg" : "neu"}`}
                >
                  {s.score > 0 ? "+" + s.score : s.score < 0 ? s.score : "0"}
                </div>
                <div>
                  <div className="signal-name">{s.name}</div>
                  <div className="signal-summary">{s.summary}</div>
                  <div className="signal-detail">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* リスク管理 */}
          <div className="card">
            <div className="section-title">🛡️ リスク管理(ここが一番大事)</div>
            <div className="risk-grid">
              <div className="risk-item">
                <div className="label">現在値</div>
                <div className="value">{result.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
              </div>
              <div className="risk-item">
                <div className="label">推奨損切りライン</div>
                <div className="value loss">
                  {result.risk.stopLoss?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? "—"}
                </div>
              </div>
              <div className="risk-item">
                <div className="label">利益目標(損失の2倍)</div>
                <div className="value gain">
                  {result.risk.target?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? "—"}
                </div>
              </div>
            </div>
            <p className="hint" style={{ marginTop: 12 }}>
              損切りラインは値動きの大きさ(ATR)から自動計算しています。
              <strong>買った後に株価がこのラインを下回ったら、理由を問わず売る</strong>
              のが大損を防ぐ鉄則です。
            </p>

            <div className="section-title" style={{ marginTop: 24 }}>
              💰 いくらまで買っていい?(ポジションサイズ計算)
            </div>
            <div className="calc-row">
              <label>
                投資に使える総資金({result.currency})
                <input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                />
              </label>
              <label>
                1回の取引で許容する損失(% / 推奨1〜2%)
                <input
                  type="number"
                  value={riskPct}
                  min={0.5}
                  max={10}
                  step={0.5}
                  onChange={(e) => setRiskPct(Number(e.target.value))}
                />
              </label>
            </div>
            {positionCalc ? (
              positionCalc.shares > 0 ? (
                <div className="calc-result">
                  損切りラインで売った場合の損失を
                  <strong> {positionCalc.riskAmount.toLocaleString()} {result.currency} </strong>
                  以内に抑えるには、
                  <strong> {positionCalc.shares.toLocaleString()}株 </strong>
                  (約 {Math.round(positionCalc.cost).toLocaleString()} {result.currency})までが上限です。
                  {positionCalc.unit === 100 && "(日本株は100株単位で計算)"}
                </div>
              ) : (
                <div className="calc-result">
                  この資金とリスク設定では、最低売買単位(
                  {positionCalc.unit}株)を買うと許容損失を超えてしまいます。
                  <strong>この銘柄は今の資金では見送りましょう。</strong>
                </div>
              )
            ) : (
              <div className="calc-result">損切りラインを計算できないため、購入は推奨できません。</div>
            )}
          </div>

          {/* AI解説 */}
          <div className="card">
            <div className="section-title">🤖 AIによる初心者向け解説</div>
            {!aiText && (
              <button className="ai-button" onClick={runAi} disabled={aiLoading}>
                {aiLoading ? "AIが分析しています…(10秒ほどかかります)" : "AIにわかりやすく解説してもらう"}
              </button>
            )}
            {aiText && <div className="ai-text">{aiText}</div>}
          </div>
        </>
      )}

      <div className="disclaimer">
        <strong>⚠️ 免責事項(必ずお読みください)</strong>
        <br />
        本ツールはテクニカル分析に基づく参考情報を提供するものであり、投資助言ではありません。
        将来の株価を保証するツールは世の中に存在せず、本ツールの判定どおりに売買しても損失が出ることがあります。
        投資判断は必ずご自身の責任で行ってください。余裕資金の範囲で、損切りルールを守って投資しましょう。
      </div>
    </main>
  );
}

function PriceChart({ history }: { history: { date: string; close: number }[] }) {
  if (history.length < 2) return null;
  const w = 800;
  const h = 180;
  const pad = 4;
  const closes = history.map((d) => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const points = history
    .map((d, i) => {
      const x = pad + (i / (history.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (d.close - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = closes[closes.length - 1] >= closes[0];
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={up ? "#16a34a" : "#dc2626"}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
