import React, { useState } from 'react'
import HintSelector from '../HintSelector/HintSelector.jsx'
import HintContent from '../HintContent/HintContent.jsx'
import { getContent } from '../../services/hintService.js'
import { recordHintView } from '../../services/statsService.js'

const SUBJECT_LABELS = {
  russian: 'Русский язык',
  math: 'Математика',
  physics: 'Физика',
  chemistry: 'Химия',
  biology: 'Биология',
  history: 'История',
}

/**
 * Tooltip — orchestrates the selector → content flow.
 * Business logic: calls hintService and statsService.
 * Rendering: delegates to HintSelector and HintContent (both purely presentational).
 *
 * Props:
 *   entry      — matched knowledge entry from knowledgeService
 *   subject    — subject string
 *   taskNumber — task number (for stats)
 *   onClose    — callback to close the tooltip
 */
export default function Tooltip({ entry, subject, taskNumber, onClose }) {
  const [view, setView] = useState('selector') // 'selector' | 'content'
  const [content, setContent] = useState(null)

  const handleSelect = async (levelId) => {
    const c = getContent(entry, levelId)
    setContent(c)
    setView('content')

    // Fire-and-forget — stats recording is non-blocking
    recordHintView({
      subject,
      taskNumber,
      topic: entry?.title,
      level: levelId,
    }).catch(() => {/* storage errors are silently ignored */})
  }

  const handleBack = () => {
    setView('selector')
    setContent(null)
  }

  return (
    <div className="sege-tooltip" role="dialog" aria-modal="true">
      <div className="sege-tooltip__arrow" />

      <div className="sege-tooltip__header">
        <span className="sege-tooltip__subject">
          {SUBJECT_LABELS[subject] || subject}
        </span>
        <button
          className="sege-tooltip__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>

      {view === 'selector' ? (
        <HintSelector onSelect={handleSelect} />
      ) : (
        <HintContent content={content} onBack={handleBack} />
      )}
    </div>
  )
}
