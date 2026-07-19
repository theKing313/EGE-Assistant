import React from 'react'

const MODE_OPTIONS = [
  { id: 'ege',        label: 'ЕГЭ' },
  { id: 'oge',        label: 'ОГЭ' },
  { id: 'university', label: 'Свой' },
]

/**
 * UserSection — shows user identity and mode selector.
 * All persistence is handled by the parent (App.jsx) via storageService.
 * This component is purely presentational + calls onModeChange.
 */
export default function UserSection({ mode, onModeChange }) {
  return (
    <section className="popup-section">
      <div className="user-section">
        <div className="user-section__avatar">👤</div>
        <div className="user-section__info">
          <p className="user-section__name">Гость</p>
          {/* Future: replace with real user name from authService */}
          <p className="user-section__sub">Войти для синхронизации</p>
        </div>
      </div>

      <div className="mode-selector">
        <p className="mode-selector__label">Режим подготовки</p>
        <div className="mode-selector__options">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={`mode-selector__btn ${mode === opt.id ? 'mode-selector__btn--active' : ''}`}
              onClick={() => onModeChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
