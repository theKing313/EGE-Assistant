import React, { useState, useEffect, useCallback } from 'react'
import './App.css'
import UserSection      from './popup/sections/UserSection.jsx'
import StatsSection     from './popup/sections/StatsSection.jsx'
import HistorySection   from './popup/sections/HistorySection.jsx'
import HowItWorksSection from './popup/sections/HowItWorksSection.jsx'
import * as storageService from './services/storageService.js'
import * as statsService   from './services/statsService.js'

/**
 * App — popup shell. Zero business logic.
 * Loads state from storageService on mount, passes it down to section components.
 * All writes go through storageService.
 */
export default function App() {
  const [enabled,     setEnabled]     = useState(true)
  const [mode,        setMode]        = useState('ege')
  const [stats,       setStats]       = useState(null)
  const [history,     setHistory]     = useState([])
  const [currentSite, setCurrentSite] = useState(null)
  const [isSupported, setIsSupported] = useState(false)
  const [loading,     setLoading]     = useState(true)

  const SUPPORTED = ['reshu.ru', 'sdamgia.ru', 'fipi.ru']

  // Load everything on mount
  useEffect(() => {
    Promise.all([
      storageService.getAll(),
      statsService.getStats(),
      statsService.getHistory(),
    ]).then(([all, st, hist]) => {
      setEnabled(all.enabled)
      setMode(all.mode)
      setStats(st)
      setHistory(hist)
      setLoading(false)
    })

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      try {
        const url = new URL(tabs[0]?.url || '')
        setCurrentSite(url.hostname)
        setIsSupported(SUPPORTED.some((s) => url.hostname.includes(s)))
      } catch { /* non-url tab */ }
    })
  }, [])

  const handleToggle = useCallback(async () => {
    const next = !enabled
    setEnabled(next)
    await storageService.set('enabled', next)
  }, [enabled])

  const handleModeChange = useCallback(async (newMode) => {
    setMode(newMode)
    await storageService.set('mode', newMode)
  }, [])

  if (loading) {
    return (
      <div className="popup popup--loading">
        <div className="popup-spinner" />
      </div>
    )
  }

  return (
    <div className="popup">
      {/* ── Header ── */}
      <header className="popup-header">
        <div className="popup-header__logo">
          <span className="popup-header__icon">💡</span>
          <span className="popup-header__name">SmartEGE</span>
        </div>

        <button
          className={`popup-toggle ${enabled ? 'popup-toggle--on' : 'popup-toggle--off'}`}
          onClick={handleToggle}
          aria-label={enabled ? 'Выключить' : 'Включить'}
          title={enabled ? 'Выключить расширение' : 'Включить расширение'}
        >
          <span className="popup-toggle__knob" />
        </button>
      </header>

      {/* ── Status bar ── */}
      <div className={`popup-status ${isSupported ? 'popup-status--active' : 'popup-status--idle'}`}>
        <span className="popup-status__dot" />
        <span className="popup-status__text">
          {isSupported
            ? `Активно на ${currentSite}`
            : currentSite
              ? `${currentSite} — не поддерживается`
              : 'Откройте учебный сайт'}
        </span>
      </div>

      {/* ── Body ── */}
      <main className="popup-body">
        <UserSection   mode={mode}    onModeChange={handleModeChange} />
        <StatsSection  stats={stats} />
        <HistorySection history={history} />
        <HowItWorksSection />
      </main>

      <footer className="popup-footer">
        SmartEGE v1.1 — умная подготовка к экзаменам
      </footer>
    </div>
  )
}
