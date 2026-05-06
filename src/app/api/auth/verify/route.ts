import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

interface VerifyRequestBody {
  password?: string;
}

export async function POST(request: NextRequest) {
  const expectedPassword = process.env.AUTH_PASSWORD;

  if (!expectedPassword) {
    return NextResponse.json(
      { authenticated: false, message: "Authentication is not configured." },
      { status: 500 },
    );
  }

  let body: VerifyRequestBody;

  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return NextResponse.json(
      { authenticated: false, message: "Invalid request." },
      { status: 400 },
    );
  }

  if (body.password !== expectedPassword) {
    return NextResponse.json(
      { authenticated: false, message: "Incorrect password." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ authenticated: true });

  response.cookies.set(AUTH_COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
