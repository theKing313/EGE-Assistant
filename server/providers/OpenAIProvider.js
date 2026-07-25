import { AIProvider, SYSTEM_PROMPT, buildPrompt, parseChatCompletion, postJson } from './AIProvider.js'

export default class OpenAIProvider extends AIProvider {
  constructor() {
    super({
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })
  }

  async generateHint({ subject, taskText, level }) {
    const data = await postJson('https://api.openai.com/v1/chat/completions', {
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