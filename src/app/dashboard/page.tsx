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
  const { data: adminCheck } = await supabase
    .from('lumina_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!adminCheck) {
    // 3. User is authenticated but NOT an admin. Force logout and redirect.
    redirect('/auth/access-denied')
  }

  // 4. Admin authorized. Fetch data on server.
  const { data: newsList, error: newsError } = await supabase
    .from('lumina_news')
    .select('id,category,title,summary,source_url')
    .order('id', { ascending: true })

  const { data: metrics, error: metricsError } = await supabase.rpc('get_lumina_metrics')

  if (newsError || metricsError) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-rose-950/30 rounded-[2.5rem] p-8 border border-rose-500/20 text-center">
          <h1 className="text-xl font-bold text-white mb-4">Error del sistema</h1>
          <p className="text-sm text-slate-300 mb-6">
            No se han podido cargar los datos del sistema de Lúmina.
          </p>
          <Link href="/" className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-full font-bold transition-colors">
            Volver al feed
          </Link>
        </div>
      </div>
    )
  }

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
