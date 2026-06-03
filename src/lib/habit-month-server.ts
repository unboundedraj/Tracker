import "server-only";

import { type Collection } from "mongodb";
import { getHabitMonthsCollection, ensureHabitMonthsIndexes } from "@/lib/mongodb";
import type { Habit, HabitMonthDbDocument, HabitMonthDocument, HabitMonthRecord } from "@/types/habits";
import { createBitstring, isBitstring } from "@/utils/bitstring";
import { getDaysInMonthFromMonthKey, getMonthStartDateFromMonthKey } from "@/utils/date";

const MAX_PREVIOUS_MONTH_LOOKUPS = 24;

function createDefaultHabits(): Habit[] {
  return Array.from({ length: 30 }, (_, index) => ({
    id: `habit-${index + 1}`,
    name: `Habit ${index + 1}`,
  }));
}

function looksLikeDefaultHabits(habits?: Habit[] | null): boolean {
  if (!Array.isArray(habits) || habits.length === 0) {
    return false;
  }

  return habits.every((habit, index) => habit.id === `habit-${index + 1}` && habit.name === `Habit ${index + 1}`);
}

function createDefaultRecords(monthKey: string, daysInMonth: number, habits: Habit[]): Record<string, HabitMonthRecord> {
  const records: Record<string, HabitMonthRecord> = {};

  for (const habit of habits) {
    records[habit.id] = {
      habitId: habit.id,
      monthKey,
      daysInMonth,
      checks: createBitstring(daysInMonth, "0"),
      updatedAt: new Date().toISOString(),
    };
  }

  return records;
}

function normalizeHabitMonthDocument(monthKey: string, document?: Partial<HabitMonthDocument> | null): HabitMonthDbDocument {
  const monthStart = getMonthStartDateFromMonthKey(monthKey);
  const daysInMonth = getDaysInMonthFromMonthKey(monthKey);
  const habits = Array.isArray(document?.habits) && document.habits.length > 0 ? document.habits : createDefaultHabits();
  const recordsByHabitId = document?.recordsByHabitId ?? createDefaultRecords(monthKey, daysInMonth, habits);

  const normalizedRecords: Record<string, HabitMonthRecord> = {};

  for (const habit of habits) {
    const record = recordsByHabitId[habit.id];
    const checks = record?.checks;

    normalizedRecords[habit.id] = {
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
    monthStart,
    daysInMonth,
    habits,
    recordsByHabitId: normalizedRecords,
    updatedAt: document?.updatedAt ?? new Date().toISOString(),
  };
}

function dbDocumentToClientDocument(document: HabitMonthDbDocument): HabitMonthDocument {
  return {
    ...document,
    monthStart: document.monthStart.toISOString(),
  };
}

function previousMonthKey(monthKey: string): string {
  const monthStart = getMonthStartDateFromMonthKey(monthKey);
  const previousMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1));
  const year = previousMonth.getUTCFullYear();
  const month = String(previousMonth.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function findSeedHabits(collection: Collection<HabitMonthDbDocument>, monthKey: string): Promise<Habit[] | null> {
  let currentMonthKey = previousMonthKey(monthKey);

  for (let attempts = 0; attempts < MAX_PREVIOUS_MONTH_LOOKUPS; attempts += 1) {
    const document = await collection.findOne({ monthKey: currentMonthKey });

    if (document?.habits && !looksLikeDefaultHabits(document.habits)) {
      return document.habits;
    }

    currentMonthKey = previousMonthKey(currentMonthKey);
  }

  return null;
}

export async function resolveHabitMonthDocument(
  monthKey: string,
  sourceDocument?: Partial<HabitMonthDocument> | null,
): Promise<HabitMonthDocument> {
  await ensureHabitMonthsIndexes();
  const collection = await getHabitMonthsCollection();

  const dbDocument = sourceDocument ? null : await collection.findOne({ monthKey });
  const clientDocument = dbDocument
    ? dbDocumentToClientDocument(dbDocument)
    : sourceDocument
      ? ({ ...sourceDocument, monthKey } satisfies Partial<HabitMonthDocument>)
      : null;

  if (clientDocument?.habits && !looksLikeDefaultHabits(clientDocument.habits)) {
    return normalizeHabitMonthDocument(monthKey, clientDocument);
  }

  const seedHabits = await findSeedHabits(collection, monthKey);
  if (seedHabits && seedHabits.length > 0) {
    return normalizeHabitMonthDocument(monthKey, {
      ...(clientDocument ?? {}),
      habits: seedHabits,
    });
  }

  return normalizeHabitMonthDocument(monthKey, clientDocument);
}
