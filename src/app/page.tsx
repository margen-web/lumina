"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { Sun, Moon, Loader2, WifiOff } from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { NewsCard } from "@/components/news-card";
import { EndOfFeed } from "@/components/end-of-feed";
import { StoryItem, supabase } from "@/lib/supabase";
import { logLuminaEvent } from "@/lib/analytics";

const FALLBACK_STORIES: StoryItem[] = [
  {
    id: "story-1",
    edition_date: "2026-08-13",
    edition_position: 1,
    status: "published",
    category: "Energía & Clima",
    headline: "Portugal cubre el 88% de su demanda eléctrica nacional con energía renovable durante un trimestre récord",
    what_changed: "La red eléctrica portuguesa ha alcanzado un nuevo máximo histórico gracias a la generación hidroeléctrica, eólica marina y solar coordinada.",
    why_it_matters: "Demuestra a escala de un país entero que una economía industrializada puede operar de forma estable dependiendo casi en su totalidad de fuentes limpias.",
    evidence: "Datos oficiales de la Red Energética Nacional (REN) registraron 14.8 TWh generados sin combustibles fósiles en el periodo analizado.",
    evidence_metric: "88%",
    evidence_metric_label: "demanda eléctrica limpia",
    caveat: "Aún persisten picos de demanda en meses de sequía que requieren respaldo temporal de ciclos combinados de gas y mayor capacidad de baterías.",
    primary_source_name: "Rede Eléctrica Nacional (REN)",
    primary_source_url: "https://www.ren.pt",
    primary_source_type: "official_data",
  },
  {
    id: "story-2",
    edition_date: "2026-08-13",
    edition_position: 2,
    status: "published",
    category: "Ciencia & Salud",
    headline: "Un ensayo en fase 3 logra reducir en un 73% la recaída en leucemia linfoblástica aguda en adultos jóvenes",
    what_changed: "Investigadores han demostrado que combinar terapia dirigida con células CAR-T antes del trasplante previene de forma drástica el escape tumoral.",
    why_it_matters: "Ofrece una opción curativa a pacientes que no respondían a los esquemas convencionales de quimioterapia intensiva.",
    evidence: "Estudio multicéntrico publicado en The New England Journal of Medicine con 420 pacientes y seguimiento a 36 meses.",
    evidence_metric: "-73%",
    evidence_metric_label: "tasa de recaídas a 3 años",
    caveat: "El tratamiento conlleva riesgo de síndrome de liberación de citoquinas en el 12% de los casos y su elevado coste actual limita su despliegue global.",
    primary_source_name: "The New England Journal of Medicine",
    primary_source_url: "https://www.nejm.org",
    primary_source_type: "scientific_paper",
  },
  {
    id: "story-3",
    edition_date: "2026-08-13",
    edition_position: 3,
    status: "published",
    category: "Biodiversidad & Océanos",
    headline: "La mayor reserva marina del Atlántico Sur recupera un 45% de la biomasa de peces depredadores tras cinco años de protección",
    what_changed: "El cese absoluto de la pesca de arrastre industrial en Tristán de Acuña ha permitido una regeneración biológica acelerada en atunes y tiburones.",
    why_it_matters: "Confirma que las zonas de veda estricta aceleran la repoblación de los océanos a un ritmo el doble de rápido de lo previsto.",
    evidence: "Monitorización acústica y censos por satélite auditados por el British Antarctic Survey y National Geographic Pristine Seas.",
    evidence_metric: "+45%",
    evidence_metric_label: "recuperación de biomasa marina",
    caveat: "La vigilancia de un área de 687.000 km² sigue siendo vulnerable a la pesca pirata internacional no declarada en los márgenes de la reserva.",
    primary_source_name: "National Geographic Pristine Seas / BAS",
    primary_source_url: "https://www.nationalgeographic.org/society/projects/pristine-seas/",
    primary_source_type: "NGO_report",
  },
  {
    id: "story-4",
    edition_date: "2026-08-13",
    edition_position: 4,
    status: "published",
    category: "Tecnología Útil",
    headline: "Desarrollan una membrana de desalinización solar pasiva con un 94% de eficiencia y cero residuos tóxicos",
    what_changed: "Ingenieros del MIT han diseñado un dispositivo flotante que utiliza convección capilar para evaporar y condensar agua marina sin acumular sal.",
    why_it_matters: "Permite producir agua potable de bajo coste en comunidades costeras e islas sin requerir conexión eléctrica ni costosas bombas de presión.",
    evidence: "Pruebas de campo continuas durante 6 meses produjeron 5.8 litros de agua pura por metro cuadrado por hora de sol.",
    evidence_metric: "5.8 L/m²",
    evidence_metric_label: "agua potable por hora de sol",
    caveat: "La durabilidad de los polímeros frente a la acumulación bacteriana a escala de varios años aún no ha sido ensayada en aguas tropicales.",
    primary_source_name: "MIT News / Nature Communications",
    primary_source_url: "https://news.mit.edu",
    primary_source_type: "university",
  },
  {
    id: "story-5",
    edition_date: "2026-08-13",
    edition_position: 5,
    status: "published",
    category: "Sociedad & Educación",
    headline: "La tasa de analfabetismo infantil en zonas rurales de Latinoamérica cae al nivel más bajo registrado por tutorías intensivas",
    what_changed: "La implementación de apoyo pedagógico individualizado en escuelas públicas de Brasil, Colombia y Perú ha beneficiado a 2.3 millones de niños.",
    why_it_matters: "Aprender a leer con fluidez antes de los 9 años es el predictor más determinante para evitar el abandono escolar y romper la pobreza intergeneracional.",
    evidence: "Informe de evaluación de impacto del Banco Interamericano de Desarrollo (BID) y UNESCO con grupo de control aleatorizado.",
    evidence_metric: "2.3M",
    evidence_metric_label: "niños con competencia lectora",
    caveat: "Persisten grandes disparidades de conectividad y formación docente en regiones indígenas remotas que aún no tienen acceso al programa.",
    primary_source_name: "UNESCO / BID",
    primary_source_url: "https://www.unesco.org",
    primary_source_type: "public_institution",
  },
];

