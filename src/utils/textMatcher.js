/**
 * textMatcher.js
 *
 * Rule-based matcher for SmartEGE.
 *
 * Supports:
 * 1. exact task number
 * 2. required keywords
 * 3. anyOf keywords
 * 4. negative keywords
 * 5. aliases / patterns
 * 6. regular keywords
 * 7. custom weights
 * 8. confidence
 * 9. topMatches
 *
 * Works with old JSON entries too.
 */

// ---------------------------------------------------------
// Weak keywords
// ---------------------------------------------------------

const WEAK_KEYWORDS = new Set([
  "ответ",
  "вычислить",
  "значение",
  "задача",
  "найти",
  "определить",
  "решение",
  "число",
  "точка",
  "отрезок",
  "сторона",
  "угол",
  "площадь",
]);

// ---------------------------------------------------------
// Russian suffixes for lightweight stemming
// ---------------------------------------------------------

const RUSSIAN_SUFFIXES = [
  "иями",
  "ями",
  "ами",
  "ого",
  "ему",
  "ому",
  "ими",
  "ыми",
  "ее",
  "ие",
  "ые",
  "ое",
  "ей",
  "ий",
  "ый",
  "ой",
  "ем",
  "ам",
  "ом",
  "им",
  "ым",
  "ах",
  "ях",
  "ов",
  "ев",
  "у",
  "ю",
  "ы",
  "ь",
  "а",
  "я",
  "и",
  "е",
  "о",
];

// ---------------------------------------------------------
// Stemming
// ---------------------------------------------------------

function stemWord(word) {
  if (!word || word.length < 4) return word;

  for (const suffix of RUSSIAN_SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}

function normalizeWord(word) {
  return stemWord(String(word).toLowerCase());
}

// ---------------------------------------------------------
// Tokenization
// ---------------------------------------------------------

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(normalizeWord);
}

// ---------------------------------------------------------
// Public normalization
// ---------------------------------------------------------

export function normalizeText(text) {
  return tokenize(text).join(" ");
}

// ---------------------------------------------------------
// Task number extraction
// ---------------------------------------------------------

function entryTaskNumbers(entry) {
  const values = [
    ...(Array.isArray(entry?.taskNumbers) ? entry.taskNumbers : []),

    ...(Array.isArray(entry?.hintFor) ? entry.hintFor : []),

    entry?.taskNumber,
  ];

  return values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));
}

// ---------------------------------------------------------
// Keyword normalization
// ---------------------------------------------------------

function normalizedKeyword(keyword) {
  return tokenize(keyword);
}

// ---------------------------------------------------------
// Keyword score
// ---------------------------------------------------------

function getKeywordWeight(entry, keyword) {
  const customWeights = entry?.weights;

  if (
    customWeights &&
    typeof customWeights === "object" &&
    typeof customWeights[keyword] === "number"
  ) {
    return customWeights[keyword];
  }

  const tokens = normalizedKeyword(keyword);

  if (tokens.length === 0) return 0;

  if (tokens.length === 1 && WEAK_KEYWORDS.has(tokens[0])) {
    return 0.25;
  }

  // Multi-word phrase = more informative
  if (tokens.length >= 3) {
    return 3;
  }

  if (tokens.length === 2) {
    return 2;
  }

  return 1;
}

// ---------------------------------------------------------
// Check whether phrase exists
// ---------------------------------------------------------

function phraseMatches(text, phrase) {
  const normalizedPhrase = normalizeText(phrase);

  if (!normalizedPhrase) return false;

  return text.includes(normalizedPhrase);
}

// ---------------------------------------------------------
// Match one keyword
// ---------------------------------------------------------

function calculateKeywordMatch(normalizedText, entry, keyword) {
  const normalizedKeywordText = normalizeText(keyword);

  if (!normalizedKeywordText) {
    return {
      matched: false,
      score: 0,
    };
  }

  // Exact phrase
  if (normalizedText.includes(normalizedKeywordText)) {
    return {
      matched: true,
      score: getKeywordWeight(entry, keyword),
      type: "phrase",
    };
  }

  // Token matching
  const textTokens = new Set(normalizedText.split(" "));

  const keywordTokens = normalizedKeywordText.split(" ");

  const matchedTokens = keywordTokens.filter((token) => textTokens.has(token));

  if (matchedTokens.length === 0) {
    return {
      matched: false,
      score: 0,
    };
  }

  const ratio = matchedTokens.length / keywordTokens.length;

  const baseWeight = getKeywordWeight(entry, keyword);

  return {
    matched: true,
    score: Number((baseWeight * ratio * 0.7).toFixed(3)),
    type: "tokens",
  };
}

