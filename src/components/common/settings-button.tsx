"use client";

import { useState } from "react";
import SettingsModal from "./settings-modal";

export default function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="settings-button"
        onClick={() => setIsOpen(true)}
        aria-label="Open settings"
        title="Settings"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M6.2 1.8h2.6l.4 1.5c.3.1.6.2.9.4l1.4-.7 1.8 1.8-.7 1.4c.2.3.3.6.4.9l1.5.4v2.6l-1.5.4c-.1.3-.2.6-.4.9l.7 1.4-1.8 1.8-1.4-.7c-.3.2-.6.3-.9.4l-.4 1.5H6.2l-.4-1.5c-.3-.1-.6-.2-.9-.4l-1.4.7-1.8-1.8.7-1.4c-.2-.3-.3-.6-.4-.9L.5 10.1V7.5L2 7.1c.1-.3.2-.6.4-.9l-.7-1.4 1.8-1.8 1.4.7c.3-.2.6-.3.9-.4l.4-1.5Z" />
          <circle cx="7.5" cy="8.8" r="2" />
        </svg>
        <span className="settings-button__label">Settings</span>
      </button>
      {isOpen && <SettingsModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
