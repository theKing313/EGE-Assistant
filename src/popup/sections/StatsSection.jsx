import React from 'react'

/**
 * StatsSection — purely presentational.
 * Receives stats object from App.jsx (loaded via statsService).
 */
export default function StatsSection({ stats }) {
  const { hint20 = 0, hint50 = 0, full = 0, total = 0 } = stats || {}

  const rows = [
    { label: 'Подсказок 20%',         value: hint20, color: '#16a34a' },
    { label: 'Подсказок 50%',         value: hint50, color: '#d97706' },
    { label: 'Полных объяснений',      value: full,   color: '#6c47ff' },
  ]

  return (
    <section className="popup-section">
      <h3 className="popup-section__title">📊 Статистика</h3>

      <div className="stats-total">
        <span className="stats-total__num">{total}</span>
        <span className="stats-total__label">заданий просмотрено</span>
      </div>

      <div className="stats-rows">
        {rows.map((row) => (
          <div key={row.label} className="stats-row">
            <span className="stats-row__label">{row.label}</span>
            <span className="stats-row__value" style={{ color: row.color }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {total === 0 && (
        <p className="stats-empty">
          Ещё нет данных — открой задание и нажми 💡
        </p>
      )}
    </section>
  )
}
