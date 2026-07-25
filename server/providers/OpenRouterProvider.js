import { AIProvider, SYSTEM_PROMPT, buildPrompt, parseChatCompletion, postJson } from './AIProvider.js'

export default class OpenRouterProvider extends AIProvider {
  constructor() {
    super({
      name: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.AI_MODEL || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    })
  }

  async generateHint({ subject, taskText, level }) {
    const data = await postJson('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
        ...(process.env.OPENROUTER_APP_NAME ? { 'X-Title': process.env.OPENROUTER_APP_NAME } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: buildPrompt(subject, taskText, level) }],
      }),
    }, this.timeoutMs)
    return parseChatCompletion(data, this.name)
  }
}