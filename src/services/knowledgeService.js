/**
 * knowledgeService.js
 *
 * Lookup strategy (cost-optimized):
 *   1. Load local JSON → score entries by keyword coverage
 *   2. If score ≥ MIN_SCORE → return JSON entry (free, instant)
 *   3. If no match       → call aiService (charged, cached server-side)
 *
 * AI is NEVER called when JSON already has a suitable answer.
 */
import { findBestMatch } from '../utils/textMatcher.js'
import * as aiService from './aiService.js'

const cache = {}

const SUBJECT_FILES = {
  russian:   'knowledge/russian.json',
  math:      'knowledge/math.json',
  physics:   'knowledge/russian.json',   // fallback until physics.json exists
  chemistry: 'knowledge/russian.json',
  biology:   'knowledge/russian.json',
  history:   'knowledge/russian.json',
}

const MIN_SCORE = 1

export async function loadKnowledge(subject) {
  if (cache[subject]) return cache[subject]

  const file = SUBJECT_FILES[subject] || SUBJECT_FILES.russian
  const url = chrome.runtime.getURL(file)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    cache[subject] = data
    return data
  } catch (err) {
    console.warn(`[SmartEGE] Failed to load knowledge for "${subject}":`, err)
    return []
  }
}

/**
 * Find the best hint entry for a task.
 * Returns a knowledge entry (source: 'json') or an AI result (source: 'ai'/'ai-cache').
 * Returns null only if both sources fail.
 *
 * @param {string}      subject
 * @param {string}      taskText
 * @param {number|null} taskNumber
 */
export async function findHint(subject, taskText, taskNumber = null) {
  // 1. Try local JSON first
  const entries = await loadKnowledge(subject)
  const match = findBestMatch(entries, taskText, taskNumber, MIN_SCORE)

  if (match) {
    console.debug('[SmartEGE] JSON match:', match.title)
    return { ...match, _source: 'json' }
  }

  // 2. No JSON match → ask AI (will hit backend cache first)
  console.debug('[SmartEGE] No JSON match, trying AI fallback')
  try {
    const aiResult = await aiService.getHint({
      subject,
      taskText,
      level: 'hint20', // backend returns a structured entry
    })

    if (aiResult && !aiResult.error) {
      return {
        id: `ai_${Date.now()}`,
        title: aiResult.title || 'Объяснение ИИ',
        keywords: [],
        hint20: aiResult.text,
        hint50: aiResult.text,
        full: { rule: aiResult.text, example: aiResult.example || null },
        _source: aiResult.source || 'ai',
      }
    }

    // AI not available or auth required — return first JSON entry as safe fallback
    if (entries.length > 0) {
      return { ...entries[0], _source: 'json-fallback' }
    }
  } catch (err) {
    console.warn('[SmartEGE] AI fallback error:', err.message)
    if (entries.length > 0) {
      return { ...entries[0], _source: 'json-fallback' }
    }
  }

  return null
}
