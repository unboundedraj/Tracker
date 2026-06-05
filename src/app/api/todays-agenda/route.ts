import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ensureTodaysAgendaIndexes, getTodaysAgendaCollection } from "@/lib/mongodb";
import type { TodaysAgendaItem } from "@/types/todays-agenda";

export const runtime = "nodejs";

type ListResponse = {
  items: TodaysAgendaItem[];
  message?: string;
};

type CreateRequestBody = {
  task?: string;
};

type CreateResponse = {
  item: TodaysAgendaItem | null;
  message?: string;
};

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

function normalizeItem(doc: {
  _id?: ObjectId;
  task: string;
  isCompleted?: boolean;
  createdAt: Date;
  expiresAt: Date;
}): TodaysAgendaItem {
  return {
    id: doc._id?.toString() ?? "",
    task: doc.task,
    isCompleted: doc.isCompleted ?? false,
    createdAt: doc.createdAt.toISOString(),
    expiresAt: doc.expiresAt.toISOString(),
  };
}

export async function GET(): Promise<NextResponse<ListResponse>> {
  try {
    await ensureTodaysAgendaIndexes();
    const collection = await getTodaysAgendaCollection();
    const now = new Date();

    await collection.deleteMany({ expiresAt: { $lte: now } });

    const documents = await collection
      .find({ expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .toArray();

    const items = documents.map((doc) => normalizeItem(doc));

    return NextResponse.json({ items });
  } catch (error) {
    const message = friendlyMongoMessage(error);
    return NextResponse.json({ items: [], message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateResponse>> {
  try {
    const body = (await request.json().catch(() => null)) as CreateRequestBody | null;

    if (!body?.task || typeof body.task !== "string" || !body.task.trim()) {
      return NextResponse.json(
        { item: null, message: "Task is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    await ensureTodaysAgendaIndexes();
    const collection = await getTodaysAgendaCollection();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result = await collection.insertOne({
      task: body.task.trim(),
      isCompleted: false,
      createdAt: now,
      expiresAt,
    });

    const item = normalizeItem({
      _id: result.insertedId,
      task: body.task.trim(),
      isCompleted: false,
      createdAt: now,
      expiresAt,
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = friendlyMongoMessage(error);
    return NextResponse.json({ item: null, message }, { status: 500 });
  }
}
