"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { Flame, Sun, Moon, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";
import { ProgressBar } from "@/components/progress-bar";
import { NewsCard, NewsItem } from "@/components/news-card";
import { EndOfFeed } from "@/components/end-of-feed";
import { FloatingParticles } from "@/components/floating-particles";
import { logLuminaEvent } from "@/lib/analytics";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";

// 5 Noticias Positivas Reales Mockeadas
const MOCK_NEWS = [
  {
    id: "1",
    category: "Naturaleza",
    title: "La población de pandas gigantes salvajes crece un 20% tras décadas de conservación",
    summary: "Gracias a los esfuerzos de reforestación y la protección legal de los bosques de bambú, los osos panda salvajes han aumentado su número de forma constante y salen oficialmente del peligro de extinción crítica.",
    sourceUrl: "https://www.worldwildlife.org",
  },
  {
    id: "2",
    category: "Ciencia",
    title: "Descubren una enzima bacteriana que descompone plásticos en cuestión de horas",
    summary: "Científicos han perfeccionado una enzima capaz de disolver botellas de PET comunes a nivel molecular en tiempo récord. Abre la puerta a un reciclaje industrial infinito y 100% limpio.",
    sourceUrl: "https://www.nature.com",
  },
  {
    id: "3",
    category: "Sociedad",
    title: "Un pueblo de Alicante logra un récord de reciclaje premiando a sus vecinos",
    summary: "El sistema de puntos intercambiables por vales de comercio local en comercios locales ha impulsado la tasa de separación de residuos al 92%, reactivando además la economía de la comunidad.",
    sourceUrl: "https://www.elpais.com",
  },
  {
    id: "4",
    category: "Salud",
    title: "Un nuevo tratamiento logra la remisión completa de leucemia en ensayos clínicos",
    summary: "Una terapia avanzada con células CAR-T modificadas genéticamente consigue curar a pacientes que no respondían a la quimio. El tratamiento ha sido aprobado para su distribución hospitalaria.",
    sourceUrl: "https://www.nejm.org",
  },
  {
    id: "5",
    category: "Tecnología",
    title: "Crean tejas solares baratas que pueden abastecer de luz gratis a hogares vulnerables",
    summary: "Una startup hispana patenta unas tejas de arcilla combinadas con silicio que reducen el coste de la energía solar doméstica un 60%, facilitando su instalación en zonas de bajos ingresos.",
    sourceUrl: "https://www.technologyreview.com",
  },
];

const CATEGORY_GRADIENTS = {
  0: "from-emerald-500/10 via-teal-500/5 to-slate-900/10 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-slate-950",
  1: "from-blue-500/10 via-cyan-500/5 to-slate-900/10 dark:from-blue-950/20 dark:via-cyan-950/10 dark:to-slate-950",
  2: "from-orange-500/10 via-amber-500/5 to-slate-900/10 dark:from-orange-950/20 dark:via-amber-950/10 dark:to-slate-950",
  3: "from-rose-500/10 via-pink-500/5 to-slate-900/10 dark:from-rose-950/20 dark:via-pink-950/10 dark:to-slate-950",
  4: "from-indigo-500/10 via-violet-500/5 to-slate-900/10 dark:from-indigo-950/20 dark:via-violet-950/10 dark:to-slate-950",
  5: "from-yellow-500/10 via-amber-500/5 to-slate-900/10 dark:from-yellow-950/20 dark:via-amber-950/10 dark:to-slate-950",
} as const;



