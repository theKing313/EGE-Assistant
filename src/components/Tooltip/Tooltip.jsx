import React, { useState, useEffect } from "react";
import HintContent from "../HintContent/HintContent.jsx";
import * as hintService from "../../services/hintService.js";
import * as subscriptionService from "../../services/subscriptionService.js";
import * as studyService from "../../services/studyService.js";
import PremiumModal from "../PremiumModal/PremiumModal.jsx";
import { findHint } from "../../services/knowledgeService.js";
import * as aiService from "../../services/aiService.js";

/**
 * Tooltip — hint + premium study actions (Готово / Запомнить).
 * Lamp click already marks in_progress. Completing is explicit.
 */
export default function Tooltip({
  entry,
  taskText,
  taskNumber,
  taskId,
  subject,
  onClose,
}) {
  const [activeLevel, setActiveLevel] = useState("hint50");
  const [currentEntry, setCurrentEntry] = useState(entry);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [taskStatus, setTaskStatus] = useState("in_progress");
  const [savedReview, setSavedReview] = useState(false);
  const [busy, setBusy] = useState(false);

  const task = {
    taskText,
    taskNumber,
    taskId,
    subject,
    topic: currentEntry?.title,
  };

  useEffect(() => {
    subscriptionService.getStatus().then((status) => {
      setIsPremium(status.plan === "premium");
    });
  }, []);

  const hintMeta = () => ({
    topic: currentEntry?.title,
    hintLevel: isPremium ? "full" : "hint50",
    hintSource: currentEntry?._source?.startsWith("ai") ? "ai" : "json",
    aiUsed: Boolean(currentEntry?._source?.startsWith("ai")),
  });

  const handleLevelChange = (levelId) => {
    if (levelId === "full" && !isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setActiveLevel(levelId);

    if (levelId === "full") {
      aiService
        .getHint({ subject, taskText, level: "full" })
        .then((result) => {
          if (!result || result.error) return;
          setCurrentEntry((previous) => ({
            ...previous,
            title: result.title || previous?.title || "Разбор задания",
            full: {
              rule: result.text || previous?.full?.rule || "",
              example: result.example || null,
              answer: result.answer || null,
            },
            _source: result.source || "ai",
          }));
        })
        .catch(() => {});
    }
  };

  const content = currentEntry
    ? hintService.getContent(currentEntry, isPremium ? activeLevel : "hint50")
    : null;

  const handlePurchased = async () => {
    subscriptionService.invalidateCache();
    setIsPremium(true);
    setActiveLevel("full");
    const fullEntry = await findHint(subject, taskText, taskNumber, [], "full");
    if (fullEntry) setCurrentEntry(fullEntry);
  };

  const handleComplete = async () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setBusy(true);
    const updated = await studyService.record("complete", task, hintMeta());
    if (updated) {
      setTaskStatus("completed");
      setSavedReview(false);
    }
    setBusy(false);
  };

  const handleReview = async () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setBusy(true);
    const updated = await studyService.record("review", task, hintMeta());
    if (updated) setSavedReview(true);
    setBusy(false);
  };

  const SUBJECT_LABELS = {
    russian: "Русский язык",
    math: "Математика",
    physics: "Физика",
    chemistry: "Химия",
    biology: "Биология",
    history: "История",
  };

  return (
    <div className="sege-tooltip" role="dialog" aria-modal="true">
      <div className="sege-tooltip__header">
        <div className="sege-tooltip__header-left">
          <span className="sege-tooltip__brand">SmartEGE</span>
          {subject && (
            <span className="sege-tooltip__subject">
              {SUBJECT_LABELS[subject] || subject}
            </span>
          )}
        </div>
        <button
          className="sege-tooltip__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>

      <div className="sege-tooltip__body">
        {!entry && (
          <div className="sege-tooltip__loading">
            <span className="sege-tooltip__loading-spinner" />
            <span>Загружаем подсказку…</span>
          </div>
        )}

        {entry && content && <HintContent content={content} />}
      </div>

      <div className="sege-tooltip__study">
        <p className="sege-tooltip__study-note">
          Не просто получить ответ — пройти подготовку и не забыть сложные
          задания.
        </p>
        <div className="sege-tooltip__study-actions">
          <button
            type="button"
            className="sege-tooltip__study-btn sege-tooltip__study-btn--done"
            onClick={handleComplete}
            disabled={busy || taskStatus === "completed"}
          >
            {taskStatus === "completed" ? "Решено" : "Готово"}
          </button>
          <button
            type="button"
            className="sege-tooltip__study-btn sege-tooltip__study-btn--later"
            onClick={handleReview}
            disabled={busy || savedReview || taskStatus === "completed"}
          >
            {savedReview ? "В списке" : "Запомнить задание"}
          </button>
        </div>
      </div>

      {entry && (
        <div className="sege-tooltip__levels">
          {hintService.LEVELS.filter((level) => level.id === "full").map(
            (level) => (
              <button
                key={level.id}
                className={[
                  "sege-tooltip__level-btn",
                  activeLevel === level.id
                    ? "sege-tooltip__level-btn--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  activeLevel === level.id
                    ? {
                        "--active-color": level.color,
                        "--active-bg": level.bg,
                        "--active-border": level.border,
                      }
                    : {}
                }
                onClick={() => handleLevelChange(level.id)}
                title={level.description}
              >
                <span className="sege-tooltip__level-icon">{level.icon}</span>
                <span className="sege-tooltip__level-label">
                  Разобрать это задание
                </span>
              </button>
            ),
          )}
        </div>
      )}

      {showPremiumModal && (
        <PremiumModal
          onClose={() => setShowPremiumModal(false)}
          onPurchased={handlePurchased}
        />
      )}
    </div>
  );
}
