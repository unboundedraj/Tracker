import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ensureShoppingListIndexes, getShoppingListCollection } from "@/lib/mongodb";
import type { ShoppingItem } from "@/types/shopping-list";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type DeleteResponse = {
  success: boolean;
  message?: string;
};

type UpdateRequestBody = {
  name?: string;
  isCompleted?: boolean;
  sortOrder?: number;
};

type UpdateResponse = {
  item: ShoppingItem | null;
  message?: string;
};

function friendlyMongoMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (/MONGODB_URI/i.test(message)) return "MONGODB_URI is not configured.";
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

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse<DeleteResponse>> {
  try {
    const { id } = await context.params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid item ID." }, { status: 400 });
    }

    await ensureShoppingListIndexes();
    const collection = await getShoppingListCollection();

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: "Item not found." }, { status: 404 });
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
      return NextResponse.json({ item: null, message: "Invalid item ID." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as UpdateRequestBody | null;

    if (!body || (body.name == null && body.isCompleted == null && body.sortOrder == null)) {
      return NextResponse.json({ item: null, message: "No updates were provided." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (body.name != null && typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (body.isCompleted != null && typeof body.isCompleted === "boolean") {
      updates.isCompleted = body.isCompleted;
    }
    if (body.sortOrder != null && typeof body.sortOrder === "number") {
      updates.sortOrder = body.sortOrder;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ item: null, message: "No valid updates were provided." }, { status: 400 });
    }

    await ensureShoppingListIndexes();
    const collection = await getShoppingListCollection();

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ item: null, message: "Item not found." }, { status: 404 });
    }

    return NextResponse.json({ item: normalizeItem(result as any) });
  } catch (error) {
    const message = friendlyMongoMessage(error);
    return NextResponse.json({ item: null, message }, { status: 500 });
  }
}