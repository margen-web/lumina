"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Lock,
  LogOut,
  FileEdit,
  Eye,
  AlertTriangle,
  Save,
  Plus,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { supabase, StoryItem } from "@/lib/supabase";

interface MetricsData {
  totalSessions: number;
  uniqueDevices: number;
  editionCompletes: number;
  completionRate: number;
  sharesCount: number;
  positionViews: { [pos: number]: number };
  evidenceOpens: { [storyId: string]: number };
  sourceClicks: { [storyId: string]: number };
  storyShares: { [storyId: string]: number };
  storyViews: { [storyId: string]: number };
  multiEditionUsers: {
    twoPlus: number;
    threePlus: number;
    fivePlus: number;
  };
}

export default function DashboardPage() {
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navegación del Dashboard
  const [activeTab, setActiveTab] = useState<"metrics" | "editor" | "preview">("metrics");

  // Estado del Editor de Ediciones
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Estado de Métricas
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  // Check auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user?.email || null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user?.email || null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadStoriesForDate = useCallback(async (dateStr: string) => {
    try {
      const { data, error } = await supabase
        .from("lumina_stories")
        .select("*")
        .eq("edition_date", dateStr)
        .order("edition_position", { ascending: true });

      if (!error && data) {
        setStories(data as StoryItem[]);
        setSelectedStoryIndex(0);
      }
    } catch (err) {
      console.error("Error loading stories:", err);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const { data: events, error } = await supabase
        .from("lumina_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error || !events) {
        return;
      }

      let totalSessions = 0;
      const deviceSet = new Set<string>();
      let editionCompletes = 0;
      let sharesCount = 0;
      const positionViews: { [pos: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const evidenceOpens: { [storyId: string]: number } = {};
      const sourceClicks: { [storyId: string]: number } = {};
      const storyShares: { [storyId: string]: number } = {};
      const storyViews: { [storyId: string]: number } = {};

      const deviceEditions: { [device: string]: Set<string> } = {};

      events.forEach((ev) => {
        if (ev.device_uuid) deviceSet.add(ev.device_uuid);

        if (ev.event_name === "session_started" || ev.event_name === "page_view") {
          totalSessions++;
        }

        if (ev.event_name === "edition_completed" || ev.event_name === "feed_complete") {
          editionCompletes++;
          if (ev.device_uuid && ev.edition_date) {
            if (!deviceEditions[ev.device_uuid]) {
              deviceEditions[ev.device_uuid] = new Set();
            }
            deviceEditions[ev.device_uuid].add(ev.edition_date);
          }
        }

        if (ev.event_name === "story_shared" || ev.event_name === "news_share") {
          sharesCount++;
          if (ev.news_id) {
            storyShares[ev.news_id] = (storyShares[ev.news_id] || 0) + 1;
          }
        }

        if (ev.event_name === "story_viewed" || ev.event_name === "news_view") {
          if (ev.position && ev.position >= 1 && ev.position <= 5) {
            positionViews[ev.position] = (positionViews[ev.position] || 0) + 1;
          }
          if (ev.news_id) {
            storyViews[ev.news_id] = (storyViews[ev.news_id] || 0) + 1;
          }
        }

        if (ev.event_name === "evidence_opened" && ev.news_id) {
          evidenceOpens[ev.news_id] = (evidenceOpens[ev.news_id] || 0) + 1;
        }

        if (ev.event_name === "source_clicked" && ev.news_id) {
          sourceClicks[ev.news_id] = (sourceClicks[ev.news_id] || 0) + 1;
        }
      });

      let twoPlus = 0;
      let threePlus = 0;
      let fivePlus = 0;
      Object.values(deviceEditions).forEach((edSet) => {
        if (edSet.size >= 2) twoPlus++;
        if (edSet.size >= 3) threePlus++;
        if (edSet.size >= 5) fivePlus++;
      });

      const uniqueDevCount = deviceSet.size || 1;
      const compRate = totalSessions > 0 ? Math.round((editionCompletes / totalSessions) * 100) : 0;

      setMetrics({
        totalSessions,
        uniqueDevices: uniqueDevCount,
        editionCompletes,
        completionRate: compRate,
        sharesCount,
        positionViews,
        evidenceOpens,
        sourceClicks,
        storyShares,
        storyViews,
        multiEditionUsers: {
          twoPlus,
          threePlus,
          fivePlus,
        },
      });
    } catch (err) {
      console.error("Error loading metrics:", err);
    }
  }, []);

  // Cargar historias de la fecha seleccionada
  useEffect(() => {
    if (!sessionUser) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStoriesForDate(selectedDate);
    loadMetrics();
  }, [sessionUser, selectedDate, loadStoriesForDate, loadMetrics]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      });

      if (error) {
        setLoginError(error.message || "Credenciales incorrectas.");
      } else if (data.user) {
        setSessionUser(data.user.email || null);
      }
    } catch {
      setLoginError("Error de conexión con el servidor de autenticación.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
  };

  // Crear nueva historia para la posición actual
  const handleCreateStory = (position: number) => {
    const newStory: StoryItem = {
      id: `story-${selectedDate}-${position}`,
      edition_date: selectedDate,
      edition_position: position,
      status: "draft",
      category: "Ciencia & Salud",
      headline: "",
      what_changed: "",
      why_it_matters: "",
      evidence: "",
      evidence_metric: "",
      evidence_metric_label: "",
      caveat: "",
      primary_source_name: "",
      primary_source_url: "https://",
      primary_source_type: "scientific_paper",
      editorial_score: 85,
      flags: [],
    };

    setStories((prev) => [...prev.filter((s) => s.edition_position !== position), newStory].sort((a, b) => a.edition_position - b.edition_position));
  };

  const handleUpdateCurrentStoryField = (field: keyof StoryItem, value: unknown) => {
    setStories((prev) => {
      const copy = [...prev];
      if (copy[selectedStoryIndex]) {
        copy[selectedStoryIndex] = {
          ...copy[selectedStoryIndex],
          [field]: value,
        };
      }
      return copy;
    });
  };

  const handleSaveAllStories = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      for (const story of stories) {
        const { error } = await supabase
          .from("lumina_stories")
          .upsert(story, { onConflict: "id" });
        if (error) throw error;
      }
      setSaveStatus("Edición guardada correctamente.");
      setTimeout(() => setSaveStatus(null), 3000);
      loadStoriesForDate(selectedDate);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar en Supabase";
      setSaveStatus(`Error: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const currentStory = stories[selectedStoryIndex] || null;

  // Validaciones editoriales
  const validationWarnings: string[] = [];
  if (stories.length !== 5) {
    validationWarnings.push(`La edición tiene ${stories.length} historias (se recomiendan exactamente 5).`);
  }
  const publishedCount = stories.filter((s) => s.status === "published").length;
  if (publishedCount > 0 && publishedCount < 5) {
    validationWarnings.push(`Hay solo ${publishedCount} historias publicadas de 5.`);
  }
  const categoryCounts: { [cat: string]: number } = {};
  stories.forEach((s) => {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    if (!s.caveat || s.caveat.trim().length < 10) {
      validationWarnings.push(`Posición ${s.edition_position}: Falta especificar 'Qué queda pendiente' (caveat).`);
    }
    if (!s.evidence || s.evidence.trim().length < 10) {
      validationWarnings.push(`Posición ${s.edition_position}: Falta especificar la evidencia o estudio.`);
    }
  });
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    if (count >= 3) {
      validationWarnings.push(`Aviso de diversidad: ${count} historias concentradas en '${cat}'.`);
    }
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Cargando acceso seguro...
      </div>
    );
  }

  // PANTALLA DE LOGIN CON SUPABASE AUTH
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30">
        <div className="w-full max-w-sm bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10 flex flex-col gap-6 items-center text-center">
          <div className="w-14 h-14 bg-primary-DEFAULT/15 rounded-2xl flex items-center justify-center text-primary-DEFAULT">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-mono">
              Lumina Admin<span className="text-primary-DEFAULT">.</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Acceso administrativo seguro (Supabase Auth)
            </p>
          </div>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3.5">
            <input
              type="email"
              placeholder="Email del editor"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:border-primary-DEFAULT/50 focus:outline-none text-xs text-white placeholder-slate-500"
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:border-primary-DEFAULT/50 focus:outline-none text-xs text-white placeholder-slate-500 font-mono"
              required
            />

            {loginError && (
              <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-primary-DEFAULT hover:bg-primary-dark text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isLoggingIn ? "Verificando..." : "Entrar al Panel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PANEL PRINCIPAL AUTENTICADO
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Barra superior de navegación */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold font-mono tracking-tight text-white">
              Lumina<span className="text-primary-DEFAULT">.</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400 font-mono">
              Validation Build 0.2
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("metrics")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "metrics"
                  ? "bg-primary-DEFAULT text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Métricas
            </button>
            <button
              onClick={() => setActiveTab("editor")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "editor"
                  ? "bg-primary-DEFAULT text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" /> Editor Ediciones
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "preview"
                  ? "bg-primary-DEFAULT text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Preview Móvil
            </button>

            <button
              onClick={handleLogout}
              className="ml-3 p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* PESTAÑA 1: MÉTRICAS DEL EXPERIMENTO DE VALIDACIÓN */}
        {activeTab === "metrics" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
                <span className="text-xs uppercase font-mono text-slate-400">Dispositivos Únicos</span>
                <p className="text-3xl font-extrabold text-white mt-1">{metrics?.uniqueDevices || 0}</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
                <span className="text-xs uppercase font-mono text-slate-400">Sesiones Totales</span>
                <p className="text-3xl font-extrabold text-white mt-1">{metrics?.totalSessions || 0}</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
                <span className="text-xs uppercase font-mono text-slate-400">Dosis Completadas</span>
                <p className="text-3xl font-extrabold text-emerald-400 mt-1">{metrics?.editionCompletes || 0}</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
                <span className="text-xs uppercase font-mono text-slate-400">Completion Rate</span>
                <p className="text-3xl font-extrabold text-primary-DEFAULT mt-1">{metrics?.completionRate || 0}%</p>
              </div>
            </div>

            {/* Embudo de Lectura 1/5 a 5/5 */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Embudo de Lectura por Posición (1/5 → 5/5)
              </h3>
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4, 5].map((pos) => {
                  const views = metrics?.positionViews[pos] || 0;
                  const pct = metrics?.totalSessions ? Math.round((views / metrics.totalSessions) * 100) : 0;
                  return (
                    <div key={pos} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Historia {pos}</span>
                        <span>{views} aperturas ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full bg-primary-DEFAULT rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Métrica Experimental Clave: Retención de Retorno a 7 días */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-primary-DEFAULT">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Métrica Experimental de Validación: Retorno a 7 Días
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                % de lectores que completan al menos 2, 3 o 5 ediciones distintas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div className="p-4 rounded-xl bg-slate-950 border border-white/5">
                  <span className="text-xs text-slate-400 font-mono">≥ 2 Ediciones en 7d</span>
                  <p className="text-2xl font-bold text-white mt-1">{metrics?.multiEditionUsers.twoPlus || 0} usuarios</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-white/5">
                  <span className="text-xs text-slate-400 font-mono">≥ 3 Ediciones en 7d</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{metrics?.multiEditionUsers.threePlus || 0} usuarios</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-white/5">
                  <span className="text-xs text-slate-400 font-mono">≥ 5 Ediciones en 7d</span>
                  <p className="text-2xl font-bold text-primary-DEFAULT mt-1">{metrics?.multiEditionUsers.fivePlus || 0} usuarios</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: EDITOR EDITORIAL CON SCORING Y VALIDACIÓN */}
        {activeTab === "editor" && (
          <div className="flex flex-col gap-6">
            {/* Selector de Fecha y Advertencias */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
              <div className="flex items-center gap-3">
                <label className="text-xs font-mono text-slate-400">Fecha de la Edición:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                {saveStatus && (
                  <span className={`text-xs font-semibold px-3 py-1 rounded-lg ${
                    saveStatus.startsWith("Error") ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {saveStatus}
                  </span>
                )}
                <button
                  onClick={handleSaveAllStories}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-primary-DEFAULT hover:bg-primary-dark text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> {isSaving ? "Guardando..." : "Guardar Edición"}
                </button>
              </div>
            </div>

            {/* Panel de Advertencias Editoriales */}
            {validationWarnings.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" /> Alertas de Calidad Editorial
                </div>
                <ul className="text-xs text-amber-300/90 list-disc list-inside flex flex-col gap-1">
                  {validationWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pestañas de Posición 1 a 5 */}
            <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-900 border border-white/10 overflow-x-auto">
              {[1, 2, 3, 4, 5].map((pos, idx) => {
                const storyAtPos = stories.find((s) => s.edition_position === pos);
                return (
                  <button
                    key={pos}
                    onClick={() => {
                      if (!storyAtPos) {
                        handleCreateStory(pos);
                      }
                      setSelectedStoryIndex(idx);
                    }}
                    className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedStoryIndex === idx
                        ? "bg-primary-DEFAULT text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>Posición {pos}</span>
                    {storyAtPos ? (
                      <span className={`w-2 h-2 rounded-full ${
                        storyAtPos.status === "published" ? "bg-emerald-400" : "bg-amber-400"
                      }`} />
                    ) : (
                      <Plus className="w-3 h-3 text-slate-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Formulario de la historia activa */}
            {currentStory ? (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-mono">Estado</label>
                    <select
                      value={currentStory.status}
                      onChange={(e) => handleUpdateCurrentStoryField("status", e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                    >
                      <option value="draft">DRAFT (Borrador)</option>
                      <option value="ready">READY (Revisado)</option>
                      <option value="published">PUBLISHED (Publicado en App)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-mono">Categoría</label>
                    <input
                      type="text"
                      value={currentStory.category}
                      onChange={(e) => handleUpdateCurrentStoryField("category", e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                      placeholder="Ej: Energía & Clima"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-mono">Tipo de Fuente Primaria</label>
                    <select
                      value={currentStory.primary_source_type}
                      onChange={(e) => handleUpdateCurrentStoryField("primary_source_type", e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                    >
                      <option value="scientific_paper">Paper Científico (Peer-reviewed)</option>
                      <option value="official_data">Datos Oficiales / Gobierno</option>
                      <option value="public_institution">Institución Pública / ONU</option>
                      <option value="university">Universidad / Centro de Investigación</option>
                      <option value="NGO_report">Informe de ONG Auditado</option>
                      <option value="reputable_media">Agencia / Medio de Referencia</option>
                    </select>
                  </div>
                </div>

                {/* Titular */}
                <div>
                  <label className="text-xs text-slate-400 font-mono">Titular (Factual y sin clickbait)</label>
                  <input
                    type="text"
                    value={currentStory.headline}
                    onChange={(e) => handleUpdateCurrentStoryField("headline", e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs sm:text-sm text-white font-bold focus:outline-none"
                    placeholder="Escribe el titular claro..."
                  />
                </div>

                {/* Qué cambió y Por qué importa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-mono">Qué cambió (Máx 2 frases)</label>
                    <textarea
                      rows={3}
                      value={currentStory.what_changed}
                      onChange={(e) => handleUpdateCurrentStoryField("what_changed", e.target.value)}
                      className="w-full mt-1 p-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white leading-relaxed focus:outline-none resize-none"
                      placeholder="Qué ocurrió exactamente con datos objetivos..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-mono">Por qué importa (1-2 frases)</label>
                    <textarea
                      rows={3}
                      value={currentStory.why_it_matters}
                      onChange={(e) => handleUpdateCurrentStoryField("why_it_matters", e.target.value)}
                      className="w-full mt-1 p-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white leading-relaxed focus:outline-none resize-none"
                      placeholder="Por qué este avance tiene impacto sistémico..."
                    />
                  </div>
                </div>

                {/* Evidencia y Métrica */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400 font-mono">Evidencia / Estudio / Datos concretos</label>
                    <textarea
                      rows={3}
                      value={currentStory.evidence}
                      onChange={(e) => handleUpdateCurrentStoryField("evidence", e.target.value)}
                      className="w-full mt-1 p-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white leading-relaxed focus:outline-none resize-none"
                      placeholder="Detalle del paper, tamaño de muestra o auditoría..."
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="text-xs text-slate-400 font-mono">Métrica Clave</label>
                      <input
                        type="text"
                        value={currentStory.evidence_metric || ""}
                        onChange={(e) => handleUpdateCurrentStoryField("evidence_metric", e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-primary-DEFAULT font-mono font-bold focus:outline-none"
                        placeholder="Ej: 88% o -73%"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-mono">Etiqueta de la Métrica</label>
                      <input
                        type="text"
                        value={currentStory.evidence_metric_label || ""}
                        onChange={(e) => handleUpdateCurrentStoryField("evidence_metric_label", e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                        placeholder="Ej: de energía limpia"
                      />
                    </div>
                  </div>
                </div>

                {/* Qué queda pendiente (Caveat) */}
                <div>
                  <label className="text-xs text-amber-400 font-mono flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Qué queda pendiente / Limitaciones (Caveat)
                  </label>
                  <textarea
                    rows={2}
                    value={currentStory.caveat}
                    onChange={(e) => handleUpdateCurrentStoryField("caveat", e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl bg-slate-950 border border-amber-500/20 text-xs text-white leading-relaxed focus:outline-none resize-none"
                    placeholder="Qué retos siguen abiertos o qué no está demostrado todavía..."
                  />
                </div>

                {/* Fuente y Enlace */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-mono">Nombre de la Fuente</label>
                    <input
                      type="text"
                      value={currentStory.primary_source_name}
                      onChange={(e) => handleUpdateCurrentStoryField("primary_source_name", e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                      placeholder="Ej: Nature Communications"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-mono">URL Oficial Directa</label>
                    <input
                      type="url"
                      value={currentStory.primary_source_url}
                      onChange={(e) => handleUpdateCurrentStoryField("primary_source_url", e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono focus:outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-white/5">
                Selecciona una posición para editar o crear una historia.
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: PREVIEW MÓVIL EN TIEMPO REAL */}
        {activeTab === "preview" && currentStory && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-full max-w-sm bg-slate-950 p-4 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 flex flex-col gap-4 text-left">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300">
                    {currentStory.category}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {currentStory.edition_position} de 5
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {currentStory.headline || "Titular de ejemplo..."}
                </h3>
                <div className="text-xs text-slate-300 flex flex-col gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Qué cambió</span>
                    <p>{currentStory.what_changed || "Descripción..."}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Por qué importa</span>
                    <p>{currentStory.why_it_matters || "Impacto..."}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-white/5 text-xs flex flex-col gap-2">
                  {currentStory.evidence_metric && (
                    <div className="text-xl font-bold font-mono text-primary-DEFAULT">
                      {currentStory.evidence_metric} <span className="text-xs font-normal text-slate-400">{currentStory.evidence_metric_label}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] uppercase font-mono text-emerald-400 block">Evidencia</span>
                    <p className="text-slate-400">{currentStory.evidence}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-amber-400 block">Qué queda pendiente</span>
                    <p className="text-slate-400">{currentStory.caveat}</p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-1 border-t border-white/5">
                  Fuente: {currentStory.primary_source_name || "Nombre de fuente"}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
