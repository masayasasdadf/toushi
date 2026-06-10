"use client";
import { useState } from "react";
import {
  IconAlert,
  IconArrowRight,
  IconBank,
  IconChevronDown,
  IconCompass,
  IconShield,
  IconTrendUp,
  IconWallet,
} from "./icons";

type Suitability = "high" | "mid" | "low";

type Plan = {
  summary: string;
  marketContext?: string;
  feasibility: { verdict: string; requiredAnnualReturn: number; comment: string };
  accountAdvice: {
    recommended: string;
    reason: string;
    comparison: { name: string; suitability: Suitability; point: string }[];
    howToStart: string;
  };
  allocation: { label: string; percent: number; amount: number; why: string }[];
  products: {
    type: "fund" | "stock";
    name: string;
    code: string;
    amount: number;
    shares: number;
    description: string;
    reason: string;
    sellRule: string;
    risk: string;
    currentPrice?: number;
    priceChecked?: boolean;
    priceNote?: string;
    valuation?: { positionPct: number; smaDeviationPct: number; overheated: boolean };
  }[];
  totalInvested: number;
  remainingCash: number;
  monthlyPlan: string;
  simulation: Record<"conservative" | "expected" | "optimistic", { label: string; year1: number; year5: number; year10: number }>;
  failureGuards: string[];
  nextActions: string[];
};

const fmt = (n: number) => Math.round(n).toLocaleString("ja-JP");
const parseAmount = (s: string) => parseInt(s.replace(/[,，\s]/g, "")) || 0;

const SUIT_LABEL: Record<Suitability, string> = { high: "おすすめ", mid: "場合による", low: "今回は不向き" };

