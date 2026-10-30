import { AppShell } from '@/components/app/AppShell';
import { getSidebarDefaults } from '@/components/app/sidebar-defaults';

// Studio routes open collapsed so the canvas gets the room;
// the saved sidebar cookie still wins.
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = await getSidebarDefaults(false);
  return (
    <AppShell {...sidebar} fullBleed>
      {children}
    </AppShell>
  );
}
