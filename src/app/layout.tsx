import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/lib/authContext';
import AppShell from "@/components/AppShell";
import { NexenInspector } from '@/components/_internal/NexenInspector';
import { getCurrentUserId } from '@/lib/auth';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: "Kairos — Tutor Invoicing & Cash Forecast",
  description: "Deterministic cash runway, invoicing, and billing for home tutors",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialUser = null;
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const u = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });
      if (u) {
        initialUser = { id: u.id, email: u.email, name: u.name, role: 'home_tutor' };
      }
    }
  } catch {
    // DB or auth token lookup issue; client will fall back safely
  }

  return (
    <html data-nexen-component="nx_app_layout" lang="en">
      <body className="font-sans antialiased">
        <NexenInspector />
        <AuthProvider initialUser={initialUser}>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
