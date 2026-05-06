"use client";

import { useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "tracker-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  const label = useMemo(() => (theme === "dark" ? "Switch to light mode" : "Switch to dark mode"), [theme]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme = (stored === "dark" || stored === "light" ? stored : window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light") as Theme;
    
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  return (
    <button
      type="button"
      className="theme-toggle"
      data-theme={theme}
      onClick={() => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        applyTheme(next);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, next);
        }

        setTheme(next);
      }}
      aria-pressed={theme === "dark"}
      aria-label={label}
      title={label}
    >
      <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
        ☀
      </span>
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb" />
      </span>
      <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
        ☾
      </span>
    </button>
  );
}
