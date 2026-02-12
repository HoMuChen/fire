import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/DashboardClient';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch watchlists server-side for initial render
  const { data: watchlists } = await supabase
    .from('watchlists')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true });

  return <DashboardClient watchlists={watchlists ?? []} />;
}
