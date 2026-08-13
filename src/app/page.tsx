"use client";

import { useEffect, useState, useRef } from "react";
import { SlidersHorizontal, Loader2, Sparkles } from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { NewsCard } from "@/components/news-card";
import { EndOfFeed } from "@/components/end-of-feed";
import { SettingsModal } from "@/components/settings-modal";
import { StoryItem, supabase } from "@/lib/supabase";
import { logLuminaEvent } from "@/lib/analytics";

const FALLBACK_STORIES: StoryItem[] = [
  {
    id: "story-1",
    edition_date: "2026-08-13",
    edition_position: 1,
    status: "published",
    category: "Energía & Clima",
    headline: "Portugal abastece el 71% de su demanda eléctrica con renovables y marca un récord histórico",
    what_changed: "La red eléctrica nacional alcanzó su máximo histórico anual con 36.7 TWh generados sin combustibles fósiles gracias al empuje hidroeléctrico, eólico y solar coordinado.",
    why_it_matters: "Demuestra que una economía industrializada moderna puede operar de forma continua dependiendo mayoritariamente de fuentes limpias.",
    evidence: "Datos oficiales de Redes Energéticas Nacionais (REN).",
    evidence_metric: "71%",
    evidence_metric_label: "demanda eléctrica limpia",
    caveat: "Persisten meses secos con respaldo de gas.",
    primary_source_name: "Redes Energéticas Nacionais",
    primary_source_url: "https://www.ren.pt",
    primary_source_type: "official_data",
  },
  {
    id: "story-2",
    edition_date: "2026-08-13",
    edition_position: 2,
    status: "published",
    category: "Ciencia & Salud",
    headline: "La inmunoterapia reduce en un 67% el riesgo de recaída en leucemia linfoblástica juvenil",
    what_changed: "Un ensayo clínico multicéntrico demuestra que sustituir la quimioterapia intensiva de rescate por blinatumomab triplica la supervivencia libre de enfermedad.",
    why_it_matters: "Ofrece una vía curativa con menor toxicidad a pacientes que no respondían a los esquemas de tratamiento convencionales.",
    evidence: "Ensayo fase 3 publicado en The New England Journal of Medicine.",
    evidence_metric: "-67%",
    evidence_metric_label: "riesgo de recaída",
    caveat: "Coste elevado.",
    primary_source_name: "The New England Journal of Medicine",
    primary_source_url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2007086",
    primary_source_type: "scientific_paper",
  },
  {
    id: "story-3",
    edition_date: "2026-08-13",
    edition_position: 3,
    status: "published",
    category: "Biodiversidad & Océanos",
    headline: "La mayor reserva marina del Atlántico Sur consolida 690.000 km² de protección absoluta",
    what_changed: "La zona de exclusión pesquera total de Tristán de Acuña cumple cinco años de veda estricta, acelerando la recuperación de especies en montes submarinos.",
    why_it_matters: "Constituye el mayor santuario sin pesca industrial del Atlántico y actúa como refugio biológico para tiburones, atunes y aves marinas.",
    evidence: "Campaña de seguimiento de National Geographic Pristine Seas y BAS.",
    evidence_metric: "690.000 km²",
    evidence_metric_label: "océano protegido",
    caveat: "Vigilancia logística compleja.",
    primary_source_name: "National Geographic / BAS",
    primary_source_url: "https://www.nationalgeographic.org/society/projects/pristine-seas/",
    primary_source_type: "NGO_report",
  },
  {
    id: "story-4",
    edition_date: "2026-08-13",
    edition_position: 4,
    status: "published",
    category: "Tecnología Útil",
    headline: "Ingenieros del MIT crean un sistema de desalinización solar que no se satura con sal",
    what_changed: "El dispositivo flotante utiliza convección capilar para evaporar agua de mar y condensarla sin bombas mecánicas ni acumulación de salmuera tóxica.",
    why_it_matters: "Permite producir agua potable de bajo coste en comunidades costeras e islas sin requerir conexión a la red eléctrica.",
    evidence: "Investigación publicada en Nature Communications.",
    evidence_metric: "5.8 L/m²",
    evidence_metric_label: "agua potable / hora de sol",
    caveat: "Ensayos de durabilidad en curso.",
    primary_source_name: "MIT News / Nature Communications",
    primary_source_url: "https://news.mit.edu/2023/desalination-system-could-produce-freshwater-cheaper-than-tap-water-0927",
    primary_source_type: "university",
  },
  {
    id: "story-5",
    edition_date: "2026-08-13",
    edition_position: 5,
    status: "published",
    category: "Sociedad & Educación",
    headline: "Las tutorías individualizadas recuperan hasta 1,5 años de retraso lector en primaria",
    what_changed: "Programas de apoyo pedagógico focalizado de 20 minutos tres veces por semana en escuelas públicas aceleran drásticamente la fluidez lectora infantil.",
    why_it_matters: "Aprender a leer con soltura a edad temprana es la herramienta más eficaz para prevenir el abandono escolar y romper barreras sociales.",
    evidence: "Evaluación de impacto del Banco Interamericano de Desarrollo (BID).",
    evidence_metric: "+1.5 años",
    evidence_metric_label: "ganancia de aprendizaje",
    caveat: "Desafío de escala y tutores.",
    primary_source_name: "Banco Interamericano de Desarrollo",
    primary_source_url: "https://www.iadb.org/es/investigacion-y-publicaciones/tutorias-remotas-para-el-aprendizaje",
    primary_source_type: "public_institution",
  },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stories, setStories] = useState<StoryItem[]>(FALLBACK_STORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAlreadyCompletedToday, setIsAlreadyCompletedToday] = useState(false);
  
  const viewedStoryIds = useRef<Set<string>>(new Set());
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    logLuminaEvent("session_started");

    // Comprobar si el usuario ya completó la edición del día
    const todayStr = new Date().toISOString().split("T")[0];
    const lastCompleted = localStorage.getItem("lumina_last_completed_edition");
    if (lastCompleted === todayStr) {
      setIsAlreadyCompletedToday(true);
    }

    const fetchStories = async () => {
      try {
        const { data, error } = await supabase
          .from("lumina_stories")
          .select("*")
          .eq("status", "published")
          .order("edition_position", { ascending: true })
          .limit(5);

        if (!error && data && data.length > 0) {
          setStories(data as StoryItem[]);
        }
      } catch (err) {
        console.warn("Using offline verified stories:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, []);

  // IntersectionObserver para registrar la posición actual y story_viewed
  useEffect(() => {
    if (!mounted || isAlreadyCompletedToday) return;
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
  }, [mounted, stories, isAlreadyCompletedToday]);

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

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  // CASO DE REAPERTURA: Si el usuario ya completó las 5 de hoy, mostrar directamente la pantalla final
  if (isAlreadyCompletedToday) {
    return (
      <div className="relative w-full h-[100dvh] flex flex-col justify-between overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <header className="fixed top-0 left-0 right-0 z-40 p-4 flex items-center justify-between max-w-lg mx-auto w-full">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sky-500" />
            <span className="text-xl font-extrabold tracking-tight text-[var(--heading)]">
              Lumina
            </span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-[var(--subtle)] text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            aria-label="Abrir ajustes"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </header>

        <EndOfFeed onReread={handleReread} isReopen={true} />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[100dvh] flex flex-col justify-between overflow-hidden select-none bg-[var(--background)] text-[var(--foreground)]">
      
      {/* Header Fijo y Limpio */}
      <header className="fixed top-0 left-0 right-0 z-40 px-5 sm:px-8 py-3.5 flex flex-col gap-2.5 bg-[var(--background)]/85 backdrop-blur-md border-b border-[var(--border)] pointer-events-none">
        <div className="flex items-center justify-between w-full max-w-lg mx-auto pointer-events-auto">
          
          {/* Logo Lumina */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
            <span className="text-lg font-extrabold tracking-tight text-[var(--heading)]">
              Lumina
            </span>
          </div>

          {/* Ajustes */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-[var(--subtle)] text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              aria-label="Abrir ajustes"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de progreso segmentada 1/5 */}
        <ProgressBar activeIndex={activeIndex} />
      </header>

      {/* Feed Vertical con Scroll-Snap (La pantalla es la noticia) */}
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
        <EndOfFeed onReread={handleReread} />
      </main>

      {/* Modal de Ajustes */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
