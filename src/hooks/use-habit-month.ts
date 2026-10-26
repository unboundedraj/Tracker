"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Habit,
  HabitId,
  HabitMonthDocument,
  HabitMonthRecord,
  HabitMonthState,
} from "@/types/habits";
import { createBitstring, isBitstring, toggleBitAtIndex } from "@/utils/bitstring";
import { getDayOfMonth, getDaysInMonth, getMonthKey, getMonthStartDateFromMonthKey } from "@/utils/date";
import { fetchHabitMonth, saveHabitMonth } from "@/services/habit-month-api";

const HABITS_COUNT = 30;
const STORAGE_PREFIX = "tracker-habits:";
const SNAPSHOT_SUFFIX = ":snapshot";
const PENDING_SUFFIX = ":pending";

export type HabitSyncStatus = "synced" | "saving" | "pending" | "offline" | "error";

type HabitOperation =
  | {
      id: string;
      type: "toggle";
      habitId: HabitId;
      day: number;
      timestamp: string;
    }
  | {
      id: string;
      type: "rename";
      habitId: HabitId;
      name: string;
      timestamp: string;
    };

type PersistentDocument = HabitMonthDocument;

function createDefaultHabits(): Habit[] {
  return Array.from({ length: HABITS_COUNT }, (_, index) => ({
    id: `habit-${index + 1}`,
    name: `Habit ${index + 1}`,
  }));
}

function createDefaultRecords(monthKey: string, daysInMonth: number): Record<HabitId, HabitMonthRecord> {
  const records: Record<HabitId, HabitMonthRecord> = {};

  for (const habit of createDefaultHabits()) {
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

function storageKey(monthKey: string): string {
  return `${STORAGE_PREFIX}${monthKey}${SNAPSHOT_SUFFIX}`;
}

function pendingKey(monthKey: string): string {
  return `${STORAGE_PREFIX}${monthKey}${PENDING_SUFFIX}`;
}

function createDefaultDocument(monthKey: string, daysInMonth: number): HabitMonthDocument {
  return {
    monthKey,
    monthStart: getMonthStartDateFromMonthKey(monthKey).toISOString(),
    daysInMonth,
    habits: createDefaultHabits(),
    recordsByHabitId: createDefaultRecords(monthKey, daysInMonth),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeDocument(
  monthKey: string,
  daysInMonth: number,
  document?: Partial<PersistentDocument> | null,
): HabitMonthDocument {
  const monthStart = getMonthStartDateFromMonthKey(monthKey).toISOString();
  const sourceHabits =
    Array.isArray(document?.habits) && document.habits.length > 0 ? document.habits : createDefaultHabits();
  const sourceRecords = document?.recordsByHabitId ?? {};
  const recordsByHabitId: Record<HabitId, HabitMonthRecord> = {};

  for (const habit of sourceHabits) {
    const record = sourceRecords[habit.id];
    const checks = record?.checks;

    recordsByHabitId[habit.id] = {
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
    habits: sourceHabits,
    recordsByHabitId,
    updatedAt: document?.updatedAt ?? new Date().toISOString(),
  };
}

function readSnapshot(monthKey: string, daysInMonth: number): HabitMonthDocument | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey(monthKey));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistentDocument>;
    if (parsed.monthKey !== monthKey || parsed.daysInMonth !== daysInMonth) {
      return null;
    }

    return normalizeDocument(monthKey, daysInMonth, parsed);
  } catch {
    return null;
  }
}

function persistSnapshot(document: HabitMonthDocument): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(document.monthKey), JSON.stringify(document));
}

