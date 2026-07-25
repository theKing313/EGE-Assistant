import { AIProvider, SYSTEM_PROMPT, buildPrompt, parseChatCompletion, postJson } from './AIProvider.js'

export default class MistralProvider extends AIProvider {
  constructor() {
    super({
      name: 'mistral',
      apiKey: process.env.MISTRAL_API_KEY,
      model: process.env.AI_MODEL || process.env.MISTRAL_MODEL || 'mistral-small-latest',
    })
  }

  async generateHint({ subject, taskText, level }) {
    const data = await postJson('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
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