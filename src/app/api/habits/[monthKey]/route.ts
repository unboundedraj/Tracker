import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { ensureHabitMonthsIndexes, getHabitMonthsCollection } from "@/lib/mongodb";
import type { Habit, HabitMonthDbDocument, HabitMonthDocument, HabitMonthRecord } from "@/types/habits";
import { createBitstring, isBitstring } from "@/utils/bitstring";
import { getDaysInMonthFromMonthKey, getMonthStartDateFromMonthKey } from "@/utils/date";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ monthKey: string }>;
};

type SaveRequestBody = {
  document?: Partial<HabitMonthDocument> | null;
};

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value === "1";
}

function friendlyMongoMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (/MONGODB_URI is not configured/i.test(message)) {
    return "MONGODB_URI is not configured. Update .env and restart the dev server.";
  }

  if (/Authentication failed|bad auth|auth failed|not authorized/i.test(message)) {
    return "MongoDB authentication failed. Recheck Atlas DB user + password (URL-encode special characters).";
  }

  if (/not allowed|IP.*not allowed|not authorized to access this server/i.test(message)) {
    return "MongoDB connection blocked. Recheck Atlas Network Access allowlist and your current public IP.";
  }

  if (/querySrv ENOTFOUND|ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return "MongoDB DNS/SRV lookup failed. Try using the non-SRV connection string or fix DNS on this machine.";
  }

  if (/timed out|ETIMEDOUT|server selection timed out/i.test(message)) {
    return "MongoDB connection timed out. Confirm the Atlas cluster is running and reachable from this network.";
  }

  return message;
}

function createDefaultHabitRecords(monthKey: string, daysInMonth: number): Record<string, HabitMonthRecord> {
  const records: Record<string, HabitMonthRecord> = {};

  for (let index = 1; index <= 30; index += 1) {
    const habitId = `habit-${index}`;
    records[habitId] = {
      habitId,
      monthKey,
      daysInMonth,
      checks: createBitstring(daysInMonth, "0"),
      updatedAt: new Date().toISOString(),
    };
  }

  return records;
}

function createDefaultHabits(): Habit[] {
  return Array.from({ length: 30 }, (_, index) => ({
    id: `habit-${index + 1}`,
    name: `Habit ${index + 1}`,
  }));
}

function normalizeDocument(monthKey: string, document?: Partial<HabitMonthDocument> | null): HabitMonthDbDocument {
  const monthStart = getMonthStartDateFromMonthKey(monthKey);
  const daysInMonth = getDaysInMonthFromMonthKey(monthKey);
  const habits = Array.isArray(document?.habits) && document.habits.length > 0 ? document.habits : createDefaultHabits();
  const recordsByHabitId = document?.recordsByHabitId ?? createDefaultHabitRecords(monthKey, daysInMonth);

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

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(_request)) {
    return NextResponse.json({ document: null, message: "Unauthorized. Please unlock the app again." }, { status: 401 });
  }

  const { monthKey } = await context.params;

  try {
    await ensureHabitMonthsIndexes();
    const collection = await getHabitMonthsCollection();
    const dbDocument = await collection.findOne({ monthKey });

    // Convert mongoDocument to client format (Date to ISO string) before normalization
    const clientDocument: Partial<HabitMonthDocument> | null = dbDocument
      ? {
          ...dbDocument,
          monthStart: dbDocument.monthStart instanceof Date
            ? dbDocument.monthStart.toISOString()
            : dbDocument.monthStart,
        }
      : null;

    // Normalize the document to ensure it has the correct structure
    const normalizedDocument = normalizeDocument(monthKey, clientDocument);

    // Convert the Date back to ISO string for the response
    const responseDocument: HabitMonthDocument = {
      ...normalizedDocument,
      monthStart: normalizedDocument.monthStart.toISOString(),
    };

    return NextResponse.json({ document: responseDocument ?? null });
  } catch (error) {
    console.error("[api/habits] GET failed", error);
    return NextResponse.json(
      { document: null, message: friendlyMongoMessage(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ document: null, message: "Unauthorized. Please unlock the app again." }, { status: 401 });
  }

  const { monthKey } = await context.params;

  let body: SaveRequestBody;

  try {
    body = (await request.json()) as SaveRequestBody;
  } catch {
    return NextResponse.json({ document: null, message: "Invalid request." }, { status: 400 });
  }

  const normalized = normalizeDocument(monthKey, body.document ?? null);

  try {
    await ensureHabitMonthsIndexes();
    const collection = await getHabitMonthsCollection();

    const normalizedForUpdate = {
      daysInMonth: normalized.daysInMonth,
      habits: normalized.habits,
      recordsByHabitId: normalized.recordsByHabitId,
      updatedAt: normalized.updatedAt,
    };

    await collection.updateOne(
      { monthKey },
      {
        $set: normalizedForUpdate,
        $setOnInsert: { monthKey, monthStart: normalized.monthStart },
      },
      { upsert: true },
    );

    const savedDocument = await collection.findOne({ monthKey });

    // Convert the Date back to ISO string for the response
    const responseDocument: HabitMonthDocument | null = savedDocument
      ? {
          ...savedDocument,
          monthStart: savedDocument.monthStart instanceof Date
            ? savedDocument.monthStart.toISOString()
            : savedDocument.monthStart,
        }
      : null;

    return NextResponse.json({ document: responseDocument });
  } catch (error) {
    console.error("[api/habits] PUT failed", error);
    return NextResponse.json(
      { document: null, message: friendlyMongoMessage(error) },
      { status: 500 },
    );
  }
}