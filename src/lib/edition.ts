import { StoryItem } from "./supabase";

/**
 * Valida que una colección de historias constituya una edición diaria válida:
 * 1. Debe contener EXACTAMENTE 5 historias.
 * 2. Las posiciones deben ser exactamente 1, 2, 3, 4, 5 (sin saltos ni duplicados).
 * 3. Todas las historias deben pertenecer a la fecha esperada (YYYY-MM-DD en Europe/Madrid).
 * 4. Todas las historias deben tener estado 'published'.
 */
export function validateDailyEdition(stories: StoryItem[] | null, expectedDate: string): boolean {
  if (!stories || !Array.isArray(stories) || stories.length !== 5) {
    return false;
  }

  // Comprobar que todas pertenezcan al día esperado y estén publicadas
  const allSameDateAndPublished = stories.every(
    (s) => s && s.edition_date === expectedDate && s.status === "published"
  );
  if (!allSameDateAndPublished) {
    return false;
  }

  // Comprobar que las posiciones sean exactamente 1, 2, 3, 4, 5
  const positions = stories.map((s) => s.edition_position).sort((a, b) => a - b);
  const hasConsecutivePositions = positions.every((pos, i) => pos === i + 1);

  return hasConsecutivePositions;
}
