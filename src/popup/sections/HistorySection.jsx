import React from 'react'
import { formatTimestamp, levelLabel, subjectLabel } from '../../services/statsService.js'

const LEVEL_ICONS = {
  hint20: '👀',
  hint50: '🧠',
  full:   '📚',
}

export default function HistorySection({ history }) {
  if (!history || history.length === 0) {
    return (
      <section className="popup-section">
        <p className="popup-section__title">Последние подсказки</p>
        <p className="history-empty">Ещё нет просмотренных подсказок</p>
      </section>
    )
  }

  return (
    <section className="popup-section">
      <p className="popup-section__title">Последние подсказки</p>
      <div className="history-list">
        {history.slice(0, 6).map((item) => (
          <div key={item.id} className="history-item">
            <span className="history-item__icon">
              {LEVEL_ICONS[item.level] || '💡'}
            </span>
            <div className="history-item__body">
              <p className="history-item__topic">{item.topic || '—'}</p>
              <div className="history-item__meta">
                <span className="history-item__badge">
                  {levelLabel(item.level)}
                </span>
                {item.subject && (
                  <span className="history-item__badge">
                    {subjectLabel(item.subject)}
                  </span>
                )}
                <span className="history-item__time">
                  {formatTimestamp(item.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
