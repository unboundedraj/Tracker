"use client";

import { useState } from "react";
import ExportDataModal from "./export-data-modal";
import { getMonthKey } from "@/utils/date";
import type { HabitMonthDocument } from "@/types/habits";

const EXPORT_FORMAT_KEY = "tracker-export-format";

export default function ExportDataButton() {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = async () => {
    if (window.localStorage.getItem(EXPORT_FORMAT_KEY) !== "json") {
      setIsOpen(true);
      return;
    }

    const response = await fetch(`/api/habits/${getMonthKey(new Date())}`, { credentials: "include", cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not export data (status ${response.status}).`);
    }
    const payload = (await response.json()) as { document: HabitMonthDocument | null };
    if (!payload.document) {
      throw new Error("No habit data found for this month.");
    }
    const blob = new Blob([JSON.stringify(payload.document, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `habit-data-${getMonthKey(new Date())}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      <button
        type="button"
        className="export-data-btn"
        onClick={() => {
          void handleClick().catch((error: unknown) => {
            window.alert(error instanceof Error ? error.message : "Could not export data.");
          });
        }}
        aria-label="Export monthly report"
        title="Export monthly report"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          aria-hidden="true"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.4"
          stroke="currentColor"
        >
          <path d="M7.5 1.5v8M4.5 6.5l3 3 3-3" />
          <path d="M2 11.5v1a1 1 0 001 1h9a1 1 0 001-1v-1" />
        </svg>
        <span className="export-data-btn__label">Export</span>
      </button>
      {isOpen && <ExportDataModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
