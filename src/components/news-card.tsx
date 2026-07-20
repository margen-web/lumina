"use client";
import { ExternalLink, Share2, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { logLuminaEvent } from "@/lib/analytics";

export interface NewsItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  sourceUrl: string;
}

interface NewsCardProps {
  news: NewsItem;
  index: number;
  total: number;
  reactionsCount: number;
  hasReacted: boolean;
  onReact: () => void;
}

export function NewsCard({ news, index, total, reactionsCount, hasReacted, onReact }: NewsCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const handleShare = async () => {
    logLuminaEvent("news_share", news.id);
    const text = `✨ Dosis de optimismo de hoy: ${news.title}\n\n${news.summary}\n\n➜ Leído en Lumina`;
    if (navigator.share) { try { await navigator.share({ title: news.title, text }); return; } catch {} }
    await navigator.clipboard.writeText(text);
    setIsCopied(true); setTimeout(() => setIsCopied(false), 2000);
  };
  return (
    <article data-news-card="true" data-index={index} className="w-full h-[100dvh] flex flex-col justify-center items-center p-6 snap-start snap-always relative">
      <div className="w-full max-w-sm bg-[var(--card)] rounded-[2.5rem] p-8 shadow-xl border border-black/5 dark:border-white/5 flex flex-col gap-6 relative">
        <div className="flex items-center justify-between">
          <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-secondary-light/30 text-secondary-dark">{news.category}</span>
          <span className="text-xs font-bold text-black/40 dark:text-white/40">{index + 1}/{total}</span>
        </div>
        <h2 className="text-2xl font-bold leading-tight text-[var(--heading)]">{news.title}</h2>
        <p className="text-base leading-relaxed text-[var(--foreground)] opacity-90">{news.summary}</p>
        <div className="mt-4 pt-6 border-t border-black/5 flex justify-between items-center">
          <a href={news.sourceUrl} target="_blank" className="flex items-center gap-2 text-sm font-semibold hover:text-primary-dark"><ExternalLink className="w-4 h-4"/> Leer original</a>
          <div className="flex items-center gap-1">
            {/* Reacción Lumina (Sparkles) */}
            <button 
              onClick={onReact} 
              className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer group"
              aria-label="Reaccionar a la noticia"
            >
              <Sparkles 
                className={`w-5 h-5 transition-all duration-300 ${
                  hasReacted 
                    ? "text-primary-DEFAULT fill-primary-DEFAULT drop-shadow-[0_0_8px_#facc15] animate-spark-pop" 
                    : "text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400"
                }`}
              />
              <span className={`text-xs font-bold transition-colors ${
                hasReacted 
                  ? "text-primary-dark dark:text-primary-light" 
                  : "text-slate-400 dark:text-slate-500"
              }`}>
                {reactionsCount}
              </span>
            </button>

            {/* Compartir */}
            <button onClick={handleShare} className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 relative cursor-pointer" aria-label="Compartir noticia">
              {isCopied ? <Check className="w-5 h-5 text-secondary-dark"/> : <Share2 className="w-5 h-5 text-slate-400 dark:text-slate-500 hover:text-[var(--foreground)]"/>}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

