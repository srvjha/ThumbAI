import { UserDetailView } from '@/components/admin/UserDetailView';

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserDetailView id={id} />;
}
