import React, { useState, useEffect, useRef } from 'react'
import Tooltip from '../Tooltip/Tooltip.jsx'
import { findHint } from '../../services/knowledgeService.js'

/**
 * Lamp — manages open/close state, outside-click, Escape, and loading.
 * Zero hint logic — all of that lives in hintService and Tooltip.
 */
export default function Lamp({ taskText, taskNumber, subject }) {
  const [open, setOpen]       = useState(false)
  const [entry, setEntry]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(false)
  const wrapperRef            = useRef(null)
  const fetchedRef            = useRef(false)

  const loadEntry = async () => {
    if (fetchedRef.current || loading) return
    fetchedRef.current = true
    setLoading(true)
    setError(false)
    try {
      const result = await findHint(subject, taskText, taskNumber)
      setEntry(result)
    } catch {
      setError(true)
      fetchedRef.current = false // allow retry
    } finally {
      setLoading(false)
    }
  }

  const handleClick = async () => {
    if (!open) await loadEntry()
    setOpen((prev) => !prev)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div className="sege-lamp" ref={wrapperRef}>
      <button
        className={[
          'sege-lamp__btn',
          open    ? 'sege-lamp__btn--active'  : '',
          loading ? 'sege-lamp__btn--loading' : '',
        ].join(' ')}
        onClick={handleClick}
        title="SmartEGE — подсказка к заданию"
        aria-expanded={open}
        aria-label="Показать подсказку SmartEGE"
      >
        {loading
          ? <span className="sege-lamp__spinner" aria-hidden="true" />
          : <span className="sege-lamp__icon"   aria-hidden="true">💡</span>
        }
        <span className="sege-lamp__label">
          {loading ? 'Загрузка…' : 'Подсказка'}
        </span>
      </button>

      {open && !error && (
        <Tooltip
          entry={entry}
          subject={subject}
          taskNumber={taskNumber}
          onClose={() => setOpen(false)}
        />
      )}

      {open && error && (
        <div className="sege-tooltip sege-error">
          <p>Не удалось загрузить подсказку.</p>
          <button onClick={() => { setError(false); setOpen(false) }}>
            Закрыть
          </button>
        </div>
      )}
    </div>
  )
}
