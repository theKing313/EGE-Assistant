import React from 'react'

/**
 * HintContent — purely presentational.
 * Displays the content returned by hintService.getContent().
 * Props: content { topic, text, example, levelMeta }, onBack()
 */
export default function HintContent({ content, onBack }) {
  if (!content) return null
  const { title, text, example, levelMeta } = content

  return (
    <div className="sege-content">
      <button className="sege-content__back" onClick={onBack}>
        ← Назад
      </button>

      <div
        className="sege-content__level-badge"
        style={{ color: levelMeta.color, background: levelMeta.bg, borderColor: levelMeta.border }}
      >
        <span>{levelMeta.label}</span>
      </div>

      <div className="sege-content__topic">{title}</div>

      <div className="sege-content__text">{text}</div>

      {example && (
        <div className="sege-content__example">
          <span className="sege-content__example-label">✏️ Пример</span>
          <p className="sege-content__example-text">{example}</p>
        </div>
      )}
    </div>
  )
}
