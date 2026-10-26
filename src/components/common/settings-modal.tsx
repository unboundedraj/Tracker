"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { getMonthKey } from "@/utils/date";
import { resetHabitMonth } from "@/services/habit-month-api";
import type { HabitMonthDocument } from "@/types/habits";

type Props = { onClose: () => void };
const EXPORT_FORMAT_KEY = "tracker-export-format";

export default function SettingsModal({ onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState(() => (
    typeof window === "undefined" ? "png" : window.localStorage.getItem(EXPORT_FORMAT_KEY) ?? "png"
  ));
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleReset = async () => {
    if (!window.confirm("Reset this month? All habit names and checks will be restored to the default view.")) {
      return;
    }

    setIsResetting(true);
    setError(null);
    try {
      const document = await resetHabitMonth(getMonthKey(new Date()));
      localStorage.removeItem(`tracker-habits:${document.monthKey}:pending`);
      localStorage.setItem(`tracker-habits:${document.monthKey}:snapshot`, JSON.stringify(document));
      window.dispatchEvent(new CustomEvent<HabitMonthDocument>("tracker:habit-month-reset", { detail: document }));
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not reset this month.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleFormatChange = (nextFormat: string) => {
    setFormat(nextFormat);
    localStorage.setItem(EXPORT_FORMAT_KEY, nextFormat);
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === backdropRef.current) onClose();
  };

  return (
    <div ref={backdropRef} className="settings-modal-backdrop" onMouseDown={handleBackdropClick}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-modal__header">
          <div>
            <p className="settings-modal__eyebrow">Preferences</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button type="button" className="settings-modal__close" onClick={onClose} aria-label="Close settings">×</button>
        </div>
        <div className="settings-modal__body">
          <div className="settings-modal__row">
            <div>
              <strong>Export format</strong>
              <p>Choose the format used by the Export control.</p>
            </div>
            <select value={format} onChange={(event) => handleFormatChange(event.target.value)} aria-label="Export format">
              <option value="png">PNG report</option>
              <option value="json">Raw JSON</option>
            </select>
          </div>
          <div className="settings-modal__row settings-modal__row--danger">
            <div>
              <strong>Reset current month</strong>
              <p>Restore Habit 1–30 and clear every check for this month.</p>
            </div>
            <button type="button" className="settings-modal__danger-button" onClick={() => void handleReset()} disabled={isResetting}>
              {isResetting ? "Resetting..." : "Reset month"}
            </button>
          </div>
          {error && <p className="settings-modal__error" role="alert">{error}</p>}
          <p className="settings-modal__note">Start-of-week layout and reminders are future settings; the tracker currently uses fixed seven-day date blocks.</p>
        </div>
      </section>
    </div>
  );
}
