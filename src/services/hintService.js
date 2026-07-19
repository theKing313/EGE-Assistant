/**
 * hintService.js — hint level definitions and content extraction.
 * Supports both JSON-sourced and AI-sourced entries identically.
 */

export const LEVELS = [
  {
    id: 'hint20',
    label: 'Намёк',
    shortLabel: '20%',
    description: 'Маленькая зацепка',
    icon: '👀',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    id: 'hint50',
    label: 'Идея',
    shortLabel: '50%',
    description: 'Идея решения',
    icon: '🧠',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    id: 'full',
    label: 'Полностью',
    shortLabel: '100%',
    description: 'Теория и правило',
    icon: '📚',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
]

export const LEVEL_MAP = Object.fromEntries(LEVELS.map((l) => [l.id, l]))

/**
 * Extract displayable content for a given hint level from any entry
 * (JSON or AI-generated — both shapes are supported).
 *
 * @param {object} entry   - topic entry from knowledgeService
 * @param {string} levelId - 'hint20' | 'hint50' | 'full'
 * @returns {{ title, text, example, levelMeta, isAI } | null}
 */
export function getContent(entry, levelId) {
  if (!entry) return null

  const levelMeta = LEVEL_MAP[levelId]
  if (!levelMeta) return null

  const isAI = entry._source === 'ai' || entry._source === 'ai-cache'

  switch (levelId) {
    case 'hint20':
      return {
        title: entry.title,
        text: entry.hint20 || 'Подсказка недоступна.',
        example: null,
        levelMeta,
        isAI,
      }
    case 'hint50':
      return {
        title: entry.title,
        text: entry.hint50 || entry.hint20 || 'Подсказка недоступна.',
        example: null,
        levelMeta,
        isAI,
      }
    case 'full':
      return {
        title: entry.title,
        text: entry.full?.rule || entry.hint50 || 'Объяснение недоступно.',
        example: entry.full?.example || null,
        levelMeta,
        isAI,
      }
    default:
      return null
  }
}
