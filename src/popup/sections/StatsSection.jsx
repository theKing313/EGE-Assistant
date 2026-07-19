import React from 'react'

const STAT_ITEMS = [
  { key: 'total',  label: 'Всего',    icon: '📊' },
  { key: 'hint20', label: 'Намёков',  icon: '👀' },
  { key: 'hint50', label: 'Идей',     icon: '🧠' },
  { key: 'full',   label: 'Полных',   icon: '📚' },
]

export default function StatsSection({ stats }) {
  if (!stats) return null

  return (
    <section className="popup-section">
      <p className="popup-section__title">Статистика</p>
      <div className="stats-grid">
        {STAT_ITEMS.map(({ key, label, icon }) => (
          <div key={key} className="stat-card">
            <span className="stat-card__value">{stats[key] ?? 0}</span>
            <span className="stat-card__label">{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
