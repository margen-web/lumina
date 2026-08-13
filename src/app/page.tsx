"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { SlidersHorizontal, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { NewsCard } from "@/components/news-card";
import { EndOfFeed } from "@/components/end-of-feed";
import { SettingsModal } from "@/components/settings-modal";
import { ApertureSymbol } from "@/components/aperture-symbol";
import { StoryItem, supabase } from "@/lib/supabase";
import { logLuminaEvent } from "@/lib/analytics";
import { getStreakState, getTodayDateString, StreakState } from "@/lib/streak";
import { validateDailyEdition } from "@/lib/edition";

type EditionLoadStatus = "loading" | "ready" | "not_ready" | "error";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [editionStatus, setEditionStatus] = useState<EditionLoadStatus>("loading");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAlreadyCompletedToday, setIsAlreadyCompletedToday] = useState(false);
  const [streakCount, setStreakCount] = useState<number>(0);
  
  const viewedStoryIds = useRef<Set<string>>(new Set());
  const mainRef = useRef<HTMLElement>(null);

  const loadDailyEdition = useCallback(async () => {
    setEditionStatus("loading");
    const todayMadrid = getTodayDateString();

    try {
      const { data, error } = await supabase
        .from("lumina_stories")
        .select("*")
        .eq("status", "published")
        .eq("edition_date", todayMadrid)
        .order("edition_position", { ascending: true });

      if (error) {
        console.error("Error cargando edición de hoy:", error);
        setEditionStatus("error");
        setStories([]);
        return;
      }

      if (validateDailyEdition(data as StoryItem[], todayMadrid)) {
        setStories(data as StoryItem[]);
        setEditionStatus("ready");
      } else {
        setStories([]);
        setEditionStatus("not_ready");
      }
    } catch (err) {
      console.error("Fallo de red / Supabase:", err);
      setEditionStatus("error");
      setStories([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    logLuminaEvent("session_started");

    // Comprobar estado de racha y finalización diaria
    const streakState = getStreakState();
    setStreakCount(streakState.currentStreak);
    if (streakState.completedToday) {
      setIsAlreadyCompletedToday(true);
    }

    loadDailyEdition();
  }, [loadDailyEdition]);

  // IntersectionObserver para registrar la posición activa y story_viewed
  useEffect(() => {
    if (!mounted || isAlreadyCompletedToday || editionStatus !== "ready") return;
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0", 10);
            setActiveIndex(index);

            if (index < stories.length) {
              const currentStory = stories[index];
              if (currentStory && !viewedStoryIds.current.has(currentStory.id)) {
                viewedStoryIds.current.add(currentStory.id);
                logLuminaEvent("story_viewed", {
                  storyId: currentStory.id,
                  position: index + 1,
                  editionDate: currentStory.edition_date,
                });
              }
            }
          }
        });
      },
      {
        root: mainElement,
        threshold: 0.6,
      }
    );

    const cards = mainElement.querySelectorAll("article");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [mounted, stories, isAlreadyCompletedToday, editionStatus]);

  // Vibración táctil discreta al cambiar de noticia
  useEffect(() => {
    if (activeIndex > 0 && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [activeIndex]);

  const handleReread = () => {
    setIsAlreadyCompletedToday(false);
    setActiveIndex(0);
    setTimeout(() => {
      if (mainRef.current) {
        mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);
  };

  const handleEditionCompleted = (updatedStreak: StreakState) => {
    setStreakCount(updatedStreak.currentStreak);
  };

  if (!mounted || editionStatus === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
      </div>
    );
  }

  // CASO DE REAPERTURA: Mostrar directamente la pantalla de finitud serena
  if (isAlreadyCompletedToday) {
    return (
      <div className="relative w-full h-[100dvh] flex flex-col justify-between overflow-hidden bg-[var(--background)] text-[var(--foreground)] animate-noise-to-light">
        <header className="fixed top-0 left-0 right-0 z-40 px-6 sm:px-10 py-4 flex items-center justify-between max-w-lg mx-auto w-full">
          <div className="flex items-center gap-2">
            <ApertureSymbol size={18} className="text-sky-500" />
            <span className="text-lg font-bold tracking-tight text-[var(--heading)]">
              Lumina
            </span>
          </div>

          <div className="flex items-center gap-3">
            {streakCount > 0 && (
              <span className="text-xs font-semibold font-mono text-slate-400 dark:text-slate-500">
                ✦ {streakCount}
              </span>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-full hover:bg-[var(--subtle)] text-slate-400 hover:text-[var(--heading)] transition-colors cursor-pointer"
              aria-label="Abrir ajustes"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </header>

        <EndOfFeed onReread={handleReread} isReopen={true} onEditionCompleted={handleEditionCompleted} />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    );
  }

  // ESTADO: LA EDICIÓN DE HOY NO ESTÁ LISTA (Menos o más de 5 historias publicadas para hoy)
  if (editionStatus === "not_ready") {
    return (
      <div className="relative w-full h-[100dvh] flex flex-col justify-between items-center px-6 py-16 bg-[var(--background)] text-[var(--foreground)] animate-noise-to-light">
        <header className="w-full max-w-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ApertureSymbol size={18} className="text-sky-500" />
            <span className="text-lg font-bold tracking-tight text-[var(--heading)]">Lumina</span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-full hover:bg-[var(--subtle)] text-slate-400"
            aria-label="Abrir ajustes"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </header>

        <div className="flex flex-col items-center gap-5 text-center my-auto max-w-xs">
          <div className="w-14 h-14 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center border border-sky-100 dark:border-sky-900/60">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-extrabold text-[var(--heading)]">
              La edición de hoy todavía no está lista.
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Vuelve más tarde para leer las cinco noticias seleccionadas de hoy.
            </p>
          </div>
          <button
            onClick={loadDailyEdition}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[var(--subtle)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--heading)] transition-all cursor-pointer border border-[var(--border)] mt-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Comprobar de nuevo</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 text-center font-mono">
          Europe/Madrid · {getTodayDateString()}
        </div>
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    );
  }

  // ESTADO: ERROR DE CONEXIÓN O SUPABASE
  if (editionStatus === "error") {
    return (
      <div className="relative w-full h-[100dvh] flex flex-col justify-between items-center px-6 py-16 bg-[var(--background)] text-[var(--foreground)]">
        <header className="w-full max-w-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ApertureSymbol size={18} className="text-sky-500" />
            <span className="text-lg font-bold tracking-tight text-[var(--heading)]">Lumina</span>
          </div>
        </header>

        <div className="flex flex-col items-center gap-4 text-center my-auto max-w-xs">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No se ha podido conectar con la edición de hoy.
          </p>
          <button
            onClick={loadDailyEdition}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 text-center font-mono">
          Lumina Core 0.3.3
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[100dvh] flex flex-col justify-between overflow-hidden select-none bg-[var(--background)] text-[var(--foreground)] animate-noise-to-light">
      
      {/* Header Fijo y Limpio con Apertura */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 sm:px-10 py-3.5 flex flex-col gap-2.5 bg-[var(--background)]/85 backdrop-blur-md border-b border-[var(--border)] pointer-events-none">
        <div className="flex items-center justify-between w-full max-w-lg mx-auto pointer-events-auto">
          
          {/* Logo Lumina */}
          <div className="flex items-center gap-2">
            <ApertureSymbol size={18} className="text-sky-500" />
            <span className="text-lg font-bold tracking-tight text-[var(--heading)]">
              Lumina
            </span>
          </div>

          {/* Racha discreta ✦ y Ajustes */}
          <div className="flex items-center gap-3">
            {streakCount > 0 && (
              <span className="text-xs font-semibold font-mono text-slate-400 dark:text-slate-500">
                ✦ {streakCount}
              </span>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-full hover:bg-[var(--subtle)] text-slate-400 hover:text-[var(--heading)] transition-colors cursor-pointer"
              aria-label="Abrir ajustes"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de progreso segmentada 1/5 */}
        <ProgressBar activeIndex={activeIndex} />
      </header>

      {/* Feed Vertical con Scroll-Snap */}
      <main
        ref={mainRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth focus:outline-none scrollbar-none"
      >
        {stories.map((story, index) => (
          <NewsCard
            key={story.id}
            story={story}
            index={index}
            total={stories.length}
          />
        ))}
        <EndOfFeed onReread={handleReread} onEditionCompleted={handleEditionCompleted} />
      </main>

      {/* Modal de Ajustes */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
