/**
 * Pure study-plan helpers (no DB). Used by the API and unit tests.
 */

export const STATUS_LABELS = {
  viewed: "просмотрено",
  in_progress: "в работе",
  completed: "решено",
};

export function dateKey(value, timeZone = "Europe/Moscow") {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDays(dateKeyStr, days) {
  const [y, m, d] = dateKeyStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

/**
 * Consecutive completion days. Completing at least one task on a day counts.
 * Opening the extension does not affect the streak.
 */
export function computeStreak(completionDateKeys, todayKey) {
  const set = new Set((completionDateKeys || []).filter(Boolean));
  if (set.size === 0) return 0;

  let cursor = set.has(todayKey) ? todayKey : addDays(todayKey, -1);
  if (!set.has(cursor)) return 0;

  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function statusLabel(status, needsReview) {
  if (needsReview && status !== "completed") return "вернуть позже";
  return STATUS_LABELS[status] || status;
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function taskNumberRange(numbers) {
  const nums = [
    ...new Set(numbers.map(Number).filter((n) => Number.isFinite(n))),
  ].sort((a, b) => a - b);
  if (nums.length < 2) return null;

  let bestStart = nums[0];
  let bestEnd = nums[0];
  let start = nums[0];
  let prev = nums[0];

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] <= prev + 2) {
      prev = nums[i];
      if (prev - start >= bestEnd - bestStart) {
        bestStart = start;
        bestEnd = prev;
      }
    } else {
      start = nums[i];
      prev = nums[i];
    }
  }

  if (bestEnd <= bestStart) return null;
  return { from: bestStart, to: bestEnd };
}

function reviewCountMessage(count) {
  if (count === 1) return "У тебя осталось 1 задание на повторение.";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `У тебя осталось ${count} задания на повторение.`;
  }
  return `У тебя осталось ${count} заданий на повторение.`;
}

export function buildRecommendations({ reviewTasks = [], allTasks = [] } = {}) {
  const messages = [];
  const reviewCount = reviewTasks.length;

  const focusTaskNumbers = [
    ...new Set(
      allTasks
        .map((task) => String(task.task_number ?? task.taskNumber ?? ""))
        .filter((number) => number === "10" || number === "12"),
    ),
  ].sort((a, b) => Number(a) - Number(b));

  if (focusTaskNumbers.length > 0) {
    messages.push(
      `Не забудь прорешать задания ${focusTaskNumbers.join(" и ")} — они легко теряются в подготовке.`,
    );
  }

  if (reviewCount > 0) {
    messages.push(reviewCountMessage(reviewCount));
  }

  const reviewTopics = countBy(reviewTasks, (task) => task.topic).filter(
    (row) => row.name && row.name !== "—",
  );

  if (reviewTopics[0]) {
    messages.push(`Повтори тему: ${reviewTopics[0].name}.`);
  }

  const returned = allTasks.filter(
    (task) =>
      task.needs_review || task.needsReview || task.status === "in_progress",
  );
  const range = taskNumberRange(
    returned.map((task) => task.task_number ?? task.taskNumber).filter(Boolean),
  );
  if (range) {
    messages.push(`Ты часто возвращался к заданиям ${range.from}–${range.to}.`);
  }

  return {
    messages,
    reviewCount,
    hardestTopic: reviewTopics[0]?.name || null,
    frequentTaskRange: range,
  };
}
