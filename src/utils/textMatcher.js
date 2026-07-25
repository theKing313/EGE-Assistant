/**
 * Pure knowledge matching utilities.
 *
 * Matching order:
 *   1. exact task number (when an entry declares one)
 *   2. normalized keyword relevance
 *   3. no match (never the first record)
 *
 * The lightweight stemmer keeps this dependency-free for a Chrome extension.
 */

const WEAK_KEYWORDS = new Set([
  'ответ',
  'вычислить',
  'значение',
  'задача',
  'найти',
  'определить',
  'решение',
  'число',
])

const RUSSIAN_SUFFIXES = [
  'иями', 'ями', 'ами', 'ого', 'ему', 'ому', 'ими', 'ыми', 'ее', 'ие',
  'ые', 'ое', 'ей', 'ий', 'ый', 'ой', 'ем', 'ам', 'ом', 'им', 'ым',
  'ах', 'ях', 'ов', 'ев', 'у', 'ю', 'ы', 'ь', 'а', 'я', 'и', 'е', 'о',
]

function stemWord(word) {
  if (word.length < 4) return word
  for (const suffix of RUSSIAN_SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length)
    }
  }
  return word
}

function normalizeWord(word) {
  return stemWord(word.toLowerCase())
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(normalizeWord)
}

/**
 * Normalize text by lowercasing, removing punctuation, collapsing whitespace,
 * and applying a small Russian/Latin suffix stemmer.
 */
export function normalizeText(text) {
  return tokenize(text).join(' ')
}

function entryTaskNumbers(entry) {
  const values = [
    ...(Array.isArray(entry?.taskNumbers) ? entry.taskNumbers : []),
    ...(Array.isArray(entry?.hintFor) ? entry.hintFor : []),
    entry?.taskNumber,
  ]
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value))
}

function normalizedKeyword(keyword) {
  return tokenize(keyword)
}

/**
 * Score a knowledge entry against normalized task text.
 * Multi-word phrases and several relevant keywords receive higher scores.
 */
export function scoreMatch(entry, normalized) {
  const text = typeof normalized === 'string' ? normalized : normalizeText(normalized)
  const textTokens = new Set(text.split(' ').filter(Boolean))
  let score = 0

  for (const keyword of entry?.keywords || []) {
    const keywordTokens = normalizedKeyword(keyword)
    if (keywordTokens.length === 0) continue

    const phrase = keywordTokens.join(' ')
    const phraseMatched = text.includes(phrase)
    const tokenMatches = keywordTokens.filter((token) => textTokens.has(token)).length
    if (!phraseMatched && tokenMatches === 0) continue

    const isWeak = keywordTokens.length === 1 && WEAK_KEYWORDS.has(keywordTokens[0])
    if (phraseMatched) {
      score += isWeak ? 0.25 : keywordTokens.length > 1 ? 3 : 1.5
    } else {
      score += isWeak ? 0.1 : 0.75 * (tokenMatches / keywordTokens.length)
    }
  }

  return Number(score.toFixed(3))
}

/**
 * Return ranked candidates and the reason for the winner.
 */
export function rankMatches(entries, taskText, taskNumber = null, minScore = 1.5) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { match: null, score: 0, reason: 'no_entries', matchedKeywords: [], topMatches: [] }
  }

  const normalized = normalizeText(taskText)
  const exactNumberMatches = taskNumber == null
    ? []
    : entries.filter((entry) => entryTaskNumbers(entry).includes(Number(taskNumber)))

  const ranked = entries.map((entry, index) => {
    const keywords = (entry.keywords || []).filter((keyword) => {
      const keywordTokens = normalizedKeyword(keyword)
      return keywordTokens.length > 0 &&
        normalized.includes(keywordTokens.join(' '))
    })
    const exactTaskNumber = exactNumberMatches.includes(entry)
    return {
      entry,
      index,
      score: exactTaskNumber ? 1000 : scoreMatch(entry, normalized),
      exactTaskNumber,
      matchedKeywords: keywords,
    }
  }).sort((a, b) => b.score - a.score || a.index - b.index)

  const winner = ranked[0]
  if (winner?.exactTaskNumber) {
    return {
      match: winner.entry,
      score: winner.score,
      reason: 'exact_task_number',
      matchedKeywords: winner.matchedKeywords,
      topMatches: ranked.slice(0, 5).map(toPublicMatch),
    }
  }

  if (!winner || winner.score < minScore) {
    return {
      match: null,
      score: winner?.score || 0,
      reason: 'below_threshold',
      matchedKeywords: winner?.matchedKeywords || [],
      topMatches: ranked.slice(0, 5).map(toPublicMatch),
    }
  }

  return {
    match: winner.entry,
    score: winner.score,
    reason: 'keyword_relevance',
    matchedKeywords: winner.matchedKeywords,
    topMatches: ranked.slice(0, 5).map(toPublicMatch),
  }
}

function toPublicMatch(result) {
  return {
    id: result.entry.id,
    title: result.entry.title,
    score: result.score,
    matchedKeywords: result.matchedKeywords,
  }
}

/**
 * Backwards-compatible convenience API.
 */
export function findBestMatch(entries, taskText, taskNumber = null, minScore = 1.5) {
  return rankMatches(entries, taskText, taskNumber, minScore).match
}

export function truncate(text, maxLength = 120) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}
