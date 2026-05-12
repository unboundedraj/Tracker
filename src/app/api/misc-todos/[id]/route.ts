import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ensureMiscTodosIndexes, getMiscTodosCollection } from "@/lib/mongodb";
import type { MiscTodo, MiscTodoLevel } from "@/types/misc-todos";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type DeleteResponse = {
  success: boolean;
  message?: string;
};

type UpdateRequestBody = {
  level?: MiscTodoLevel;
  sortOrder?: number;
};

type UpdateResponse = {
  todo: MiscTodo | null;
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

function normalizeLevel(value: unknown): MiscTodoLevel {
  return value === "high" || value === "low" ? value : "medium";
}

function normalizeTodo(doc: {
  _id?: ObjectId;
  task: string;
  note?: string;
  level?: MiscTodoLevel;
  sortOrder?: number;
  createdAt: Date;
}): MiscTodo {
  return {
    id: doc._id?.toString() ?? "",
    task: doc.task,
    note: doc.note,
    level: normalizeLevel(doc.level),
    sortOrder: typeof doc.sortOrder === "number" ? doc.sortOrder : doc.createdAt.getTime(),
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse<DeleteResponse>> {
  try {
    const { id } = await context.params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid todo ID." }, { status: 400 });
    }

    await ensureMiscTodosIndexes();
    const collection = await getMiscTodosCollection();

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: "Todo not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = friendlyMongoMessage(error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse<UpdateResponse>> {
  try {
    const { id } = await context.params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ todo: null, message: "Invalid todo ID." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as UpdateRequestBody | null;

    if (!body || (body.level == null && body.sortOrder == null)) {
      return NextResponse.json({ todo: null, message: "No updates were provided." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (body.level != null) {
      updates.level = normalizeLevel(body.level);
    }

    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      updates.sortOrder = body.sortOrder;
    }

    await ensureMiscTodosIndexes();
    const collection = await getMiscTodosCollection();

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updates });

    if (result.matchedCount === 0) {
      return NextResponse.json({ todo: null, message: "Todo not found." }, { status: 404 });
    }

    const updated = await collection.findOne({ _id: new ObjectId(id) });

    if (!updated) {
      return NextResponse.json({ todo: null, message: "Todo not found." }, { status: 404 });
    }

    return NextResponse.json({ todo: normalizeTodo(updated) });
  } catch (error) {
    const message = friendlyMongoMessage(error);
    return NextResponse.json({ todo: null, message }, { status: 500 });
  }
}
