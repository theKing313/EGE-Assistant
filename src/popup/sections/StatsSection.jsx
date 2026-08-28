import React from "react";

export default function StatsSection({ stats, onBack }) {
  if (!stats) {
    return (
      <section className="popup-section">
        <button className="back-link" onClick={onBack}>
          ← Назад
        </button>
        <p className="history-empty">Нет данных статистики</p>
      </section>
    );
  }

  return (
    <section className="popup-section">
      <button className="back-link" onClick={onBack}>
        ← Назад
      </button>
      <div className="popup-section__title">
        <span>📊</span> Статистика
      </div>

      <div className="stats-hero">
        <div>
          <div className="stats-hero__label">Сегодня</div>
          <div className="stats-hero__value">
            {stats.today.completed} / {stats.today.goal} заданий
          </div>
        </div>
        <div>
          <div className="stats-hero__label">Неделя</div>
          <div className="stats-hero__value">{stats.week} задания</div>
        </div>
        <div>
          <div className="stats-hero__label">Серия</div>
          <div className="stats-hero__value">
            🔥 {stats.streak} дней подряд
          </div>
        </div>
      </div>

      <div className="stats-list">
        <div className="stats-row">
          <span className="stats-row__label">За месяц</span>
          <span className="stats-row__value">{stats.month}</span>
        </div>
        <div className="stats-row">
          <span className="stats-row__label">План на сегодня</span>
          <span className="stats-row__value">{stats.completionPercent}%</span>
        </div>
        <div className="stats-row">
          <span className="stats-row__label">Среднее в день</span>
          <span className="stats-row__value">{stats.averagePerDay}</span>
        </div>
        <div className="stats-row">
          <span className="stats-row__label">AI-подсказки</span>
          <span className="stats-row__value">{stats.aiHintsUsed}</span>
        </div>
        <div className="stats-row">
          <span className="stats-row__label">JSON-подсказки</span>
          <span className="stats-row__value">{stats.jsonHintsUsed}</span>
        </div>
      </div>

      {stats.hardestTopic && (
        <p className="hard-topic">
          Самая сложная тема
          <strong>{stats.hardestTopic}</strong>
        </p>
      )}

      {stats.mostPracticed?.length > 0 && (
        <>
          <div className="popup-section__title">Частые типы</div>
          <div className="stats-list">
            {stats.mostPracticed.map((row) => (
              <div className="stats-row" key={row.name}>
                <span className="stats-row__label">Задание {row.name}</span>
                <span className="stats-row__value">{row.count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {stats.recommendations?.length > 0 && (
        <ul className="reco-list">
          {stats.recommendations.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
