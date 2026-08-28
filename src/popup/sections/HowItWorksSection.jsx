import React, { useState } from 'react'

const STEPS = [
  { num: '1', text: 'Открой задание на reshu.ru или sdamgia.ru' },
  { num: '2', text: 'Нажми 💡 — задание попадёт в работу, подсказка появится сразу' },
  { num: '3', text: 'Отметь «Готово» или «Запомнить задание», чтобы вернуться позже' },
  { num: '4', text: 'В Premium следи за планом, серией дней и темами на повторение' },
]

export default function HowItWorksSection() {
  const [open, setOpen] = useState(false)

  return (
    <section className="popup-section">
      <button className="how-toggle" onClick={() => setOpen((v) => !v)}>
        <span>❓ Как это работает</span>
        <span className={`how-toggle__arrow ${open ? 'how-toggle__arrow--open' : ''}`}>›</span>
      </button>

      {open && (
        <ul className="how-steps">
          {STEPS.map((s) => (
            <li key={s.num} className="how-step">
              <span className="how-step__num">{s.num}</span>
              <span className="how-step__text">{s.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
