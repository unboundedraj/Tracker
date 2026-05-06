export type HabitId = string;

export type Habit = {
  id: HabitId;
  name: string;
};

// Stored as a simple "bitstring" so it can be persisted locally (offline)
// and later stored in MongoDB without needing a separate join table.
// Example for a 31-day month: "010000..." (length = daysInMonth)
export type HabitChecksBitstring = string;

export type HabitMonthRecord = {
  habitId: HabitId;
  monthKey: string; // YYYY-MM
  daysInMonth: number;
  checks: HabitChecksBitstring;
  updatedAt: string; // ISO
};

export type HabitMonthState = {
  monthKey: string;
  daysInMonth: number;
  habits: Habit[];
  recordsByHabitId: Record<HabitId, HabitMonthRecord>;
};
