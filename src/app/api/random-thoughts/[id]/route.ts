import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ensureRandomThoughtsIndexes, getRandomThoughtsCollection } from "@/lib/mongodb";
import type { RandomThoughtDbDocument } from "@/types/random-thoughts";

export const runtime = "nodejs";

function formatError(error: unknown): string {
  if (error instanceof Error) {
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("connect")
    ) {
      return "MongoDB connection failed. Check your MONGODB_URI.";
    }
    if (error.message.includes("authentication")) {
      return "MongoDB authentication failed. Check credentials in MONGODB_URI.";
    }
    return error.message;
  }
  return "Unknown error";
}

function dbToClient(doc: RandomThoughtDbDocument) {
  return {
    id: doc._id.toString(),
    content: doc.content,
    isCompleted: doc.isCompleted,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureRandomThoughtsIndexes();
    let objectId;
    try {
      objectId = new ObjectId(params.id);
    } catch {
      return NextResponse.json(
        { error: "Invalid thought ID format" },
        { status: 400 }
      );
    }

    const updates = await request.json();

    // Build update object with only allowed fields
    const updateFields: Record<string, unknown> = {};
    if ("content" in updates) {
      updateFields.content = updates.content;
    }
    if ("isCompleted" in updates) {
      updateFields.isCompleted = updates.isCompleted;
    }
    if ("sortOrder" in updates) {
      updateFields.sortOrder = updates.sortOrder;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const collection = await getRandomThoughtsCollection();
    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return NextResponse.json(
        { error: "Random thought not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(dbToClient(result.value));
  } catch (error) {
    const message = formatError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureRandomThoughtsIndexes();
    let objectId;
    try {
      objectId = new ObjectId(params.id);
    } catch {
      return NextResponse.json(
        { error: "Invalid thought ID format" },
        { status: 400 }
      );
    }

    const collection = await getRandomThoughtsCollection();
    const result = await collection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Random thought not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = formatError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
