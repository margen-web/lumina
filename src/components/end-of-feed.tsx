"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { logLuminaEvent } from "@/lib/analytics";

interface EndOfFeedProps {
  onReread?: () => void;
  isReopen?: boolean;
}

export function EndOfFeed({ onReread, isReopen }: EndOfFeedProps) {
  const hasLoggedComplete = useRef(false);

  useEffect(() => {
    // Si no es reapertura, registrar edition_completed la primera vez que se visualiza
    if (!isReopen) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !hasLoggedComplete.current) {
            hasLoggedComplete.current = true;
            logLuminaEvent("edition_completed");
            
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(20);
            }
            
            // Guardar que la edición de hoy ya fue completada
            const todayStr = new Date().toISOString().split("T")[0];
            localStorage.setItem("lumina_last_completed_edition", todayStr);
          }
        },
        { threshold: 0.5 }
      );

      const el = document.getElementById("end-of-feed");
      if (el) observer.observe(el);

      return () => observer.disconnect();
    }
  }, [isReopen]);

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

        {/* Mensaje de Cierre Finito */}
        <div className="flex flex-col items-center gap-6 my-auto">
          <div className="w-16 h-16 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="flex flex-col gap-2.5">
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--heading)]">
              Ya estás al día.
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 font-normal">
              Has visto las cinco noticias de hoy.
            </p>
          </div>

          <div className="w-full p-4 rounded-2xl bg-[var(--subtle)] border border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--heading)] leading-relaxed">
              Eso es todo por hoy. Vuelve mañana para cinco historias nuevas.
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
