import React from "react";
import { formatTimestamp, subjectLabel } from "../../services/statsService.js";

export default function HistorySection({ history, onBack }) {
  const groups = history?.groups || [];
  const items = history?.items || [];
  const focusTaskNumbers = [
    ...new Set(
      items
        .map((item) => String(item.taskNumber || ""))
        .filter((number) => number === "10" || number === "12"),
    ),
  ].sort((a, b) => Number(a) - Number(b));

  return (
    <section className="popup-section">
      {onBack && (
        <button className="back-link" onClick={onBack}>
          ← Назад
        </button>
      )}
      <div className="popup-section__title">
        <span>⏱</span> История
      </div>

      {focusTaskNumbers.length > 0 && (
        <p className="reco-list">
          Не забудь прорешать задания {focusTaskNumbers.join(" и ")} — они легко
          теряются в подготовке.
        </p>
      )}

      {items.length === 0 ? (
        <p className="history-empty">История пуста — начни решать задания!</p>
      ) : (
        (groups.length ? groups : [{ label: "Все", tasks: items }]).map(
          (group) => (
            <div key={group.label} className="history-group">
              <div className="history-group__label">{group.label}</div>
              <div className="history-list">
                {group.tasks.map((item) => (
                  <div key={item.id || item.taskKey} className="history-item">
                    <span className="history-item__icon">
                      {item.needsReview
                        ? "🔁"
                        : item.status === "completed"
                          ? "✅"
                          : "💡"}
                    </span>
                    <div className="history-item__body">
                      <p className="history-item__topic">
                        Задание {item.taskNumber || "—"}
                        {item.topic ? ` — ${item.topic}` : ""}
                      </p>
                      <div className="history-item__meta">
                        <span className="history-item__badge">
                          {item.statusLabel}
                        </span>
                        {item.subject && (
                          <span className="history-item__badge">
                            {subjectLabel(item.subject)}
                          </span>
                        )}
                        <span className="history-item__time">
                          {formatTimestamp(
                            new Date(item.updatedAt || item.openedAt).getTime(),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ),
        )
      )}
    </section>
  );
}
