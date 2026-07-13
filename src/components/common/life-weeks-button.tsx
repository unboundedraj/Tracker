"use client";

import { useState } from "react";
import { orbitron } from "@/lib/fonts";
import LifeWeeksModal from "./life-weeks-modal";

export default function LifeWeeksButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`misc-todos-button ${orbitron.className}`}
        aria-label="Open Life in Weeks"
        title="Life in Weeks"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path d="M1 6.5S3.2 2 6.5 2 12 6.5 12 6.5 9.8 11 6.5 11 1 6.5 1 6.5z" />
          <circle cx="6.5" cy="6.5" r="1.8" />
        </svg>
      </button>
      {isOpen && <LifeWeeksModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
