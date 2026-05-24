"use client";

import { useState } from "react";
import { orbitron } from "@/lib/fonts";
import RandomThoughtsModal from "./random-thoughts-modal";

export default function RandomThoughtsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`misc-todos-button ${orbitron.className}`}
        aria-label="Open Random Thoughts"
      >
        Random Thoughts
      </button>
      {isOpen && (
        <RandomThoughtsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
