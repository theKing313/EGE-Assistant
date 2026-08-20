import crypto from 'crypto'
import https from 'https'
import {
  AIProvider,
  SYSTEM_PROMPT,
  buildPrompt,
  parseChatCompletion,
} from './AIProvider.js'

const OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth'
const CHAT_URL = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions'

let tokenCache = null

/**
 * GigaChat's public endpoints currently serve a self-signed certificate
 * chain. Keep the exception scoped to these two HTTPS requests only.
 */
function postGigaJson(url, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: options.method || 'POST',
      headers: options.headers,
      agent: new https.Agent({ rejectUnauthorized: false }),
      timeout: timeoutMs,
    }, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { body += chunk })
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode}: ${body.slice(0, 200)}`))
          return
        }
        try {
          resolve(JSON.parse(body))
        } catch {
          reject(new Error('GigaChat returned invalid JSON'))
        }
      })
    })

    request.on('timeout', () => request.destroy(new Error('GigaChat request timed out')))
    request.on('error', reject)
    request.write(options.body || '')
    request.end()
  })
}

export default class GigaChatProvider extends AIProvider {
  constructor() {
    super({
      name: 'gigachat',
      apiKey: process.env.GIGACHAT_AUTH_KEY || process.env.GIGACHAT_CLIENT_SECRET,
      model: process.env.GIGACHAT_MODEL || 'GigaChat',
    })
    this.clientId = process.env.GIGACHAT_CLIENT_ID
    this.authKey = process.env.GIGACHAT_AUTH_KEY
    this.scope = process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS'
  }

  isAvailable() {
    return Boolean((this.authKey || (this.clientId && this.apiKey)) && this.scope)
  }

  async getAccessToken() {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
      return tokenCache.value
    }

    const basic = this.authKey || Buffer.from(`${this.clientId}:${this.apiKey}`).toString('base64')
    const data = await postGigaJson(
      OAUTH_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          RqUID: crypto.randomUUID(),
        },
        body: new URLSearchParams({ scope: this.scope }).toString(),
      },
      this.timeoutMs,
    )

    if (!data.access_token) {
      throw new Error('GigaChat OAuth response does not contain access_token')
    }

    tokenCache = {
      value: data.access_token,
      expiresAt: Date.now() + Math.max((data.expires_at || 1_800_000) - Date.now(), 60_000),
    }
    return tokenCache.value
  }

  async generateHint({ subject, taskText, level }) {
    const token = await this.getAccessToken()
    const data = await postGigaJson(
      CHAT_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.3,
          max_tokens: 400,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildPrompt(subject, taskText, level) },
          ],
        }),
      },
      this.timeoutMs,
    )

    return parseChatCompletion(data, this.name)
  }
}