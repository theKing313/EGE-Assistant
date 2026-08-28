import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import "./components/AuthModal/AuthModal.css";
import "./components/PremiumModal/PremiumModal.css";
import UserSection from "./popup/sections/UserSection.jsx";
import DashboardSection from "./popup/sections/DashboardSection.jsx";
import StatsSection from "./popup/sections/StatsSection.jsx";
import HistorySection from "./popup/sections/HistorySection.jsx";
import HowItWorksSection from "./popup/sections/HowItWorksSection.jsx";
import PremiumGate from "./popup/sections/PremiumGate.jsx";
import * as storageService from "./services/storageService.js";
import * as subscriptionService from "./services/subscriptionService.js";
import * as studyService from "./services/studyService.js";
import * as authService from "./services/authService.js";

const SUPPORTED = ["reshu.ru", "sdamgia.ru", "fipi.ru"];

export default function App() {
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState("ege");
  const [currentSite, setCurrentSite] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("free");
  const [pricing, setPricing] = useState(null);
  const [view, setView] = useState("home");
  const [dashboard, setDashboard] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState(null);

  const loadPremiumData = useCallback(async (isPremiumUser) => {
    if (!isPremiumUser) {
      setDashboard(null);
      setStats(null);
      setHistory(null);
      return;
    }
    const [dash, st, hist] = await Promise.all([
      studyService.getDashboard(),
      studyService.getStats(),
      studyService.getHistory(),
    ]);
    setDashboard(dash);
    setStats(st);
    setHistory(hist);
  }, []);

  useEffect(() => {
    Promise.all([
      storageService.getAll(),
      subscriptionService.getStatus(),
      authService.getUser(),
    ]).then(([all, sub]) => {
      setEnabled(all.enabled ?? true);
      setMode(all.mode ?? "ege");
      setPlan(sub?.plan || "free");
      setPricing(sub?.pricing || null);
      setLoading(false);
      loadPremiumData(sub?.plan === "premium");
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      try {
        const url = new URL(tabs[0]?.url || "");
        setCurrentSite(url.hostname);
        setIsSupported(SUPPORTED.some((s) => url.hostname.includes(s)));
      } catch {
        /* non-url tab */
      }
    });
  }, [loadPremiumData]);

  const handleToggle = useCallback(async () => {
    const next = !enabled;
    setEnabled(next);
    await storageService.set("enabled", next);
  }, [enabled]);

  const handleModeChange = useCallback(async (newMode) => {
    setMode(newMode);
    await storageService.set("mode", newMode);
  }, []);

  const handlePurchased = async () => {
    subscriptionService.invalidateCache();
    const sub = await subscriptionService.getStatus(true);
    setPlan(sub?.plan || "free");
    setPricing(sub?.pricing || null);
    await loadPremiumData(sub?.plan === "premium");
  };

  if (loading) {
    return (
      <div className="popup popup--loading">
        <div className="popup-spinner" />
      </div>
    );
  }

  const isPremium = plan === "premium";

  return (
    <div className="popup">
      <header className="popup-header">
        <div className="popup-header__logo">
          <span className="popup-header__icon">💡</span>
          <span className="popup-header__name">SMART EGE</span>
        </div>
        <button
          className={`popup-toggle ${enabled ? "popup-toggle--on" : "popup-toggle--off"}`}
          onClick={handleToggle}
          aria-label={enabled ? "Выключить" : "Включить"}
        >
          <span className="popup-toggle__knob" />
        </button>
      </header>

      <div
        className={`popup-status ${isSupported ? "popup-status--active" : "popup-status--idle"}`}
      >
        <span className="popup-status__dot" />
        <span className="popup-status__text">
          {isSupported
            ? `Активно на ${currentSite}`
            : currentSite
              ? `${currentSite} — не поддерживается`
              : "Откройте учебный сайт"}
        </span>
      </div>

      <main className="popup-body">
        <UserSection mode={mode} onModeChange={handleModeChange} />

        {!isPremium && (
          <PremiumGate pricing={pricing} onPurchased={handlePurchased} />
        )}

        {isPremium && view === "home" && (
          <DashboardSection
            dashboard={dashboard}
            onOpenStats={() => setView("stats")}
            onOpenHistory={() => setView("history")}
          />
        )}
        {isPremium && view === "stats" && (
          <StatsSection stats={stats} onBack={() => setView("home")} />
        )}
        {isPremium && view === "history" && (
          <HistorySection history={history} onBack={() => setView("home")} />
        )}

        <HowItWorksSection />
      </main>

      <footer className="popup-footer">
        Подготовка к экзамену, а не только подсказки
      </footer>
    </div>
  );
}
