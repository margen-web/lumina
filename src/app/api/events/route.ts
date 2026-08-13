import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getTodayDateString } from "@/lib/streak";

// In-memory sliding window rate limiter
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_EVENTS_PER_WINDOW = 35; // Máximo 35 eventos por IP/minuto

// Limpieza periódica de entradas expiradas para no saturar memoria
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

const ALLOWED_EVENTS = new Set([
  "session_started",
  "story_viewed",
  "story_completed",
  "evidence_opened",
  "evidence_closed",
  "source_clicked",
  "story_shared",
  "edition_completed",
]);

export async function POST(request: NextRequest) {
  try {
    // 1. Obtener identificador de origen para Rate Limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") || 
               "anonymous-client";

    const now = Date.now();
    const rateLimit = rateLimitMap.get(ip);

    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= MAX_EVENTS_PER_WINDOW) {
          return NextResponse.json(
            { error: "Too Many Requests - Rate limit exceeded" },
            { status: 429, headers: { "Retry-After": "60" } }
          );
        }
        rateLimit.count++;
      } else {
        rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    }

    // 2. Control de tamaño del payload (< 2KB)
    const rawBody = await request.text();
    if (rawBody.length > 2048) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    const { event_name, device_uuid, session_id, story_id, position, edition_date, metadata } = payload;

    // 3. Validación estricta de Event Name
    if (!event_name || !ALLOWED_EVENTS.has(event_name)) {
      return NextResponse.json({ error: "Invalid or unauthorized event_name" }, { status: 422 });
    }

    // 4. Validación de formatos de identificadores
    if (!device_uuid || typeof device_uuid !== "string" || device_uuid.length > 64) {
      return NextResponse.json({ error: "Invalid device_uuid" }, { status: 422 });
    }
    if (!session_id || typeof session_id !== "string" || session_id.length > 64) {
      return NextResponse.json({ error: "Invalid session_id" }, { status: 422 });
    }

    // Validación de posición (1 a 5 o null)
    let validatedPosition: number | null = null;
    if (position !== undefined && position !== null) {
      const posNum = Number(position);
      if (!Number.isInteger(posNum) || posNum < 1 || posNum > 5) {
        return NextResponse.json({ error: "Position must be an integer between 1 and 5" }, { status: 422 });
      }
      validatedPosition = posNum;
    }

    // Validación de fecha en Europe/Madrid (YYYY-MM-DD)
    const validDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const validatedDate = typeof edition_date === "string" && validDateRegex.test(edition_date)
      ? edition_date
      : getTodayDateString();

    // 5. Deduplicación Server-Side Estricta para edition_completed (máx 1 por device_uuid y edition_date)
    if (event_name === "edition_completed") {
      const { data: existingEvents, error: checkError } = await supabase
        .from("lumina_events")
        .select("id")
        .eq("event_name", "edition_completed")
        .eq("device_uuid", device_uuid)
        .eq("edition_date", validatedDate)
        .limit(1);

      if (!checkError && existingEvents && existingEvents.length > 0) {
        // Ya registrado hoy para este dispositivo: responder éxito deduplicado sin insertar duplicados
        return NextResponse.json({ ok: true, deduplicated: true }, { status: 200 });
      }
    }

    // 6. Inserción segura y controlada en Supabase
    const { error: dbError } = await supabase.from("lumina_events").insert({
      event_name,
      device_uuid,
      session_id,
      news_id: story_id && typeof story_id === "string" ? story_id.substring(0, 64) : null,
      position: validatedPosition,
      edition_date: validatedDate,
      metadata: typeof metadata === "object" && metadata !== null ? metadata : {},
    });

    if (dbError) {
      console.error("Database event insertion error:", dbError.message);
      return NextResponse.json({ error: "Failed to persist event" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("API Event Route unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
