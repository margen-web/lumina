"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { logLuminaEvent } from "@/lib/analytics";

export function EndOfFeed() {
  const hasLoggedComplete = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasLoggedComplete.current) {
          hasLoggedComplete.current = true;
          logLuminaEvent("edition_completed");
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(20);
          }
        }
      },
      { threshold: 0.6 }
    );

    const el = document.getElementById("end-of-feed");
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <article
      id="end-of-feed"
      data-index={5}
      className="w-full h-[100dvh] flex flex-col justify-center items-center p-6 snap-start snap-always relative"
    >
      <div className="w-full max-w-sm bg-[var(--card)] rounded-3xl p-8 shadow-lg border border-[var(--border)] flex flex-col items-center text-center gap-6">
        <div className="w-14 h-14 rounded-full bg-[var(--subtle)] text-primary-DEFAULT flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--heading)]">
            Ya estás al día.
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Has terminado las 5 historias de hoy.
          </p>
        </div>

        <div className="w-full p-4 rounded-2xl bg-[var(--subtle)] border border-[var(--border)]">
          <p className="text-xs sm:text-sm font-semibold text-[var(--heading)] leading-relaxed">
            Eso es todo. Puedes cerrar Lumina y continuar con tu día.
          </p>
        </div>

        <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500">
          <a href="/privacidad" className="hover:text-[var(--heading)] transition-colors hover:underline">
            Privacidad & Metodología Editorial
          </a>
        </div>
      </div>
    </article>
  );
}
