import { AIProvider, SYSTEM_PROMPT, buildPrompt, parseChatCompletion, postJson } from './AIProvider.js'

export default class DeepSeekProvider extends AIProvider {
  constructor() {
    super({
      name: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.AI_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    })
  }

  async generateHint({ subject, taskText, level }) {
    const data = await postJson('https://api.deepseek.com/v1/chat/completions', {
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