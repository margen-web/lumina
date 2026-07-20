'use client'

import { useState } from 'react'
import { Sparkles, Save, Eye, CheckCircle, LogOut, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface NewsItem {
  id: string
  category: string
  title: string
  summary: string
  sourceUrl: string
}

interface Metrics {
  total_views: number
  unique_visitors: number
  feed_completes: number
  shares: number
  news_views: { [newsId: string]: number }
}

export default function DashboardClient({ initialNews, initialMetrics }: { initialNews: NewsItem[], initialMetrics: Metrics | null }) {
  const metrics = initialMetrics
  const [newsList, setNewsList] = useState<NewsItem[]>(initialNews)
  const [selectedNewsTab, setSelectedNewsTab] = useState<string>(initialNews[0]?.id?.toString() || "1")
  
  const [isSavingNews, setIsSavingNews] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  // Initial form values derived from tab "1"
  const defaultNews = initialNews.find(n => n.id === "1") || initialNews[0] || { category: '', title: '', summary: '', sourceUrl: '' }
  const [formCategory, setFormCategory] = useState(defaultNews.category)
  const [formTitle, setFormTitle] = useState(defaultNews.title)
  const [formSummary, setFormSummary] = useState(defaultNews.summary)
  const [formSourceUrl, setFormSourceUrl] = useState(defaultNews.sourceUrl)

  const supabase = createClient()
  const router = useRouter()

  const handleTabChange = (newsId: string) => {
    setSelectedNewsTab(newsId)
    const activeNews = newsList.find(n => n.id === newsId)
    if (activeNews) {
      setFormCategory(activeNews.category)
      setFormTitle(activeNews.title)
      setFormSummary(activeNews.summary)
      setFormSourceUrl(activeNews.sourceUrl)
    }
  }

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingNews(true)
    setSaveSuccessMsg("")
    setErrorMsg("")

    try {
      // Direct UPDATE to the table. RLS will protect it.
      const { data, error } = await supabase
        .from('lumina_news')
        .update({
          category: formCategory,
          title: formTitle,
          summary: formSummary,
          source_url: formSourceUrl
        })
        .eq('id', selectedNewsTab)
        .select('id')
        .single()

      if (error || !data) {
        throw new Error("No se pudo modificar la noticia")
      }

      setSaveSuccessMsg("¡Noticia actualizada en directo con éxito!")
      setTimeout(() => setSaveSuccessMsg(""), 4000)
      
      // Update local state smoothly
      setNewsList(prev => prev.map(n => n.id === selectedNewsTab ? {
        ...n,
        category: formCategory,
        title: formTitle,
        summary: formSummary,
        sourceUrl: formSourceUrl
      } : n))

    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Error al guardar noticia")
    } finally {
      setIsSavingNews(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
      
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary-DEFAULT" />
          <h1 className="text-2xl font-bold tracking-tight text-white">Panel Lumina</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            Ver Feed Público
          </Link>
          <button 
            onClick={async () => {
              await fetch('/auth/logout', { method: 'POST' });
              router.push('/dashboard/login');
              router.refresh();
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-full text-sm font-bold transition-colors"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUMNA 1: MÉTRICAS */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="bg-slate-800/50 rounded-[2rem] p-6 border border-white/5 flex flex-col gap-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary-DEFAULT" /> Audiencia (Total)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 p-4 rounded-2xl flex flex-col">
                <span className="text-xs font-semibold text-slate-400 mb-1">Vistas Generales</span>
                <span className="text-3xl font-black text-white">{metrics?.total_views || 0}</span>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-2xl flex flex-col">
                <span className="text-xs font-semibold text-slate-400 mb-1">Visitantes Únicos</span>
                <span className="text-3xl font-black text-white">{metrics?.unique_visitors || 0}</span>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-2xl flex flex-col">
                <span className="text-xs font-semibold text-slate-400 mb-1">Dosis Completas</span>
                <span className="text-3xl font-black text-emerald-400">{metrics?.feed_completes || 0}</span>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-2xl flex flex-col">
                <span className="text-xs font-semibold text-slate-400 mb-1">Compartidos</span>
                <span className="text-3xl font-black text-blue-400">{metrics?.shares || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: EDITOR DE NOTICIAS */}
        <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
          <div className="bg-slate-800/50 rounded-[2rem] p-6 border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Save className="w-5 h-5 text-primary-DEFAULT" /> Editor de Dosis
              </h2>
              {newsList.length !== 5 && (
                <div className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold border border-amber-500/20">
                  ⚠️ Atención: Hay {newsList.length} noticias (deben ser 5)
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
              {newsList.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleTabChange(n.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                    selectedNewsTab === n.id 
                      ? "bg-primary-DEFAULT text-slate-900 border-primary-DEFAULT shadow-[0_0_15px_rgba(250,204,21,0.3)]" 
                      : "bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-800"
                  }`}
                >
                  Dosis {n.id}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveNews} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Categoría</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Ej: CIENCIA, TECNOLOGÍA..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 focus:border-primary-DEFAULT/50 focus:outline-none text-sm text-white transition-all font-semibold"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Titular Positivo</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 focus:border-primary-DEFAULT/50 focus:outline-none text-base text-white transition-all font-bold"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Resumen (Directo al grano)</label>
                <textarea
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 focus:border-primary-DEFAULT/50 focus:outline-none text-sm text-slate-300 transition-all resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">URL de la Fuente original</label>
                <input
                  type="url"
                  value={formSourceUrl}
                  onChange={(e) => setFormSourceUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 focus:border-primary-DEFAULT/50 focus:outline-none text-sm text-blue-400 transition-all"
                  required
                />
              </div>

              <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                <div className="flex flex-col">
                  {errorMsg && <span className="text-xs font-bold text-rose-400">{errorMsg}</span>}
                  {saveSuccessMsg && <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {saveSuccessMsg}</span>}
                </div>
                
                <button
                  type="submit"
                  disabled={isSavingNews}
                  className="px-8 py-3 rounded-full bg-white text-slate-900 font-black hover:bg-slate-200 transition-all transform active:scale-95 disabled:opacity-50 flex items-center gap-2 text-sm shadow-xl"
                >
                  {isSavingNews ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSavingNews ? "Guardando..." : "Publicar Cambios"}
                </button>
              </div>
            </form>

          </div>
        </div>

      </div>
    </div>
  )
}
