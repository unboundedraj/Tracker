import { AppShell } from "@/components/layout/app-shell";
import { HabitTracker } from "@/components/common/habits/habit-tracker";
import { orbitron } from "@/lib/fonts";

export default function Home() {
  return (
    <AppShell>
      <div className="habit-page">
        <h1 className={`habit-page__title ${orbitron.className}`}>Daily Habit Tracker</h1>
        <HabitTracker />
      </div>
    </AppShell>
  );
}
