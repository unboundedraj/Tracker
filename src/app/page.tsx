import { AppShell } from "@/components/layout/app-shell";
import { HabitTracker } from "@/components/common/habits/habit-tracker";
import { MiscellaneousTodosButton } from "@/components/common/misc-todos-button";
import { orbitron } from "@/lib/fonts";
import Link from "next/link";

export default function Home() {
  return (
    <AppShell>
      <div className="habit-page">
        <div className="habit-page__header">
          <div className="habit-page__header-buttons">
            <Link href="/focus" className={`focus-mode-button ${orbitron.className}`}>
              Focus Mode
            </Link>
            <MiscellaneousTodosButton />
          </div>
          <h1 className={`habit-page__title ${orbitron.className}`}>Daily Habit Tracker</h1>
        </div>
        <HabitTracker />
      </div>
    </AppShell>
  );
}
