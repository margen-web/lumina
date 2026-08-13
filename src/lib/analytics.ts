import { getTodayDateString } from "./streak";

export type LuminaEventName =
  | "session_started"
  | "story_viewed"
  | "story_completed"
  | "evidence_opened"
  | "evidence_closed"
  | "source_clicked"
  | "story_shared"
  | "edition_completed";

// Generar u obtener un identificador anónimo del dispositivo persistente
export function getOrCreateDeviceUuid(): string {
  if (typeof window === "undefined") return "";
  let uuid = localStorage.getItem("lumina_device_uuid");
  if (!uuid) {
    uuid = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("lumina_device_uuid", uuid);
  }
  return uuid;
}

// Generar u obtener un identificador de sesión temporal
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("lumina_session_id");
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    sessionStorage.setItem("lumina_session_id", sid);
  }
  return sid;
}

// Deduplicación en cliente para evitar dobles disparos por re-renders de React
const loggedSessionEvents = new Set<string>();

export async function logLuminaEvent(
  eventName: LuminaEventName,
  payload?: {
    storyId?: string;
    position?: number;
    editionDate?: string;
    sourceType?: string;
    method?: string;
    metadata?: Record<string, unknown>;
  }
) {
  if (typeof window === "undefined") return;

  const deviceUuid = getOrCreateDeviceUuid();
  const sessionId = getOrCreateSessionId();
  if (!deviceUuid || !sessionId) return;

  // Fecha en zona horaria editorial estricta Europe/Madrid
  const madridEditionDate = payload?.editionDate || getTodayDateString();

  // Deduplicación de eventos únicos en la misma sesión
  const dedupKey = `${eventName}_${payload?.storyId || ""}_${payload?.position || ""}_${madridEditionDate}`;
  if (
    eventName === "session_started" ||
    eventName === "edition_completed" ||
    eventName === "story_viewed" ||
    eventName === "story_completed"
  ) {
    if (loggedSessionEvents.has(dedupKey)) {
      return;
    }
    loggedSessionEvents.add(dedupKey);
  }

  try {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_name: eventName,
        device_uuid: deviceUuid,
        session_id: sessionId,
        story_id: payload?.storyId || null,
        position: payload?.position ?? null,
        edition_date: madridEditionDate,
        metadata: {
          source_type: payload?.sourceType,
          method: payload?.method,
          ...payload?.metadata,
        },
      }),
    });

    if (!res.ok && res.status !== 429) {
      console.warn("Analytics route response status:", res.status);
    }
  } catch (err) {
    // Analytics nunca debe romper la experiencia de usuario
    console.warn("Analytics dispatch warning:", err);
  }
}
