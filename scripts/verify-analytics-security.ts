import { createClient } from "@supabase/supabase-js";

/**
 * LIVE VERIFICATION HARNESS: END-TO-END ANALYTICS SECURITY & ATOMIC DEDUPLICATION
 * 
 * Verifica el flujo completo en un entorno REAL:
 * 1. Anon Client -> Intento de INSERT directo a DB -> Rechazado por RLS / Revoke de privilegios.
 * 2. Cliente HTTP -> POST /api/events -> Backend con getSupabaseServer() y service_role -> 201 Created.
 * 3. Cliente HTTP -> 2 POST concurrentes /api/events (mismo device_uuid y edition_date) -> 1x 201, 1x 200 (deduplicated: true).
 * 4. DB Inspection -> Exactamente 1 fila de edition_completed en PostgreSQL (Índice único atómico 23505 verificado).
 * 5. Cliente HTTP -> POST /api/events para fecha diferente -> 201 Created y 2 filas totales en DB.
 * 6. Cleanup -> Limpieza garantizada en bloque finally usando serviceClient.
 * 
 * Uso:
 * LUMINA_BASE_URL="http://localhost:3000" npx tsx scripts/verify-analytics-security.ts
 * o contra preview:
 * LUMINA_BASE_URL="https://lumina-preview-url.vercel.app" npx tsx scripts/verify-analytics-security.ts
 */

const rawBaseUrl = process.env.LUMINA_BASE_URL || "http://localhost:3000";
const baseUrl = rawBaseUrl.replace(/\/+$/, "");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface SummaryResults {
  anonDirectInsert: boolean;
  apiNormalInsert: boolean;
  apiConcurrentDedupe: boolean;
  dbExactRowCount: boolean;
  differentEditionDate: boolean;
  cleanup: boolean;
}

