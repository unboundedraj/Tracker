import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ensureTodaysAgendaIndexes, getTodaysAgendaCollection } from "@/lib/mongodb";
import type { TodaysAgendaItem } from "@/types/todays-agenda";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type DeleteResponse = {
  success: boolean;
  message?: string;
};

type UpdateRequestBody = {
  isCompleted?: boolean;
};

type UpdateResponse = {
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

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse<UpdateResponse>> {
  try {
    const { id } = await context.params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ item: null, message: "Invalid task ID." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as UpdateRequestBody | null;

    if (!body || typeof body.isCompleted !== "boolean") {
      return NextResponse.json({ item: null, message: "isCompleted must be provided as a boolean." }, { status: 400 });
    }

    await ensureTodaysAgendaIndexes();
    const collection = await getTodaysAgendaCollection();

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isCompleted: body.isCompleted } },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ item: null, message: "Task not found." }, { status: 404 });
    }

    return NextResponse.json({ item: normalizeItem(result) });
  } catch (error) {
    const message = friendlyMongoMessage(error);
    return NextResponse.json({ item: null, message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse<DeleteResponse>> {
  try {
    const { id } = await context.params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid task ID." }, { status: 400 });
    }

    await ensureTodaysAgendaIndexes();
    const collection = await getTodaysAgendaCollection();

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: "Task not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = friendlyMongoMessage(error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
