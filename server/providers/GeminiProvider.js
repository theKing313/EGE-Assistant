import { AIProvider, SYSTEM_PROMPT, buildPrompt, postJson } from './AIProvider.js'

export default class GeminiProvider extends AIProvider {
  constructor() {
    super({
      name: 'gemini',
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      model: process.env.AI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    })
  }

  async generateHint({ subject, taskText, level }) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`
    const data = await postJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: buildPrompt(subject, taskText, level) }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 400, responseMimeType: 'application/json' },
      }),
    }, this.timeoutMs)
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) throw new Error('Empty response from gemini')
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/gi, '').trim())
    return {
      title: parsed.title || 'Объяснение ИИ',
      text: parsed.text || 'Не удалось получить объяснение.',
      example: parsed.example || null,
    }
  }
}