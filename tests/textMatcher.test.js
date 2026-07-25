import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeText, rankMatches } from '../src/utils/textMatcher.js'

const entries = [
  { id: 'stress', title: 'Орфоэпические нормы — ударение', keywords: ['ударение', 'произношение'] },
  { id: 'geometry', title: 'Геометрия — площадь', taskNumbers: [3], keywords: ['площадь', 'треугольник', 'круг'] },
  { id: 'equations', title: 'Уравнения', keywords: ['уравнение', 'дискриминант'] },
]

test('normalizes punctuation, whitespace, and Russian word forms', () => {
  assert.equal(normalizeText('  УДАРЕНИЯ!!!   в словах  '), 'ударени в слов')
})

test('uses exact task number before keyword scoring', () => {
  const result = rankMatches(entries, 'Найдите площадь фигуры', 3)
  assert.equal(result.match.id, 'geometry')
  assert.equal(result.reason, 'exact_task_number')
})

test('selects a relevant keyword topic', () => {
  const result = rankMatches(entries, 'В каком слове неверно поставлено ударение?')
  assert.equal(result.match.id, 'stress')
  assert.equal(result.reason, 'keyword_relevance')
  assert.ok(result.score >= 1.5)
})

test('returns no match instead of the first entry for unrelated text', () => {
  const result = rankMatches(entries, 'На улице идёт дождь и дует ветер', null, 1.5)
  assert.equal(result.match, null)
  assert.equal(result.reason, 'below_threshold')
  assert.equal(result.topMatches[0].id, 'stress')
  assert.equal(result.topMatches[0].score, 0)
})