/**
 * knowledgeService.js
 *
 * Lookup strategy (cost-optimized):
 *   1. Load local JSON → score entries by keyword coverage
 *   2. If score ≥ MIN_SCORE → return JSON entry (free, instant)
 *   3. If no match       → call aiService (charged, cached server-side)
 *
 * AI is NEVER called when JSON already has a suitable answer.
 */
import { rankMatches } from "../utils/textMatcher.js";
import * as aiService from "./aiService.js";

const cache = {};

const SUBJECT_FILES = {
  russian: "knowledge/russian.json",
  math: "knowledge/math.json",
};

const DEFAULT_MATCH_THRESHOLD = 1.5;
const configuredThreshold = Number(import.meta.env.VITE_KNOWLEDGE_MATCH_THRESHOLD);
export const MATCH_THRESHOLD = Number.isFinite(configuredThreshold) && configuredThreshold >= 0
  ? configuredThreshold
  : DEFAULT_MATCH_THRESHOLD;

export async function loadKnowledge(subject) {
  if (cache[subject]) return cache[subject];

  const file = SUBJECT_FILES[subject];
  if (!file) {
    console.warn(`[SmartEGE] No local knowledge base for subject "${subject}"`);
    cache[subject] = [];
    return cache[subject];
  }
  const url = chrome.runtime.getURL(file);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache[subject] = data;
    return data;
  } catch (err) {
    console.warn(`[SmartEGE] Failed to load knowledge for "${subject}":`, err);
    return [];
  }
}

/**
 * Find the best hint entry for a task.
 * Returns a knowledge entry (source: 'json') or an AI result (source: 'ai'/'ai-cache').
 * Returns null only if both sources fail.
 *
 * @param {string}      subject
 * @param {string}      taskText
 * @param {number|null} taskNumber
 */
export async function findHint(subject, taskText, taskNumber = null) {
  // 1. Try local JSON first
  const entries = await loadKnowledge(subject);
  const result = rankMatches(entries, taskText, taskNumber, MATCH_THRESHOLD);

  console.debug("[SmartEGE] Knowledge match ranking:", {
    subject,
    taskNumber,
    reason: result.reason,
    selected: result.match?.title || "no_match",
    score: result.score,
    threshold: MATCH_THRESHOLD,
    matchedKeywords: result.matchedKeywords,
    top5: result.topMatches,
  });

  if (result.match) {
    return { ...result.match, _source: "json", _match: result };
  }

  // 2. No JSON match → ask AI (will hit backend cache first)
  console.debug("[SmartEGE] No JSON match, trying AI fallback");
  try {
    const aiResult = await aiService.getHint({
      subject,
      taskText,
      level: "hint20", // backend returns a structured entry
    });

    if (aiResult && !aiResult.error) {
      return {
        id: `ai_${Date.now()}`,
        title: aiResult.title || "Объяснение ИИ",
        keywords: [],
        hint20: aiResult.text,
        hint50: aiResult.text,
        full: { rule: aiResult.text, example: aiResult.example || null },
        _source: aiResult.source || "ai",
      };
    }

    if (aiResult && aiResult.error) {
      console.warn(
        "[SmartEGE] AI returned error:",
        aiResult.error,
        aiResult.code || "",
      );
      const detailText = aiResult.detail ? ` — ${aiResult.detail}` : "";
      const errorMessage = `${aiResult.error}${detailText}`;

      return {
        id: "no_match",
        title: "Подходящая подсказка не найдена",
        keywords: [],
        hint20: `Нет подходящей подсказки в базе знаний. AI недоступен: ${errorMessage}`,
        hint50: `Нет подходящей подсказки в базе знаний. AI недоступен: ${errorMessage}`,
        full: {
          rule: `Нет подходящей подсказки в базе знаний. AI недоступен: ${errorMessage}`,
          example: null,
        },
        _source: "no_match",
      };
    }
  } catch (err) {
    console.warn("[SmartEGE] AI fallback error:", err.message);
  }

  return {
    id: "no_match",
    title: "Подходящая подсказка не найдена",
    keywords: [],
    hint20:
      "В базе знаний нет записи, подходящей к этому заданию.",
    hint50:
      "Попробуйте уточнить условие задания или включить AI-подсказки.",
    full: {
      rule: "Совпадение не достигло настроенного порога. Другая тема не подставляется, чтобы не показать нерелевантное объяснение.",
      example: null,
    },
    _source: "no_match",
  };
}
