import type { Metadata } from 'next';
import { LibraryView } from '@/components/dashboard/LibraryView';

export const metadata: Metadata = {
  title: 'Library',
};

export default function DashboardPage() {
  return <LibraryView />;
}
