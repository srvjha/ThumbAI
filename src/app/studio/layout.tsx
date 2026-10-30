import { AppShell } from '@/components/app/AppShell';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
