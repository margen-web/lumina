// Helper para cálculo y persistencia de la racha de luz (Daily Streak)

export interface DayOfWeekStatus {
  dayLabel: "L" | "M" | "X" | "J" | "V" | "S" | "D";
  dateString: string;
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface StreakState {
  currentStreak: number;
  lastCompletedDate: string | null;
  history: string[]; // Todas las fechas completadas recientemente (formato YYYY-MM-DD)
  isNewStreak: boolean;
  completedToday: boolean;
  weekStatus: DayOfWeekStatus[];
}

// Obtener fecha actual en formato YYYY-MM-DD según la zona horaria de Madrid (Europe/Madrid)
export function getTodayDateString(customDate?: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(customDate || new Date());
  } catch {
    return (customDate || new Date()).toISOString().split("T")[0];
  }
}

// Obtener el día de la semana (0 = Lunes, 6 = Domingo) en Europe/Madrid para una fecha YYYY-MM-DD
export function getMadridDayOfWeekIndex(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00Z");
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    weekday: "short",
  });
  const weekday = formatter.format(d).toLowerCase();
  const map: Record<string, number> = {
    mon: 0,
    tue: 1,
    wed: 2,
    thu: 3,
    fri: 4,
    sat: 5,
    sun: 6,
  };
  return map[weekday] ?? 0;
}

// Sumar o restar días a una fecha YYYY-MM-DD en formato ISO
export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// Diferencia en días enteros entre dos cadenas de fecha YYYY-MM-DD
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + "T12:00:00Z");
  const d2 = new Date(dateStr2 + "T12:00:00Z");
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Calcular los 7 días (L M X J V S D) de la semana actual según Europe/Madrid
export function getWeekStatusForDate(
  referenceDateStr: string,
  history: string[]
): DayOfWeekStatus[] {
  const dayIndex = getMadridDayOfWeekIndex(referenceDateStr); // 0 (Mon) a 6 (Sun)
  const mondayDateStr = addDaysToDateString(referenceDateStr, -dayIndex);
  
  const labels: Array<"L" | "M" | "X" | "J" | "V" | "S" | "D"> = ["L", "M", "X", "J", "V", "S", "D"];
  const result: DayOfWeekStatus[] = [];

  for (let i = 0; i < 7; i++) {
    const dayDateStr = addDaysToDateString(mondayDateStr, i);
    const isCompleted = history.includes(dayDateStr);
    const isToday = dayDateStr === referenceDateStr;
    const isFuture = dayDateStr > referenceDateStr;

    result.push({
      dayLabel: labels[i],
      dateString: dayDateStr,
      isCompleted,
      isToday,
      isFuture,
    });
  }

  return result;
}

// Obtener estado actual de la racha desde localStorage
export function getStreakState(referenceDate?: Date): StreakState {
  const todayStr = getTodayDateString(referenceDate);

  if (typeof window === "undefined") {
    return {
      currentStreak: 0,
      lastCompletedDate: null,
      history: [],
      isNewStreak: false,
      completedToday: false,
      weekStatus: getWeekStatusForDate(todayStr, []),
    };
  }

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

  // Si no se completó hoy y la última fecha fue hace 2 o más días, la racha activa se resetea a 0
  let activeStreak = storedStreak;
  if (!completedToday && lastDate) {
    const diff = getDaysDifference(lastDate, todayStr);
    if (diff > 1) {
      activeStreak = 0;
    }
  }

  const weekStatus = getWeekStatusForDate(todayStr, history);

  return {
    currentStreak: activeStreak,
    lastCompletedDate: lastDate,
    history,
    isNewStreak: !lastDate || (lastDate !== todayStr && getDaysDifference(lastDate, todayStr) > 1),
    completedToday,
    weekStatus,
  };
}

// Registrar finalización de edición y actualizar racha anclada a targetEditionDate
export function recordEditionCompleted(
  targetEditionDate?: string,
  referenceDate?: Date
): StreakState {
  const todayStr = getTodayDateString(referenceDate);
  const editionDate = targetEditionDate || todayStr;

  if (typeof window === "undefined") {
    const isToday = editionDate === todayStr;
    return {
      currentStreak: 1,
      lastCompletedDate: editionDate,
      history: [editionDate],
      isNewStreak: true,
      completedToday: isToday,
      weekStatus: getWeekStatusForDate(todayStr, [editionDate]),
    };
  }

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

  // Si ya se completó esta edición exacta, no volver a incrementar
  if (lastDate === editionDate) {
    const isToday = editionDate === todayStr;
    return {
      currentStreak: storedStreak,
      lastCompletedDate: lastDate,
      history,
      isNewStreak: false,
      completedToday: isToday,
      weekStatus: getWeekStatusForDate(todayStr, history),
    };
  }

  let newStreak = 1;
  let isNewStreak = true;

  if (lastDate) {
    const diff = getDaysDifference(lastDate, editionDate);
    if (diff === 1) {
      // Día consecutivo respecto a la fecha de la edición completada
      newStreak = storedStreak + 1;
      isNewStreak = false;
    } else {
      // Se saltó uno o más días
      newStreak = 1;
      isNewStreak = true;
    }
  }

  // Guardar historial de fechas completadas (últimos 60 días)
  const updatedHistory = [...history.filter((d) => d !== editionDate), editionDate].slice(-60);

  // Persistir en localStorage
  localStorage.setItem("lumina_streak_count", newStreak.toString());
  localStorage.setItem("lumina_last_completed_date", editionDate);
  localStorage.setItem("lumina_streak_history", JSON.stringify(updatedHistory));
  localStorage.setItem("lumina_last_completed_edition", editionDate);

  const isToday = editionDate === todayStr;
  const weekStatus = getWeekStatusForDate(todayStr, updatedHistory);

  return {
    currentStreak: newStreak,
    lastCompletedDate: editionDate,
    history: updatedHistory,
    isNewStreak,
    completedToday: isToday,
    weekStatus,
  };
}
