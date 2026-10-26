import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import ExportDataButton from "@/components/common/export-data-button";
import SettingsButton from "@/components/common/settings-button";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell">
      <div className="app-shell__frame">
        <div className="app-shell__top-controls">
          <ThemeToggle />
          <SettingsButton />
          <ExportDataButton />
        </div>
        <div className="app-shell__glow app-shell__glow--top" />
        <div className="app-shell__glow app-shell__glow--bottom" />
        <div className="app-shell__content">{children}</div>
      </div>
    </main>
  );
}
