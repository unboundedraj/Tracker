import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell">
      <div className="app-shell__frame">
        <div className="app-shell__glow app-shell__glow--top" />
        <div className="app-shell__glow app-shell__glow--bottom" />
        <div className="app-shell__content">{children}</div>
      </div>
    </main>
  );
}
