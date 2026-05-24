"use client";

import { useState } from "react";
import { orbitron } from "@/lib/fonts";
import ShoppingListModal from "./shopping-list-modal";

export default function ShoppingListButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`misc-todos-button ${orbitron.className}`}
        aria-label="Open Shopping List"
      >
        Shopping List
      </button>

      {isOpen && <ShoppingListModal isOpen={isOpen} onClose={() => setIsOpen(false)} />}
    </>
  );
}