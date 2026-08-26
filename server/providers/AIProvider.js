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

export const SYSTEM_PROMPT = `
Ты — умный репетитор для подготовки к ЕГЭ и ОГЭ.

Отвечай только на русском языке.

Твоя задача — объяснить правило или решить задачу в зависимости от режима.

Правила:

Для режима HINT порядок ответа обязателен:
1. Сначала назови и объясни основное правило темы.
2. Затем кратко напиши, как применять правило к подобным словам, выражениям или предложениям.
3. В конце добавь один короткий похожий пример с объяснением правила.

Не пересказывай условие задания и не копируй его варианты в ответ.
Не подменяй правило общей фразой вроде «определите нужную букву».

В режиме HINT не указывай правильный ответ, номера вариантов, номера запятых или итоговые вычисления исходного задания.

В режиме FULL можно дать короткое пошаговое решение и один итоговый ответ.

Если это задание с несколькими вариантами, объясни, по какому правилу проверять варианты, но не называй правильные номера.

Для математических задач:
- проверяй вычисления;
- проверяй используемые формулы;
- не делай необоснованных геометрических предположений.

Для русского языка:
- если требуется выбрать варианты, анализируй каждый вариант отдельно;
- различай букву, звук, часть речи, написание и другие формулировки условия.

Верни только валидный JSON:

{
  "title": "string",
  "text": "string",
  "example": "string|null",
  "answer": "string|null"
}

В режиме HINT поле answer должно быть null.
В режиме FULL поле answer должно содержать только один итоговый ответ, без списка альтернатив.
`;
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
export function buildPrompt(subject, taskText, level) {
  const isFull = level === "full";

  return `Предмет: ${subject}

Задание:
${String(taskText || "").slice(0, 1500)}

Режим: ${isFull ? "FULL" : "HINT"}

${
  isFull
    ? "Реши исходное задание кратко: назови правило, покажи ключевые шаги и в конце укажи один итоговый ответ. Не копируй условие целиком."
    : "Дай краткий конспект: сначала основное правило, затем способ применения и один похожий пример. Не решай исходное задание, не указывай его ответ, номера вариантов или номера запятых. Не копируй условие и варианты."
}

Начни поле text с основного правила.
Ограничь text 4-8 короткими предложениями.

Верни только JSON.`;
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
    return normalizeHintResponse(JSON.parse(cleaned));
  } catch (jsonError) {
    try {
      return normalizeHintResponse(
        JSON.parse(escapeControlCharacters(cleaned)),
      );
    } catch {
      console.warn(
        `[AI] ${providerName} returned non-JSON or malformed JSON. Using text fallback.`,
        { parseError: jsonError.message, preview: content.slice(0, 500) },
      );
    }
  }

  // 3. Fallback: считаем ответ обычным текстом
  return {
    title: "Объяснение ИИ",
    text: content,
    example: null,
  };
}

function normalizeHintResponse(parsed) {
  if (
    parsed &&
    ("hint20" in parsed || "hint50" in parsed || "full" in parsed)
  ) {
    return {
      title: parsed.title || "Объяснение ИИ",
      hint20: parsed.hint20 || "Подсказка недоступна.",
      hint50: parsed.hint50 || parsed.hint20 || "Подсказка недоступна.",
      full: {
        rule: parsed.full?.rule || "Объяснение недоступно.",
        formulas: parsed.full?.formulas || "",
        example: parsed.full?.example || null,
      },
    };
  }

  return {
    title: parsed?.title || "Объяснение ИИ",
    text: parsed?.text || "Не удалось получить объяснение.",
    example: parsed?.example || null,
    answer: parsed?.answer || null,
  };
}

function escapeControlCharacters(value) {
  let result = "";
  let insideString = false;
  let escaped = false;

  for (const character of value) {
    if (escaped) {
      result += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      result += character;
      escaped = true;
      continue;
    }
    if (character === '"') {
      result += character;
      insideString = !insideString;
      continue;
    }
    if (insideString) {
      if (character === "\n") result += "\\n";
      else if (character === "\r") result += "\\r";
      else if (character === "\t") result += "\\t";
      else result += character;
    } else {
      result += character;
    }
  }

  return result;
}
