import React from 'react'
import { formatTimestamp, levelLabel, subjectLabel } from '../../services/statsService.js'

const LEVEL_COLORS = {
  hint20: '#16a34a',
  hint50: '#d97706',
  full:   '#6c47ff',
}

/**
 * HistorySection — purely presentational.
 * Receives history array from App.jsx (loaded via statsService).
 */
export default function HistorySection({ history }) {
  if (!history || history.length === 0) {
    return (
      <section className="popup-section">
        <h3 className="popup-section__title">🕓 История</h3>
        <p className="stats-empty">История пуста — начни решать задания!</p>
      </section>
    )
  }

  return (
    <section className="popup-section">
      <h3 className="popup-section__title">🕓 История</h3>
      <div className="history-list">
        {history.slice(0, 15).map((item) => (
          <div key={item.id} className="history-item">
            <div className="history-item__left">
              <span
                className="history-item__level"
                style={{ color: LEVEL_COLORS[item.level] || '#6c47ff' }}
              >
                {levelLabel(item.level)}
              </span>
              <span className="history-item__topic">{item.topic}</span>
            </div>
            <div className="history-item__right">
              {item.subject && (
                <span className="history-item__subject">
                  {subjectLabel(item.subject)}
                </span>
              )}
              <span className="history-item__time">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
