import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { PROJECT_NAME } from "@/lib/project";

export const metadata: Metadata = {
  title: PROJECT_NAME,
  description: `${PROJECT_NAME} project initialized with a scalable App Router structure.`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