async function runLiveVerification() {
  console.log("==================================================================");
  console.log("  LUMINA LIVE VERIFICATION HARNESS (E2E API & DATABASE)");
  console.log("==================================================================");
  console.log(`Target URL: ${baseUrl}\n`);

  if (!supabaseUrl || !anonKey) {
    throw new Error("Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Configúrala en tu entorno o .env.local para ejecutar la inspección y limpieza."
    );
  }

  const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const testDeviceUuid = `lumina_security_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const testEditionDate1 = "2026-08-13";
  const testEditionDate2 = "2026-08-14";

  console.log(`Dispositivo de prueba: ${testDeviceUuid}\n`);

  const summary: SummaryResults = {
    anonDirectInsert: false,
    apiNormalInsert: false,
    apiConcurrentDedupe: false,
    dbExactRowCount: false,
    differentEditionDate: false,
    cleanup: false,
  };

  let executionFailed = false;

  try {
    // -------------------------------------------------------------------------
    // TEST A: Intento de INSERT directo con anon key (PostgreSQL RLS / Revoke)
    // -------------------------------------------------------------------------
    console.log("--- 1. TEST A: Intento de INSERT directo usando clave anónima (Browser Anon) ---");
    const { error: anonError } = await anonClient.from("lumina_events").insert({
      event_name: "story_viewed",
      device_uuid: testDeviceUuid,
      session_id: "test_sess_anon",
      edition_date: testEditionDate1,
    });

    if (anonError) {
      console.log(`✓ RECHAZADO CORRECTAMENTE por RLS/Privilegios: [${anonError.code}] ${anonError.message}`);
      summary.anonDirectInsert = true;
    } else {
      console.error("❌ FALLO DE SEGURIDAD: El cliente anónimo pudo insertar directamente en lumina_events.");
      summary.anonDirectInsert = false;
      executionFailed = true;
    }

    // -------------------------------------------------------------------------
    // TEST B: HTTP POST real a /api/events (Validación E2E Route -> Service Role)
    // -------------------------------------------------------------------------
    console.log(`\n--- 2. TEST B: HTTP POST real a ${baseUrl}/api/events (story_viewed) ---`);
    const resB = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: "story_viewed",
        device_uuid: testDeviceUuid,
        session_id: "test_sess_api_normal",
        position: 1,
        edition_date: testEditionDate1,
        metadata: { source_type: "harness_test" },
      }),
    });

    const bodyB = await resB.json().catch(() => null);
    if (resB.status === 201 && bodyB?.ok === true) {
      console.log(`✓ API POST /api/events respondió 201 Created: ${JSON.stringify(bodyB)}`);
      summary.apiNormalInsert = true;
    } else {
      console.error(`❌ ERROR en POST /api/events: Status ${resB.status}`, bodyB);
      summary.apiNormalInsert = false;
      executionFailed = true;
    }

    // -------------------------------------------------------------------------
    // TEST C: Dos HTTP POST concurrentes de edition_completed a /api/events
    // -------------------------------------------------------------------------
    console.log(`\n--- 3. TEST C: 2 HTTP POST concurrentes a /api/events (edition_completed) ---`);
    const payloadC = {
      event_name: "edition_completed",
      device_uuid: testDeviceUuid,
      session_id: "test_sess_api_concurrent",
      edition_date: testEditionDate1,
      metadata: { current_streak: 1 },
    };

    const [fetch1, fetch2] = await Promise.all([
      fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadC),
      }),
      fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadC),
      }),
    ]);

    const json1 = await fetch1.json().catch(() => null);
    const json2 = await fetch2.json().catch(() => null);

    console.log(`Respuesta 1: Status ${fetch1.status}`, json1);
    console.log(`Respuesta 2: Status ${fetch2.status}`, json2);

    const has201 = fetch1.status === 201 || fetch2.status === 201;
    const has200Dedup =
      (fetch1.status === 200 && json1?.deduplicated === true) ||
      (fetch2.status === 200 && json2?.deduplicated === true);

    if (has201 && has200Dedup) {
      console.log("✓ DEDUPLICACIÓN ATÓMICA CONFIRMADA EN RUTA HTTP: 1x 201 Created y 1x 200 Deduplicated.");
      summary.apiConcurrentDedupe = true;
    } else {
      console.error("❌ FALLO EN DEDUPLICACIÓN CONCURRENTE HTTP: Se esperaba una 201 y una 200 { deduplicated: true }.");
      summary.apiConcurrentDedupe = false;
      executionFailed = true;
    }

    // Inspección en Base de Datos vía serviceClient (Solo lectura)
    const { data: rowsDay1, error: countError } = await serviceClient
      .from("lumina_events")
      .select("id")
      .eq("device_uuid", testDeviceUuid)
      .eq("event_name", "edition_completed")
      .eq("edition_date", testEditionDate1);

    if (!countError && rowsDay1 && rowsDay1.length === 1) {
      console.log(`✓ Verificación DB: Exactamente ${rowsDay1.length} fila de edition_completed para ${testEditionDate1}.`);
      summary.dbExactRowCount = true;
    } else {
      console.error(`❌ ERROR DB: Se esperaba exactamente 1 fila, se encontraron ${rowsDay1?.length ?? 0}.`, countError);
      summary.dbExactRowCount = false;
      executionFailed = true;
    }

    // -------------------------------------------------------------------------
    // TEST D: HTTP POST para fecha diferente (Día 2)
    // -------------------------------------------------------------------------
    console.log(`\n--- 4. TEST D: HTTP POST para fecha diferente (${testEditionDate2}) ---`);
    const resD = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: "edition_completed",
        device_uuid: testDeviceUuid,
        session_id: "test_sess_day2",
        edition_date: testEditionDate2,
        metadata: { current_streak: 2 },
      }),
    });

    const bodyD = await resD.json().catch(() => null);
    if (resD.status === 201 && bodyD?.ok === true) {
      console.log(`✓ Inserción permitida para ${testEditionDate2}: Status 201 Created.`);

      const { data: totalCompletions } = await serviceClient
        .from("lumina_events")
        .select("id, edition_date")
        .eq("device_uuid", testDeviceUuid)
        .eq("event_name", "edition_completed");

      if (totalCompletions && totalCompletions.length === 2) {
        console.log(`✓ Verificación DB: Total de 2 completions para fechas distintas.`);
        summary.differentEditionDate = true;
      } else {
        console.error(`❌ ERROR DB: Se esperaban 2 completions, encontradas ${totalCompletions?.length ?? 0}.`);
        summary.differentEditionDate = false;
        executionFailed = true;
      }
    } else {
      console.error(`❌ ERROR en POST /api/events para fecha distinta: Status ${resD.status}`, bodyD);
      summary.differentEditionDate = false;
      executionFailed = true;
    }
  } catch (err) {
    console.error("❌ Excepción no controlada durante la verificación:", err);
    executionFailed = true;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP GARANTIZADO: Eliminar todos los registros de testDeviceUuid
    // -------------------------------------------------------------------------
    console.log("\n--- 5. CLEANUP GARANTIZADO ---");
    try {
      const { error: cleanupError } = await serviceClient
        .from("lumina_events")
        .delete()
        .eq("device_uuid", testDeviceUuid);

      if (cleanupError) {
        console.warn("⚠️ Advertencia en cleanup:", cleanupError.message);
        summary.cleanup = false;
      } else {
        console.log(`✓ Registros con device_uuid '${testDeviceUuid}' eliminados con éxito.`);
        summary.cleanup = true;
      }
    } catch (cleanErr) {
      console.warn("⚠️ Excepción en cleanup:", cleanErr);
      summary.cleanup = false;
    }

    // -------------------------------------------------------------------------
    // OUTPUT FINAL RESUMIDO
    // -------------------------------------------------------------------------
    console.log("\n==================================================================");
    console.log("  RESUMEN FINAL DE VERIFICACIÓN EN VIVO");
    console.log("==================================================================");
    console.log(`ANON DIRECT INSERT:       ${summary.anonDirectInsert ? "PASS" : "FAIL"}`);
    console.log(`API NORMAL INSERT:        ${summary.apiNormalInsert ? "PASS" : "FAIL"}`);
    console.log(`API CONCURRENT DEDUPE:    ${summary.apiConcurrentDedupe ? "PASS" : "FAIL"}`);
    console.log(`DB EXACT ROW COUNT:       ${summary.dbExactRowCount ? "PASS" : "FAIL"}`);
    console.log(`DIFFERENT EDITION DATE:   ${summary.differentEditionDate ? "PASS" : "FAIL"}`);
    console.log(`CLEANUP:                  ${summary.cleanup ? "PASS" : "FAIL"}`);
    console.log("==================================================================\n");

    if (executionFailed || Object.values(summary).some((val) => val !== true)) {
      process.exit(1);
    }
  }
}

runLiveVerification();
