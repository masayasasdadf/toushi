"use client";
import { useState } from "react";

const TAX = 0.20315;

export default function SellCalc() {
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [shares, setShares] = useState("");
  const [commission, setCommission] = useState("");
  const [isNisa, setIsNisa] = useState(false);

  type Result = {
    saleTotal: number;
    costTotal: number;
    grossProfit: number;
    tax: number;
    net: number;
    roi: number;
    nisa: boolean;
  };
  const [result, setResult] = useState<Result | null>(null);

  function calc(e: React.FormEvent) {
    e.preventDefault();
    const buy = parseFloat(buyPrice);
    const sell = parseFloat(sellPrice);
    const sh = parseInt(shares);
    const comm = parseFloat(commission) || 0;
    const saleTotal = sell * sh;
    const costTotal = buy * sh + comm;
    const grossProfit = saleTotal - costTotal;
    const tax = !isNisa && grossProfit > 0 ? grossProfit * TAX : 0;
    const net = grossProfit - tax;
    const roi = costTotal > 0 ? (net / costTotal) * 100 : 0;
    setResult({ saleTotal, costTotal, grossProfit, tax, net, roi, nisa: isNisa });
  }

  const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString("ja-JP");
  const sign = (n: number) => (n >= 0 ? "+" : "-");

  return (
    <div className="sell-calc-view">
      <div className="wizard-hero">
        <h2>売却シミュレーター</h2>
        <p>
          売ったときの手取りを、税金まで含めて計算します。
          <br />
          NISA口座なら税金はかかりません。
        </p>
      </div>

      <form onSubmit={calc} className="card calc-form">
        <div className="form-group">
          <span className="form-label">どの口座で買いましたか？</span>
          <div className="option-grid cols-2">
            <button type="button" className={`option-btn ${!isNisa ? "selected" : ""}`} onClick={() => setIsNisa(false)}>
              <span className="opt-main">特定・一般口座</span>
              <span className="opt-sub">利益に20.315%課税</span>
            </button>
            <button type="button" className={`option-btn ${isNisa ? "selected" : ""}`} onClick={() => setIsNisa(true)}>
              <span className="opt-main">NISA口座</span>
              <span className="opt-sub">非課税</span>
            </button>
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="c-buy">購入単価（円）</label>
            <input id="c-buy" className="form-input" type="number" placeholder="3000" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} required min="1" step="any" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="c-sell">売却単価（円）</label>
            <input id="c-sell" className="form-input" type="number" placeholder="3500" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} required min="1" step="any" />
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="c-shares">株数</label>
            <input id="c-shares" className="form-input" type="number" placeholder="100" value={shares} onChange={(e) => setShares(e.target.value)} required min="1" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="c-comm">手数料合計（円・任意）</label>
            <input id="c-comm" className="form-input" type="number" placeholder="0" value={commission} onChange={(e) => setCommission(e.target.value)} min="0" />
          </div>
        </div>
        <button type="submit" className="btn-primary btn-lg">
          計算する
        </button>
      </form>

      {result && (
        <section className="card calc-result">
          <h3 className="form-section-title">計算結果</h3>
          <div className="result-rows">
            <div className="result-row">
              <span>売却代金</span>
              <span className="num">¥{fmt(result.saleTotal)}</span>
            </div>
            <div className="result-row">
              <span>取得コスト（手数料込み）</span>
              <span className="num">¥{fmt(result.costTotal)}</span>
            </div>
            <div className="result-row">
              <span>税引前の損益</span>
              <span className={`num ${result.grossProfit >= 0 ? "positive" : "negative"}`}>
                {sign(result.grossProfit)}¥{fmt(result.grossProfit)}
              </span>
            </div>
            <div className="result-row">
              <span>税金{result.nisa ? "（NISAのため非課税）" : "（20.315%）"}</span>
              <span className="num">{result.tax > 0 ? `-¥${fmt(result.tax)}` : "¥0"}</span>
            </div>
            <div className="result-row result-net">
              <span>手取りの損益</span>
              <span className={`num net-val ${result.net >= 0 ? "positive" : "negative"}`}>
                {sign(result.net)}¥{fmt(result.net)}
              </span>
            </div>
            <div className="result-row">
              <span>投資利回り</span>
              <span className={`num ${result.roi >= 0 ? "positive" : "negative"}`}>
                {result.roi >= 0 ? "+" : ""}
                {result.roi.toFixed(2)}%
              </span>
            </div>
          </div>
          <p className="meta-text">
            税率の内訳：所得税15% ＋ 住民税5% ＋ 復興特別所得税0.315% ＝ 20.315%。損失が出た場合、特定口座では確定申告で他の利益と相殺（損益通算）できます。
          </p>
        </section>
      )}
    </div>
  );
}
