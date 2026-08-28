import React from "react";

/**
 * HintContent — displays hint text, example, and AI badge.
 * Props: content { title, text, example, levelMeta, isAI }
 */
export default function HintContent({ content }) {
  if (!content) return null;
  const { title, text, example, levelMeta, isAI } = content;

  return (
    <div className="sege-content">
      {/* Topic + badges row */}
      <div className="sege-content__meta">
        <span className="sege-content__topic">{title}</span>
        <div className="sege-content__badges">
          <span
            className="sege-content__badge"
            style={{
              color: levelMeta.color,
              background: levelMeta.bg,
              borderColor: levelMeta.border,
            }}
          >
            {levelMeta.icon} {levelMeta.shortLabel}
          </span>
          {isAI && (
            <span className="sege-content__badge sege-content__badge--ai">
              ✨ ИИ
            </span>
          )}
        </div>
      </div>

      {/* Hint text */}
      <p className="sege-content__text">{text}</p>

      {example && (
        <div className="sege-content__example">
          <span className="sege-content__example-label">
            ✏️ Разбор этого задания
          </span>
          <p className="sege-content__example-text">{example}</p>
        </div>
      )}
    </div>
  );
}
