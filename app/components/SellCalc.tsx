"use client";
import { useState } from "react";

const TAX = 0.20315;

export default function SellCalc() {
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [shares, setShares] = useState("");
  const [commission, setCommission] = useState("");

  type Result = {
    saleTotal: number;
    costTotal: number;
    grossProfit: number;
    tax: number;
    net: number;
    roi: number;
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
    const tax = grossProfit > 0 ? grossProfit * TAX : 0;
    const net = grossProfit - tax;
    const roi = costTotal > 0 ? (net / costTotal) * 100 : 0;
    setResult({ saleTotal, costTotal, grossProfit, tax, net, roi });
  }

  const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString("ja-JP");
  const sign = (n: number) => (n >= 0 ? "+" : "-");

  return (
    <div className="sell-calc-view">
      <div className="calc-hero">
        <div className="wizard-emoji">💰</div>
        <h2>売却シミュレーター</h2>
        <p>売ったらいくら手元に残るか<br />税金も含めて計算できます</p>
      </div>

      <form onSubmit={calc} className="calc-form card">
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">購入単価（円）</label>
            <input
              className="form-input"
              type="number"
              placeholder="3000"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              required
              min="1"
            />
          </div>
          <div className="form-group">
            <label className="form-label">売却単価（円）</label>
            <input
              className="form-input"
              type="number"
              placeholder="3500"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              required
              min="1"
            />
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">株数</label>
            <input
              className="form-input"
              type="number"
              placeholder="100"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              required
              min="1"
            />
          </div>
          <div className="form-group">
            <label className="form-label">手数料合計（円）</label>
            <input
              className="form-input"
              type="number"
              placeholder="0"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              min="0"
            />
          </div>
        </div>
        <button type="submit" className="btn-primary btn-lg">計算する</button>
      </form>

      {result && (
        <div className={`calc-result card ${result.net >= 0 ? "result-gain" : "result-loss"}`}>
          <h3>計算結果</h3>
          <div className="result-rows">
            <div className="result-row">
              <span>売却代金</span>
              <span>¥{fmt(result.saleTotal)}</span>
            </div>
            <div className="result-row">
              <span>購入コスト</span>
              <span>¥{fmt(result.costTotal)}</span>
            </div>
            <div className="result-divider" />
            <div className="result-row">
              <span>税引前の利益</span>
              <span className={result.grossProfit >= 0 ? "positive" : "negative"}>
                {sign(result.grossProfit)}¥{fmt(result.grossProfit)}
              </span>
            </div>
            {result.tax > 0 && (
              <div className="result-row tax-line">
                <span>税金（20.315%）</span>
                <span className="tax-val">-¥{fmt(result.tax)}</span>
              </div>
            )}
            <div className="result-divider" />
            <div className="result-row result-net">
              <span>手取り利益</span>
              <span className={`net-val ${result.net >= 0 ? "positive" : "negative"}`}>
                {sign(result.net)}¥{fmt(result.net)}
              </span>
            </div>
            <div className="result-row">
              <span>投資利回り</span>
              <span className={result.roi >= 0 ? "positive" : "negative"}>
                {result.roi >= 0 ? "+" : ""}{result.roi.toFixed(2)}%
              </span>
            </div>
          </div>
          <p className="tax-note">
            ※ 株式譲渡益課税：所得税15% ＋ 住民税5% ＋ 復興特別所得税0.315% = 合計20.315%
          </p>
        </div>
      )}

      <div className="calc-examples card">
        <h4>計算例</h4>
        <p className="example-text">
          例：トヨタ株を 3,000円で100株（30万円）購入し、3,500円で売却した場合<br />
          売却代金 350,000円 − 取得コスト 300,000円 = 利益 50,000円<br />
          税金 50,000 × 20.315% = 10,157円<br />
          <strong>手取り 39,843円</strong>
        </p>
      </div>
    </div>
  );
}
