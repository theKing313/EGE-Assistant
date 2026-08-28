/**
 * analyticsRepository.js — product events without personal data.
 */
import { query } from "../config/database.js";

const ALLOWED = new Set([
  "task_opened",
  "task_marked_in_progress",
  "task_completed",
  "task_saved_for_review",
  "study_plan_progress",
  "premium_conversion",
]);

export async function track(userId, eventName, properties = {}) {
  if (!ALLOWED.has(eventName)) return null;

  const safe = {
    subject: properties.subject || undefined,
    taskType: properties.taskType || undefined,
    taskNumber: properties.taskNumber || undefined,
    status: properties.status || undefined,
    hintLevel: properties.hintLevel || undefined,
    hintSource: properties.hintSource || undefined,
    completedToday: properties.completedToday,
    dailyGoal: properties.dailyGoal,
    percent: properties.percent,
    source: properties.source || undefined,
  };

  const res = await query(
    `INSERT INTO analytics_events (user_id, event_name, properties)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, event_name, created_at`,
    [userId || null, eventName, JSON.stringify(safe)],
  );
  return res.rows[0];
}
