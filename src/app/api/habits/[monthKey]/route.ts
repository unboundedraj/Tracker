import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import type { HabitMonthDocument } from "@/types/habits";
import { getHabitMonthsCollection } from "@/lib/mongodb";
import { createDefaultHabitMonthDocument, resolveHabitMonthDocument } from "@/lib/habit-month-server";

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

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(_request)) {
    return NextResponse.json({ document: null, message: "Unauthorized. Please unlock the app again." }, { status: 401 });
  }

  const { monthKey } = await context.params;

  try {
    const responseDocument = await resolveHabitMonthDocument(monthKey);

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

  try {
    const collection = await getHabitMonthsCollection();
    const normalized = await resolveHabitMonthDocument(monthKey, body.document ?? null);
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
        $setOnInsert: { monthKey, monthStart: new Date(normalized.monthStart) },
      },
      { upsert: true },
    );

    const savedDocument = await collection.findOne({ monthKey });

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

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ document: null, message: "Unauthorized. Please unlock the app again." }, { status: 401 });
  }

  const { monthKey } = await context.params;

  try {
    const collection = await getHabitMonthsCollection();
    const resetDocument = createDefaultHabitMonthDocument(monthKey);
    await collection.updateOne(
      { monthKey },
      {
        $set: {
          daysInMonth: resetDocument.daysInMonth,
          habits: resetDocument.habits,
          recordsByHabitId: resetDocument.recordsByHabitId,
          updatedAt: resetDocument.updatedAt,
        },
        $setOnInsert: { monthKey, monthStart: new Date(resetDocument.monthStart) },
      },
      { upsert: true },
    );

    return NextResponse.json({ document: resetDocument });
  } catch (error) {
    console.error("[api/habits] POST reset failed", error);
    return NextResponse.json(
      { document: null, message: friendlyMongoMessage(error) },
      { status: 500 },
    );
  }
}