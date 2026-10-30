import { AppShell } from '@/components/app/AppShell';

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
