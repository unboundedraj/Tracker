"use client";

import { useState } from "react";
import ExportDataModal from "./export-data-modal";

export default function ExportDataButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="export-data-btn"
        onClick={() => setIsOpen(true)}
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