function readPendingOperations(monthKey: string): HabitOperation[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(pendingKey(monthKey));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as HabitOperation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistPendingOperations(monthKey: string, operations: HabitOperation[]): void {
  if (typeof window === "undefined") {
    return;
  }

  if (operations.length === 0) {
    window.localStorage.removeItem(pendingKey(monthKey));
    return;
  }

  window.localStorage.setItem(pendingKey(monthKey), JSON.stringify(operations));
}

function applyOperation(document: HabitMonthDocument, operation: HabitOperation): HabitMonthDocument {
  if (operation.type === "toggle") {
    const record = document.recordsByHabitId[operation.habitId];

    if (!record) {
      return document;
    }

    const nextChecks = toggleBitAtIndex(record.checks, operation.day - 1);

    return {
      ...document,
      recordsByHabitId: {
        ...document.recordsByHabitId,
        [operation.habitId]: {
          ...record,
          checks: nextChecks,
          updatedAt: operation.timestamp,
        },
      },
      updatedAt: operation.timestamp,
    };
  }

  return {
    ...document,
    habits: document.habits.map((habit) =>
      habit.id === operation.habitId ? { ...habit, name: operation.name.trim() } : habit,
    ),
    updatedAt: operation.timestamp,
  };
}

function applyOperations(document: HabitMonthDocument, operations: HabitOperation[]): HabitMonthDocument {
  return operations.reduce((currentDocument, operation) => applyOperation(currentDocument, operation), document);
}

function queueOperation(monthKey: string, operation: HabitOperation): HabitOperation[] {
  const nextOperations = [...readPendingOperations(monthKey), operation];
  persistPendingOperations(monthKey, nextOperations);
  return nextOperations;
}

function setSnapshot(document: HabitMonthDocument): void {
  persistSnapshot(document);
}

export function useHabitMonth(initialDocument?: HabitMonthDocument | null) {
  const now = useMemo(() => new Date(), []);
  const monthKey = useMemo(() => getMonthKey(now), [now]);
  const daysInMonth = useMemo(() => getDaysInMonth(now), [now]);
  const today = useMemo(() => getDayOfMonth(now), [now]);

  const defaultDocument = useMemo(() => createDefaultDocument(monthKey, daysInMonth), [daysInMonth, monthKey]);
  const [document, setDocument] = useState<HabitMonthDocument>(
    () => readSnapshot(monthKey, daysInMonth) ?? initialDocument ?? defaultDocument,
  );
  const [syncStatus, setSyncStatus] = useState<HabitSyncStatus>("synced");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const documentRef = useRef(document);
  const syncQueueRef = useRef(Promise.resolve());
  const mountedRef = useRef(false);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    setMounted(true);
    mountedRef.current = true;
  }, []);

  const flushPendingOperations = useCallback(
    async (preferredDocument?: HabitMonthDocument) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus(readPendingOperations(monthKey).length > 0 ? "offline" : "synced");
        setSyncError(readPendingOperations(monthKey).length > 0 ? "Offline changes queued." : null);
        return;
      }

      const pendingOperations = readPendingOperations(monthKey);
      if (pendingOperations.length === 0) {
        setSyncStatus("synced");
        setSyncError(null);
        return;
      }

      setSyncStatus("saving");
      setSyncError(null);

      syncQueueRef.current = syncQueueRef.current.then(async () => {
        const latestServerDocument = await fetchHabitMonth(monthKey).catch(() => null);
        const baseDocument = normalizeDocument(
          monthKey,
          daysInMonth,
          latestServerDocument ?? preferredDocument ?? documentRef.current,
        );
        const mergedDocument = applyOperations(baseDocument, pendingOperations);

        try {
          const savedDocument = await saveHabitMonth(mergedDocument);
          const normalizedSavedDocument = normalizeDocument(monthKey, daysInMonth, savedDocument);
          documentRef.current = normalizedSavedDocument;
          setDocument(normalizedSavedDocument);
          setSnapshot(normalizedSavedDocument);
          persistPendingOperations(monthKey, []);
          setSyncStatus("synced");
          setSyncError(null);
        } catch (error) {
          setSnapshot(mergedDocument);
          setDocument(mergedDocument);

          const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
          const baseMessage =
            error instanceof Error
              ? error.message
              : "MongoDB write failed. Check Atlas IP access, credentials, and cluster status.";
          const message = isOnline ? baseMessage : "Offline changes queued.";

          setSyncStatus(isOnline ? "error" : "offline");
          setSyncError(message);
          throw new Error(message);
        }
      });

      await syncQueueRef.current.catch(() => undefined);
    },
    [daysInMonth, monthKey],
  );

  useEffect(() => {
    mountedRef.current = true;

    let cancelled = false;

    void (async () => {
      const localSnapshot = readSnapshot(monthKey, daysInMonth);
      const pendingOperations = readPendingOperations(monthKey);

      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          let serverDocument = await fetchHabitMonth(monthKey);

          if (cancelled) {
            return;
          }

          // If the server has no document for the requested month, or if
          // the returned document only contains the generic placeholders
          // (e.g. "Habit 1"...), try to seed habit names from the
          // previous month so users see their real habit names.
          if (!serverDocument) {
            try {
              const [yearPart, monthPart] = monthKey.split("-").map(Number);
              let prevYear = yearPart;
              let prevMonth = monthPart - 1;
              if (prevMonth < 1) {
                prevYear = yearPart - 1;
                prevMonth = 12;
              }
              const prevMonthKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
              const prevDoc = await fetchHabitMonth(prevMonthKey).catch(() => null);
              if (prevDoc && Array.isArray(prevDoc.habits) && prevDoc.habits.length > 0) {
                serverDocument = { ...(serverDocument ?? {}), habits: prevDoc.habits } as any;
              }
            } catch {
              // ignore failures fetching previous month
            }
          }

          const serverState = normalizeDocument(monthKey, daysInMonth, serverDocument ?? defaultDocument);
          const mergedDocument = applyOperations(serverState, pendingOperations);

          documentRef.current = mergedDocument;
          setDocument(mergedDocument);
          setSnapshot(mergedDocument);

          if (pendingOperations.length > 0) {
            await flushPendingOperations(mergedDocument);
          } else {
            setSyncStatus("synced");
            setSyncError(null);
          }

          return;
        } catch (error) {
          if (!cancelled) {
            setSyncStatus("error");
            setSyncError(error instanceof Error ? error.message : "Failed to load from MongoDB.");
          }

          // Fall back to local data below.
        }
      }

      const initialLocalDocument = localSnapshot ?? initialDocument ?? defaultDocument;
      const localDocument = applyOperations(initialLocalDocument, pendingOperations);

      documentRef.current = localDocument;
      setDocument(localDocument);
      setSnapshot(localDocument);
      setSyncStatus(pendingOperations.length > 0 ? "offline" : "synced");
      setSyncError(pendingOperations.length > 0 ? "Offline changes queued." : null);
    })();

    const handleOnline = () => {
      void flushPendingOperations(documentRef.current);
    };

    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, [defaultDocument, daysInMonth, flushPendingOperations, monthKey]);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const document = (event as CustomEvent<HabitMonthDocument>).detail;
      if (!document || document.monthKey !== monthKey) {
        return;
      }

      persistPendingOperations(monthKey, []);
      documentRef.current = document;
      setDocument(document);
      setSnapshot(document);
      setSyncStatus("synced");
      setSyncError(null);
    };

    window.addEventListener("tracker:habit-month-reset", handleReset);
    return () => window.removeEventListener("tracker:habit-month-reset", handleReset);
  }, [monthKey]);

  const state = useMemo<HabitMonthState>(
    () => ({
      monthKey: document.monthKey,
      daysInMonth: document.daysInMonth,
      habits: document.habits,
      recordsByHabitId: document.recordsByHabitId,
    }),
    [document],
  );

  const updateWithOperation = useCallback(
    async (operation: HabitOperation) => {
      const nextDocument = applyOperation(documentRef.current, operation);
      documentRef.current = nextDocument;
      setDocument(nextDocument);
      setSnapshot(nextDocument);

      const pendingOperations = queueOperation(monthKey, operation);
      if (pendingOperations.length > 0 && typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("offline");
        setSyncError("Offline changes queued.");
        return;
      }

      try {
        await flushPendingOperations(nextDocument);
      } catch (error) {
        const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
        setSyncStatus(isOnline ? "error" : "offline");
        setSyncError(error instanceof Error ? error.message : "Sync failed.");
      }
    },
    [flushPendingOperations, monthKey],
  );

  const toggleHabitDay = useCallback(
    (habitId: HabitId, day: number) => {
      const operation: HabitOperation = {
        id: `${habitId}:${day}:${Date.now()}`,
        type: "toggle",
        habitId,
        day,
        timestamp: new Date().toISOString(),
      };

      void updateWithOperation(operation);
    },
    [updateWithOperation],
  );

  const renameHabit = useCallback(
    (habitId: HabitId, name: string) => {
      const nextName = name.trim();
      if (!nextName) {
        return;
      }

      const operation: HabitOperation = {
        id: `${habitId}:rename:${Date.now()}`,
        type: "rename",
        habitId,
        name: nextName,
        timestamp: new Date().toISOString(),
      };

      void updateWithOperation(operation);
    },
    [updateWithOperation],
  );

  const reorderHabits = useCallback(
    async (reorderedHabits: Habit[]) => {
      const nextDocument = {
        ...documentRef.current,
        habits: reorderedHabits,
        updatedAt: new Date().toISOString(),
      };
      documentRef.current = nextDocument;
      setDocument(nextDocument);
      setSnapshot(nextDocument);
      setSyncStatus("saving");

      try {
        const savedDocument = await saveHabitMonth(nextDocument);
        documentRef.current = savedDocument;
        setDocument(savedDocument);
        setSnapshot(savedDocument);
        setSyncStatus("synced");
        setSyncError(null);
      } catch (error) {
        const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
        setSyncStatus(isOnline ? "error" : "offline");
        setSyncError(error instanceof Error ? error.message : "Sync failed.");
      }
    },
    [],
  );

  const syncMessage = useMemo(() => {
    if (syncError) {
      return syncError;
    }

    switch (syncStatus) {
      case "saving":
        return "Saving...";
      case "pending":
        return "Pending sync";
      case "offline":
        return "Offline changes queued";
      case "error":
        return "Sync failed, retrying later";
      default:
        return "Synced";
    }
  }, [syncError, syncStatus]);

  return {
    state,
    today,
    toggleHabitDay,
    renameHabit,
    reorderHabits,
    syncStatus,
    syncMessage,
    syncError,
    mounted,
  };
}
