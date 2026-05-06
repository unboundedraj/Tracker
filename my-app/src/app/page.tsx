import { AppShell } from "@/components/layout/app-shell";
import { HabitTracker } from "@/components/common/habits/habit-tracker";

export default function Home() {
  return (
    <AppShell>
      <div className="habit-page">
        <h1 className="habit-page__title">Daily Habit Tracker</h1>
        <HabitTracker />
      </div>
    </AppShell>
  );
}
