"use client";

import { useEffect, useState, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { ApertureSymbol } from "@/components/aperture-symbol";
import { logLuminaEvent } from "@/lib/analytics";
import { recordEditionCompleted, getStreakState, StreakState } from "@/lib/streak";

interface EndOfFeedProps {
  onReread?: () => void;
  isReopen?: boolean;
  onEditionCompleted?: (streak: StreakState) => void;
}

export function EndOfFeed({ onReread, isReopen, onEditionCompleted }: EndOfFeedProps) {
  const hasLoggedComplete = useRef(false);
  const [streakInfo, setStreakInfo] = useState<StreakState>(() => {
    return getStreakState();
  });
  const [isLitAnimated, setIsLitAnimated] = useState(isReopen || false);

  useEffect(() => {
    // Si es reapertura el mismo día, no volvemos a registrar ni reanimar con fuerza
    if (isReopen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasLoggedComplete.current) {
          hasLoggedComplete.current = true;
          
          // Actualizar racha de luz y semana
          const updatedStreak = recordEditionCompleted();
          setStreakInfo(updatedStreak);

          if (onEditionCompleted) {
            onEditionCompleted(updatedStreak);
          }

          // Registrar evento analítico con racha actual
          logLuminaEvent("edition_completed", {
            metadata: {
              current_streak: updatedStreak.currentStreak,
              is_new_streak: updatedStreak.isNewStreak,
            },
          });

          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(18);
          }

          // Microanimación de encendido de luz (450ms)
          setTimeout(() => {
            setIsLitAnimated(true);
          }, 350);
        }
      },
      { threshold: 0.5 }
    );

    const el = document.getElementById("end-of-feed");
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [isReopen, onEditionCompleted]);

  const streak = streakInfo.currentStreak || 1;
  const isNew = streakInfo.isNewStreak;
  const weekDays = streakInfo.weekStatus || [];

  return (
    <article
      id="end-of-feed"
      data-index={5}
      className="w-full h-[100dvh] flex flex-col justify-between items-center px-6 sm:px-10 py-20 sm:py-24 snap-start snap-always relative overflow-hidden text-center"
      style={{
        background: "radial-gradient(circle at 50% 35%, rgba(56, 189, 248, 0.09) 0%, transparent 65%)",
      }}
    >
      <div className="w-full max-w-sm mx-auto flex flex-col justify-between h-full relative z-10">
        
        {/* Cabecera discreta */}
        <div className="pt-1">
          <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500">
            5 de 5 completadas
          </span>
        </div>

        {/* Bloque central: Apertura de luz + Cierre sereno */}
        <div className="flex flex-col items-center gap-6 my-auto">
          <div className="w-16 h-16 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-500 flex items-center justify-center border border-sky-100 dark:border-sky-900/60 shadow-sm transition-transform duration-500 hover:scale-105">
            <ApertureSymbol size={28} glow={isLitAnimated} />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[var(--heading)]">
              Ya estás al día.
            </h2>
            <p className="text-base text-slate-500 dark:text-slate-400 font-normal">
              {isReopen 
                ? "Tus cinco noticias de hoy ya están vistas."
                : "Has visto las cinco noticias de hoy."}
            </p>
          </div>

          {/* Racha de Luz: Constelación semanal L M X J V S D */}
          <div className="w-full p-5 rounded-3xl bg-[var(--subtle)] border border-[var(--border)] flex flex-col items-center gap-3.5">
            <span className="text-xs font-bold text-[var(--heading)] tracking-wide">
              {streak > 1
                ? `${streak} días seguidos ✦`
                : isNew && streakInfo.lastCompletedDate
                ? "Hoy empieza una nueva racha ✦"
                : "Primer día completado ✦"}
            </span>

            {/* Fila de los 7 días de la semana actual (L M X J V S D) */}
            <div className="flex items-center justify-between w-full max-w-[240px] px-2 py-1">
              {weekDays.map((day) => {
                const isLit = day.isCompleted && isLitAnimated;
                return (
                  <div key={day.dateString} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500">
                      {day.dayLabel}
                    </span>
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                        isLit
                          ? day.isToday
                            ? "bg-sky-400 scale-125 shadow-[0_0_8px_rgba(56,189,248,0.9)] animate-pulse"
                            : "bg-sky-500"
                          : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isReopen
                ? "Mañana habrá cinco nuevas historias."
                : "Eso es todo por hoy. Nos vemos mañana."}
            </p>
          </div>

          {/* Botón de releer: ÚNICAMENTE visible cuando isReopen === true */}
          {isReopen && onReread && (
            <button
              onClick={onReread}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-400 hover:text-[var(--heading)] hover:bg-[var(--subtle)] transition-all cursor-pointer"
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
          <span className="font-mono text-[10px]">v0.3.3</span>
        </div>

      </div>
    </article>
  );
}
