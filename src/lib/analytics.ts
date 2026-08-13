import { supabase } from "./supabase";

export type LuminaEventName =
  | "session_started"
  | "story_viewed"
  | "story_completed"
  | "evidence_opened"
  | "evidence_closed"
  | "source_clicked"
  | "story_shared"
  | "edition_completed";

// Generar u obtener un identificador único anónimo persistente del dispositivo
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

// Control de tasa y deduplicación en memoria para mitigar abusos
const recentEvents = new Set<string>();
let eventCountInWindow = 0;
let windowStartTime = Date.now();

const MAX_EVENTS_PER_MINUTE = 40;

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

  // Control de tasa por minuto
  const now = Date.now();
  if (now - windowStartTime > 60000) {
    windowStartTime = now;
    eventCountInWindow = 0;
  }
  if (eventCountInWindow >= MAX_EVENTS_PER_MINUTE) {
    return;
  }
  eventCountInWindow++;

  // Clave de deduplicación para eventos idénticos en la misma sesión
  const dedupKey = `${eventName}_${payload?.storyId || ""}_${payload?.position || ""}`;
  if (
    eventName === "session_started" ||
    eventName === "edition_completed" ||
    eventName === "story_viewed"
  ) {
    if (recentEvents.has(dedupKey)) {
      return;
    }
    recentEvents.add(dedupKey);
  }

  try {
    const { error } = await supabase.from("lumina_events").insert({
      event_name: eventName,
      device_uuid: deviceUuid,
      session_id: sessionId,
      news_id: payload?.storyId || null,
      position: payload?.position ?? null,
      edition_date: payload?.editionDate || new Date().toISOString().split("T")[0],
      metadata: {
        source_type: payload?.sourceType,
        method: payload?.method,
        ...payload?.metadata,
      },
    });

    if (error) {
      console.warn("Analytics log warning:", error.message);
    }
  } catch (err) {
    console.warn("Failed to record analytics event:", err);
  }
}
