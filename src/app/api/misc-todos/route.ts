import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ensureMiscTodosIndexes, getMiscTodosCollection } from "@/lib/mongodb";
import type { MiscTodo } from "@/types/misc-todos";

export const runtime = "nodejs";

type ListResponse = {
  todos: MiscTodo[];
  message?: string;
};

type CreateRequestBody = {
  task?: string;
  note?: string;
};

type CreateResponse = {
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

export async function GET(): Promise<NextResponse<ListResponse>> {
  try {
    await ensureMiscTodosIndexes();
    const collection = await getMiscTodosCollection();

    const documents = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const todos: MiscTodo[] = documents.map((doc) => ({
      id: doc._id?.toString() ?? "",
      task: doc.task,
      note: doc.note,
      createdAt: doc.createdAt.toISOString(),
    }));

    return NextResponse.json({ todos });
  } catch (error) {
    const message = friendlyMongoMessage(error);
    return NextResponse.json({ todos: [], message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateResponse>> {
  try {
    const body = (await request.json().catch(() => null)) as CreateRequestBody | null;

    if (!body?.task || typeof body.task !== "string" || !body.task.trim()) {
      return NextResponse.json(
        { todo: null, message: "Task is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    await ensureMiscTodosIndexes();
    const collection = await getMiscTodosCollection();

    const now = new Date();
    const result = await collection.insertOne({
      task: body.task.trim(),
      note: body.note && typeof body.note === "string" ? body.note.trim() : undefined,
      createdAt: now,
    });

    const todo: MiscTodo = {
      id: result.insertedId.toString(),
      task: body.task.trim(),
      note: body.note && typeof body.note === "string" ? body.note.trim() : undefined,
      createdAt: now.toISOString(),
    };

    return NextResponse.json({ todo });
  } catch (error) {
    const message = friendlyMongoMessage(error);
    return NextResponse.json({ todo: null, message }, { status: 500 });
  }
}
