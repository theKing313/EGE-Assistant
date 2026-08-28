import React, { useState, useEffect, useRef } from "react";
import Tooltip from "../Tooltip/Tooltip.jsx";
import { findHint } from "../../services/knowledgeService.js";
import * as studyService from "../../services/studyService.js";

/**
 * Lamp — icon-only button. No label text.
 * Click → load entry → open Tooltip with first hint already visible.
 * For Premium users, opening a task counts as solving it in the study plan.
 */
export default function Lamp({
  taskText,
  taskNumber,
  taskId,
  subject,
  extraTexts = [],
}) {
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const wrapperRef = useRef(null);
  const fetchedRef = useRef(false);

  const task = { taskText, taskNumber, taskId, subject };

  const loadEntry = async () => {
    if (entry) return entry;
    if (fetchedRef.current && loading) return null;
    fetchedRef.current = true;
    setLoading(true);
    setError(false);
    try {
      const result = await findHint(subject, taskText, taskNumber, extraTexts);
      console.log("[SmartEGE] Lamp loadEntry result:", result);
      if (!result) {
        setError(true);
        fetchedRef.current = false;
        return null;
      }
      setEntry(result);
      return result;
    } catch {
      setError(true);
      fetchedRef.current = false;
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (!open) {
      const result = await loadEntry();
      const hint = result || entry;
      studyService
        .record("complete", task, {
          topic: hint?.title,
          hintLevel: "hint50",
          hintSource: hint?._source?.startsWith("ai") ? "ai" : "json",
          aiUsed: Boolean(hint?._source?.startsWith("ai")),
        })
        .catch(() => {});
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="sege-lamp" ref={wrapperRef}>
      <button
        className={[
          "sege-lamp__btn",
          open ? "sege-lamp__btn--active" : "",
          loading ? "sege-lamp__btn--loading" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={handleClick}
        title="SmartEGE — подсказка к заданию"
        aria-expanded={open}
        aria-label="Показать подсказку SmartEGE"
      >
        {loading ? (
          <span className="sege-lamp__spinner" aria-hidden="true" />
        ) : (
          <span className="sege-lamp__icon" aria-hidden="true">
            💡
          </span>
        )}
      </button>

      {open && entry && (
        <Tooltip
          entry={entry}
          taskText={taskText}
          taskNumber={taskNumber}
          taskId={taskId}
          subject={subject}
          onClose={() => setOpen(false)}
        />
      )}

      {open && !entry && error && (
        <div className="sege-tooltip sege-error">
          <p>Не удалось загрузить подсказку.</p>
          <button
            onClick={() => {
              setError(false);
              setOpen(false);
            }}
          >
            Закрыть
          </button>
        </div>
      )}
    </div>
  );
}
