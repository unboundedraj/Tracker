import { AppShell } from "@/components/layout/app-shell";
import { HabitTracker } from "@/components/common/habits/habit-tracker";
import { MiscellaneousTodosButton } from "@/components/common/misc-todos-button";
import ShoppingListButton from "@/components/common/shopping-list-button";
import RandomThoughtsButton from "@/components/common/random-thoughts-button";
import { orbitron } from "@/lib/fonts";
import Link from "next/link";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getMonthKey } from "@/utils/date";
import { resolveHabitMonthDocument } from "@/lib/habit-month-server";

export default async function Home() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get(AUTH_COOKIE_NAME)?.value === "1";
  const initialHabitMonth = isAuthenticated ? await resolveHabitMonthDocument(getMonthKey(new Date())) : null;

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
        <HabitTracker initialDocument={initialHabitMonth} />
      </div>
    </AppShell>
  );
}
