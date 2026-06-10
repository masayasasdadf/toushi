"use client";
import { useState, useEffect } from "react";
import { IconChart, IconPlus } from "./icons";

type Holding = {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  buyPrice: number;
  buyDate: string;
};

type Alert = { level: "danger" | "warn" | "good" | "info"; message: string };
type PriceMap = Record<string, { price: number; name: string; change: number; stopLoss?: number; alerts?: Alert[] }>;

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
    setLoadingPrices(true);
    fetch("/api/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holdings: holdings.map((h) => ({ symbol: h.symbol, buyPrice: h.buyPrice })),
      }),
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
    setSym("");
    setName("");
    setShares("");
    setBuyPrice("");
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
        <IconChart size={40} className="empty-icon" />
        <h3>保有資産を記録する</h3>
        <p>
          購入した株を登録すると、いまの評価額と
          <br />
          損益をまとめて確認できます。
        </p>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          保有株を追加する
        </button>
      </div>
    );
  }

  return (
    <div className="portfolio-view">
      {holdings.length > 0 && (
        <section className="card portfolio-summary">
          <p className="eyebrow">資産合計</p>
          <p className="summary-value num">¥{fmt(totalValue)}</p>
          <div className="summary-rows">
            <div className="sum-row">
              <span>投資元本</span>
              <span className="num">¥{fmt(totalCost)}</span>
            </div>
            <div className="sum-row">
              <span>評価損益</span>
              <span className={`num strong ${totalPnl >= 0 ? "positive" : "negative"}`}>
                {totalPnl >= 0 ? "+" : "-"}¥{fmt(totalPnl)}
                <span className="pnl-pct">{fmtPct(totalPct)}</span>
              </span>
            </div>
          </div>
          {loadingPrices && <p className="meta-text">株価と売り時を確認しています…</p>}
        </section>
      )}

      {(() => {
        const all = holdings.flatMap((h) => prices[h.symbol]?.alerts ?? []);
        const danger = all.filter((a) => a.level === "danger").length;
        const warn = all.filter((a) => a.level === "warn").length;
        const good = all.filter((a) => a.level === "good").length;
        if (danger > 0)
          return <div className="portfolio-banner alert-danger">対応が必要な銘柄があります。下の赤い表示を確認してください。</div>;
        if (warn > 0)
          return <div className="portfolio-banner alert-warn">注意して見守りたい銘柄があります。</div>;
        if (good > 0)
          return <div className="portfolio-banner alert-good">利益確定を検討できる銘柄があります。</div>;
        return null;
      })()}

      {holdings.map((h) => {
        const cp = prices[h.symbol]?.price;
        const cur = cp && cp > 0 ? cp : h.buyPrice;
        const val = cur * h.shares;
        const cost = h.buyPrice * h.shares;
        const pnl = val - cost;
        const pct = (pnl / cost) * 100;
        const ch = prices[h.symbol]?.change ?? 0;
        const alerts = prices[h.symbol]?.alerts ?? [];
        const stopLoss = prices[h.symbol]?.stopLoss;

        return (
          <section key={h.id} className="card holding-card">
            <div className="holding-top">
              <div>
                <div className="holding-name">{h.name}</div>
                <div className="holding-meta">
                  {h.symbol} ・ {h.shares}株 ・ 取得 ¥{fmt(h.buyPrice)}
                </div>
              </div>
              <div className="holding-price-block">
                <div className="holding-cur num">¥{fmt(cur)}</div>
                <div className={`holding-ch num ${ch >= 0 ? "positive" : "negative"}`}>
                  前日比 {fmtPct(ch)}
                </div>
              </div>
            </div>
            <div className="holding-bottom">
              <span>評価額 <span className="num">¥{fmt(val)}</span></span>
              <span className={`num strong ${pnl >= 0 ? "positive" : "negative"}`}>
                {pnl >= 0 ? "+" : "-"}¥{fmt(pnl)}（{fmtPct(pct)}）
              </span>
            </div>
            {alerts.map((a, i) => (
              <div key={i} className={`holding-alert alert-${a.level}`}>
                {a.message}
              </div>
            ))}
            {alerts.length === 0 && stopLoss != null && (
              <p className="meta-text">
                損切りの目安：¥{fmt(stopLoss)} を下回ったら売却を検討（現在は問題ありません）
              </p>
            )}
            <button className="btn-remove" onClick={() => setHoldings((prev) => prev.filter((x) => x.id !== h.id))}>
              削除
            </button>
          </section>
        );
      })}

      {showForm ? (
        <section className="card add-form">
          <h3 className="form-section-title">保有株を追加</h3>
          <form onSubmit={addHolding}>
            <div className="form-group">
              <label className="form-label" htmlFor="h-sym">銘柄コード</label>
              <input id="h-sym" className="form-input" placeholder="7203" value={sym} onChange={(e) => setSym(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="h-name">銘柄名（任意）</label>
              <input id="h-name" className="form-input" placeholder="トヨタ自動車" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="h-shares">株数</label>
                <input id="h-shares" className="form-input" type="number" placeholder="100" value={shares} onChange={(e) => setShares(e.target.value)} required min="1" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="h-price">購入単価（円）</label>
                <input id="h-price" className="form-input" type="number" placeholder="3000" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} required min="1" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="h-date">購入日</label>
              <input id="h-date" className="form-input" type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} required />
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                キャンセル
              </button>
              <button type="submit" className="btn-primary">
                追加する
              </button>
            </div>
          </form>
        </section>
      ) : (
        <button className="btn-dashed" onClick={() => setShowForm(true)}>
          <IconPlus size={14} />
          保有株を追加する
        </button>
      )}
    </div>
  );
}
