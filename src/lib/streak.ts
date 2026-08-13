// Helper para cálculo y persistencia de la racha de luz (Daily Streak)

export interface StreakState {
  currentStreak: number;
  lastCompletedDate: string | null;
  history: string[]; // Fechas completadas recientemente (últimos 7 días)
  isNewStreak: boolean;
  completedToday: boolean;
}

// Obtener fecha actual en formato YYYY-MM-DD según la zona horaria de Madrid / local
export function getTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// Diferencia en días entre dos cadenas de fecha YYYY-MM-DD
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + "T00:00:00Z");
  const d2 = new Date(dateStr2 + "T00:00:00Z");
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Obtener estado actual de la racha
export function getStreakState(): StreakState {
  if (typeof window === "undefined") {
    return {
      currentStreak: 0,
      lastCompletedDate: null,
      history: [],
      isNewStreak: false,
      completedToday: false,
    };
  }

  const todayStr = getTodayDateString();
  const lastDate = localStorage.getItem("lumina_last_completed_date");
  const storedStreak = parseInt(localStorage.getItem("lumina_streak_count") || "0", 10);
  
  let history: string[] = [];
  try {
    const rawHistory = localStorage.getItem("lumina_streak_history");
    if (rawHistory) {
      history = JSON.parse(rawHistory);
    }
  } catch {
    history = [];
  }

  const completedToday = lastDate === todayStr;

  // Si no se completó hoy y la última fecha fue hace 2 o más días, la racha activa se reseteó a 0 (hasta que complete hoy)
  let activeStreak = storedStreak;
  if (!completedToday && lastDate) {
    const diff = getDaysDifference(lastDate, todayStr);
    if (diff > 1) {
      activeStreak = 0;
    }
  }

  return {
    currentStreak: activeStreak,
    lastCompletedDate: lastDate,
    history,
    isNewStreak: !lastDate || (lastDate !== todayStr && getDaysDifference(lastDate, todayStr) > 1),
    completedToday,
  };
}

// Registrar finalización de edición y actualizar racha
export function recordEditionCompleted(): StreakState {
  if (typeof window === "undefined") {
    return {
      currentStreak: 1,
      lastCompletedDate: null,
      history: [],
      isNewStreak: true,
      completedToday: true,
    };
  }

  const todayStr = getTodayDateString();
  const lastDate = localStorage.getItem("lumina_last_completed_date");
  const storedStreak = parseInt(localStorage.getItem("lumina_streak_count") || "0", 10);
  
  let history: string[] = [];
  try {
    const rawHistory = localStorage.getItem("lumina_streak_history");
    if (rawHistory) {
      history = JSON.parse(rawHistory);
    }
  } catch {
    history = [];
  }

  // Si ya se completó hoy, no incrementar de nuevo
  if (lastDate === todayStr) {
    return {
      currentStreak: storedStreak,
      lastCompletedDate: lastDate,
      history,
      isNewStreak: false,
      completedToday: true,
    };
  }

  let newStreak = 1;
  let isNewStreak = true;

  if (lastDate) {
    const diff = getDaysDifference(lastDate, todayStr);
    if (diff === 1) {
      // Día consecutivo: racha +1
      newStreak = storedStreak + 1;
      isNewStreak = false;
    } else {
      // Se saltó uno o más días: nueva racha comenzando en 1
      newStreak = 1;
      isNewStreak = true;
    }
  }

  // Actualizar historial de días recientes (máx 7)
  const updatedHistory = [...history.filter((d) => d !== todayStr), todayStr].slice(-7);

  // Persistir en localStorage
  localStorage.setItem("lumina_streak_count", newStreak.toString());
  localStorage.setItem("lumina_last_completed_date", todayStr);
  localStorage.setItem("lumina_streak_history", JSON.stringify(updatedHistory));
  localStorage.setItem("lumina_last_completed_edition", todayStr);

  return {
    currentStreak: newStreak,
    lastCompletedDate: todayStr,
    history: updatedHistory,
    isNewStreak,
    completedToday: true,
  };
}
