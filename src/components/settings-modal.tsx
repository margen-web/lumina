"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { X, Sun, Moon, Laptop, Bell, Shield, Info } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const savedNotif = localStorage.getItem("lumina_daily_notif");
    if (savedNotif === "true") {
      setNotificationsEnabled(true);
    }
  }, []);

  const handleToggleNotifications = async () => {
    const nextState = !notificationsEnabled;
    setNotificationsEnabled(nextState);
    localStorage.setItem("lumina_daily_notif", nextState ? "true" : "false");

    if (nextState && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    }
  };

  if (!isOpen || !mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[var(--card)] rounded-3xl p-6 shadow-2xl border border-[var(--border-strong)] flex flex-col gap-6 text-[var(--foreground)] animate-in zoom-in-95 duration-200">
        
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-[var(--heading)]">Ajustes</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--subtle)] text-slate-400 hover:text-[var(--heading)] transition-colors cursor-pointer"
            aria-label="Cerrar ajustes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sección 1: Apariencia */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Apariencia
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTheme("light")}
              className={`py-2.5 px-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                theme === "light"
                  ? "bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-600 dark:text-sky-400"
                  : "border-[var(--border)] hover:bg-[var(--subtle)] text-slate-500"
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Claro</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`py-2.5 px-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-600 dark:text-sky-400"
                  : "border-[var(--border)] hover:bg-[var(--subtle)] text-slate-500"
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Oscuro</span>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`py-2.5 px-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                theme === "system"
                  ? "bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-600 dark:text-sky-400"
                  : "border-[var(--border)] hover:bg-[var(--subtle)] text-slate-500"
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Auto</span>
            </button>
          </div>
        </div>

        {/* Sección 2: Notificaciones Opt-in */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Avisos diarios
          </label>
          <div className="p-3.5 rounded-2xl bg-[var(--subtle)] border border-[var(--border)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-sky-500" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[var(--heading)]">Aviso de edición</span>
                <span className="text-[11px] text-slate-500 leading-tight">Máximo una notificación al día</span>
              </div>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                notificationsEnabled ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
              role="switch"
              aria-checked={notificationsEnabled}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  notificationsEnabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sección 3: Enlaces y Acerca de */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
          <a
            href="/privacidad"
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--subtle)] text-xs text-slate-600 dark:text-slate-400 hover:text-[var(--heading)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Privacidad & Transparencia
            </span>
            <span className="text-slate-400">↗</span>
          </a>

          <div className="p-3 rounded-xl bg-[var(--subtle)] text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-500" />
            <p>
              Lumina te muestra cinco noticias positivas al día. Una vez terminas, se acabó hasta mañana.
            </p>
          </div>

          <div className="text-center pt-1 text-[10px] text-slate-400 font-mono">
            Lumina Core 0.3
          </div>
        </div>

      </div>
    </div>
  );
}
