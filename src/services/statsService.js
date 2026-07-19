/**
 * statsService.js
 * Records hint views and returns aggregated statistics.
 * All persistence is delegated to storageService — never chrome.storage directly.
 *
 * Future: add a POST /events call here to send events to a backend analytics endpoint.
 */

import * as storageService from './storageService.js'

/**
 * Record a hint view. Called by Tooltip when the user selects a level.
 *
 * @param {{ subject, taskNumber, topic, level }} params
 */
export async function recordHintView({ subject, taskNumber, topic, level }) {
  // --- update counters ---
  const stats = await storageService.get('stats')
  const newStats = {
    ...stats,
    [level]: (stats[level] || 0) + 1,
    total: (stats.total || 0) + 1,
  }
  await storageService.set('stats', newStats)

  // --- prepend to history (max 50 entries) ---
  const history = await storageService.get('history')
  const entry = {
    id: Date.now() + Math.random(), // unique enough without a uuid dep
    subject,
    taskNumber: taskNumber || null,
    topic: topic || '—',
    level,
    timestamp: Date.now(),
  }
  const newHistory = [entry, ...history].slice(0, 50)
  await storageService.set('history', newHistory)
}

export async function getStats() {
  return storageService.get('stats')
}

export async function getHistory() {
  return storageService.get('history')
}

/**
 * Human-readable relative timestamp.
 */
export function formatTimestamp(ts) {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'только что'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин. назад`
  if (diff < 86_400_000) {
    const d = new Date(ts)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const d = new Date(ts)
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

const LEVEL_LABELS = {
  hint20: '20%',
  hint50: '50%',
  full: 'Полная',
}
export function levelLabel(level) {
  return LEVEL_LABELS[level] || level
}

const SUBJECT_LABELS = {
  russian: 'Рус.',
  math: 'Мат.',
  physics: 'Физ.',
  chemistry: 'Хим.',
  biology: 'Био.',
  history: 'Ист.',
}
export function subjectLabel(subject) {
  return SUBJECT_LABELS[subject] || subject
}