export default function PlanWizard() {
  const [budget, setBudget] = useState("");
  const [monthly, setMonthly] = useState("");
  const [target, setTarget] = useState("");
  const [period, setPeriod] = useState("long");
  const [risk, setRisk] = useState("mid");
  const [age, setAge] = useState("30代");
  const [purpose, setPurpose] = useState("grow");
  const [hasEmergencyFund, setHasEmergencyFund] = useState(true);

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const b = parseAmount(budget);
    const t = parseAmount(target);
    const m = parseAmount(monthly);
    if (b <= 0) return setError("予算を入力してください");
    if (t <= b) return setError("目標金額は予算より大きい金額を入力してください");
    setError("");
    setLoading(true);
    setPlan(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: b, monthly: m, target: t, period, risk, age, purpose, hasEmergencyFund }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `エラーが発生しました（HTTP ${res.status}）`);
      setPlan(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="loading-title">プランを作成しています</p>
        <p className="loading-sub">
          最新の市場ニュースを調べ、制度の選択から
          <br />
          商品の組み合わせまで検討しています。1〜2分ほどお待ちください。
        </p>
      </div>
    );
  }

  if (plan) {
    const verdictClass =
      plan.feasibility.verdict === "realistic" ? "tone-ok" : plan.feasibility.verdict === "challenging" ? "tone-warn" : "tone-bad";
    const verdictLabel =
      plan.feasibility.verdict === "realistic" ? "現実的な目標です" : plan.feasibility.verdict === "challenging" ? "やや挑戦的な目標です" : "目標の見直しをおすすめします";

    return (
      <div className="plan-result">
        <section className="plan-hero card">
          <p className="eyebrow">あなたの投資プラン</p>
          <p className="plan-summary-text">{plan.summary}</p>
        </section>

        {plan.marketContext && (
          <section className="card">
            <div className="card-head">
              <IconTrendUp className="card-head-icon" />
              <h3>いまの市場環境</h3>
            </div>
            <p className="body-text">{plan.marketContext}</p>
            <p className="meta-text">最新のニュース・市況をWeb検索で確認したうえで判断しています。</p>
          </section>
        )}

        <section className={`card feasibility-card ${verdictClass}`}>
          <div className="card-head">
            <IconCompass className="card-head-icon" />
            <h3>目標の現実性</h3>
          </div>
          <p className="feasibility-verdict">{verdictLabel}</p>
          <p className="body-text">{plan.feasibility.comment}</p>
          <p className="meta-text">目標達成に必要な年利の目安：約{plan.feasibility.requiredAnnualReturn}%</p>
        </section>

        <section className="card">
          <div className="card-head">
            <IconBank className="card-head-icon" />
            <h3>使うべき制度・口座</h3>
          </div>
          <div className="account-recommend">
            <span className="account-badge">{plan.accountAdvice.recommended}</span>
          </div>
          <p className="body-text">{plan.accountAdvice.reason}</p>
          <div className="account-table">
            {plan.accountAdvice.comparison.map((c) => (
              <div key={c.name} className="account-row">
                <div className="account-row-head">
                  <span className="account-name">{c.name}</span>
                  <span className={`suit-badge suit-${c.suitability}`}>{SUIT_LABEL[c.suitability]}</span>
                </div>
                <p className="account-point">{c.point}</p>
              </div>
            ))}
          </div>
          <div className="howto-block">
            <p className="block-label">始め方</p>
            <p className="body-text">{plan.accountAdvice.howToStart}</p>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <IconWallet className="card-head-icon" />
            <h3>資産の配分</h3>
          </div>
          <div className="alloc-bar">
            {plan.allocation.map((a, i) => (
              <div key={i} className={`alloc-seg alloc-c${i % 4}`} style={{ width: `${a.percent}%` }} />
            ))}
          </div>
          <div className="alloc-list">
            {plan.allocation.map((a, i) => (
              <div key={i} className="alloc-item">
                <span className={`alloc-dot alloc-c${i % 4}`} />
                <div className="alloc-body">
                  <div className="alloc-top">
                    <span className="alloc-label">{a.label}</span>
                    <span className="alloc-amount">
                      {a.percent}% ・ ¥{fmt(a.amount)}
                    </span>
                  </div>
                  <p className="alloc-why">{a.why}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="budget-rows">
            <div className="budget-row">
              <span>初期投資の合計</span>
              <span className="num">¥{fmt(plan.totalInvested)}</span>
            </div>
            <div className="budget-row">
              <span>手元に残す現金</span>
              <span className="num">¥{fmt(plan.remainingCash)}</span>
            </div>
          </div>
          {plan.monthlyPlan && (
            <div className="howto-block">
              <p className="block-label">毎月の積立</p>
              <p className="body-text">{plan.monthlyPlan}</p>
            </div>
          )}
        </section>

        <h3 className="section-heading">具体的な商品</h3>
        {plan.products.map((p, i) => {
          const open = expanded === i;
          return (
            <section key={i} className="card product-card" onClick={() => setExpanded(open ? null : i)}>
              <div className="product-top">
                <div>
                  <span className={`type-badge ${p.type === "fund" ? "type-fund" : "type-stock"}`}>
                    {p.type === "fund" ? "投資信託" : "個別株"}
                  </span>
                  <div className="product-name">{p.name}</div>
                  <div className="product-meta">
                    {p.code && `${p.code} ・ `}
                    {p.shares > 0 ? `${p.shares}株` : "金額指定で購入"}
                    {p.priceChecked && p.currentPrice ? ` ・ 現在値 ¥${fmt(p.currentPrice)}` : ""}
                  </div>
                  {p.priceChecked && <span className="price-verified">リアルタイム株価で計算済み</span>}
                  {p.priceNote && <p className="price-note">{p.priceNote}</p>}
                  {p.valuation?.overheated && (
                    <p className="price-note">
                      この銘柄はいま1年間の高値圏（下から{p.valuation.positionPct}%の位置）にあり、高値掴みになる可能性があります。一度に買わず、数回に分けて買うことをおすすめします。
                    </p>
                  )}
                </div>
                <div className="product-amount num">¥{fmt(p.amount)}</div>
              </div>
              <p className="body-text">{p.description}</p>
              {open && (
                <div className="product-details">
                  <div className="detail-block">
                    <p className="block-label">選んだ理由</p>
                    <p className="body-text">{p.reason}</p>
                  </div>
                  <div className="detail-block">
                    <p className="block-label">売る・見直すタイミング</p>
                    <p className="body-text">{p.sellRule}</p>
                  </div>
                  <div className="detail-block">
                    <p className="block-label">リスク</p>
                    <p className="body-text">{p.risk}</p>
                  </div>
                </div>
              )}
              <div className="expand-toggle">
                <IconChevronDown size={14} className={open ? "rot" : ""} />
                {open ? "閉じる" : "詳しく見る"}
              </div>
            </section>
          );
        })}

        <section className="card">
          <div className="card-head">
            <IconTrendUp className="card-head-icon" />
            <h3>将来シミュレーション</h3>
          </div>
          <div className="sim-table">
            <div className="sim-row sim-head">
              <span>シナリオ</span>
              <span>1年後</span>
              <span>5年後</span>
              <span>10年後</span>
            </div>
            {(["conservative", "expected", "optimistic"] as const).map((k) => (
              <div key={k} className={`sim-row ${k === "expected" ? "sim-em" : ""}`}>
                <span>{plan.simulation[k].label}</span>
                <span className="num">¥{fmt(plan.simulation[k].year1)}</span>
                <span className="num">¥{fmt(plan.simulation[k].year5)}</span>
                <span className="num">¥{fmt(plan.simulation[k].year10)}</span>
              </div>
            ))}
          </div>
          <p className="meta-text">過去の市場実績に基づく概算であり、将来の成果を保証するものではありません。</p>
        </section>

        <section className="card guard-card">
          <div className="card-head">
            <IconShield className="card-head-icon" />
            <h3>大損しないためのルール</h3>
          </div>
          <ol className="guard-list">
            {plan.failureGuards.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ol>
        </section>

        <section className="card">
          <div className="card-head">
            <IconArrowRight className="card-head-icon" />
            <h3>今日からやること</h3>
          </div>
          <ol className="action-list">
            {plan.nextActions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </section>

        <button className="btn-secondary" onClick={() => setPlan(null)}>
          条件を変えてプランを作り直す
        </button>

        <p className="disclaimer-text">
          本プランはAIによる参考情報であり、投資助言ではありません。投資判断はご自身の責任で行ってください。
        </p>
      </div>
    );
  }

  return (
    <div className="wizard">
      <div className="wizard-hero">
        <h2>投資プランをつくる</h2>
        <p>
          いくつかの質問に答えるだけで、NISA・iDeCoなどの制度選びから
          <br />
          具体的な商品の組み合わせまで提案します。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="wizard-form">
        <fieldset className="form-section card">
          <legend className="form-section-title">お金について</legend>
          <div className="form-group">
            <label className="form-label" htmlFor="budget">いま投資に回せる金額</label>
            <div className="input-row">
              <input id="budget" className="form-input" type="text" inputMode="numeric" placeholder="500,000" value={budget} onChange={(e) => setBudget(e.target.value)} required />
              <span className="input-unit">円</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="monthly">毎月積み立てられる金額（任意）</label>
            <div className="input-row">
              <input id="monthly" className="form-input" type="text" inputMode="numeric" placeholder="30,000" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
              <span className="input-unit">円</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="target">最終的に目指す金額</label>
            <div className="input-row">
              <input id="target" className="form-input" type="text" inputMode="numeric" placeholder="1,000,000" value={target} onChange={(e) => setTarget(e.target.value)} required />
              <span className="input-unit">円</span>
            </div>
          </div>
          <div className="form-group">
            <span className="form-label">生活費3〜6ヶ月分の貯金は別にありますか？</span>
            <div className="option-grid cols-2">
              <button type="button" className={`option-btn ${hasEmergencyFund ? "selected" : ""}`} onClick={() => setHasEmergencyFund(true)}>
                <span className="opt-main">ある</span>
              </button>
              <button type="button" className={`option-btn ${!hasEmergencyFund ? "selected" : ""}`} onClick={() => setHasEmergencyFund(false)}>
                <span className="opt-main">ない・わからない</span>
              </button>
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section card">
          <legend className="form-section-title">あなたについて</legend>
          <div className="form-group">
            <span className="form-label">年齢層</span>
            <div className="option-grid cols-3">
              {["20代以下", "30代", "40代", "50代", "60代以上"].map((a) => (
                <button key={a} type="button" className={`option-btn ${age === a ? "selected" : ""}`} onClick={() => setAge(a)}>
                  <span className="opt-main">{a}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <span className="form-label">投資の目的</span>
            <div className="option-grid cols-2">
              {[
                { v: "grow", label: "余裕資金を増やす" },
                { v: "retirement", label: "老後資金づくり" },
                { v: "education", label: "教育・住宅資金" },
                { v: "start", label: "まず始めてみたい" },
              ].map((o) => (
                <button key={o.v} type="button" className={`option-btn ${purpose === o.v ? "selected" : ""}`} onClick={() => setPurpose(o.v)}>
                  <span className="opt-main">{o.label}</span>
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section card">
          <legend className="form-section-title">投資のスタイル</legend>
          <div className="form-group">
            <span className="form-label">投資にかけられる期間</span>
            <div className="option-grid cols-3">
              {[
                { v: "short", label: "短期", sub: "1年以内" },
                { v: "mid", label: "中期", sub: "1〜5年" },
                { v: "long", label: "長期", sub: "5年以上" },
              ].map((o) => (
                <button key={o.v} type="button" className={`option-btn ${period === o.v ? "selected" : ""}`} onClick={() => setPeriod(o.v)}>
                  <span className="opt-main">{o.label}</span>
                  <span className="opt-sub">{o.sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <span className="form-label">値下がりへの耐性</span>
            <div className="option-grid cols-3">
              {[
                { v: "low", label: "安全重視", sub: "元本割れは避けたい" },
                { v: "mid", label: "バランス", sub: "多少の上下はOK" },
                { v: "high", label: "積極派", sub: "大きく狙いたい" },
              ].map((o) => (
                <button key={o.v} type="button" className={`option-btn ${risk === o.v ? "selected" : ""}`} onClick={() => setRisk(o.v)}>
                  <span className="opt-main">{o.label}</span>
                  <span className="opt-sub">{o.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        {error && (
          <div className="error-msg">
            <IconAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="btn-primary btn-lg">
          プランを作成する
        </button>
      </form>
    </div>
  );
}
