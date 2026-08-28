/**
 * studyService.js — Premium study history / plan API for the extension.
 */
import { API_BASE_URL } from "../config.js";
import { authFetch, isLoggedIn } from "./authService.js";
import * as subscriptionService from "./subscriptionService.js";

function fingerprint(text) {
  let hash = 0;
  const value = String(text || "");
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return String(hash);
}

export function buildPayload(task, extras = {}) {
  const taskId = task.taskId ?? extras.taskId ?? null;
  const taskNumber = task.taskNumber ?? extras.taskNumber ?? null;
  return {
    subject: task.subject || extras.subject || null,
    taskType: taskNumber != null ? String(taskNumber) : extras.taskType || null,
    taskNumber: taskNumber != null ? String(taskNumber) : null,
    taskId: taskId != null ? String(taskId) : fingerprint(task.taskText),
    topic: extras.topic || task.topic || null,
    hintLevel: extras.hintLevel || null,
    hintSource: extras.hintSource || (extras.aiUsed ? "ai" : "json"),
    aiUsed: Boolean(extras.aiUsed),
    sourceUrl:
      extras.sourceUrl ||
      (typeof location !== "undefined" ? location.href : null),
  };
}

export async function canUseStudyFeatures() {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) return false;
  return subscriptionService.isPremium();
}

export async function record(action, task, extras = {}) {
  if (!(await canUseStudyFeatures())) return null;
  try {
    const res = await authFetch(`${API_BASE_URL}/api/study/tasks/${action}`, {
      method: "POST",
      body: JSON.stringify(buildPayload(task, extras)),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.task || null;
  } catch {
    return null;
  }
}

export async function getDashboard() {
  if (!(await canUseStudyFeatures())) return null;
  const res = await authFetch(`${API_BASE_URL}/api/study/dashboard`);
  if (!res.ok) return null;
  return res.json();
}
export async function getHistory() {
  if (!(await canUseStudyFeatures())) return null;
  const res = await authFetch(`${API_BASE_URL}/api/study/history`);
  if (!res.ok) return null;
  return res.json();
}

export async function getStats() {
  if (!(await canUseStudyFeatures())) return null;
  const res = await authFetch(`${API_BASE_URL}/api/study/stats`);
  if (!res.ok) return null;
  return res.json();
}
