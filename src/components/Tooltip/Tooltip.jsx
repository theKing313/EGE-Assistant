import React, { useState, useEffect } from 'react'
import HintContent from '../HintContent/HintContent.jsx'
import * as hintService from '../../services/hintService.js'
import * as statsService from '../../services/statsService.js'

/**
 * Tooltip — new UX:
 *   1. Opens with first hint (hint20) already visible — no extra click.
 *   2. Three level buttons shown below the hint text.
 *   3. Clicking a button switches the displayed hint.
 */
export default function Tooltip({ entry, subject, taskNumber, onClose }) {
  const [activeLevel, setActiveLevel] = useState('hint20')

  // Record the initial hint view
  useEffect(() => {
    if (!entry) return
    statsService.recordHintView({
      subject,
      taskNumber,
      topic: entry.title,
      level: 'hint20',
    }).catch(() => {})
  }, [entry])

  const handleLevelChange = (levelId) => {
    setActiveLevel(levelId)
    if (!entry) return
    statsService.recordHintView({
      subject,
      taskNumber,
      topic: entry.title,
      level: levelId,
    }).catch(() => {})
  }

  const content = entry
    ? hintService.getContent(entry, activeLevel)
    : null

  const SUBJECT_LABELS = {
    russian: 'Русский язык',
    math: 'Математика',
    physics: 'Физика',
    chemistry: 'Химия',
    biology: 'Биология',
    history: 'История',
  }

  return (
    <div className="sege-tooltip" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="sege-tooltip__header">
        <div className="sege-tooltip__header-left">
          <span className="sege-tooltip__brand">SmartEGE</span>
          {subject && (
            <span className="sege-tooltip__subject">
              {SUBJECT_LABELS[subject] || subject}
            </span>
          )}
        </div>
        <button
          className="sege-tooltip__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>

      {/* Content area */}
      <div className="sege-tooltip__body">
        {!entry && (
          <div className="sege-tooltip__loading">
            <span className="sege-tooltip__loading-spinner" />
            <span>Загружаем подсказку…</span>
          </div>
        )}

        {entry && content && (
          <HintContent content={content} />
        )}
      </div>

      {/* Level switcher — shown below content */}
      {entry && (
        <div className="sege-tooltip__levels">
          {hintService.LEVELS.map((level) => (
            <button
              key={level.id}
              className={[
                'sege-tooltip__level-btn',
                activeLevel === level.id ? 'sege-tooltip__level-btn--active' : '',
              ].filter(Boolean).join(' ')}
              style={activeLevel === level.id ? {
                '--active-color': level.color,
                '--active-bg': level.bg,
                '--active-border': level.border,
              } : {}}
              onClick={() => handleLevelChange(level.id)}
              title={level.description}
            >
              <span className="sege-tooltip__level-icon">{level.icon}</span>
              <span className="sege-tooltip__level-label">{level.shortLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
