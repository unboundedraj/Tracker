import { AppShell } from "@/components/layout/app-shell";
import { HabitTracker } from "@/components/common/habits/habit-tracker";
import { MiscellaneousTodosButton } from "@/components/common/misc-todos-button";
import ShoppingListButton from "@/components/common/shopping-list-button";
import RandomThoughtsButton from "@/components/common/random-thoughts-button";
import { orbitron } from "@/lib/fonts";
import Link from "next/link";

export default function Home() {
  return (
    <AppShell>
      <div className="habit-page">
        <div className="habit-page__header">
          <h1 className={`habit-page__title ${orbitron.className}`}>Daily Habit Tracker</h1>
        </div>
        <section className="habit-page__feature-bar" aria-label="Tools and features">
          <div className="habit-page__feature-bar-inner">
            <Link href="/focus" className={`focus-mode-button ${orbitron.className}`}>
              Focus Mode
            </Link>
            <MiscellaneousTodosButton />
            <ShoppingListButton />
            <RandomThoughtsButton />
          </div>
        </section>
        <HabitTracker />
      </div>
    </AppShell>
  );
}