export default function Home() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stories, setStories] = useState<StoryItem[]>(FALLBACK_STORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  
  const viewedStoryIds = useRef<Set<string>>(new Set());
  const completedStoryIds = useRef<Set<string>>(new Set());
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    logLuminaEvent("session_started");

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
          setIsOfflineFallback(false);
        } else {
          setIsOfflineFallback(true);
        }
      } catch (err) {
        console.warn("Using offline fallback:", err);
        setIsOfflineFallback(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, []);

  // IntersectionObserver para registrar story_viewed y cronometrar story_completed
  useEffect(() => {
    if (!mounted) return;
    const mainElement = document.querySelector("main");
    if (!mainElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0", 10);
            setActiveIndex(index);

            // Limpiar temporizador previo
            if (dwellTimerRef.current) {
              clearTimeout(dwellTimerRef.current);
            }

            if (index < stories.length) {
              const currentStory = stories[index];
              if (currentStory) {
                // Registrar story_viewed
                if (!viewedStoryIds.current.has(currentStory.id)) {
                  viewedStoryIds.current.add(currentStory.id);
                  logLuminaEvent("story_viewed", {
                    storyId: currentStory.id,
                    position: index + 1,
                    editionDate: currentStory.edition_date,
                  });
                }

                // Registrar story_completed tras 6 segundos de permanencia activa
                dwellTimerRef.current = setTimeout(() => {
                  if (!completedStoryIds.current.has(currentStory.id)) {
                    completedStoryIds.current.add(currentStory.id);
                    logLuminaEvent("story_completed", {
                      storyId: currentStory.id,
                      position: index + 1,
                      editionDate: currentStory.edition_date,
                    });
                  }
                }, 6000);
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

    return () => {
      observer.disconnect();
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
      }
    };
  }, [mounted, stories]);

  // Vibración háptica suave al avanzar de tarjeta
  useEffect(() => {
    if (activeIndex > 0 && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(12);
    }
  }, [activeIndex]);

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-DEFAULT" />
      </div>
    );
  }

  const currentTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <div className="relative w-full h-[100dvh] flex flex-col justify-between overflow-hidden select-none bg-[var(--background)] text-[var(--foreground)]">
      {/* Header Fijo y Sobrio */}
      <header className="fixed top-0 left-0 right-0 z-50 p-3 sm:p-4 flex flex-col gap-2 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border)] pointer-events-none">
        <div className="flex items-center justify-between w-full max-w-md mx-auto pointer-events-auto">
          {/* Wordmark y Subtítulo Neutral */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-[var(--heading)] font-mono">
              Lumina<span className="text-primary-DEFAULT">.</span>
            </span>
            {isOfflineFallback ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-medium">
                <WifiOff className="w-3 h-3" /> Edición previa (offline)
              </span>
            ) : (
              <span className="hidden sm:inline text-xs text-slate-400 font-medium">
                Cinco avances verificables
              </span>
            )}
          </div>

          {/* Selector de Tema */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-[var(--subtle)] text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              aria-label="Alternar tema"
            >
              {currentTheme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>

        {/* Barra de progreso 1/5 */}
        <ProgressBar activeIndex={activeIndex} />
      </header>

      {/* Feed Vertical con Scroll-Snap */}
      <main className="w-full h-full pt-16 overflow-y-scroll snap-y snap-mandatory scroll-smooth focus:outline-none scrollbar-none">
        {stories.map((story, index) => (
          <NewsCard
            key={story.id}
            story={story}
            index={index}
            total={stories.length}
          />
        ))}
        <EndOfFeed />
      </main>
    </div>
  );
}
