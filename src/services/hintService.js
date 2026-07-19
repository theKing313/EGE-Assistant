/**
 * hintService.js
 * All hint-level business logic lives here.
 * Components never decide which content to show — they call this service.
 *
 * Future: replace getContent() body with an AI API call when ready.
 * The interface stays identical — only the data source changes.
 */

export const LEVELS = [
  {
    id: 'hint20',
    label: '👀 Намек',
    description: 'Маленькая зацепка',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    id: 'hint50',
    label: '🧠 Объяснить идею',
    description: 'Идея решения',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    id: 'full',
    label: '📚 Полностью разобрать',
    description: 'Теория и правило',
    color: '#6c47ff',
    bg: '#faf5ff',
    border: '#e9d5ff',
  },
]

export const LEVEL_MAP = Object.fromEntries(LEVELS.map((l) => [l.id, l]))

/**
 * Extract content for a given hint level from a knowledge entry.
 *
 * @param {object} entry   - A topic entry (from knowledgeService)
 * @param {string} levelId - 'hint20' | 'hint50' | 'full'
 * @returns {{ title, text, example?, levelMeta } | null}
 *
 * AI integration point: replace this function body with:
 *   return await aiService.getHint(entry, levelId)
 * The return shape stays the same.
 */
export function getContent(entry, levelId) {
  if (!entry) return null

  const levelMeta = LEVEL_MAP[levelId]
  if (!levelMeta) return null

  switch (levelId) {
    case 'hint20':
      return {
        title: entry.title,
        text: entry.hint20 || 'Подсказка недоступна.',
        example: null,
        levelMeta,
      }
    case 'hint50':
      return {
        title: entry.title,
        text: entry.hint50 || 'Подсказка недоступна.',
        example: null,
        levelMeta,
      }
    case 'full':
      return {
        title: entry.title,
        text: entry.full?.rule || 'Объяснение недоступно.',
        example: entry.full?.example || null,
        levelMeta,
      }
    default:
      return null
  }
}
