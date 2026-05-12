"use client";

import { useState } from "react";
import { orbitron } from "@/lib/fonts";
import { MiscellaneousTodosModal } from "./misc-todos-modal";

export function MiscellaneousTodosButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button className={`misc-todos-button ${orbitron.className}`} onClick={() => setIsModalOpen(true)}>
        Miscellaneous Todos
      </button>
      <MiscellaneousTodosModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