// ---------------------------------------------------------
// Get all searchable phrases from entry
// ---------------------------------------------------------

function getAllPatterns(entry) {
  return [
    ...(Array.isArray(entry?.keywords) ? entry.keywords : []),

    ...(Array.isArray(entry?.aliases) ? entry.aliases : []),

    ...(Array.isArray(entry?.patterns) ? entry.patterns : []),
  ].filter(Boolean);
}

// ---------------------------------------------------------
// Calculate one entry score
// ---------------------------------------------------------

export function scoreMatch(entry, taskText) {
  const normalizedText = normalizeText(taskText);

  let score = 0;

  const matchedKeywords = [];
  const negativeMatches = [];

  // -------------------------------------------------------
  // REQUIRED
  // -------------------------------------------------------

  const required = Array.isArray(entry?.required) ? entry.required : [];

  let requiredMatched = true;

  for (const keyword of required) {
    const result = calculateKeywordMatch(normalizedText, entry, keyword);

    if (result.matched) {
      score += 3.5;
      matchedKeywords.push(keyword);
    } else {
      requiredMatched = false;
    }
  }

  // -------------------------------------------------------
  // ANY OF
  // -------------------------------------------------------

  const anyOf = Array.isArray(entry?.anyOf) ? entry.anyOf : [];

  let anyOfMatched = false;

  for (const keyword of anyOf) {
    const result = calculateKeywordMatch(normalizedText, entry, keyword);

    if (result.matched) {
      anyOfMatched = true;
      score += 2.5;
      matchedKeywords.push(keyword);
      break;
    }
  }

  // -------------------------------------------------------
  // NEGATIVE
  // -------------------------------------------------------

  const negative = Array.isArray(entry?.negative) ? entry.negative : [];

  for (const keyword of negative) {
    if (phraseMatches(normalizedText, keyword)) {
      negativeMatches.push(keyword);
    }
  }

  // Strong penalty
  if (negativeMatches.length > 0) {
    score -= negativeMatches.length * 5;
  }

  // -------------------------------------------------------
  // KEYWORDS / ALIASES / PATTERNS
  // -------------------------------------------------------

  const patterns = getAllPatterns(entry);

  for (const keyword of patterns) {
    const result = calculateKeywordMatch(normalizedText, entry, keyword);

    if (!result.matched) continue;

    // Avoid double-counting required/anyOf
    if (matchedKeywords.includes(keyword)) {
      continue;
    }

    score += result.score;
    matchedKeywords.push(keyword);
  }

  // -------------------------------------------------------
  // Prevent invalid required combinations
  // -------------------------------------------------------

  if (required.length > 0 && !requiredMatched) {
    score -= 4;
  }

  // If anyOf exists and none matched
  if (anyOf.length > 0 && !anyOfMatched) {
    score -= 3;
  }

  return {
    score: Number(Math.max(score, 0).toFixed(3)),

    matchedKeywords,

    negativeMatches,

    requiredMatched,

    anyOfMatched,
  };
}

// ---------------------------------------------------------
// Confidence
// ---------------------------------------------------------

function calculateConfidence(score, secondBestScore, threshold) {
  if (score <= 0) return 0;

  if (score < threshold) {
    return Number(Math.min(score / threshold, 0.49).toFixed(2));
  }

  // How far above threshold are we?
  const thresholdFactor = Math.min(score / Math.max(threshold, 1), 2) / 2;

  // Difference from second candidate
  let separation = 1;

  if (secondBestScore != null && secondBestScore > 0) {
    separation = Math.max(0, score - secondBestScore) / score;
  }

  const confidence = 0.65 * thresholdFactor + 0.35 * separation;

  return Number(Math.min(confidence, 1).toFixed(2));
}

// ---------------------------------------------------------
// Public candidate
// ---------------------------------------------------------

function toPublicMatch(result) {
  return {
    id: result.entry?.id,
    title: result.entry?.title,
    score: result.score,
    confidence: result.confidence,
    matchedKeywords: result.matchedKeywords,
    negativeMatches: result.negativeMatches,
    requiredMatched: result.requiredMatched,
    anyOfMatched: result.anyOfMatched,
  };
}

// ---------------------------------------------------------
// MAIN MATCHER
// ---------------------------------------------------------

