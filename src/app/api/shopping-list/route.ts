import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ensureShoppingListIndexes, getShoppingListCollection } from "@/lib/mongodb";
import type { ShoppingItem } from "@/types/shopping-list";

export const runtime = "nodejs";

type ListResponse = {
  items: ShoppingItem[];
  message?: string;
};

type CreateRequestBody = {
  name?: string;
};

type CreateResponse = {
  item: ShoppingItem | null;
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
  name: string;
  isCompleted?: boolean;
  sortOrder?: number;
  createdAt: Date;
}): ShoppingItem {
  return {
    id: doc._id?.toString() ?? "",
    name: doc.name,
    isCompleted: doc.isCompleted ?? false,
    sortOrder: typeof doc.sortOrder === "number" ? doc.sortOrder : doc.createdAt.getTime(),
    createdAt: doc.createdAt.toISOString(),
  };
}

function compareItems(left: ShoppingItem, right: ShoppingItem): number {
  if (left.isCompleted !== right.isCompleted) {
    return left.isCompleted ? 1 : -1;
  }

  if (left.sortOrder !== right.sortOrder) {
    return right.sortOrder - left.sortOrder;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

export async function GET(): Promise<NextResponse<ListResponse>> {
  try {
    await ensureShoppingListIndexes();
    const collection = await getShoppingListCollection();

    const documents = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const items = documents.map((doc) => normalizeItem(doc)).sort(compareItems);

    return NextResponse.json({ items });
  } catch (error) {
    const message = friendlyMongoMessage(error);
    return NextResponse.json({ items: [], message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateResponse>> {
  try {
    const body = (await request.json().catch(() => null)) as CreateRequestBody | null;

    if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { item: null, message: "Name is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    await ensureShoppingListIndexes();
    const collection = await getShoppingListCollection();

    const now = new Date();
    const result = await collection.insertOne({
      name: body.name.trim(),
      isCompleted: false,
      sortOrder: now.getTime(),
      createdAt: now,
    });

    const item: ShoppingItem = normalizeItem({
      _id: result.insertedId,
      name: body.name.trim(),
      isCompleted: false,
      sortOrder: now.getTime(),
      createdAt: now,
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = friendlyMongoMessage(error);
    return NextResponse.json({ item: null, message }, { status: 500 });
  }
}