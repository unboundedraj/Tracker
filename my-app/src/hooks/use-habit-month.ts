"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { Habit, HabitId, HabitMonthRecord, HabitMonthState } from "@/types/habits";
import { createBitstring, isBitstring, toggleBitAtIndex } from "@/utils/bitstring";
import { getDayOfMonth, getDaysInMonth, getMonthKey } from "@/utils/date";

const HABITS_COUNT = 30;

function createDefaultHabits(): Habit[] {
  return Array.from({ length: HABITS_COUNT }, (_, index) => {
    const habitNumber = index + 1;
    return {
      id: `habit-${habitNumber}`,
      name: `Habit ${habitNumber}`,
    };
  });
}

function storageKey(monthKey: string): string {
  return `tracker-habits:${monthKey}`;
}

type PersistedPayload = {
  monthKey: string;
  daysInMonth: number;
  habits: Habit[];
  recordsByHabitId: Record<HabitId, HabitMonthRecord>;
};

const STORE_EVENT = "tracker-habits-store";

function subscribeToMonth(monthKey: string, callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    if (event instanceof CustomEvent) {
      const detail = (event as CustomEvent<string>).detail;
      if (detail && detail !== monthKey) {
        return;
      }
    }

    callback();
  };

  window.addEventListener(STORE_EVENT, handler as EventListener);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(STORE_EVENT, handler as EventListener);
    window.removeEventListener("storage", handler);
  };
}

function emitMonthChange(monthKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: monthKey }));
}

function createDefaultPayload(monthKey: string, daysInMonth: number): PersistedPayload {
  const habits = createDefaultHabits();
  const recordsByHabitId: Record<HabitId, HabitMonthRecord> = {};

  for (const habit of habits) {
    recordsByHabitId[habit.id] = {
      habitId: habit.id,
      monthKey,
      daysInMonth,
      checks: createBitstring(daysInMonth, "0"),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    monthKey,
    daysInMonth,
    habits,
    recordsByHabitId,
  };
}

function readPayloadFromRaw(
  raw: string,
  monthKey: string,
  daysInMonth: number,
  fallback: PersistedPayload,
): PersistedPayload {
  let payload: PersistedPayload | null = null;
  try {
    payload = JSON.parse(raw) as PersistedPayload;
  } catch {
    payload = null;
  }

  if (!payload || payload.monthKey !== monthKey || payload.daysInMonth !== daysInMonth) {
    return fallback;
  }

  const nextRecordsByHabitId: Record<HabitId, HabitMonthRecord> = {};

  for (const habit of payload.habits) {
    const record = payload.recordsByHabitId[habit.id];
    const checks = record?.checks;

    nextRecordsByHabitId[habit.id] = {
      habitId: habit.id,
      monthKey,
      daysInMonth,
      checks:
        typeof checks === "string" && isBitstring(checks, daysInMonth)
          ? checks
          : createBitstring(daysInMonth, "0"),
      updatedAt: record?.updatedAt ?? new Date().toISOString(),
    };
  }

  return {
    monthKey,
    daysInMonth,
    habits: payload.habits,
    recordsByHabitId: nextRecordsByHabitId,
  };
}

export function useHabitMonth() {
  const now = useMemo(() => new Date(), []);
  const monthKey = useMemo(() => getMonthKey(now), [now]);
  const daysInMonth = useMemo(() => getDaysInMonth(now), [now]);
  const today = useMemo(() => getDayOfMonth(now), [now]);

  const fallbackPayload = useMemo(() => createDefaultPayload(monthKey, daysInMonth), [daysInMonth, monthKey]);

  const snapshotCacheRef = useRef<{ raw: string | null; value: PersistedPayload } | null>(null);

  const getSnapshot = useCallback((): PersistedPayload => {
    if (typeof window === "undefined") {
      return fallbackPayload;
    }

    const key = storageKey(monthKey);
    const raw = window.localStorage.getItem(key);

    if (snapshotCacheRef.current && snapshotCacheRef.current.raw === raw) {
      return snapshotCacheRef.current.value;
    }

    const value = raw
      ? readPayloadFromRaw(raw, monthKey, daysInMonth, fallbackPayload)
      : fallbackPayload;

    snapshotCacheRef.current = { raw, value };
    return value;
  }, [daysInMonth, fallbackPayload, monthKey]);

  const getServerSnapshot = useCallback((): PersistedPayload => fallbackPayload, [fallbackPayload]);

  const payload = useSyncExternalStore(
    useCallback((callback) => subscribeToMonth(monthKey, callback), [monthKey]),
    getSnapshot,
    getServerSnapshot,
  );

  const state = useMemo<HabitMonthState>(
    () => ({
      monthKey: payload.monthKey,
      daysInMonth: payload.daysInMonth,
      habits: payload.habits,
      recordsByHabitId: payload.recordsByHabitId,
    }),
    [payload.daysInMonth, payload.habits, payload.monthKey, payload.recordsByHabitId],
  );

  const toggleHabitDay = useCallback(
    (habitId: HabitId, day: number) => {
      const record = payload.recordsByHabitId[habitId];

      if (!record) {
        return;
      }

      const index = day - 1;
      const nextChecks = toggleBitAtIndex(record.checks, index);

      const nextPayload: PersistedPayload = {
        ...payload,
        recordsByHabitId: {
          ...payload.recordsByHabitId,
          [habitId]: {
            ...record,
            checks: nextChecks,
            updatedAt: new Date().toISOString(),
          },
        },
      };

      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey(monthKey), JSON.stringify(nextPayload));
      }

      emitMonthChange(monthKey);
    },
    [monthKey, payload],
  );

  const renameHabit = useCallback(
    (habitId: HabitId, name: string) => {
      const nextName = name.trim();
      if (!nextName) {
        return;
      }

      const nextHabits = payload.habits.map((habit) =>
        habit.id === habitId ? { ...habit, name: nextName } : habit,
      );

      const nextPayload: PersistedPayload = {
        ...payload,
        habits: nextHabits,
      };

      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey(monthKey), JSON.stringify(nextPayload));
      }

      emitMonthChange(monthKey);
    },
    [monthKey, payload],
  );

  return {
    state,
    today,
    toggleHabitDay,
    renameHabit,
  };
}
