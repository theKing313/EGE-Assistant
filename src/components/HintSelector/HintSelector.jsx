import React from 'react'
import { LEVELS } from '../../services/hintService.js'

/**
 * HintSelector — purely presentational.
 * Shows the three hint-level buttons. Zero business logic.
 * Props: onSelect(levelId: string)
 */
export default function HintSelector({ onSelect }) {
  return (
    <div className="sege-selector">
      <p className="sege-selector__prompt">Выбери уровень подсказки:</p>
      <div className="sege-selector__buttons">
        {LEVELS.map((level) => (
          <button
            key={level.id}
            className="sege-selector__btn"
            style={{ '--level-color': level.color, '--level-bg': level.bg, '--level-border': level.border }}
            onClick={() => onSelect(level.id)}
          >
            <span className="sege-selector__btn-icon">{level.icon}</span>
            <span className="sege-selector__btn-body">
              <span className="sege-selector__btn-label">{level.label}</span>
              <span className="sege-selector__btn-desc">{level.description}</span>
            </span>
            <span className="sege-selector__btn-arrow">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
