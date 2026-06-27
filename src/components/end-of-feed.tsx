"use client";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Smile, Star } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://btyfqihnriqlobxcbvno.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0eWZxaWhucmlxbG9ieGNidm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjA4MDcsImV4cCI6MjA5NDA5NjgwN30.P5b8vV_roeN0PsCJpGwua8XyPrK2T8DlsKGSvALI_5U";

interface PollData {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  votes_a: number;
  votes_b: number;
}

export function EndOfFeed() {
  const { streak, isMounted } = useStreak();
  const [isVisible, setIsVisible] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  
  const [poll, setPoll] = useState<PollData | null>(null);
  const [userVote, setUserVote] = useState<'a' | 'b' | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasRated(localStorage.getItem("has_rated") === "true");
    }

    // Fetch daily poll from Supabase
    const fetchLatestPoll = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/lumina_polls?order=id.desc&limit=1`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const currentPoll = data[0];
            setPoll(currentPoll);

            // Load user vote from localStorage
            const savedVote = localStorage.getItem(`lumina_poll_vote_${currentPoll.id}`);
            if (savedVote === 'a' || savedVote === 'b') {
              setUserVote(savedVote);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching daily poll:", err);
      }
    };
    fetchLatestPoll();
  }, []);

  const handleVote = async (option: 'a' | 'b') => {
    if (!poll) return;

    setUserVote(option);
    localStorage.setItem(`lumina_poll_vote_${poll.id}`, option);

    setPoll((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        votes_a: option === 'a' ? prev.votes_a + 1 : prev.votes_a,
        votes_b: option === 'b' ? prev.votes_b + 1 : prev.votes_b,
      };
    });

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/vote_lumina_poll`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poll_id_param: poll.id,
          option_param: option,
        }),
      });
      if (res.ok) {
        const updatedPoll = await res.json();
        if (updatedPoll) {
          setPoll(updatedPoll);
        }
      }
    } catch (err) {
      console.error("Error saving vote:", err);
    }
  };

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

  // Calculate percentages
  const totalVotes = (poll?.votes_a || 0) + (poll?.votes_b || 0);
  const percentA = totalVotes > 0 ? Math.round(((poll?.votes_a || 0) / totalVotes) * 100) : 0;
  const percentB = totalVotes > 0 ? 100 - percentA : 0;

  return (
    <article id="end-of-feed" data-index={5} className="w-full h-[100dvh] flex flex-col justify-center items-center p-6 snap-start snap-always relative">
      <div className={`flex flex-col items-center text-center max-w-sm gap-6 p-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="w-20 h-20 bg-primary-light/40 text-primary-dark rounded-full flex items-center justify-center mb-1"><Smile className="w-10 h-10" /></div>
        <h2 className="text-3xl font-bold text-[var(--heading)]">Ya estás al día.</h2>
        <p className="text-base font-semibold opacity-90">{msg}</p>
        
        {/* Encuesta Zen Diaria */}
        {poll && (
          <div className="w-full p-6 bg-[var(--card)] rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-md flex flex-col gap-4 text-center items-center">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-primary-light/40 dark:bg-primary-dark/20 text-primary-dark dark:text-primary-light tracking-wider uppercase">Encuesta del día</span>
            <p className="text-xs font-bold leading-snug text-[var(--heading)] px-2">{poll.question}</p>
            
            {!userVote ? (
              <div className="flex gap-2 w-full mt-2">
                <button
                  onClick={() => handleVote('a')}
                  className="flex-1 py-3 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-bold text-xs transition-all transform active:scale-95 cursor-pointer text-[var(--foreground)]"
                >
                  {poll.option_a}
                </button>
                <button
                  onClick={() => handleVote('b')}
                  className="flex-1 py-3 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-bold text-xs transition-all transform active:scale-95 cursor-pointer text-[var(--foreground)]"
                >
                  {poll.option_b}
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-3 mt-1 text-left">
                {/* Opción A */}
                <div className="relative w-full h-10 rounded-full bg-slate-100 dark:bg-slate-900 border border-black/5 dark:border-white/5 overflow-hidden flex items-center px-4 justify-between">
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-primary-DEFAULT/25 dark:bg-primary-DEFAULT/20 transition-all duration-1000" 
                    style={{ width: `${percentA}%` }}
                  />
                  <span className="text-xs font-bold z-10 flex items-center gap-1.5 text-[var(--foreground)]">
                    {poll.option_a} {userVote === 'a' && <span className="text-[9px] bg-primary-DEFAULT/40 px-1.5 py-0.5 rounded-full text-primary-dark font-extrabold">Tu voto</span>}
                  </span>
                  <span className="text-xs font-extrabold z-10 text-[var(--heading)]">{percentA}%</span>
                </div>

                {/* Opción B */}
                <div className="relative w-full h-10 rounded-full bg-slate-100 dark:bg-slate-900 border border-black/5 dark:border-white/5 overflow-hidden flex items-center px-4 justify-between">
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-primary-DEFAULT/25 dark:bg-primary-DEFAULT/20 transition-all duration-1000" 
                    style={{ width: `${percentB}%` }}
                  />
                  <span className="text-xs font-bold z-10 flex items-center gap-1.5 text-[var(--foreground)]">
                    {poll.option_b} {userVote === 'b' && <span className="text-[9px] bg-primary-DEFAULT/40 px-1.5 py-0.5 rounded-full text-primary-dark font-extrabold">Tu voto</span>}
                  </span>
                  <span className="text-xs font-extrabold z-10 text-[var(--heading)]">{percentB}%</span>
                </div>

                <span className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1 font-semibold">
                  {totalVotes} {totalVotes === 1 ? 'voto total' : 'votos totales'}
                </span>
              </div>
            )}
          </div>
        )}

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
