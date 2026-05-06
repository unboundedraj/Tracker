"use client";

import { useMemo } from "react";
import { useHabitMonth } from "@/hooks/use-habit-month";
import type { HabitId } from "@/types/habits";
import { countOnes } from "@/utils/bitstring";
import { getMonthWeekColumns } from "@/utils/date";
import { CircularProgress } from "@/components/ui/circular-progress";
import { LinearProgress } from "@/components/ui/linear-progress";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
});

const yearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
});

function weekBlockWidth(days: number): string {
  const gaps = Math.max(0, days - 1);
  return `calc(${days} * var(--day-size) + ${gaps} * var(--day-gap) + var(--week-pad) + var(--week-pad))`;
}

function weekProgress(
  habitIds: HabitId[],
  checksByHabitId: Record<HabitId, string>,
  startDay: number,
  endDay: number,
  today: number,
): number {
  const effectiveEnd = Math.min(endDay, today);
  const daysCount = Math.max(0, effectiveEnd - startDay + 1);

  if (daysCount === 0 || habitIds.length === 0) {
    return 0;
  }

  let completed = 0;

  for (const habitId of habitIds) {
    const checks = checksByHabitId[habitId] ?? "";

    for (let day = startDay; day <= effectiveEnd; day += 1) {
      if (checks[day - 1] === "1") {
        completed += 1;
      }
    }
  }

  const possible = habitIds.length * daysCount;
  return completed / possible;
}

function habitMonthProgress(checks: string, today: number): number {
  if (today <= 0) {
    return 0;
  }

  const completed = countOnes(checks, today);
  return completed / today;
}

function defaultHabitNameForId(habitId: HabitId): string | null {
  if (!habitId.startsWith("habit-")) {
    return null;
  }

  const suffix = habitId.slice("habit-".length);
  const index = Number(suffix);
  if (!Number.isFinite(index) || index <= 0) {
    return null;
  }

  return `Habit ${index}`;
}

function isRenamedHabit(habitId: HabitId, habitName: string): boolean {
  const defaultName = defaultHabitNameForId(habitId);
  if (!defaultName) {
    return true;
  }

  return habitName.trim() !== defaultName;
}

export function HabitTracker() {
  const { state, today, toggleHabitDay, renameHabit } = useHabitMonth();
  const now = new Date();
  const month = monthFormatter.format(now);
  const year = yearFormatter.format(now);
  const weekColumns = useMemo(() => getMonthWeekColumns(state.daysInMonth), [state.daysInMonth]);
  const trackedHabitIds = useMemo(
    () => state.habits.filter((habit) => isRenamedHabit(habit.id, habit.name)).map((habit) => habit.id),
    [state.habits],
  );
  const fullWeekWidth = useMemo(() => weekBlockWidth(7), []);

  const checksByHabitId = useMemo(() => {
    const mapping: Record<HabitId, string> = {};

    for (const habit of state.habits) {
      mapping[habit.id] = state.recordsByHabitId[habit.id]?.checks ?? "";
    }

    return mapping;
  }, [state.habits, state.recordsByHabitId]);

  return (
    <section className="habit-tracker" aria-label="Habit tracking calendar">
      <header className="habit-tracker__header">
        <div className="habit-tracker__header-date" aria-label={`${month} ${year}`}>
          <div className="habit-tracker__month">{month}</div>
          <div className="habit-tracker__year">{year}</div>
        </div>
        <div className="habit-tracker__weeks">
          {weekColumns.map((week) => (
            <div
              key={week.label}
              className={`habit-tracker__week habit-tracker__week--${week.index + 1}`}
              style={{ width: fullWeekWidth }}
            >
              <CircularProgress
                value={weekProgress(trackedHabitIds, checksByHabitId, week.startDay, week.endDay, today)}
                label={`${week.label} progress`}
                size={40}
              />
              <div className="habit-tracker__week-label">{week.label}</div>
            </div>
          ))}
        </div>
        <div className="habit-tracker__header-progress">Progress</div>
      </header>

      <div className="habit-tracker__grid" role="table">
        <div className="habit-tracker__grid-header" role="rowgroup">
          <div className="habit-tracker__row habit-tracker__row--days" role="row">
            <div className="habit-tracker__cell habit-tracker__cell--sidebar" role="columnheader">
              <div className="habit-sidebar">
                <p className="habit-sidebar__eyebrow">Daily habits</p>
                <h2 className="habit-sidebar__title">Daily habits</h2>
              </div>
            </div>

            <div className="habit-tracker__cell habit-tracker__cell--days" role="columnheader">
              <div className="habit-days">
                {weekColumns.map((week) => (
                  <div
                    key={week.label}
                    className={`habit-days__week habit-days__week--${week.index + 1}`}
                    style={{ width: fullWeekWidth }}
                  >
                    {week.days.map((day) => (
                      <div key={day} className="habit-days__day">
                        {day}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="habit-tracker__cell habit-tracker__cell--progress" role="columnheader" aria-label="Monthly progress" />
          </div>
        </div>

        <div className="habit-tracker__grid-body" role="rowgroup">
          {state.habits.map((habit) => {
            const record = state.recordsByHabitId[habit.id];
            const checks = record?.checks ?? "";

            return (
              <div key={habit.id} className="habit-tracker__row" role="row">
                <div className="habit-tracker__cell habit-tracker__cell--sidebar" role="rowheader">
                  <input
                    key={`${habit.id}:${habit.name}`}
                    className="habit-input"
                    type="text"
                    defaultValue={habit.name}
                    aria-label={`Edit habit name for ${habit.name}`}
                    onBlur={(event) => renameHabit(habit.id, event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </div>

                <div className="habit-tracker__cell habit-tracker__cell--days" role="cell">
                  <div className="habit-days">
                    {weekColumns.map((week) => (
                      <div
                        key={week.label}
                        className={`habit-days__week habit-days__week--${week.index + 1}`}
                        style={{ width: fullWeekWidth }}
                      >
                        {week.days.map((day) => {
                          const checked = checks[day - 1] === "1";
                          const isFuture = day > today;

                          return (
                            <button
                              key={day}
                              type="button"
                              className={`habit-checkbox ${checked ? "habit-checkbox--checked" : ""} ${
                                isFuture ? "habit-checkbox--future" : ""
                              }`}
                              onClick={() => toggleHabitDay(habit.id, day)}
                              aria-pressed={checked}
                              aria-label={`${habit.name} day ${day}`}
                              disabled={isFuture}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="habit-tracker__cell habit-tracker__cell--progress" role="cell">
                  <LinearProgress value={habitMonthProgress(checks, today)} label={`${habit.name} monthly progress`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
