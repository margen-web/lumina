import { useState, useEffect } from "react";
export function useStreak() {
  const [streak, setStreak] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);

    // MOCK DE DESARROLLO (solo para localhost): Fuerza racha de 3 días y habilita el banner de valoración
    if (process.env.NODE_ENV === "development") {
      localStorage.setItem("current_streak", "3");
      if (!localStorage.getItem("has_rated_mocked")) {
        localStorage.setItem("has_rated", "false");
        localStorage.setItem("has_rated_mocked", "true");
      }
    }

    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem("last_login_date");
    let currentStreak = parseInt(localStorage.getItem("current_streak") || "0", 10);
    if (lastLogin !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastLogin && new Date(lastLogin).toDateString() === yesterday.toDateString()) {
        currentStreak += 1;
      } else { currentStreak = 1; }
      localStorage.setItem("last_login_date", today);
      localStorage.setItem("current_streak", currentStreak.toString());
      setStreak(currentStreak);
    } else { setStreak(currentStreak || 1); }
  }, []);
  return { streak, isMounted };
}
