"use client";

import { useState } from "react";
import { MiscellaneousTodosModal } from "./misc-todos-modal";

export function MiscellaneousTodosButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button className="misc-todos-button" onClick={() => setIsModalOpen(true)}>
        Miscellaneous Todos
      </button>
      <MiscellaneousTodosModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
