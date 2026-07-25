/**
 * Provider-agnostic AI orchestration.
 * This service owns caching/retries; vendor details live in server/providers/.
 */
import crypto from 'crypto'
import * as aiCacheRepository from '../repositories/aiCacheRepository.js'
import { getAIProvider, getProviderName } from '../providers/index.js'

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1_000

export function isAvailable() {
  try {
    return getAIProvider().isAvailable()
  } catch (error) {
    console.error(`[AI] ${error.message}`)
    return false
  }
}

export function providerInfo() {
  try {
    const provider = getAIProvider()
    return { name: provider.name, model: provider.model, available: provider.isAvailable() }
  } catch (error) {
    return { name: getProviderName(), model: null, available: false, error: error.message }
  }
}

function makeCacheKey(subject, taskText, level, provider) {
  const raw = `${provider.name}:${provider.model}||${subject}||${taskText.trim().toLowerCase().slice(0, 300)}||${level}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function getHint({ subject, taskText, level }) {
  const provider = getAIProvider()
  const cacheKey = makeCacheKey(subject, taskText, level, provider)

  const cached = await aiCacheRepository.findByKey(cacheKey)
  if (cached) {
    console.log(`[AI] Cache hit provider=${provider.name} key=${cacheKey.slice(0, 12)}… (used ${cached.used_count}x)`)
    return { ...cached.response, source: 'ai-cache', provider: provider.name }
  }

  if (!provider.isAvailable()) return { available: false, provider: provider.name }

  console.log(`[AI] Calling provider=${provider.name} model=${provider.model} subject=${subject} level=${level} key=${cacheKey.slice(0, 12)}…`)
  const start = Date.now()
  let lastError = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS * attempt)
      console.log(`[AI] Retry ${attempt}/${MAX_RETRIES}`)
    }

    try {
      const response = await provider.generateHint({ subject, taskText, level })
      console.log(`[AI] Success provider=${provider.name} in ${Date.now() - start}ms (attempt ${attempt + 1})`)
      await aiCacheRepository.save(cacheKey, subject, response)
      return { ...response, source: 'ai', provider: provider.name }
    } catch (error) {
      lastError = error
      console.warn(`[AI] Provider ${provider.name} attempt ${attempt + 1} failed:`, error.message)
    }
  }

  throw new Error(`${provider.name} API unavailable after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}