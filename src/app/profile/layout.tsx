import { AppShell } from '@/components/app/AppShell';
import { getSidebarDefaults } from '@/components/app/sidebar-defaults';

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = await getSidebarDefaults(true);
  return <AppShell {...sidebar}>{children}</AppShell>;
}
