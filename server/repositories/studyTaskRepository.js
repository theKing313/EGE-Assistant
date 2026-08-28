/**
 * studyTaskRepository.js — study history and review list.
 * One row per user + task_key (upsert). Does not replace usage_logs.
 */
import { query } from "../config/database.js";

export function makeTaskKey({ subject, taskId, taskNumber, taskText }) {
  const subj = (subject || "unknown").toLowerCase();
  if (taskId != null && String(taskId).trim() !== "") {
    return `${subj}:id:${String(taskId).trim()}`;
  }
  const number = taskNumber != null ? String(taskNumber) : "x";
  const snippet = String(taskText || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return `${subj}:n:${number}:${snippet || "empty"}`;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    taskKey: row.task_key,
    subject: row.subject,
    taskType: row.task_type,
    taskNumber: row.task_number,
    taskId: row.task_id,
    topic: row.topic,
    hintLevel: row.hint_level,
    hintSource: row.hint_source,
    aiUsed: row.ai_used,
    status: row.status,
    needsReview: row.needs_review,
    sourceUrl: row.source_url,
    openedAt: row.opened_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

const RANK = { viewed: 1, in_progress: 2, completed: 3 };

export async function findByKey(userId, taskKey) {
  const res = await query(
    `SELECT * FROM study_tasks WHERE user_id = $1 AND task_key = $2 LIMIT 1`,
    [userId, taskKey],
  );
  return mapRow(res.rows[0]);
}

export async function upsertOpen(userId, payload) {
  const existing = await findByKey(userId, payload.taskKey);
  const nextStatus = payload.status || "viewed";
  const mergedStatus =
    existing && RANK[existing.status] > RANK[nextStatus]
      ? existing.status
      : nextStatus;

  const completedAt =
    mergedStatus === "completed"
      ? existing?.completedAt || new Date()
      : existing?.status === "completed" && mergedStatus !== "completed"
        ? null
        : existing?.completedAt || null;

  const res = await query(
    `INSERT INTO study_tasks (
        user_id, task_key, subject, task_type, task_number, task_id, topic,
        hint_level, hint_source, ai_used, status, needs_review, source_url, completed_at
      )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (user_id, task_key) DO UPDATE
       SET subject      = COALESCE(EXCLUDED.subject, study_tasks.subject),
           task_type    = COALESCE(EXCLUDED.task_type, study_tasks.task_type),
           task_number  = COALESCE(EXCLUDED.task_number, study_tasks.task_number),
           task_id      = COALESCE(EXCLUDED.task_id, study_tasks.task_id),
           topic        = COALESCE(EXCLUDED.topic, study_tasks.topic),
           hint_level   = COALESCE(EXCLUDED.hint_level, study_tasks.hint_level),
           hint_source  = COALESCE(EXCLUDED.hint_source, study_tasks.hint_source),
           ai_used      = study_tasks.ai_used OR EXCLUDED.ai_used,
           status       = $15,
           needs_review = CASE
             WHEN $16::boolean IS NULL THEN study_tasks.needs_review
             ELSE $16
           END,
           source_url   = COALESCE(EXCLUDED.source_url, study_tasks.source_url),
           completed_at = $17,
           updated_at   = NOW()
     RETURNING *`,
    [
      userId,
      payload.taskKey,
      payload.subject || null,
      payload.taskType || null,
      payload.taskNumber != null ? String(payload.taskNumber) : null,
      payload.taskId != null ? String(payload.taskId) : null,
      payload.topic || null,
      payload.hintLevel || null,
      payload.hintSource || null,
      Boolean(payload.aiUsed),
      nextStatus,
      payload.needsReview ?? false,
      payload.sourceUrl || null,
      mergedStatus === "completed" ? completedAt || new Date() : completedAt,
      mergedStatus,
      payload.needsReview === undefined ? null : Boolean(payload.needsReview),
      mergedStatus === "completed" ? completedAt || new Date() : completedAt,
    ],
  );
  return mapRow(res.rows[0]);
}

export async function updateStatus(userId, taskKey, status, extras = {}) {
  const completedAtSql =
    status === "completed" ? "COALESCE(study_tasks.completed_at, NOW())" : "study_tasks.completed_at";
  const clearReview = status === "completed";

  const res = await query(
    `UPDATE study_tasks
        SET status = $3,
            hint_level = COALESCE($4, hint_level),
            hint_source = COALESCE($5, hint_source),
            ai_used = ai_used OR $6,
            topic = COALESCE($7, topic),
            needs_review = CASE WHEN $8 THEN FALSE ELSE needs_review END,
            completed_at = ${completedAtSql},
            updated_at = NOW()
      WHERE user_id = $1 AND task_key = $2
      RETURNING *`,
    [
      userId,
      taskKey,
      status,
      extras.hintLevel || null,
      extras.hintSource || null,
      Boolean(extras.aiUsed),
      extras.topic || null,
      clearReview,
    ],
  );
  return mapRow(res.rows[0]);
}

export async function setNeedsReview(userId, taskKey, needsReview) {
  const res = await query(
    `UPDATE study_tasks
        SET needs_review = $3,
            updated_at = NOW()
      WHERE user_id = $1 AND task_key = $2
      RETURNING *`,
    [userId, taskKey, Boolean(needsReview)],
  );
  return mapRow(res.rows[0]);
}

export async function listByUser(userId, { limit = 50, offset = 0 } = {}) {
  const res = await query(
    `SELECT * FROM study_tasks
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT $2 OFFSET $3`,
    [userId, Math.min(limit, 100), offset],
  );
  return res.rows.map(mapRow);
}

export async function listReview(userId) {
  const res = await query(
    `SELECT * FROM study_tasks
      WHERE user_id = $1 AND needs_review = TRUE AND status <> 'completed'
      ORDER BY updated_at DESC
      LIMIT 40`,
    [userId],
  );
  return res.rows.map(mapRow);
}

export async function listAllForStats(userId) {
  const res = await query(
    `SELECT subject, task_type, task_number, topic, hint_level, hint_source,
            ai_used, status, needs_review, source_url, opened_at, updated_at, completed_at
       FROM study_tasks
      WHERE user_id = $1`,
    [userId],
  );
  return res.rows;
}

export async function countCompletedInRange(userId, startIso, endIso) {
  const res = await query(
    `SELECT COUNT(*)::int AS count
       FROM study_tasks
      WHERE user_id = $1
        AND status = 'completed'
        AND completed_at >= $2
        AND completed_at < $3`,
    [userId, startIso, endIso],
  );
  return res.rows[0]?.count ?? 0;
}