export function rankMatches(
  entries,
  taskText,
  extraTextsOrTaskNumber = [],
  taskNumber = null,
  minScore = 1.5,
) {
  const resolvedTaskNumber =
    typeof extraTextsOrTaskNumber === "number" ||
    Number.isInteger(extraTextsOrTaskNumber)
      ? Number(extraTextsOrTaskNumber)
      : taskNumber;

  const resolvedExtraTexts = Array.isArray(extraTextsOrTaskNumber)
    ? extraTextsOrTaskNumber
    : [];

  const combinedText = [taskText, ...resolvedExtraTexts]
    .filter(Boolean)
    .join("\n");

  console.debug("[SmartEGE] rankMatches called with:", {
    entriesCount: Array.isArray(entries) ? entries.length : 0,

    taskText,
    extraTexts: resolvedExtraTexts,

    taskNumber: resolvedTaskNumber,

    minScore,
  });

  // -------------------------------------------------------
  // Empty DB
  // -------------------------------------------------------

  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      match: null,
      score: 0,
      confidence: 0,
      reason: "no_entries",
      matchedKeywords: [],
      topMatches: [],
    };
  }

  // -------------------------------------------------------
  // EXACT TASK NUMBER
  // -------------------------------------------------------

  if (resolvedTaskNumber != null) {
    const exactMatches = entries.filter((entry) =>
      entryTaskNumbers(entry).includes(Number(resolvedTaskNumber)),
    );

    if (exactMatches.length > 0) {
      const winner = exactMatches[0];

      return {
        match: winner,
        score: 1000,
        confidence: 1,
        reason: "exact_task_number",
        matchedKeywords: winner.keywords || [],
        topMatches: exactMatches.slice(0, 5).map((entry) => ({
          id: entry.id,
          title: entry.title,
          score: 1000,
          confidence: 1,
          matchedKeywords: entry.keywords || [],
        })),
      };
    }
  }

  // -------------------------------------------------------
  // SCORE ALL ENTRIES
  // -------------------------------------------------------

  const ranked = entries
    .map((entry, index) => {
      const result = scoreMatch(entry, combinedText);

      return {
        entry,
        index,
        ...result,
      };
    })
    .sort((a, b) => {
      return (
        b.score - a.score ||
        b.matchedKeywords.length - a.matchedKeywords.length ||
        a.index - b.index
      );
    });

  const winner = ranked[0];

  if (!winner) {
    return {
      match: null,
      score: 0,
      confidence: 0,
      reason: "no_match",
      matchedKeywords: [],
      topMatches: [],
    };
  }

  const secondBest = ranked[1]?.score ?? null;

  const confidence = calculateConfidence(winner.score, secondBest, minScore);

  // Add calculated confidence
  winner.confidence = confidence;

  // -------------------------------------------------------
  // NEGATIVE MATCH = reject
  // -------------------------------------------------------

  if (winner.negativeMatches && winner.negativeMatches.length > 0) {
    return {
      match: null,
      score: winner.score,
      confidence: 0,
      reason: "negative_keywords",
      matchedKeywords: winner.matchedKeywords,
      topMatches: ranked.slice(0, 5).map(toPublicMatch),
    };
  }

  // -------------------------------------------------------
  // BELOW THRESHOLD
  // -------------------------------------------------------

  if (winner.score < minScore) {
    return {
      match: null,
      score: winner.score,
      confidence,
      reason: "below_threshold",
      matchedKeywords: winner.matchedKeywords,
      topMatches: ranked.slice(0, 5).map(toPublicMatch),
    };
  }
  // -------------------------------------------------------
  // FINAL RESULT
  // -------------------------------------------------------
  return {
    match: winner.entry,
    score: winner.score,
    confidence,
    reason: winner.requiredMatched ? "keyword_relevance" : "partial_relevance",

    matchedKeywords: winner.matchedKeywords,

    topMatches: ranked.slice(0, 5).map(toPublicMatch),
  };
}

// ---------------------------------------------------------
// Backwards-compatible API
// ---------------------------------------------------------

export function findBestMatch(
  entries,
  taskText,
  taskNumber = null,
  minScore = 1.5,
) {
  return rankMatches(entries, taskText, taskNumber, minScore).match;
}

// ---------------------------------------------------------
// Truncate helper
// ---------------------------------------------------------

export function truncate(text, maxLength = 120) {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trimEnd() + "…";
}
