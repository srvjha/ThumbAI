import type { Metadata } from 'next';
import { AnalyticsView } from '@/components/dashboard/analytics/AnalyticsView';

export const metadata: Metadata = {
  title: 'Analytics',
};

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
