"use client";
import { useState } from "react";

type PlanStock = {
  code: string;
  name: string;
  shares: number;
  estimatedPrice: number;
  estimatedCost: number;
  businessDescription: string;
  reason: string;
  expectedReturn: string;
  sellTiming: string;
  risk: string;
};

type Plan = {
  summary: string;
  feasibility: string;
  stocks: PlanStock[];
  totalCost: number;
  remainingCash: number;
  longTermScenario: string;
  shortTermScenario: string;
  beginnerTips: string[];
  warnings: string[];
};

const fmt = (n: number) => Math.round(n).toLocaleString("ja-JP");

export default function PlanWizard() {
  const [budget, setBudget] = useState("");
  const [target, setTarget] = useState("");
  const [period, setPeriod] = useState("mid");
  const [risk, setRisk] = useState("mid");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const b = parseInt(budget.replace(/[,，]/g, ""));
    const t = parseInt(target.replace(/[,，]/g, ""));
    if (!b || !t || b <= 0) {
      setError("予算を正しく入力してください");
      return;
    }
    if (t <= b) {
      setError("目標金額は予算より大きい金額を入力してください");
      return;
    }
    setError("");
    setLoading(true);
    setPlan(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: b, target: t, period, risk }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "error");
      setPlan(data);
    } catch (err) {
      setError((err as Error).message || "プランの生成に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="loading-title">AIがプランを考えています</p>
        <p className="loading-sub">あなたの予算と目標に合った銘柄を選んでいます。<br />30〜60秒ほどかかります。</p>
      </div>
    );
  }

  if (plan) {
    return (
      <div className="plan-result">
        <div className="plan-hero card">
          <div className="plan-hero-label">あなたへの投資プラン</div>
          <p className="plan-summary-text">{plan.summary}</p>
          <p className="plan-feasibility">{plan.feasibility}</p>
        </div>

        <div className="budget-card card">
          <h3>💴 予算の内訳</h3>
          <div className="budget-row">
            <span>投資に使う金額</span>
            <span className="budget-val">¥{fmt(plan.totalCost)}</span>
          </div>
          <div className="budget-row">
            <span>手元に残しておく金額</span>
            <span className="budget-val cash">¥{fmt(plan.remainingCash)}</span>
          </div>
        </div>

        <h3 className="section-title">📈 おすすめ銘柄</h3>
        {plan.stocks.map((s) => {
          const isExpanded = expanded === s.code;
          return (
            <div key={s.code} className="stock-card card" onClick={() => setExpanded(isExpanded ? null : s.code)}>
              <div className="stock-top">
                <div className="stock-info">
                  <div className="stock-name">{s.name}</div>
                  <div className="stock-meta">{s.code}.T · 約¥{fmt(s.estimatedPrice)}</div>
                </div>
                <div className="stock-amount">
                  <div className="stock-cost">¥{fmt(s.estimatedCost)}</div>
                  <div className="stock-shares">{s.shares}株</div>
                </div>
              </div>
              <p className="stock-desc">{s.businessDescription}</p>
              {isExpanded && (
                <div className="stock-details">
                  <div className="detail-block">
                    <div className="detail-label">選んだ理由</div>
                    <p>{s.reason}</p>
                  </div>
                  <div className="detail-block">
                    <div className="detail-label">期待できるリターン</div>
                    <p>{s.expectedReturn}</p>
                  </div>
                  <div className="detail-block sell-block">
                    <div className="detail-label">🔔 売るタイミング</div>
                    <p>{s.sellTiming}</p>
                  </div>
                  <div className="detail-block risk-block">
                    <div className="detail-label">⚠️ リスク</div>
                    <p>{s.risk}</p>
                  </div>
                </div>
              )}
              <div className="expand-toggle">{isExpanded ? "▲ 閉じる" : "▼ 詳しく見る"}</div>
            </div>
          );
        })}

        <h3 className="section-title">📊 投資シナリオ</h3>
        <div className="scenario-card card">
          <div className="scenario">
            <div className="scenario-title">🚀 短期で利益を狙う場合</div>
            <p>{plan.shortTermScenario}</p>
          </div>
          <div className="scenario">
            <div className="scenario-title">🌱 長期でじっくり育てる場合</div>
            <p>{plan.longTermScenario}</p>
          </div>
        </div>

        <div className="tips-card card">
          <h3>💡 初心者へのアドバイス</h3>
          <ul className="tips-list">
            {plan.beginnerTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>

        {plan.warnings.length > 0 && (
          <div className="warnings-card card">
            <h3>⚠️ 重要な注意点</h3>
            <ul className="warnings-list">
              {plan.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <button className="btn-outline" onClick={() => setPlan(null)}>
          別の条件でプランを作り直す
        </button>
      </div>
    );
  }

  return (
    <div className="wizard">
      <div className="wizard-hero">
        <div className="wizard-emoji">🎯</div>
        <h2>投資プランを立てよう</h2>
        <p>予算と目標を入れるだけで、AIが<br />あなたに合った銘柄を提案します</p>
      </div>

      <form onSubmit={handleSubmit} className="wizard-form">
        <div className="form-group">
          <label className="form-label">💴 投資に使える予算はいくらですか？</label>
          <div className="input-row">
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              placeholder="例：500000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
            />
            <span className="input-unit">円</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">🎯 最終的にいくらにしたいですか？</label>
          <div className="input-row">
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              placeholder="例：600000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            />
            <span className="input-unit">円</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">⏰ どのくらいの期間で投資しますか？</label>
          <div className="option-grid">
            {[
              { v: "short", label: "短期", sub: "1年以内" },
              { v: "mid", label: "中期", sub: "1〜3年" },
              { v: "long", label: "長期", sub: "3年以上" },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                className={`option-btn ${period === o.v ? "selected" : ""}`}
                onClick={() => setPeriod(o.v)}
              >
                <span className="opt-main">{o.label}</span>
                <span className="opt-sub">{o.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">💪 リスクはどのくらい取れますか？</label>
          <div className="option-grid">
            {[
              { v: "low", label: "安全重視", sub: "少しずつ確実に" },
              { v: "mid", label: "バランス型", sub: "リスクと利益のバランス" },
              { v: "high", label: "積極投資", sub: "大きなリターンを狙う" },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                className={`option-btn ${risk === o.v ? "selected" : ""}`}
                onClick={() => setRisk(o.v)}
              >
                <span className="opt-main">{o.label}</span>
                <span className="opt-sub">{o.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button type="submit" className="btn-primary btn-lg">
          🤖 AIにプランを作ってもらう
        </button>
      </form>
    </div>
  );
}
