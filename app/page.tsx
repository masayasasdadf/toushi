"use client";
import { useState } from "react";
import PlanWizard from "./components/PlanWizard";
import Portfolio from "./components/Portfolio";
import SellCalc from "./components/SellCalc";

type Tab = "plan" | "portfolio" | "sell";

export default function Home() {
  const [tab, setTab] = useState<Tab>("plan");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <span className="app-logo">📈</span>
          <div>
            <div className="app-title">カブナビ</div>
            <div className="app-subtitle">AIが投資をサポート</div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {tab === "plan" && <PlanWizard />}
        {tab === "portfolio" && <Portfolio />}
        {tab === "sell" && <SellCalc />}
      </main>

      <nav className="bottom-nav">
        <button
          className={`nav-tab ${tab === "plan" ? "active" : ""}`}
          onClick={() => setTab("plan")}
        >
          <span className="nav-icon">🎯</span>
          <span className="nav-label">プラン</span>
        </button>
        <button
          className={`nav-tab ${tab === "portfolio" ? "active" : ""}`}
          onClick={() => setTab("portfolio")}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">保有株</span>
        </button>
        <button
          className={`nav-tab ${tab === "sell" ? "active" : ""}`}
          onClick={() => setTab("sell")}
        >
          <span className="nav-icon">💰</span>
          <span className="nav-label">売却計算</span>
        </button>
      </nav>
    </div>
  );
}
