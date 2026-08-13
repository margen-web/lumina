"use client";

import { useEffect, useState, useRef } from "react";
import { CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { logLuminaEvent } from "@/lib/analytics";
import { recordEditionCompleted, getStreakState, StreakState } from "@/lib/streak";

interface EndOfFeedProps {
  onReread?: () => void;
  isReopen?: boolean;
}

export function EndOfFeed({ onReread, isReopen }: EndOfFeedProps) {
  const hasLoggedComplete = useRef(false);
  const [streakInfo, setStreakInfo] = useState<StreakState | null>(() => {
    if (typeof window !== "undefined" && isReopen) {
      return getStreakState();
    }
    return null;
  });
  const [isDotAnimated, setIsDotAnimated] = useState(isReopen || false);

  useEffect(() => {
    // Si es reapertura, ya fue inicializado
    if (isReopen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasLoggedComplete.current) {
          hasLoggedComplete.current = true;
          
          // Actualizar racha de luz
          const updatedStreak = recordEditionCompleted();
          setStreakInfo(updatedStreak);

          // Registrar evento analítico con racha actual
          logLuminaEvent("edition_completed", {
            metadata: {
              current_streak: updatedStreak.currentStreak,
              is_new_streak: updatedStreak.isNewStreak,
            },
          });

          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(20);
          }

          // Trigger animación de iluminación
          setTimeout(() => {
            setIsDotAnimated(true);
          }, 300);
        }
      },
      { threshold: 0.5 }
    );

    const el = document.getElementById("end-of-feed");
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [isReopen]);

  const streak = streakInfo?.currentStreak || 1;
  const isNew = streakInfo?.isNewStreak ?? false;

  // Renderizar 7 puntos de luz para la semana
  const dotCount = 7;
  const activeDots = Math.min(streak, dotCount);

  return (
    <article
      id="end-of-feed"
      data-index={5}
      className="w-full h-[100dvh] flex flex-col justify-between items-center px-5 sm:px-8 py-20 sm:py-24 snap-start snap-always relative overflow-hidden"
    >
      <div className="w-full max-w-sm mx-auto flex flex-col justify-between h-full text-center">
        
        {/* Cabecera discreta */}
        <div className="pt-2">
          <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
            5 de 5 completadas
          </span>
        </div>

        {/* Mensaje de Cierre Finito + Racha de Luz */}
        <div className="flex flex-col items-center gap-5 my-auto">
          <div className="w-16 h-16 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--heading)]">
              Ya estás al día.
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 font-normal">
              Has visto las cinco noticias de hoy.
            </p>
          </div>

          {/* Racha de Luz: Puntos iluminados */}
          <div className="w-full p-4 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-xs font-bold text-[var(--heading)]">
                {streak > 1
                  ? `${streak} días seguidos ✦`
                  : isNew && streakInfo?.lastCompletedDate
                  ? "Hoy empieza una nueva racha ✦"
                  : "Primer día completado ✦"}
              </span>
            </div>

            {/* Constelación de 7 puntos de luz */}
            <div className="flex items-center gap-2.5 py-1">
              {Array.from({ length: dotCount }).map((_, i) => {
                const isLit = i < activeDots;
                const isCurrentToday = i === activeDots - 1;
                return (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                      isLit && isDotAnimated
                        ? isCurrentToday
                          ? "bg-sky-400 scale-125 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse"
                          : "bg-sky-500"
                        : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  />
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {streak > 1
                ? "Una pequeña dosis de luz cada día."
                : "Vuelve mañana para continuar tu racha de luz."}
            </p>
          </div>

          {/* Botón discreto para releer */}
          {onReread && (
            <button
              onClick={onReread}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:text-[var(--heading)] hover:bg-[var(--subtle)] transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Releer las 5 de hoy</span>
            </button>
          )}
        </div>

        {/* Pie de pantalla */}
        <div className="pt-4 border-t border-[var(--border)] text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between w-full">
          <a href="/privacidad" className="hover:text-[var(--heading)] transition-colors hover:underline">
            Privacidad
          </a>
          <span className="font-mono text-[10px]">v0.3</span>
        </div>

      </div>
    </article>
  );
}
