"use client";

import { useState } from "react";
import { orbitron } from "@/lib/fonts";
import TodaysAgendaModal from "./todays-agenda-modal";

export default function TodaysAgendaButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`misc-todos-button ${orbitron.className}`}
        aria-label="Open Today's Agenda"
      >
        Today&apos;s Agenda
      </button>

      {isOpen && <TodaysAgendaModal isOpen={isOpen} onClose={() => setIsOpen(false)} />}
    </>
  );
}
