/**
 * textMatcher.js
 * Pure text-matching utilities — no task-number logic here.
 *
 * The primary matching strategy is keyword scoring against normalized text.
 * Topic entries in the JSON represent grammatical / mathematical TOPICS,
 * not specific task numbers — so this works for any exercise, not just predefined ones.
 */

/**
 * Normalize raw task text for keyword matching.
 * Keeps Cyrillic + Latin alphanumeric, strips everything else.
 */
export function normalizeText(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/[«»""''„"‹›]/g, ' ')
    .replace(/[^а-яёa-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Score how well a topic entry matches the given normalized task text.
 * Multi-word keyword phrases score higher (more specific signal).
 *
 * @param {object} entry         — a topic entry from the knowledge base
 * @param {string} normalizedText — output of normalizeText()
 * @returns {number}
 */
export function scoreMatch(entry, normalizedText) {
  const keywords = entry.keywords || []
  let score = 0
  for (const kw of keywords) {
    const kwNorm = kw.toLowerCase().trim()
    if (!kwNorm) continue
    if (normalizedText.includes(kwNorm)) {
      score += kwNorm.split(/\s+/).length
    }
  }
  return score
}

/**
 * Find the best matching topic entry from a list.
 * Returns null if no entry reaches the minimum score threshold.
 *
 * NOTE: taskNumber is intentionally NOT a primary key.
 * It is only accepted as an optional tiebreaker boost (0.5 points).
 *
 * @param {object[]} entries
 * @param {string}   taskText    — raw task text (will be normalized internally)
 * @param {number|null} taskNumber — optional secondary hint
 * @param {number}   minScore    — minimum score to accept a match (default 1)
 */
export function findBestMatch(entries, taskText, taskNumber = null, minScore = 1) {
  if (!entries || entries.length === 0) return null

  const normalized = normalizeText(taskText)
  let best = null
  let bestScore = 0

  for (const entry of entries) {
    let score = scoreMatch(entry, normalized)

    // Optional micro-boost for task number — never overrides keyword match
    if (taskNumber && Array.isArray(entry.hintFor) && entry.hintFor.includes(taskNumber)) {
      score += 0.5
    }

    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  return bestScore >= minScore ? best : null
}

/**
 * Truncate text to a readable length.
 */
export function truncate(text, maxLength = 120) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}
