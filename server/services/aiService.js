/**
 * aiService.js — AI API calls with timeout, retries, logging, and cost control.
 *
 * Provider: OpenAI (gpt-4o-mini — cheapest capable model).
 * API key: set OPENAI_API_KEY environment variable to activate.
 * When no key is present, all calls return { available: false }.
 *
 * Cost priority: JSON → DB cache → AI → save to DB cache
 */
import * as aiCacheRepository from '../repositories/aiCacheRepository.js'
import crypto from 'crypto'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'
const TIMEOUT_MS = 15_000
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1_000

/**
 * Check whether AI is available (API key set).
 */
export function isAvailable() {
  return Boolean(process.env.OPENAI_API_KEY)
}

/**
 * Generate a deterministic cache key for a hint request.
 */
function makeCacheKey(subject, taskText, level) {
  const raw = `${subject}||${taskText.trim().toLowerCase().slice(0, 300)}||${level}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/**
 * Main entry point. Returns cached result when possible.
 *
 * @param {{ subject, taskText, level }} params
 * @returns {{ title, text, example, source: 'ai'|'ai-cache' } | { available: false }}
 */
export async function getHint({ subject, taskText, level }) {
  const cacheKey = makeCacheKey(subject, taskText, level)

  // 1. Check DB cache first
  const cached = await aiCacheRepository.findByKey(cacheKey)
  if (cached) {
    console.log(`[AI] Cache hit: ${cacheKey.slice(0, 12)}… (used ${cached.used_count}x)`)
    return { ...cached.response, source: 'ai-cache' }
  }

  // 2. Check API key
  if (!isAvailable()) {
    return { available: false }
  }

  // 3. Call AI API with retries
  console.log(`[AI] Calling API for subject=${subject} level=${level} key=${cacheKey.slice(0, 12)}…`)
  const start = Date.now()
  let lastError = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS * attempt)
      console.log(`[AI] Retry ${attempt}/${MAX_RETRIES}`)
    }

    try {
      const response = await callOpenAI(subject, taskText, level)
      const duration = Date.now() - start
      console.log(`[AI] Success in ${duration}ms (attempt ${attempt + 1})`)

      // 4. Save to DB cache before returning
      await aiCacheRepository.save(cacheKey, subject, response)

      return { ...response, source: 'ai' }
    } catch (err) {
      lastError = err
      console.warn(`[AI] Attempt ${attempt + 1} failed:`, err.message)
    }
  }

  console.error(`[AI] All retries exhausted:`, lastError?.message)
  throw new Error(`AI API unavailable after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`)
}

async function callOpenAI(subject, taskText, level) {
  const prompt = buildPrompt(subject, taskText, level)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`)
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content
    if (!raw) throw new Error('Empty response from OpenAI')

    const parsed = JSON.parse(raw)
    return {
      title: parsed.title || 'Объяснение ИИ',
      text: parsed.text || 'Не удалось получить объяснение.',
      example: parsed.example || null,
    }
  } finally {
    clearTimeout(timeout)
  }
}

function buildPrompt(subject, taskText, level) {
  const levelMap = {
    hint20: 'краткий намёк (1-2 предложения, не раскрывай решение)',
    hint50: 'идею решения (3-5 предложений)',
    full: 'полное объяснение с правилом и примером',
  }
  const levelDesc = levelMap[level] || levelMap.hint20

  return `Предмет: ${subject}
Задание: ${taskText.slice(0, 400)}
Уровень подсказки: ${levelDesc}

Ответь в JSON: { "title": "...", "text": "...", "example": "..." }`
}

const SYSTEM_PROMPT = `Ты — умный репетитор для подготовки к ЕГЭ/ОГЭ. 
Отвечаешь только на русском языке. 
Даёшь подсказки разного уровня: намёк, идея или полное объяснение.
Никогда не давай готовый ответ — помогай думать.
Формат ответа строго JSON: { "title": string, "text": string, "example": string|null }`

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
