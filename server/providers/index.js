import OpenRouterProvider from './OpenRouterProvider.js'
import OpenAIProvider from './OpenAIProvider.js'
import DeepSeekProvider from './DeepSeekProvider.js'
import MistralProvider from './MistralProvider.js'
import GeminiProvider from './GeminiProvider.js'

const PROVIDERS = {
  openrouter: OpenRouterProvider,
  openai: OpenAIProvider,
  deepseek: DeepSeekProvider,
  mistral: MistralProvider,
  gemini: GeminiProvider,
}

export function getAIProvider() {
  const requested = (process.env.AI_PROVIDER || 'openrouter').trim().toLowerCase()
  const Provider = PROVIDERS[requested]
  if (!Provider) {
    throw new Error(`Unsupported AI_PROVIDER "${requested}". Supported: ${Object.keys(PROVIDERS).join(', ')}`)
  }
  return new Provider()
}

export function getProviderName() {
  return (process.env.AI_PROVIDER || 'openrouter').trim().toLowerCase()
}

export function listProviders() {
  return Object.keys(PROVIDERS)
}