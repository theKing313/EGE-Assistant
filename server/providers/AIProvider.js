/**
 * Provider-agnostic AI contract and shared chat-completion helpers.
 * Business logic depends on this contract, never on a vendor SDK/API.
 */
export class AIProvider {
  constructor({ name, apiKey, model, timeoutMs = 15_000 }) {
    this.name = name
    this.apiKey = apiKey
    this.model = model
    this.timeoutMs = timeoutMs
  }

  isAvailable() {
    return Boolean(this.apiKey)
  }

  async generateHint() {
    throw new Error(`${this.name} provider does not implement generateHint`)
  }
}

export const SYSTEM_PROMPT = `Ты — умный репетитор для подготовки к ЕГЭ/ОГЭ.
Отвечаешь только на русском языке.
Даёшь подсказки разного уровня: намёк, идея или полное объяснение.
Никогда не давай готовый ответ — помогай думать.
Формат ответа строго JSON: { "title": string, "text": string, "example": string|null }`

export function buildPrompt(subject, taskText, level) {
  const levelMap = {
    hint20: 'краткий намёк (1-2 предложения, не раскрывай решение)',
    hint50: 'идею решения (3-5 предложений)',
    full: 'полное объяснение с правилом и примером',
  }
  return `Предмет: ${subject}
Задание: ${String(taskText || '').slice(0, 400)}
Уровень подсказки: ${levelMap[level] || levelMap.hint20}

Ответь в JSON: { "title": "...", "text": "...", "example": "..." }`
}

export async function postJson(url, options, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`)
    }
    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

export function parseChatCompletion(data, providerName) {
  const raw = data?.choices?.[0]?.message?.content
  if (!raw) throw new Error(`Empty response from ${providerName}`)
  const json = raw.replace(/^```json\s*|\s*```$/gi, '').trim()
  const parsed = JSON.parse(json)
  return {
    title: parsed.title || 'Объяснение ИИ',
    text: parsed.text || 'Не удалось получить объяснение.',
    example: parsed.example || null,
  }
}