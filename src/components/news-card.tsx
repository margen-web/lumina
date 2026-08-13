"use client";

import { useState } from "react";
import { ExternalLink, Share2, Check, ChevronDown, ChevronUp, ShieldCheck, AlertCircle } from "lucide-react";
import { StoryItem } from "@/lib/supabase";
import { logLuminaEvent } from "@/lib/analytics";

interface NewsCardProps {
  story: StoryItem;
  index: number;
  total: number;
}

export function NewsCard({ story, index, total }: NewsCardProps) {
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleToggleEvidence = () => {
    const nextState = !isEvidenceOpen;
    setIsEvidenceOpen(nextState);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
    if (nextState) {
      logLuminaEvent("evidence_opened", { storyId: story.id, position: index + 1 });
      logLuminaEvent("story_completed", { storyId: story.id, position: index + 1 });
    } else {
      logLuminaEvent("evidence_closed", { storyId: story.id, position: index + 1 });
    }
  };

  const handleSourceClick = () => {
    logLuminaEvent("source_clicked", {
      storyId: story.id,
      position: index + 1,
      sourceType: story.primary_source_type,
    });
  };

  const handleShare = async () => {
    logLuminaEvent("story_shared", { storyId: story.id, position: index + 1, method: "native" });
    const shareText = `Lumina — Progreso Verificable:\n\n${story.headline}\n\n• Qué ocurrió: ${story.what_changed}\n• Por qué importa: ${story.why_it_matters}\n\nFuente: ${story.primary_source_name} (${story.primary_source_url})\n\n➜ lumina-app-drab.vercel.app`;
    
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: story.headline,
          text: shareText,
          url: "https://lumina-app-drab.vercel.app",
        });
        return;
      } catch {
        // Fallback a portapapeles si el usuario cancela o falla
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <article
      data-index={index}
      className="w-full h-[100dvh] flex flex-col justify-center items-center p-4 sm:p-6 snap-start snap-always relative overflow-hidden"
    >
      <div className="w-full max-w-md bg-[var(--card)] rounded-3xl p-6 sm:p-7 shadow-lg border border-[var(--border)] flex flex-col gap-4 relative max-h-[88dvh] overflow-y-auto scrollbar-none transition-all">
        
        {/* Cabecera de la tarjeta: Categoría y Posición */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-[var(--subtle)] text-[var(--foreground)]">
            {story.category}
          </span>
          <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
            {index + 1} de {total}
          </span>
        </div>

        {/* CAPA 1: Titular Factual y Bloques Fundamentales */}
        <div className="flex flex-col gap-3.5">
          <h2 className="text-xl sm:text-2xl font-extrabold leading-snug tracking-tight text-[var(--heading)]">
            {story.headline}
          </h2>

          <div className="flex flex-col gap-2.5 text-sm sm:text-base leading-relaxed text-[var(--foreground)]">
            <div>
              <span className="font-bold text-[var(--heading)] block text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                Qué cambió
              </span>
              <p className="opacity-95">{story.what_changed}</p>
            </div>

            <div>
              <span className="font-bold text-[var(--heading)] block text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                Por qué importa
              </span>
              <p className="opacity-95">{story.why_it_matters}</p>
            </div>
          </div>
        </div>

        {/* CAPA 2: Botón de Apertura de Evidencia y Caveats */}
        <div className="mt-1 pt-3 border-t border-[var(--border)] flex flex-col gap-3">
          <button
            onClick={handleToggleEvidence}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--subtle)] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold text-[var(--heading)] flex items-center justify-between transition-all cursor-pointer"
            aria-expanded={isEvidenceOpen}
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-DEFAULT" />
              {isEvidenceOpen ? "Ocultar evidencia y límites" : "Ver evidencia y límites"}
            </span>
            {isEvidenceOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Bloque desplegable de Evidencia y Límites */}
          {isEvidenceOpen && (
            <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] text-xs sm:text-sm leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Métrica de Evidencia destacada si existe */}
              {story.evidence_metric && (
                <div className="flex items-baseline gap-2.5 pb-2 border-b border-[var(--border)]">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-primary-DEFAULT">
                    {story.evidence_metric}
                  </span>
                  {story.evidence_metric_label && (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {story.evidence_metric_label}
                    </span>
                  )}
                </div>
              )}

              {/* Detalle de la Evidencia */}
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[var(--heading)] mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Evidencia y Datos
                </div>
                <p className="text-slate-600 dark:text-slate-300">{story.evidence}</p>
              </div>

              {/* Lo que todavía no sabemos (Caveat) */}
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[var(--heading)] mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  Qué queda pendiente
                </div>
                <p className="text-slate-600 dark:text-slate-300">{story.caveat}</p>
              </div>
            </div>
          )}

          {/* Barra inferior: Fuente y Compartir */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <a
              href={story.primary_source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSourceClick}
              className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400 hover:text-[var(--heading)] transition-colors hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Fuente: {story.primary_source_name}</span>
            </a>

            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-[var(--subtle)] text-slate-400 hover:text-[var(--heading)] transition-colors cursor-pointer"
              aria-label="Compartir historia"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

      </div>
    </article>
  );
}
