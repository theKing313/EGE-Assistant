/**
 * Provider-agnostic AI contract and shared chat-completion helpers.
 * Business logic depends on this contract, never on a vendor SDK/API.
 */
export class AIProvider {
  constructor({ name, apiKey, model, timeoutMs = 15_000 }) {
    this.name = name;
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  isAvailable() {
    return Boolean(this.apiKey);
  }

  async generateHint() {
    throw new Error(`${this.name} provider does not implement generateHint`);
  }
}

export const SYSTEM_PROMPT = `Ты — умный репетитор для подготовки к ЕГЭ и ОГЭ.

Отвечай только на русском языке.

Проанализируй переданное задание и подготовь сразу ТРИ уровня подсказки.

ВАЖНО:
- hint20 — правило только, не раскрывай способ решения полностью.
- hint50 — объясни идею и нужное правило/формулу, но не раскрывай всё решение.
- full — полное объяснение решения с правилом, последовательностью действий и итоговым ответом. И также циферки ответа правильный напиши

Верни ТОЛЬКО валидный JSON.

Структура ответа:

{
  "hint20": "string",
  "hint50": "string",
  "full": {
    "rule": "string",
    "solution": "string",
    "answer": "string",
    "answerNnumbers" : "string", 
    "example": "string"
  }
}

Не используй markdown.
Не оборачивай JSON в \`\`\`.
Все двойные кавычки внутри строк должны быть корректно экранированы.
Не добавляй никакого текста до или после JSON.`;

// `Ты — умный репетитор для подготовки к ЕГЭ/ОГЭ.
// Отвечаешь только на русском языке.
// Даёшь подсказки разного уровня: намёк, идея или полное объяснение.
// Никогда не давай готовый ответ — помогай думать.
// Формат ответа строго JSON: { "title": string, "text": string, "example": string|null }`;

// export function buildPrompt(subject, taskText, level) {
//   const levelMap = {
//     hint20: "краткий намёк (1-2 предложения, не раскрывай решение)",
//     hint50: "идею решения (3-5 предложений)",
//     full: "полное объяснение с правилом и примером",
//   };
//   return `Предмет: ${subject}
// Задание: ${String(taskText || "").slice(0, 400)}
// Уровень подсказки: ${levelMap[level] || levelMap.hint20}

// Ответь в JSON: { "title": "...", "text": "...", "example": "..." }`;
// }
export function buildPrompt(subject, taskText) {
  return `Предмет: ${subject}

Задание:
${String(taskText || "").slice(0, 1500)}

Подготовь сразу три уровня подсказки:
1. hint20
2. hint50
3. full

Для full обязательно укажи:
- правило или формулу;
- пошаговое решение;
- итоговый ответ;
- короткий похожий пример.`;
}
export async function postJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function parseChatCompletion(data, providerName) {
  const raw = data?.choices?.[0]?.message?.content;

  if (!raw) {
    throw new Error(`Empty response from ${providerName}`);
  }

  const content = String(raw).trim();

  // 1. Если модель вернула JSON внутри markdown-блока:
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // 2. Сначала пробуем обычный JSON
  try {
    const parsed = JSON.parse(cleaned);

    return {
      title: parsed.title || "Объяснение ИИ",
      text: parsed.text || "Не удалось получить объяснение.",
      example: parsed.example || null,
    };
  } catch (jsonError) {
    console.warn(
      `[AI] ${providerName} returned non-JSON or malformed JSON. Using text fallback.`,
      {
        parseError: jsonError.message,
        preview: content.slice(0, 500),
      },
    );
  }

  // 3. Fallback: считаем ответ обычным текстом
  return {
    title: "Объяснение ИИ",
    text: content,
    example: null,
  };
}
