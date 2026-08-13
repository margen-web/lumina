import { createClient } from "@supabase/supabase-js";

/**
 * LIVE VERIFICATION SCRIPT: ANALYTICS SECURITY & ATOMIC DEDUPLICATION
 * 
 * Este script se ejecuta para verificar contra una instancia REAL de Supabase:
 * 1. Rechazo de escrituras directas con clave anónima (RLS / Revoke).
 * 2. Inserción autorizada mediante clave de servicio (service_role).
 * 3. Atomicidad del índice único parcial bajo concurrencia (código 23505).
 * 4. Permitir eventos en fechas distintas para el mismo dispositivo.
 * 5. Limpieza automática de registros de prueba.
 * 
 * Ejecución: npx tsx scripts/verify-analytics-security.ts
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runLiveVerification() {
  console.log("==================================================================");
  console.log("  LUMINA LIVE ANALYTICS SECURITY & ATOMIC DEDUPE VERIFICATION");
  console.log("==================================================================\n");

  if (!supabaseUrl || !anonKey) {
    console.error("❌ ERROR: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error("❌ ERROR: Falta variable SUPABASE_SERVICE_ROLE_KEY.");
    console.error("   Configura SUPABASE_SERVICE_ROLE_KEY en tu entorno o .env.local antes de ejecutar.");
    process.exit(1);
  }

  const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const testDeviceUuid = `lumina_security_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const testEditionDate1 = "2026-08-13";
  const testEditionDate2 = "2026-08-14";

  console.log(`Dispositivo de prueba: ${testDeviceUuid}\n`);

  try {
    // -------------------------------------------------------------------------
    // TEST A: Intento de INSERT directo con anon key
    // -------------------------------------------------------------------------
    console.log("--- TEST A: Intento de INSERT directo usando clave anónima (Browser Anon) ---");
    const { data: anonData, error: anonError } = await anonClient.from("lumina_events").insert({
      event_name: "story_viewed",
      device_uuid: testDeviceUuid,
      session_id: "test_sess_anon",
      edition_date: testEditionDate1,
    });

    if (anonError) {
      console.log(`✓ RECHAZADO CORRECTAMENTE por RLS/Permisos: [${anonError.code}] ${anonError.message}`);
    } else {
      console.error("❌ FALLO DE SEGURIDAD: El cliente anónimo pudo insertar directamente en lumina_events.");
      console.error("   Datos insertados:", anonData);
      process.exit(1);
    }

    // -------------------------------------------------------------------------
    // TEST B: Inserción autorizada vía Service Role Client
    // -------------------------------------------------------------------------
    console.log("\n--- TEST B: Inserción autorizada mediante Service Role Client ---");
    const { error: serviceError } = await serviceClient.from("lumina_events").insert({
      event_name: "story_viewed",
      device_uuid: testDeviceUuid,
      session_id: "test_sess_service",
      edition_date: testEditionDate1,
    });

    if (serviceError) {
      console.error("❌ ERROR: El cliente service_role no pudo insertar evento:", serviceError.message);
      process.exit(1);
    }
    console.log("✓ Inserción autorizada completada con éxito.");

    // -------------------------------------------------------------------------
    // TEST C: Dos inserciones concurrentes de edition_completed (Mismo día y device)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST C: Concurrencia de edition_completed (Mismo device + Misma fecha) ---");
    const payload = {
      event_name: "edition_completed",
      device_uuid: testDeviceUuid,
      session_id: "test_sess_concurrent",
      edition_date: testEditionDate1,
    };

    const [res1, res2] = await Promise.all([
      serviceClient.from("lumina_events").insert(payload),
      serviceClient.from("lumina_events").insert(payload),
    ]);

    const results = [res1, res2];
    const successes = results.filter((r) => !r.error);
    const uniqueViolations = results.filter((r) => r.error && r.error.code === "23505");

    console.log(`Resultados concurrentes: ${successes.length} insert exitoso, ${uniqueViolations.length} unique_violation (23505).`);

    if (successes.length === 1 && uniqueViolations.length === 1) {
      console.log("✓ ATOMICIDAD CONFIRMADA EN POSTGRESQL: Exactamente 1 insert permitido, el duplicado disparó error 23505.");
    } else {
      console.error("❌ FALLO EN RESTRICCIÓN ÚNICA: Se esperaban 1 éxito y 1 error 23505.");
      console.error("Resultados:", results);
      process.exit(1);
    }

    // Comprobar filas reales en la tabla
    const { data: rowsDay1, error: countError1 } = await serviceClient
      .from("lumina_events")
      .select("id")
      .eq("device_uuid", testDeviceUuid)
      .eq("event_name", "edition_completed")
      .eq("edition_date", testEditionDate1);

    if (countError1 || !rowsDay1 || rowsDay1.length !== 1) {
      console.error("❌ ERROR: La base de datos no contiene exactamente 1 fila para la fecha 1.");
      process.exit(1);
    }
    console.log(`✓ Verificación DB: Exactamente ${rowsDay1.length} fila de edition_completed para ${testEditionDate1}.`);

    // -------------------------------------------------------------------------
    // TEST D: Inserción para fecha diferente (Día 2)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST D: Inserción de edition_completed para fecha diferente (Día 2) ---");
    const { error: day2Error } = await serviceClient.from("lumina_events").insert({
      event_name: "edition_completed",
      device_uuid: testDeviceUuid,
      session_id: "test_sess_day2",
      edition_date: testEditionDate2,
    });

    if (day2Error) {
      console.error("❌ ERROR: No se pudo insertar evento para fecha distinta:", day2Error.message);
      process.exit(1);
    }
    console.log(`✓ Inserción permitida para ${testEditionDate2}.`);

    const { data: totalCompletions } = await serviceClient
      .from("lumina_events")
      .select("id, edition_date")
      .eq("device_uuid", testDeviceUuid)
      .eq("event_name", "edition_completed");

    console.log(`✓ Verificación DB: Total de ${totalCompletions?.length} completions para fechas distintas.`);

  } finally {
    // -------------------------------------------------------------------------
    // TEST E: Limpieza de registros de prueba
    // -------------------------------------------------------------------------
    console.log("\n--- TEST E: Limpieza de registros de prueba ---");
    const { error: cleanupError } = await serviceClient
      .from("lumina_events")
      .delete()
      .eq("device_uuid", testDeviceUuid);

    if (cleanupError) {
      console.warn("⚠️ Advertencia al limpiar registros de prueba:", cleanupError.message);
    } else {
      console.log(`✓ Registros de prueba con device_uuid '${testDeviceUuid}' eliminados con éxito.`);
    }
  }

  console.log("\n==================================================================");
  console.log("  VERIFICACIÓN LIVE COMPLETADA CON ÉXITO AL 100%");
  console.log("==================================================================\n");
}

runLiveVerification().catch((err) => {
  console.error("Error fatal en verificación live:", err);
  process.exit(1);
});
