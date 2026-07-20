import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config";

// Generar u obtener un identificador único anónimo del dispositivo
export function getOrCreateDeviceUuid(): string {
  if (typeof window === "undefined") return "";
  let uuid = localStorage.getItem("lumina_device_uuid");
  if (!uuid) {
    // Usar crypto.randomUUID si está disponible, o un fallback matemático
    uuid = typeof crypto !== "undefined" && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("lumina_device_uuid", uuid);
  }
  return uuid;
}

// Registrar un evento anónimo en la base de datos de Supabase
export async function logLuminaEvent(eventName: string, newsId?: string) {
  const deviceUuid = getOrCreateDeviceUuid();
  if (!deviceUuid) return;

  try {
    // Ejecutar de forma no bloqueante
    fetch(`${SUPABASE_URL}/rest/v1/lumina_events`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        event_name: eventName,
        news_id: newsId || null,
        device_uuid: deviceUuid,
      }),
    }).catch(e => console.error("Error logging event:", e));
  } catch (err) {
    console.error("Failed to log analytics event:", err);
  }
}
