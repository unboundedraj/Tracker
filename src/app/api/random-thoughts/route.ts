import { NextRequest, NextResponse } from "next/server";
import { ensureRandomThoughtsIndexes, getRandomThoughtsCollection } from "@/lib/mongodb";
import type { RandomThought, RandomThoughtDbDocument } from "@/types/random-thoughts";

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

function dbToClient(doc: RandomThoughtDbDocument): RandomThought {
  return {
    id: doc._id?.toString() ?? "",
    content: doc.content,
    isCompleted: doc.isCompleted,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    await ensureRandomThoughtsIndexes();
    const collection = await getRandomThoughtsCollection();
    const documents = await collection
      .find({})
      .sort({ isCompleted: 1, sortOrder: -1 })
      .toArray();

    const thoughts = documents.map(dbToClient);
    return NextResponse.json(thoughts);
  } catch (error) {
    const message = formatError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRandomThoughtsIndexes();
    const { content } = await request.json();

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const collection = await getRandomThoughtsCollection();
    const sortOrder = Date.now();

    const result = await collection.insertOne({
      content: content.trim(),
      isCompleted: false,
      sortOrder,
      createdAt: new Date(),
    });

    const newDoc = await collection.findOne({ _id: result.insertedId });
    if (!newDoc) {
      return NextResponse.json(
        { error: "Failed to retrieve created thought" },
        { status: 500 }
      );
    }

    return NextResponse.json(dbToClient(newDoc), { status: 201 });
  } catch (error) {
    const message = formatError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
