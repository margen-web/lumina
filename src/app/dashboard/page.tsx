"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowLeft, Loader2, Save, Users, Eye, CheckCircle, Share2, LogIn, Lock } from "lucide-react";
import Link from "next/link";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";

interface NewsItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  sourceUrl: string;
}

interface Metrics {
  total_views: number;
  unique_visitors: number;
  feed_completes: number;
  shares: number;
  news_views: { [newsId: string]: number };
}

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // States for data
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [selectedNewsTab, setSelectedNewsTab] = useState<string>("1");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSavingNews, setIsSavingNews] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Editor form values
  const [formCategory, setFormCategory] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formSourceUrl, setFormSourceUrl] = useState("");

  const loadDashboardData = async (activePasscode: string) => {
    setIsLoadingData(true);
    try {
      // 1. Fetch News
      const resNews = await fetch(`${SUPABASE_URL}/rest/v1/lumina_news?select=id,category,title,summary,source_url&order=id.asc`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      let fetchedNewsList: NewsItem[] = [];
      if (resNews.ok) {
        const data = await resNews.json();
        fetchedNewsList = data.map((item: {
          id: string;
          category: string;
          title: string;
          summary: string;
          source_url: string;
        }) => ({
          id: item.id,
          category: item.category,
          title: item.title,
          summary: item.summary,
          sourceUrl: item.source_url,
        }));
        setNewsList(fetchedNewsList);
        
        // Initialize form values with news ID "1"
        const activeNews = fetchedNewsList.find(n => n.id === selectedNewsTab) || fetchedNewsList[0];
        if (activeNews) {
          setFormCategory(activeNews.category);
          setFormTitle(activeNews.title);
          setFormSummary(activeNews.summary);
          setFormSourceUrl(activeNews.sourceUrl);
        }
      }

      // 2. Fetch Metrics RPC
      const resMetrics = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_lumina_metrics`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode_param: activePasscode }),
      });

      if (resMetrics.ok) {
        const data = await resMetrics.json();
        setMetrics(data);
      } else {
        const errData = await resMetrics.json();
        throw new Error(errData.message || "Error al obtener métricas");
      }
    } catch (err) {
      const error = err as Error;
      console.error(error);
      setErrorMsg(error.message || "Fallo en la comunicación con el servidor");
      sessionStorage.removeItem("lumina_admin_auth");
      sessionStorage.removeItem("lumina_admin_passcode");
      setIsAuthenticated(false);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Load auth state from session
  useEffect(() => {
    const savedAuth = sessionStorage.getItem("lumina_admin_auth");
    const savedPass = sessionStorage.getItem("lumina_admin_passcode");
    if (savedAuth === "true" && savedPass) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPasscode(savedPass);
      setIsAuthenticated(true);
      loadDashboardData(savedPass);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;

    setIsLoggingIn(true);
    setErrorMsg("");

    try {
      // Test the passcode by calling get_lumina_metrics RPC
      const resMetrics = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_lumina_metrics`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode_param: passcode }),
      });

      if (resMetrics.ok) {
        sessionStorage.setItem("lumina_admin_auth", "true");
        sessionStorage.setItem("lumina_admin_passcode", passcode);
        setIsAuthenticated(true);
        loadDashboardData(passcode);
      } else {
        const errData = await resMetrics.json();
        setErrorMsg(errData.message || "Contraseña incorrecta. Acceso denegado.");
      }
    } catch {
      setErrorMsg("Error de red al verificar contraseña");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleTabChange = (newsId: string) => {
    setSelectedNewsTab(newsId);
    const activeNews = newsList.find(n => n.id === newsId);
    if (activeNews) {
      setFormCategory(activeNews.category);
      setFormTitle(activeNews.title);
      setFormSummary(activeNews.summary);
      setFormSourceUrl(activeNews.sourceUrl);
    }
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    setIsSavingNews(true);
    setSaveSuccessMsg("");

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_lumina_news`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          passcode_param: passcode,
          news_id_param: selectedNewsTab,
          category_param: formCategory,
          title_param: formTitle,
          summary_param: formSummary,
          source_url_param: formSourceUrl,
        }),
      });

      if (res.ok) {
        setSaveSuccessMsg("¡Noticia actualizada en directo con éxito!");
        setTimeout(() => setSaveSuccessMsg(""), 4000);
        // Refresh local cache data
        loadDashboardData(passcode);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.message || "Error al guardar noticia");
      }
    } catch {
      setErrorMsg("Error de red al guardar la noticia");
    } finally {
      setIsSavingNews(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20">
        <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl border border-white/5 flex flex-col gap-6 items-center text-center">
          
          <div className="w-16 h-16 bg-primary-DEFAULT/15 rounded-full flex items-center justify-center mb-1 text-primary-DEFAULT">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
              <Sparkles className="w-5 h-5 text-primary-DEFAULT animate-pulse" /> Panel Lumina
            </h1>
            <p className="text-xs text-slate-400 mt-1">Escribe la contraseña para acceder al panel de control</p>
          </div>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
            <div className="relative">
              <input
                type="password"
                placeholder="Contraseña"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-5 py-3 rounded-full bg-slate-800/80 border border-white/5 focus:border-primary-DEFAULT/50 focus:outline-none text-sm text-center text-white placeholder-slate-500 transition-all font-mono"
                required
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-semibold px-2">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-full bg-primary-DEFAULT hover:bg-primary-dark text-slate-950 font-bold transition-all transform active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Entrar al panel
                </>
              )}
            </button>
          </form>

          <Link href="/" className="text-xs text-slate-500 hover:text-slate-400 transition-colors flex items-center gap-1 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Lumina
          </Link>

        </div>
      </div>
    );
  }

  // Calculate percentages/conversion rates
  const uniqueUsers = metrics?.unique_visitors || 0;
  const feedCompletes = metrics?.feed_completes || 0;
  const conversionRate = uniqueUsers > 0 ? Math.round((feedCompletes / uniqueUsers) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl w-full flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-DEFAULT/15 rounded-2xl text-primary-DEFAULT">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Lumina Dashboard</h1>
              <p className="text-xs text-slate-400">Analíticas anónimas y editor de noticias diarias</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadDashboardData(passcode)}
              disabled={isLoadingData}
              className="px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoadingData ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Actualizar"}
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded-full bg-primary-DEFAULT hover:bg-primary-dark text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ir al feed
            </Link>
          </div>
        </header>

        {/* Global stats grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Unique users */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] flex items-center gap-4 shadow-md">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 hidden sm:block">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Lectores Únicos</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{uniqueUsers}</h3>
            </div>
          </div>

          {/* Card 2: Total page views */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] flex items-center gap-4 shadow-md">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 hidden sm:block">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Visitas Totales</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{metrics?.total_views || 0}</h3>
            </div>
          </div>

          {/* Card 3: Feed completes */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] flex items-center gap-4 shadow-md">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 hidden sm:block">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Dosis Completadas</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{feedCompletes}</h3>
            </div>
          </div>

          {/* Card 4: Conversion / completes */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] flex items-center gap-4 shadow-md">
            <div className="p-3 bg-pink-500/10 rounded-2xl text-pink-400 hidden sm:block">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tasa Retención</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{conversionRate}%</h3>
            </div>
          </div>
        </section>

        {/* Analytics details */}
        {metrics && (
          <section className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col gap-6">
            <h2 className="text-lg font-bold text-white">Embudo de Lectura (Visualizaciones por noticia)</h2>
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4, 5].map((index) => {
                const count = metrics.news_views?.[index.toString()] || 0;
                // Calculate percentage based on total views
                const percent = metrics.total_views > 0 ? Math.round((count / metrics.total_views) * 100) : 0;
                return (
                  <div key={index} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-400 px-1">
                      <span>Noticia {index}</span>
                      <span>{count} vistas ({percent}%)</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-950 border border-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-1000"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* News Editor Section */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col gap-6">
          <h2 className="text-lg font-bold text-white">Editor de Noticias Diarias</h2>
          
          {newsList.length !== 5 && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl text-sm font-semibold text-center">
              ⚠️ Atención: Actualmente hay {newsList.length} noticias en la base de datos. Lúmina requiere exactamente 5 noticias para funcionar correctamente.
            </div>
          )}

          {/* News tab switcher */}
          <div className="flex gap-2 p-1.5 rounded-full bg-slate-950/80 border border-white/5 w-full max-w-md mx-auto">
            {["1", "2", "3", "4", "5"].map((id) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedNewsTab === id
                    ? "bg-primary-DEFAULT text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Card {id}
              </button>
            ))}
          </div>

          {/* Editor Form */}
          <form onSubmit={handleSaveNews} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Category */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 px-1">Categoría</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Ej: Naturaleza, Ciencia..."
                  className="px-5 py-3 rounded-2xl bg-slate-950 border border-white/5 focus:border-primary-DEFAULT/50 focus:outline-none text-sm text-white transition-all"
                  required
                />
              </div>

              {/* Source URL */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 px-1">Enlace original (Source URL)</label>
                <input
                  type="url"
                  value={formSourceUrl}
                  onChange={(e) => setFormSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="px-5 py-3 rounded-2xl bg-slate-950 border border-white/5 focus:border-primary-DEFAULT/50 focus:outline-none text-sm text-white transition-all"
                  required
                />
              </div>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 px-1">Título de la noticia</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Escribe el titular optimista..."
                className="px-5 py-3 rounded-2xl bg-slate-950 border border-white/5 focus:border-primary-DEFAULT/50 focus:outline-none text-sm text-white transition-all"
                required
              />
            </div>

            {/* Summary */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 px-1">Resumen (2-3 líneas)</label>
              <textarea
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                placeholder="Escribe el resumen descriptivo y positivo..."
                rows={4}
                className="px-5 py-4 rounded-3xl bg-slate-950 border border-white/5 focus:border-primary-DEFAULT/50 focus:outline-none text-sm text-white resize-none transition-all leading-relaxed"
                required
              />
            </div>

            {/* Success and Error messages */}
            {saveSuccessMsg && (
              <p className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2.5 rounded-full text-center border border-emerald-500/20">
                {saveSuccessMsg}
              </p>
            )}
            {errorMsg && !saveSuccessMsg && (
              <p className="text-xs text-rose-400 font-bold bg-rose-500/10 px-4 py-2.5 rounded-full text-center border border-rose-500/20">
                {errorMsg}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="submit"
                disabled={isSavingNews}
                className="px-6 py-3.5 rounded-full bg-primary-DEFAULT hover:bg-primary-dark text-slate-950 font-bold text-sm transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSavingNews ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Guardar Noticia
                  </>
                )}
              </button>
            </div>

          </form>
        </section>

      </div>
    </div>
  );
}
