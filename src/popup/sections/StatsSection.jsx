import React from 'react'

export default function StatsSection({ stats }) {
  if (!stats) return null
  const total = stats.total ?? 0

  return (
    <section className="popup-section">
      <div className="popup-section__title">
        <span>📊</span> Статистика
      </div>

      {/* Big total counter */}
      <div className="stats-total">
        <span className="stats-total__num">{total}</span>
        <span className="stats-total__label">заданий просмотрено</span>
      </div>

      {/* Breakdown list */}
      <div className="stats-list">
        <div className="stats-row">
          <span className="stats-row__label">Подсказок 20%</span>
          <span className="stats-row__value stats-row__value--hint20">{stats.hint20 ?? 0}</span>
        </div>
        <div className="stats-row">
          <span className="stats-row__label">Подсказок 50%</span>
          <span className="stats-row__value stats-row__value--hint50">{stats.hint50 ?? 0}</span>
        </div>
        <div className="stats-row">
          <span className="stats-row__label">Полных объяснений</span>
          <span className="stats-row__value stats-row__value--full">{stats.full ?? 0}</span>
        </div>
      </div>

      {total === 0 && (
        <p className="stats-empty">Ещё нет данных — открой задание и нажми 💡</p>
      )}
    </section>
  )
}
