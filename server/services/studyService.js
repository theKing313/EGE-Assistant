/**
 * studyService.js — premium study history, plan, stats, recommendations.
 */
import { getBillingConfig } from "../config/billing.js";
import * as studyTaskRepository from "../repositories/studyTaskRepository.js";
import * as analyticsRepository from "../repositories/analyticsRepository.js";
import {
  buildRecommendations,
  computeStreak,
  dateKey,
  statusLabel,
} from "../lib/studyStats.js";

function addCalendarDays(dateKeyStr, days) {
  const [y, m, d] = dateKeyStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

function startOfMonth(todayKey) {
  return `${todayKey.slice(0, 8)}01`;
}

function serializeTask(task) {
  return {
    ...task,
    statusLabel: statusLabel(task.status, task.needsReview),
  };
}

export async function recordTask(userId, body, action) {
  const taskKey = studyTaskRepository.makeTaskKey(body);
  let status = "viewed";
  if (action === "open") status = "viewed";
  if (action === "lamp" || action === "review") status = "in_progress";
  if (action === "complete") status = "completed";

  const extras = {
    ...body,
    taskKey,
    status,
    needsReview: action === "review" ? true : undefined,
  };

  let task = await studyTaskRepository.findByKey(userId, taskKey);

  if (!task) {
    task = await studyTaskRepository.upsertOpen(userId, {
      ...extras,
      needsReview: action === "review",
    });
  } else if (action === "complete") {
    task = await studyTaskRepository.updateStatus(userId, taskKey, "completed", body);
  } else if (action === "lamp") {
    if (task.status !== "completed") {
      task = await studyTaskRepository.updateStatus(
        userId,
        taskKey,
        "in_progress",
        body,
      );
    }
  } else if (action === "open") {
    task = await studyTaskRepository.upsertOpen(userId, extras);
  }

  if (action === "review") {
    task =
      (await studyTaskRepository.setNeedsReview(userId, taskKey, true)) ||
      (await studyTaskRepository.upsertOpen(userId, {
        ...extras,
        needsReview: true,
      }));
  }

  const eventName =
    action === "open"
      ? "task_opened"
      : action === "lamp"
        ? "task_marked_in_progress"
        : action === "complete"
          ? "task_completed"
          : action === "review"
            ? "task_saved_for_review"
            : null;

  if (eventName) {
    await analyticsRepository.track(userId, eventName, {
      subject: task.subject,
      taskType: task.taskType,
      taskNumber: task.taskNumber,
      status: task.status,
      hintLevel: task.hintLevel,
      hintSource: task.hintSource,
    });
  }

  if (action === "complete") {
    const dashboard = await getDashboard(userId);
    await analyticsRepository.track(userId, "study_plan_progress", {
      completedToday: dashboard.plan.completed,
      dailyGoal: dashboard.plan.goal,
      percent: dashboard.plan.percent,
    });
  }

  return serializeTask(task);
}

export async function getHistory(userId) {
  const items = await studyTaskRepository.listByUser(userId, { limit: 80 });
  const groups = new Map();
  const tz = getBillingConfig().timezone;
  const today = dateKey(new Date(), tz);

  for (const item of items) {
    const key = dateKey(item.updatedAt, tz) || today;
    const label =
      key === today
        ? "Сегодня"
        : key === addCalendarDays(today, -1)
          ? "Вчера"
          : key;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(serializeTask(item));
  }

  return {
    items: items.map(serializeTask),
    groups: [...groups.entries()].map(([label, tasks]) => ({ label, tasks })),
  };
}

export async function getDashboard(userId) {
  const billing = getBillingConfig();
  const tz = billing.timezone;
  const today = dateKey(new Date(), tz);
  const rows = await studyTaskRepository.listAllForStats(userId);
  const review = await studyTaskRepository.listReview(userId);

  const completedToday = rows.filter(
    (row) =>
      row.status === "completed" &&
      row.completed_at &&
      dateKey(row.completed_at, tz) === today,
  ).length;
  const inProgress = rows.filter((row) => row.status === "in_progress").length;
  const goal = billing.dailyGoal;
  const percent = Math.min(100, Math.round((completedToday / goal) * 100));

  const completionDates = rows
    .filter((row) => row.status === "completed" && row.completed_at)
    .map((row) => dateKey(row.completed_at, tz));
  const streak = computeStreak(completionDates, today);

  const recommendations = buildRecommendations({
    reviewTasks: review,
    allTasks: rows,
  });

  const continueTask =
    review[0] ||
    rows
      .filter((row) => row.status === "in_progress")
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] ||
    null;

  return {
    plan: {
      title: "План на сегодня",
      goal,
      completed: completedToday,
      inProgress,
      needReview: review.length,
      percent,
    },
    streak,
    review: review.map(serializeTask),
    recommendations: recommendations.messages,
    continueUrl: continueTask?.source_url || continueTask?.sourceUrl || null,
  };
}

export async function getStats(userId) {
  const billing = getBillingConfig();
  const tz = billing.timezone;
  const today = dateKey(new Date(), tz);
  const monthStart = startOfMonth(today);
  const rows = await studyTaskRepository.listAllForStats(userId);
  const review = await studyTaskRepository.listReview(userId);

  const completed = rows.filter((row) => row.status === "completed");
  const completedToday = completed.filter(
    (row) => dateKey(row.completed_at, tz) === today,
  ).length;
  const weekStart = addCalendarDays(today, -6);
  const completedWeek = completed.filter((row) => {
    const key = dateKey(row.completed_at, tz);
    return key && key >= weekStart && key <= today;
  }).length;
  const completedMonth = completed.filter((row) => {
    const key = dateKey(row.completed_at, tz);
    return key && key >= monthStart && key <= today;
  }).length;

  const byType = {};
  const byTopicReview = {};
  let aiHints = 0;
  let jsonHints = 0;

  for (const row of rows) {
    const type = row.task_type || row.task_number;
    if (type) byType[type] = (byType[type] || 0) + 1;
    if (row.ai_used || row.hint_source === "ai") aiHints += 1;
    if (row.hint_source === "json") jsonHints += 1;
    if (row.needs_review && row.topic) {
      byTopicReview[row.topic] = (byTopicReview[row.topic] || 0) + 1;
    }
  }

  const mostPracticed = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  const hardestTopics = Object.entries(byTopicReview)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const firstOpen = rows.reduce((min, row) => {
    const t = new Date(row.opened_at).getTime();
    return t < min ? t : min;
  }, Date.now());
  const daysActive = Math.max(
    1,
    Math.ceil((Date.now() - firstOpen) / 86_400_000),
  );
  const averagePerDay =
    Math.round((completed.length / daysActive) * 10) / 10;

  const streak = computeStreak(
    completed.map((row) => dateKey(row.completed_at, tz)),
    today,
  );
  const recommendations = buildRecommendations({
    reviewTasks: review,
    allTasks: rows,
  });

  return {
    today: {
      completed: completedToday,
      goal: billing.dailyGoal,
    },
    week: completedWeek,
    month: completedMonth,
    completionPercent: Math.min(
      100,
      Math.round((completedToday / billing.dailyGoal) * 100),
    ),
    mostPracticed,
    hardestTopics,
    hardestTopic: hardestTopics[0]?.name || recommendations.hardestTopic,
    aiHintsUsed: aiHints,
    jsonHintsUsed: jsonHints,
    averagePerDay,
    streak,
    recommendations: recommendations.messages,
  };
}

export async function getReview(userId) {
  const items = await studyTaskRepository.listReview(userId);
  return items.map(serializeTask);
}
