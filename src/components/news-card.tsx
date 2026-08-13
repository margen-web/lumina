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

interface CategoryTheme {
  name: string;
  badgeClass: string;
  glowColor: string;
  accentText: string;
}

function getStoryTheme(category: string): CategoryTheme {
  const cat = category.toLowerCase();
  if (cat.includes("ciencia") || cat.includes("salud")) {
    return {
      name: category,
      badgeClass: "text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-800/60",
      glowColor: "rgba(6, 182, 212, 0.08)",
      accentText: "text-cyan-600 dark:text-cyan-400",
    };
  }
  if (cat.includes("clima") || cat.includes("energía") || cat.includes("ambiente") || cat.includes("naturaleza")) {
    return {
      name: category,
      badgeClass: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60",
      glowColor: "rgba(16, 185, 129, 0.08)",
      accentText: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (cat.includes("tecnología") || cat.includes("innovación")) {
    return {
      name: category,
      badgeClass: "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border-sky-200/80 dark:border-sky-800/60",
      glowColor: "rgba(2, 132, 199, 0.08)",
      accentText: "text-sky-600 dark:text-sky-400",
    };
  }
  if (cat.includes("sociedad") || cat.includes("educación") || cat.includes("comunidad")) {
    return {
      name: category,
      badgeClass: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60",
      glowColor: "rgba(244, 63, 94, 0.08)",
      accentText: "text-rose-600 dark:text-rose-400",
    };
  }
  if (cat.includes("océanos") || cat.includes("biodiversidad") || cat.includes("animales")) {
    return {
      name: category,
      badgeClass: "text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border-violet-200/80 dark:border-violet-800/60",
      glowColor: "rgba(139, 92, 246, 0.08)",
      accentText: "text-violet-600 dark:text-violet-400",
    };
  }
  return {
    name: category,
    badgeClass: "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700",
    glowColor: "rgba(2, 132, 199, 0.05)",
    accentText: "text-sky-600 dark:text-sky-400",
  };
}

export function NewsCard({ story, index }: NewsCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const theme = getStoryTheme(story.category);

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

  // Resumen humano fluido
  const summaryText = story.what_changed 
    ? (story.why_it_matters ? `${story.what_changed} ${story.why_it_matters}` : story.what_changed)
    : story.evidence || "";

  return (
    <article
      data-index={index}
      className="w-full h-[100dvh] flex flex-col justify-between items-center px-6 sm:px-10 py-20 sm:py-24 snap-start snap-always relative overflow-hidden select-text"
      style={{
        background: `radial-gradient(circle at 50% 30%, ${theme.glowColor} 0%, transparent 70%)`,
      }}
    >
      <div className="w-full max-w-lg mx-auto flex flex-col justify-between h-full relative z-10">
        
        {/* Cabecera de la noticia: Categoría limpia (sin triple contador redundante) */}
        <div className="flex items-center justify-between pt-1">
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors ${theme.badgeClass}`}>
            {theme.name}
          </span>
        </div>

        {/* Cuerpo central: Titular vivo + Resumen humano */}
        <div className="flex flex-col gap-5 sm:gap-7 my-auto py-2">
          <h1 className="text-2xl sm:text-[2rem] leading-[1.18] font-extrabold tracking-[-0.025em] text-[var(--heading)]">
            {story.headline}
          </h1>

          <p className="text-base sm:text-lg leading-[1.65] text-slate-600 dark:text-slate-300 font-normal">
            {summaryText}
          </p>

          <div className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <span>{story.primary_source_name}</span>
            <span>·</span>
            <span>Hoy</span>
          </div>
        </div>

        {/* Acciones: Leer original + Compartir */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <a
            href={story.primary_source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleSourceClick}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity group cursor-pointer ${theme.accentText}`}
          >
            <span>Leer original</span>
            <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--subtle)] hover:bg-slate-200 dark:hover:bg-slate-800/80 text-xs font-semibold text-[var(--heading)] transition-all cursor-pointer border border-[var(--border)]"
            aria-label="Compartir noticia"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Compartir</span>
              </>
            )}
          </button>
        </div>

      </div>
    </article>
  );
}
