import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-50">台股交易輔助平台</h1>
        <p className="mt-2 text-slate-400">Dashboard — Phase 2 will build this out</p>
        <p className="mt-1 text-sm text-slate-500">Logged in as {user.email}</p>
      </div>
    </div>
  );
}
