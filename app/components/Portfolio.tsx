"use client";
import { useState, useEffect } from "react";

type Holding = {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  buyPrice: number;
  buyDate: string;
};

type PriceMap = Record<string, { price: number; name: string; change: number }>;

const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString("ja-JP");
const fmtPct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<PriceMap>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [sym, setSym] = useState("");
  const [name, setName] = useState("");
  const [shares, setShares] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kabunavi_portfolio");
      if (saved) setHoldings(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("kabunavi_portfolio", JSON.stringify(holdings));
    } catch {}
    if (holdings.length === 0) return;
    const symbols = [...new Set(holdings.map((h) => h.symbol))];
    setLoadingPrices(true);
    fetch("/api/portfolio-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
    })
      .then((r) => r.json())
      .then(setPrices)
      .catch(console.error)
      .finally(() => setLoadingPrices(false));
  }, [holdings]);

  function addHolding(e: React.FormEvent) {
    e.preventDefault();
    const symbol = /^\d{4}$/.test(sym.trim()) ? `${sym.trim()}.T` : sym.trim().toUpperCase();
    setHoldings((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        symbol,
        name: name.trim() || symbol,
        shares: parseInt(shares),
        buyPrice: parseFloat(buyPrice),
        buyDate,
      },
    ]);
    setShowForm(false);
    setSym(""); setName(""); setShares(""); setBuyPrice("");
    setBuyDate(new Date().toISOString().slice(0, 10));
  }

  const totalCost = holdings.reduce((s, h) => s + h.buyPrice * h.shares, 0);
  const totalValue = holdings.reduce((s, h) => {
    const p = prices[h.symbol]?.price;
    return s + (p && p > 0 ? p : h.buyPrice) * h.shares;
  }, 0);
  const totalPnl = totalValue - totalCost;
  const totalPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  if (holdings.length === 0 && !showForm) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <h3>保有株を登録しよう</h3>
        <p>購入した株を登録すると、<br />損益をリアルタイムで確認できます</p>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          ＋ 保有株を追加する
        </button>
      </div>
    );
  }

  return (
    <div className="portfolio-view">
      {holdings.length > 0 && (
        <div className={`portfolio-summary card ${totalPnl >= 0 ? "summary-gain" : "summary-loss"}`}>
          <div className="summary-label">ポートフォリオ全体</div>
          <div className="summary-value">¥{fmt(totalValue)}</div>
          <div className="summary-rows">
            <div className="sum-row">
              <span>投資額</span>
              <span>¥{fmt(totalCost)}</span>
            </div>
            <div className="sum-row pnl-row">
              <span>損益</span>
              <span className={totalPnl >= 0 ? "positive" : "negative"}>
                {totalPnl >= 0 ? "+" : "-"}¥{fmt(totalPnl)}
                <span className="pnl-pct">（{fmtPct(totalPct)}）</span>
              </span>
            </div>
          </div>
          {loadingPrices && <div className="price-updating">株価を更新中...</div>}
        </div>
      )}

      {holdings.map((h) => {
        const cp = prices[h.symbol]?.price;
        const cur = cp && cp > 0 ? cp : h.buyPrice;
        const val = cur * h.shares;
        const cost = h.buyPrice * h.shares;
        const pnl = val - cost;
        const pct = (pnl / cost) * 100;
        const ch = prices[h.symbol]?.change ?? 0;

        return (
          <div key={h.id} className="holding-card card">
            <div className="holding-top">
              <div className="holding-info">
                <div className="holding-name">{h.name}</div>
                <div className="holding-meta">{h.symbol} · {h.shares}株</div>
              </div>
              <div className="holding-price-block">
                <div className="holding-cur">¥{fmt(cur)}</div>
                <div className={`holding-ch ${ch >= 0 ? "up" : "down"}`}>
                  {ch >= 0 ? "▲" : "▼"}{Math.abs(ch).toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="holding-bottom">
              <span className="holding-val">評価額 ¥{fmt(val)}</span>
              <span className={`holding-pnl ${pnl >= 0 ? "positive" : "negative"}`}>
                {pnl >= 0 ? "+" : "-"}¥{fmt(pnl)}（{fmtPct(pct)}）
              </span>
            </div>
            <button
              className="btn-remove"
              onClick={() => setHoldings((prev) => prev.filter((x) => x.id !== h.id))}
            >
              削除
            </button>
          </div>
        );
      })}

      {showForm ? (
        <div className="add-form card">
          <h3>保有株を追加</h3>
          <form onSubmit={addHolding}>
            <div className="form-group">
              <label className="form-label">銘柄コード</label>
              <input
                className="form-input"
                placeholder="例: 7203（トヨタ）"
                value={sym}
                onChange={(e) => setSym(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">銘柄名（任意）</label>
              <input
                className="form-input"
                placeholder="例: トヨタ自動車"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">保有株数</label>
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
            </div>
            <div className="form-group">
              <label className="form-label">購入日</label>
              <input
                className="form-input"
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                required
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>キャンセル</button>
              <button type="submit" className="btn-primary">追加する</button>
            </div>
          </form>
        </div>
      ) : (
        <button className="btn-add-holding" onClick={() => setShowForm(true)}>
          ＋ 保有株を追加する
        </button>
      )}
    </div>
  );
}
