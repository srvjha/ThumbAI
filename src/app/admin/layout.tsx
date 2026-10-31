import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { AppShell } from '@/components/app/AppShell';
import { getSidebarDefaults } from '@/components/app/sidebar-defaults';

export const metadata = { title: 'Admin', robots: { index: false } };

/**
 * The admin panel lives in the app shell beside everything else. Anyone but
 * an admin gets a 404, so the section's existence isn't advertised. The
 * APIs check again on every call.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const user = userId
    ? await db.user.findUnique({
        where: { clerk_id: userId },
        select: { role: true, deleted_at: true },
      })
    : null;
  if (user?.role !== 'ADMIN' || user.deleted_at) notFound();

  const sidebar = await getSidebarDefaults(true);
  return <AppShell {...sidebar}>{children}</AppShell>;
}
