import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardClient from '@/components/dashboard/dashboard-client'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Check valid session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/dashboard/login')
  }

  // 2. Check if user is in lumina_admins
  const { data: adminData, error: adminError } = await supabase
    .from('lumina_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (adminError || !adminData) {
    // Authenticated but not an admin -> sign out and reject
    await supabase.auth.signOut()
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="max-w-md bg-slate-800 p-8 rounded-3xl shadow-xl">
          <h1 className="text-2xl font-bold text-rose-500 mb-4">Acceso Denegado</h1>
          <p className="text-sm text-slate-300 mb-6">
            Tu cuenta no tiene permisos de administrador. Sesión cerrada.
          </p>
          <Link href="/" className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-full font-bold transition-colors">
            Volver al feed
          </Link>
        </div>
      </div>
    )
  }

  // 3. Admin authorized. Fetch data on server.
  // We use supabase client, which sends the auth token automatically.
  const { data: newsList } = await supabase
    .from('lumina_news')
    .select('id,category,title,summary,source_url')
    .order('id', { ascending: true })

  // 4. Fetch metrics
  const { data: metrics } = await supabase.rpc('get_lumina_metrics')

  const parsedNewsList = (newsList || []).map((item: { id: string, category: string, title: string, summary: string, source_url: string }) => ({
    id: item.id,
    category: item.category,
    title: item.title,
    summary: item.summary,
    sourceUrl: item.source_url,
  }))

  return (
    <DashboardClient 
      initialNews={parsedNewsList} 
      initialMetrics={metrics} 
    />
  )
}
