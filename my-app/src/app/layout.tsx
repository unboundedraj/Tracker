import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AuthGate } from "@/components/common/auth-gate";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import "./globals.css";
import { PROJECT_NAME } from "@/lib/project";

export const metadata: Metadata = {
  title: PROJECT_NAME,
  description: `${PROJECT_NAME} project initialized with a scalable App Router structure.`,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const initialAuthenticated = cookieStore.get(AUTH_COOKIE_NAME)?.value === "1";

  return (
    <html lang="en">
      <body>
        <AuthGate initialAuthenticated={initialAuthenticated}>{children}</AuthGate>
      </body>
    </html>
  );
}
