import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getUserSettingsCollection } from "@/lib/mongodb";

export const runtime = "nodejs";

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value === "1";
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ birthDate: null }, { status: 401 });
  }

  try {
    const collection = await getUserSettingsCollection();
    const doc = await collection.findOne({ settingsKey: "global" });
    return NextResponse.json({ birthDate: doc?.birthDate ?? null });
  } catch {
    return NextResponse.json({ birthDate: null }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ birthDate: null }, { status: 401 });
  }

  let body: { birthDate?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ birthDate: null }, { status: 400 });
  }

  const birthDate = body.birthDate ?? null;

  try {
    const collection = await getUserSettingsCollection();
    await collection.updateOne(
      { settingsKey: "global" },
      { $set: { birthDate, updatedAt: new Date().toISOString() } },
      { upsert: true },
    );
    return NextResponse.json({ birthDate });
  } catch {
    return NextResponse.json({ birthDate: null }, { status: 500 });
  }
}
