import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ensureMiscTodosIndexes, getMiscTodosCollection } from "@/lib/mongodb";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type DeleteResponse = {
  success: boolean;
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
