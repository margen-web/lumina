"use client";
import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { Smile, Star } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";
import { logLuminaEvent } from "@/lib/analytics";

export function EndOfFeed() {
  const { streak, isMounted } = useStreak();
  const [isVisible, setIsVisible] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const hasLoggedComplete = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasRated(localStorage.getItem("has_rated") === "true");
    }
  }, []);

  const handleRateApp = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
    window.open("https://play.google.com/store", "_blank");
    localStorage.setItem("has_rated", "true");
    setHasRated(true);
  };

  const handleDismissRate = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
    localStorage.setItem("has_rated", "true");
    setHasRated(true);
  };

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        if (!hasLoggedComplete.current) {
          hasLoggedComplete.current = true;
          logLuminaEvent("feed_complete");
        }
        if (isMounted) {
          const duration = 2.5 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 28, spread: 360, ticks: 60, zIndex: 100 };

          const randomInRange = (min: number, max: number) => {
            return Math.random() * (max - min) + min;
          };

          intervalId = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              if (intervalId) clearInterval(intervalId);
              return;
            }

            const particleCount = 40 * (timeLeft / duration);

            confetti({
              ...defaults,
              particleCount,
              origin: { x: randomInRange(0.15, 0.4), y: randomInRange(0.2, 0.5) },
              colors: ["#facc15", "#34d399", "#f472b6", "#a7f3d0", "#fef08a"],
            });
            confetti({
              ...defaults,
              particleCount,
              origin: { x: randomInRange(0.6, 0.85), y: randomInRange(0.2, 0.5) },
              colors: ["#facc15", "#34d399", "#f472b6", "#a7f3d0", "#fef08a"],
            });
          }, 300);

          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([80, 40, 120, 40, 200, 40, 300]);
          }
        }
      }
    }, { threshold: 0.5 });

    const el = document.getElementById("end-of-feed");
    if (el) observer.observe(el);

    return () => {
      observer.disconnect();
      if (intervalId) clearInterval(intervalId);
    };
  }, [isMounted]);

  let msg = "Has completado tus 5 noticias positivas de hoy.";
  if (isMounted) {
    if (streak >= 7) msg = "¡Una semana entera de puro optimismo! Estás en otro nivel. 🌟";
    else if (streak >= 3) msg = "¡Llevas varios días seguidos cuidando tu salud mental! Choca esos cinco 🖐️.";
  }

  return (
    <article id="end-of-feed" data-index={5} className="w-full h-[100dvh] flex flex-col justify-center items-center p-6 snap-start snap-always relative">
      <div className={`flex flex-col items-center text-center max-w-sm gap-6 p-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="w-24 h-24 bg-primary-light/40 text-primary-dark rounded-full flex items-center justify-center mb-2"><Smile className="w-12 h-12" /></div>
        <h2 className="text-3xl font-bold text-[var(--heading)]">Ya estás al día.</h2>
        <p className="text-lg font-medium">{msg}</p>
        
        <div className="p-5 bg-[var(--card)] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm w-full">
          <p className="text-sm font-semibold opacity-95">No hay más ruido por hoy. Apaga la pantalla y que tengas un gran día. ✨</p>
        </div>

        {/* Banner para calificar la aplicación (se muestra a partir del día 3 si no ha calificado) */}
        {isMounted && streak >= 3 && !hasRated && (
          <div className="w-full p-6 bg-primary-light/30 dark:bg-primary-dark/10 border border-primary-DEFAULT/30 dark:border-primary-dark/30 rounded-[2rem] flex flex-col gap-4 items-center shadow-sm">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-5 h-5 text-primary-DEFAULT fill-primary-DEFAULT animate-pulse" />
              ))}
            </div>
            <h3 className="text-sm font-bold text-[var(--heading)]">¿Te gusta Lumina?</h3>
            <p className="text-xs text-[var(--foreground)] opacity-90 max-w-[250px]">
              Tardas solo 30 segundos y nos ayuda enormemente a que más personas descubran el lado positivo del mundo.
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={handleRateApp}
                className="flex-1 py-2 rounded-full bg-primary-DEFAULT hover:bg-primary-dark text-slate-950 text-xs font-bold transition-all transform active:scale-95 cursor-pointer shadow-sm"
              >
                Valorar app
              </button>
              <button
                onClick={handleDismissRate}
                className="flex-1 py-2 rounded-full bg-black/5 dark:bg-white/5 text-[var(--foreground)] text-xs font-semibold hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                Quizás luego
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400 italic px-4 leading-relaxed max-w-[280px]">
          💡 ¿Sabías que empezar el día leyendo buenas noticias reduce los niveles de cortisol y mejora tu bienestar emocional? 🌿
        </p>
        <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-600 hover:text-slate-500">
          <a href="/privacidad" className="hover:underline cursor-pointer">Privacidad y Aviso Legal</a>
        </div>
      </div>
    </article>
  );
}
