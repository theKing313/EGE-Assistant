import React from "react";

function ProgressBar({ completed, goal }) {
  const percent = Math.min(100, Math.round(((completed || 0) / (goal || 10)) * 100));
  return (
    <div className="plan-bar" aria-label={`${completed} из ${goal}`}>
      <div className="plan-bar__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function DashboardSection({ dashboard, onOpenStats, onOpenHistory }) {
  if (!dashboard) {
    return (
      <section className="popup-section">
        <p className="history-empty">Загрузка плана…</p>
      </section>
    );
  }

  const { plan, streak, review, recommendations } = dashboard;
  const continueUrl = dashboard.continueUrl;

  const handleContinue = () => {
    if (continueUrl && typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url: continueUrl });
    }
  };

  return (
    <section className="popup-section dashboard">
      <div className="today-card">
        <div className="today-card__label">Сегодня</div>
        <div className="today-card__score">
          {plan.completed} / {plan.goal}
        </div>
        <ProgressBar completed={plan.completed} goal={plan.goal} />
        <div className="today-card__streak">
          🔥 Серия {streak} {streak === 1 ? "день" : "дней"}
        </div>
        <button className="today-card__continue" onClick={handleContinue}>
          Продолжить план
        </button>
      </div>

      <div className="plan-counts">
        <div>
          <strong>{plan.completed}</strong>
          <span>решено</span>
        </div>
        <div>
          <strong>{plan.inProgress}</strong>
          <span>в работе</span>
        </div>
        <div>
          <strong>{plan.needReview}</strong>
          <span>повторить</span>
        </div>
      </div>

      <div className="popup-section__title">Нужно повторить</div>
      {review?.length ? (
        <ul className="review-list">
          {review.slice(0, 5).map((item) => (
            <li key={item.taskKey || item.id}>
              Задание {item.taskNumber || "—"}
              {item.topic ? ` — ${item.topic}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="history-empty">Пока нет отложенных заданий</p>
      )}

      {recommendations?.length > 0 && (
        <ul className="reco-list">
          {recommendations.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}

      <div className="dashboard-links">
        <button onClick={onOpenStats}>Статистика · Смотреть</button>
        <button onClick={onOpenHistory}>История · Открыть</button>
      </div>
    </section>
  );
}
