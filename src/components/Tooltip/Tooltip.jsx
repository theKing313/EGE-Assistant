import React, { useState, useEffect } from "react";
import HintContent from "../HintContent/HintContent.jsx";
import * as hintService from "../../services/hintService.js";
import * as statsService from "../../services/statsService.js";
import * as subscriptionService from "../../services/subscriptionService.js";
import PremiumModal from "../PremiumModal/PremiumModal.jsx";
import { findHint } from "../../services/knowledgeService.js";

/**
 * Tooltip — new UX:
 *   1. Opens with the complete rule and example already visible.
 *   2. Keeps one level button below the hint text.
 */
export default function Tooltip({
  entry,
  taskText,
  taskNumber,
  subject,
  onClose,
}) {
  const [activeLevel, setActiveLevel] = useState("hint50");
  const [currentEntry, setCurrentEntry] = useState(entry);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    subscriptionService.getStatus().then((status) => {
      setIsPremium(status.plan === "premium");
    });
  }, []);

  // Record the initial hint view
  useEffect(() => {
    if (!entry) return;
    statsService
      .recordHintView({
        subject,
        taskNumber,
        topic: entry.title,
        level: "full",
      })
      .catch(() => {});
  }, [entry]);

  const handleLevelChange = (levelId) => {
    if (levelId === "full" && !isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setActiveLevel(levelId);
    if (!entry) return;
    statsService
      .recordHintView({
        subject,
        taskNumber,
        topic: entry.title,
        level: levelId,
      })
      .catch(() => {});
  };

  const content = currentEntry
    ? hintService.getContent(currentEntry, isPremium ? "full" : "hint50")
    : null;

  const handlePurchased = async () => {
    subscriptionService.invalidateCache();
    setIsPremium(true);
    const fullEntry = await findHint(subject, taskText, taskNumber, [], "full");
    if (fullEntry) setCurrentEntry(fullEntry);
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
      {/* Header */}
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

      {/* Content area */}
      <div className="sege-tooltip__body">
        {!entry && (
          <div className="sege-tooltip__loading">
            <span className="sege-tooltip__loading-spinner" />
            <span>Загружаем подсказку…</span>
          </div>
        )}

        {entry && content && <HintContent content={content} />}
      </div>

      {/* Level switcher — shown below content */}
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
                <span className="sege-tooltip__level-label">Полный ответ</span>
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
