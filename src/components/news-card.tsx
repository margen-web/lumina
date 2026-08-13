"use client";

import { useState } from "react";
import { ExternalLink, Share2, Check } from "lucide-react";
import { StoryItem } from "@/lib/supabase";
import { logLuminaEvent } from "@/lib/analytics";

interface NewsCardProps {
  story: StoryItem;
  index: number;
  total: number;
}

// Helpers para formatear la fuente y categoría con estilo limpio
function getCategoryBadgeClass(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes("ciencia") || cat.includes("salud")) {
    return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800";
  }
  if (cat.includes("clima") || cat.includes("energía") || cat.includes("ambiente")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
  }
  if (cat.includes("tecnología") || cat.includes("innovación")) {
    return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
  }
  if (cat.includes("sociedad") || cat.includes("educación")) {
    return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800";
  }
  if (cat.includes("océanos") || cat.includes("biodiversidad") || cat.includes("animales")) {
    return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
}

export function NewsCard({ story, index, total }: NewsCardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleSourceClick = () => {
    logLuminaEvent("source_clicked", {
      storyId: story.id,
      position: index + 1,
      sourceType: story.primary_source_type,
    });
  };

  const handleShare = async () => {
    logLuminaEvent("story_shared", { storyId: story.id, position: index + 1, method: "native" });
    const shareText = `Lumina (Noticia ${index + 1}/5):\n\n${story.headline}\n\n${story.what_changed}\n\nFuente: ${story.primary_source_name}\n➜ lumina-app-drab.vercel.app`;
    
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: story.headline,
          text: shareText,
          url: "https://lumina-app-drab.vercel.app",
        });
        return;
      } catch {
        // Fallback a portapapeles
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Resumen limpio de 2 a 4 frases
  const summaryText = story.what_changed 
    ? (story.why_it_matters ? `${story.what_changed} ${story.why_it_matters}` : story.what_changed)
    : story.evidence || "";

  return (
    <article
      data-index={index}
      className="w-full h-[100dvh] flex flex-col justify-between items-center px-5 sm:px-8 py-20 sm:py-24 snap-start snap-always relative overflow-hidden"
    >
      <div className="w-full max-w-lg mx-auto flex flex-col justify-between h-full">
        
        {/* Parte superior: Categoría y contador */}
        <div className="flex items-center justify-between pt-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getCategoryBadgeClass(story.category)}`}>
            {story.category}
          </span>
          <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
            {index + 1} de {total}
          </span>
        </div>

        {/* Cuerpo principal de la noticia: Titular + Resumen claro */}
        <div className="flex flex-col gap-5 sm:gap-6 my-auto py-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-[1.2] tracking-tight text-[var(--heading)]">
            {story.headline}
          </h1>

          <p className="text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
            {summaryText}
          </p>

          <div className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <span>{story.primary_source_name}</span>
            <span>·</span>
            <span>Hoy</span>
          </div>
        </div>

        {/* Acciones inferiores: Leer original + Compartir */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <a
            href={story.primary_source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleSourceClick}
            className="inline-flex items-center gap-2 text-sm font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors group cursor-pointer"
          >
            <span>Leer original</span>
            <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--subtle)] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold text-[var(--heading)] transition-all cursor-pointer"
            aria-label="Compartir noticia"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-slate-500" />
                <span>Compartir</span>
              </>
            )}
          </button>
        </div>

      </div>
    </article>
  );
}