export default function Home() {
  const { streak, isMounted } = useStreak();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [reactions, setReactions] = useState<{ [newsId: string]: number }>({});
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [newsList, setNewsList] = useState<NewsItem[]>(MOCK_NEWS);
  const [viewedCards, setViewedCards] = useState<string[]>([]);
  
  const visibleNewsList = newsList.slice(0, 5);
  const newsSignature = visibleNewsList.map((news) => news.id).join("|");
  const hasCompleteDailyDose = visibleNewsList.length === 5;
  const audioRef = useRef<HTMLAudioElement | null>(null);



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    logLuminaEvent("page_view");

    const hasSeen = localStorage.getItem("has_seen_onboarding");
    if (!hasSeen) {
      setShowOnboarding(true);
    }

    // Load user reactions from localStorage
    const savedReactions = localStorage.getItem("lumina_user_reactions");
    if (savedReactions) {
      try {
        setUserReactions(JSON.parse(savedReactions));
      } catch (e) {
        console.error("Error parsing user reactions:", e);
      }
    }

    // Fetch initial reactions count from Supabase
    const loadReactions = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/lumina_reactions?select=news_id,count`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const counts: { [newsId: string]: number } = {};
          data.forEach((row: { news_id: string; count: number }) => {
            counts[row.news_id] = row.count;
          });
          setReactions(counts);
        }
      } catch (err) {
        console.error("Error loading reactions:", err);
      }
    };

    // Fetch initial daily news list from Supabase
    const loadNews = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/lumina_news?select=id,category,title,summary,source_url&order=id.asc`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const mappedData: NewsItem[] = data.map((item: {
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
            setNewsList(mappedData);
          }
        }
      } catch (err) {
        console.error("Error loading news from Supabase:", err);
      }
    };

    loadReactions();
    loadNews();
  }, []);
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (visibleNewsList.length > 0 && activeIndex >= visibleNewsList.length) {
      setActiveIndex(visibleNewsList.length - 1);
    }
  }, [newsSignature, visibleNewsList.length, activeIndex]);

  useEffect(() => {
    if (!mounted) return;
    const mainElement = document.querySelector("main");
    if (!mainElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0", 10);
            // Protect against out-of-bounds indices if DOM somehow desyncs
            if (index < visibleNewsList.length) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        root: mainElement,
        threshold: 0.6,
      }
    );

    const cards = mainElement.querySelectorAll("article[data-news-card='true']");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [mounted, newsSignature, visibleNewsList.length]);

  // Vibración táctil suave en cambio de noticia
  useEffect(() => {
    if (activeIndex > 0 && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  }, [activeIndex]);

  // Registrar evento de noticia vista de forma única por sesión
  useEffect(() => {
    if (visibleNewsList.length > 0 && activeIndex < visibleNewsList.length) {
      const currentNews = visibleNewsList[activeIndex];
      if (currentNews && !viewedCards.includes(currentNews.id)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setViewedCards((prev) => [...prev, currentNews.id]);
        logLuminaEvent("news_view", currentNews.id);
      }
    }
  }, [activeIndex, visibleNewsList, viewedCards]);

  const toggleAudio = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(20);
    }
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);
    
    if (nextState) {
      if (!audioRef.current && typeof Audio !== "undefined") {
        const a = new Audio("https://assets.mixkit.co/music/preview/mixkit-zen-meditation-625.mp3");
        a.loop = true;
        a.volume = 0.15;
        audioRef.current = a;
      }
      audioRef.current?.play().catch(err => {
        console.log("Audio play failed:", err);
        setAudioEnabled(false);
      });
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  const handleToggleReaction = async (newsId: string) => {
    const hasReacted = userReactions.includes(newsId);
    let updatedUserReactions: string[];

    if (hasReacted) {
      updatedUserReactions = userReactions.filter((id) => id !== newsId);
    } else {
      updatedUserReactions = [...userReactions, newsId];
    }

    setUserReactions(updatedUserReactions);
    localStorage.setItem("lumina_user_reactions", JSON.stringify(updatedUserReactions));

    setReactions((prev) => ({
      ...prev,
      [newsId]: Math.max(0, (prev[newsId] || 0) + (hasReacted ? -1 : 1)),
    }));

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }

    const endpoint = hasReacted ? "decrement_lumina_reaction" : "increment_lumina_reaction";
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${endpoint}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ news_id_param: newsId }),
      });
      if (res.ok) {
        const newCount = await res.json();
        setReactions((prev) => ({
          ...prev,
          [newsId]: newCount,
        }));
      }
    } catch (err) {
      console.error("Failed to sync reaction with database:", err);
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--background)]">
        <Sparkles className="w-10 h-10 animate-spin text-primary-DEFAULT" />
      </div>
    );
  }

  const currentTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <div className={`relative w-full h-[100dvh] flex flex-col justify-between overflow-hidden select-none transition-all duration-1000 bg-gradient-to-br ${CATEGORY_GRADIENTS[activeIndex as keyof typeof CATEGORY_GRADIENTS] || CATEGORY_GRADIENTS[0]}`}>
      
      {/* Partículas de Fondo Zen */}
      <FloatingParticles />

      {/* Header Fijo */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4 flex flex-col gap-2 bg-gradient-to-b from-[var(--background)] to-transparent pointer-events-none">
        <div className="flex items-center justify-between w-full max-w-sm mx-auto pointer-events-auto">
          
          {/* Logo y Nombre */}
          <div className="flex items-center gap-1">
            <Sparkles className="w-5 h-5 text-primary-DEFAULT animate-pulse" />
            <span className="text-xl font-bold tracking-tight text-[var(--heading)]">Lumina.</span>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3">
            {/* Llama de racha */}
            {isMounted && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 transition-all">
                <Flame 
                  className={`w-4 h-4 transition-all duration-500 ${
                    streak >= 3 
                      ? 'text-primary-DEFAULT fill-primary-DEFAULT drop-shadow-[0_0_8px_#facc15] animate-wiggle' 
                      : 'text-slate-400 dark:text-slate-600'
                  }`} 
                />
                <span className="text-xs font-bold text-[var(--foreground)]">{streak}d</span>
              </div>
            )}

            {/* Alternador de Sonido Zen */}
            <button
              onClick={toggleAudio}
              className="p-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Alternar sonido"
            >
              {audioEnabled ? (
                <Volume2 className="w-4 h-4 text-[var(--foreground)]" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-600" />
              )}
            </button>

            {/* Alternador Modo Oscuro */}
            <button
              onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Alternar tema"
            >
              {currentTheme === "dark" ? (
                <Sun className="w-4 h-4 text-primary-light" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        <ProgressBar activeIndex={activeIndex} />
      </header>

      {/* Contenedor Feed Snapping */}
      <main className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth focus:outline-none scrollbar-none">
        {visibleNewsList.map((news, index) => (
          <NewsCard
            key={news.id}
            news={news}
            index={index}
            total={visibleNewsList.length}
            reactionsCount={reactions[news.id] || 0}
            hasReacted={userReactions.includes(news.id)}
            onReact={() => handleToggleReaction(news.id)}
          />
        ))}
        {hasCompleteDailyDose ? (
          <EndOfFeed />
        ) : (
          <article className="w-full h-[100dvh] flex flex-col justify-center items-center p-6 snap-start snap-always relative">
            <div className="w-full max-w-sm bg-[var(--card)] rounded-[2.5rem] p-8 shadow-xl border border-black/5 dark:border-white/5 flex flex-col gap-6 relative text-center items-center">
              <Sparkles className="w-10 h-10 text-primary-DEFAULT opacity-50" />
              <h2 className="text-xl font-bold text-[var(--heading)]">En preparación</h2>
              <p className="text-sm leading-relaxed text-[var(--foreground)] opacity-90">
                Estamos preparando tu dosis positiva de hoy. Vuelve dentro de un rato.
              </p>
            </div>
          </article>
        )}
      </main>

      {/* Pantalla de Onboarding (primer ingreso) */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-center items-center p-6 bg-gradient-to-br from-yellow-50 via-emerald-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-emerald-950">
          <div className="w-full max-w-sm bg-[var(--card)] rounded-[2.5rem] p-8 shadow-2xl border border-black/5 dark:border-white/5 flex flex-col gap-6 text-center items-center">
            <div className="w-20 h-20 bg-primary-light/45 text-primary-dark rounded-full flex items-center justify-center mb-2">
              <Sparkles className="w-10 h-10 text-primary-DEFAULT animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold text-[var(--heading)] tracking-tight">Bienvenido a Lumina</h1>
            <p className="text-base leading-relaxed text-[var(--foreground)] opacity-95">
              Sin ruido, sin clickbait ni negatividad. Solo 5 dosis de puro optimismo diario para empezar tu día con otra energía.
            </p>
            <div className="w-full p-4 bg-secondary-light/25 dark:bg-secondary-dark/15 text-secondary-dark dark:text-secondary-light rounded-2xl border border-secondary-light/35 dark:border-secondary-dark/35">
              <p className="text-sm font-semibold">✨ Desliza hacia arriba para navegar por las noticias de hoy.</p>
            </div>
            <button
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate([40, 20, 40]);
                }
                localStorage.setItem("has_seen_onboarding", "true");
                setShowOnboarding(false);
              }}
              className="w-full mt-4 py-4 rounded-full bg-primary-DEFAULT hover:bg-primary-dark text-slate-950 font-bold transition-all transform active:scale-95 cursor-pointer shadow-md hover:shadow-lg"
            >
              Empezar la dosis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
