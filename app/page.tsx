"use client";
import { useState } from "react";
import PlanWizard from "./components/PlanWizard";
import Portfolio from "./components/Portfolio";
import SellCalc from "./components/SellCalc";
import { IconCalculator, IconChart, IconCompass } from "./components/icons";

type Tab = "plan" | "portfolio" | "sell";

const TABS: { id: Tab; label: string; icon: typeof IconCompass }[] = [
  { id: "plan", label: "プラン", icon: IconCompass },
  { id: "portfolio", label: "保有資産", icon: IconChart },
  { id: "sell", label: "売却計算", icon: IconCalculator },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("plan");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-mark">中</div>
          <div>
            <div className="app-title">中村家投資アプリ</div>
            <div className="app-subtitle">はじめての投資ガイド</div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {tab === "plan" && <PlanWizard />}
        {tab === "portfolio" && <Portfolio />}
        {tab === "sell" && <SellCalc />}
      </main>

      <nav className="bottom-nav" aria-label="メインナビゲーション">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}>
            <Icon size={22} />
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
