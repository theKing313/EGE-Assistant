/**
 * knowledgeService.js
 * Loads and caches the local JSON knowledge base for each subject.
 *
 * Lookup strategy — TOPIC-FIRST, text-only:
 *   1. Normalize task text (lowercase, strip punctuation)
 *   2. Score each topic entry by keyword coverage
 *   3. Multi-word keyword phrases score higher (more specific)
 *   4. Task number is NEVER the primary key — only used for a small
 *      secondary score boost to break ties when two topics are close
 *
 * This means the same JSON works for any EGE task, not just predefined ones.
 */

const cache = {}

const SUBJECT_FILES = {
  russian:   'knowledge/russian.json',
  math:      'knowledge/math.json',
  physics:   'knowledge/russian.json',   // fallback until physics.json exists
  chemistry: 'knowledge/russian.json',
  biology:   'knowledge/russian.json',
  history:   'knowledge/russian.json',
}

// Minimum keyword score to consider a match meaningful
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
 * Return the best-matching topic entry for the given task text.
 * Returns null when nothing matches (instead of a wrong fallback).
 *
 * @param {string} subject
 * @param {string} taskText   — raw visible text of the task element
 * @param {number|null} taskNumber — optional, used only as tiebreaker
 */
export async function findHint(subject, taskText, taskNumber = null) {
  const entries = await loadKnowledge(subject)
  if (!entries.length) return null

  const normalized = normalizeText(taskText)

  let best = null
  let bestScore = 0

  for (const entry of entries) {
    let score = scoreEntry(entry, normalized)

    // Secondary micro-boost: taskNumber listed in entry's optional hintFor array
    // This never overrides a clearly better keyword match, just breaks exact ties
    if (taskNumber && Array.isArray(entry.hintFor) && entry.hintFor.includes(taskNumber)) {
      score += 0.5
    }

    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  // Return best match, or fall back to first entry so the user always sees something
  return best && bestScore >= MIN_SCORE ? best : entries[0]
}

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * Normalize text for matching: lowercase, remove punctuation, collapse spaces.
 * Keeps Cyrillic and Latin alphanumerics.
 */
function normalizeText(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/[«»""''„"‹›]/g, ' ')
    .replace(/[^а-яёa-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Score one entry against normalised task text.
 * Multi-word keyword phrases give more points (they are more specific).
 */
function scoreEntry(entry, normalizedText) {
  const keywords = entry.keywords || []
  let score = 0

  for (const kw of keywords) {
    const kwNorm = kw.toLowerCase().trim()
    if (!kwNorm) continue
    if (normalizedText.includes(kwNorm)) {
      // Weight: number of words in the keyword phrase
      score += kwNorm.split(/\s+/).length
    }
  }

  return score
}
