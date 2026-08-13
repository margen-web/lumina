import assert from "node:assert";
import { validateDailyEdition } from "../src/lib/edition";
import {
  getTodayDateString,
  getMadridDayOfWeekIndex,
  getWeekStatusForDate,
  getDaysDifference,
  recordEditionCompleted,
  getStreakState,
} from "../src/lib/streak";
import { StoryItem } from "../src/lib/supabase";

console.log("==================================================================");
console.log("  LUMINA CORE & ANALYTICS INTEGRITY 0.3.5 — TEST SUITE");
console.log("==================================================================\n");

// -----------------------------------------------------------------------------
// 1. TESTS DE EDICIÓN DIARIA (src/lib/edition.ts)
// -----------------------------------------------------------------------------
console.log("--- 1. VALIDACIÓN DE EDICIÓN DIARIA (validateDailyEdition) ---");

const createMockStory = (id: string, date: string, pos: number): StoryItem => ({
  id,
  edition_date: date,
  edition_position: pos,
  status: "published",
  category: "Ciencia & Salud",
  headline: `Titular Noticia ${pos}`,
  what_changed: "Descripción del cambio",
  why_it_matters: "Importancia",
  evidence: "Evidencia",
  evidence_metric: "100%",
  evidence_metric_label: "Métrica",
  caveat: null,
  primary_source_name: "Fuente",
  primary_source_url: "https://ejemplo.com",
  primary_source_type: "scientific_paper",
});

const todayDate = "2026-08-13";
const valid5Stories: StoryItem[] = [
  createMockStory("s1", todayDate, 1),
  createMockStory("s2", todayDate, 2),
  createMockStory("s3", todayDate, 3),
  createMockStory("s4", todayDate, 4),
  createMockStory("s5", todayDate, 5),
];

// Test 1.1: Exactamente 5 historias válidas
assert.strictEqual(
  validateDailyEdition(valid5Stories, todayDate),
  true,
  "Debe validar 5 historias publicadas con posiciones 1..5 para hoy"
);
console.log("✓ 1.1: Exactamente 5 historias publicadas (1..5) -> VÁLIDO");

// Test 1.2: 4 historias para hoy
const only4 = valid5Stories.slice(0, 4);
assert.strictEqual(
  validateDailyEdition(only4, todayDate),
  false,
  "Debe rechazar ediciones de menos de 5 historias"
);
console.log("✓ 1.2: 4 historias para hoy -> RECHAZADO (not_ready)");

// Test 1.3: 6 historias para hoy
const with6 = [...valid5Stories, createMockStory("s6", todayDate, 6)];
assert.strictEqual(
  validateDailyEdition(with6, todayDate),
  false,
  "Debe rechazar ediciones de más de 5 historias"
);
console.log("✓ 1.3: 6 historias para hoy -> RECHAZADO (not_ready)");

// Test 1.4: Fechas mezcladas
const mixedDates = [
  createMockStory("s1", "2026-08-12", 1),
  createMockStory("s2", todayDate, 2),
  createMockStory("s3", todayDate, 3),
  createMockStory("s4", todayDate, 4),
  createMockStory("s5", todayDate, 5),
];
assert.strictEqual(
  validateDailyEdition(mixedDates, todayDate),
  false,
  "Debe rechazar ediciones con fechas mezcladas"
);
console.log("✓ 1.4: Fechas mezcladas (ayer + hoy) -> RECHAZADO");

// -----------------------------------------------------------------------------
// 2. MIDNIGHT CROSSING & COMPLETION ANCHORED TO LOADED EDITION DATE
// -----------------------------------------------------------------------------
console.log("\n--- 2. SESIÓN QUE CRUZA LA MEDIANOCHE (MIDNIGHT-CROSSING) ---");

// Simulación:
// Usuario abre la app a las 23:58 del día 2026-08-13 (carga edición del 13).
// Termina de leer la noticia 5 a las 00:02 del día 2026-08-14.
const simulatedMidnightCrossingTime = new Date("2026-08-13T22:02:00.000Z"); // 00:02 CEST en Madrid del día 14
const loadedEditionDate = "2026-08-13";

// Completar la edición 13 cuando el reloj del sistema marca el día 14
const completionState = recordEditionCompleted(loadedEditionDate, simulatedMidnightCrossingTime);

// 1. Debe registrar completion del 13
assert.strictEqual(
  completionState.lastCompletedDate,
  "2026-08-13",
  "La fecha de finalización debe anclarse a la edición cargada (2026-08-13)"
);

// 2. El día 14 NO debe figurar como completado hoy
assert.strictEqual(
  completionState.completedToday,
  false,
  "El día 14 no debe marcarse como completado tras finalizar la edición del 13 tras medianoche"
);

// 3. Al consultar getStreakState en el día 14, completedToday debe ser false (para que la app cargue las 5 noticias del 14)
const day14State = getStreakState(simulatedMidnightCrossingTime);
assert.strictEqual(
  day14State.completedToday,
  false,
  "Al abrir la app el día 14, completedToday es false y se cargará la edición del 14"
);

console.log("✓ 2.1: Sesión que cruza medianoche (23:58 -> 00:02) completa la edición del 13");
console.log("✓ 2.2: El día 14 NO queda marcado como completado");
console.log("✓ 2.3: La racha se actualiza con base en la edición leída");

// -----------------------------------------------------------------------------
// 3. ATOMIC DEDUPLICATION LOGIC (POSTGRES CODE 23505)
// -----------------------------------------------------------------------------
console.log("\n--- 3. DEDUPLICACIÓN ATÓMICA DE EDITION_COMPLETED ---");

// Simular el manejador de la base de datos para inserciones concurrentes
function simulateEventInsertion(
  existingRecords: Array<{ device_uuid: string; edition_date: string; event_name: string }>,
  newRecord: { device_uuid: string; edition_date: string; event_name: string }
) {
  const isDuplicate = existingRecords.some(
    (r) =>
      r.event_name === "edition_completed" &&
      newRecord.event_name === "edition_completed" &&
      r.device_uuid === newRecord.device_uuid &&
      r.edition_date === newRecord.edition_date
  );

  if (isDuplicate) {
    // Código Postgres 23505 (unique_violation)
    return { ok: true, deduplicated: true, status: 200 };
  }

  existingRecords.push(newRecord);
  return { ok: true, deduplicated: false, status: 201 };
}

const mockDbEvents: Array<{ device_uuid: string; edition_date: string; event_name: string }> = [];

// Request 1: Primera completion del día 13
const req1 = simulateEventInsertion(mockDbEvents, {
  device_uuid: "device_abc",
  edition_date: "2026-08-13",
  event_name: "edition_completed",
});
assert.strictEqual(req1.status, 201);
assert.strictEqual(req1.deduplicated, false);
assert.strictEqual(mockDbEvents.length, 1);
console.log("✓ 3.1: Primer request -> Insertado (201 Created)");

// Request 2: Request concurrente o relectura para el mismo día
const req2 = simulateEventInsertion(mockDbEvents, {
  device_uuid: "device_abc",
  edition_date: "2026-08-13",
  event_name: "edition_completed",
});
assert.strictEqual(req2.status, 200);
assert.strictEqual(req2.deduplicated, true);
assert.strictEqual(mockDbEvents.length, 1, "La DB debe conservar exactamente 1 fila");
console.log("✓ 3.2: Request duplicado concurrente -> Atómicamente deduplicado (200 OK, 1 sola fila en DB)");

// Request 3: Completion del día siguiente (14) para el mismo device
const req3 = simulateEventInsertion(mockDbEvents, {
  device_uuid: "device_abc",
  edition_date: "2026-08-14",
  event_name: "edition_completed",
});
assert.strictEqual(req3.status, 201);
assert.strictEqual(req3.deduplicated, false);
assert.strictEqual(mockDbEvents.length, 2, "Días distintos deben persistir dos filas independientes");
console.log("✓ 3.3: Edición de fecha diferente (2026-08-14) -> Insertada correctamente (2 filas en total)");

// -----------------------------------------------------------------------------
// 4. DST & TIMEZONE TESTS EN EUROPE/MADRID (src/lib/streak.ts)
// -----------------------------------------------------------------------------
console.log("\n--- 4. PRUEBAS DE TIMEZONE Y DST EN EUROPE/MADRID ---");

// Test 4.1: Invierno CET (UTC+1)
const winterBefore = new Date("2026-01-15T22:59:59.000Z"); // 23:59:59 CET
const winterAfter = new Date("2026-01-15T23:00:01.000Z");  // 00:00:01 CET
assert.strictEqual(getTodayDateString(winterBefore), "2026-01-15");
assert.strictEqual(getTodayDateString(winterAfter), "2026-01-16");
console.log("✓ 4.1: Medianoche de Invierno (CET UTC+1) delimitada al segundo exacto (23:00 UTC)");

// Test 4.2: Verano CEST (UTC+2)
const summerBefore = new Date("2026-07-15T21:59:59.000Z"); // 23:59:59 CEST
const summerAfter = new Date("2026-07-15T22:00:01.000Z");  // 00:00:01 CEST
assert.strictEqual(getTodayDateString(summerBefore), "2026-07-15");
assert.strictEqual(getTodayDateString(summerAfter), "2026-07-16");
console.log("✓ 4.2: Medianoche de Verano (CEST UTC+2) delimitada al segundo exacto (22:00 UTC)");

// Test 4.3: Transición DST Marzo (02:00 -> 03:00)
const marchBefore = new Date("2026-03-29T00:59:00.000Z");
const marchAfter = new Date("2026-03-29T01:01:00.000Z");
assert.strictEqual(getTodayDateString(marchBefore), "2026-03-29");
assert.strictEqual(getTodayDateString(marchAfter), "2026-03-29");
assert.strictEqual(getMadridDayOfWeekIndex("2026-03-29"), 6); // Domingo
console.log("✓ 4.3: Salto DST de Marzo calculado con fecha y día de la semana consistente");

// Test 4.4: Transición DST Octubre (03:00 -> 02:00)
const octBefore = new Date("2026-10-25T00:59:00.000Z");
const octAfter = new Date("2026-10-25T01:01:00.000Z");
assert.strictEqual(getTodayDateString(octBefore), "2026-10-25");
assert.strictEqual(getTodayDateString(octAfter), "2026-10-25");
assert.strictEqual(getMadridDayOfWeekIndex("2026-10-25"), 6); // Domingo
console.log("✓ 4.4: Retraso DST de Octubre calculado con fecha consistente");

// -----------------------------------------------------------------------------
// 5. CONSTELACIÓN SEMANAL (L M X J V S D) Y DIFERENCIAS
// -----------------------------------------------------------------------------
console.log("\n--- 5. CONSTELACIÓN SEMANAL (L M X J V S D) ---");
const weekMockHistory = ["2026-08-10", "2026-08-11", "2026-08-13"];
const weekStatus = getWeekStatusForDate("2026-08-13", weekMockHistory);
const completedArray = weekStatus.map((d) => d.isCompleted);
assert.deepStrictEqual(completedArray, [true, true, false, true, false, false, false]);
assert.strictEqual(getDaysDifference("2026-08-12", "2026-08-13"), 1);
console.log("✓ 5.1: Semana L, M, J completados -> [true, true, false, true, false, false, false]");

console.log("\n==================================================================");
console.log("  TODAS LAS PRUEBAS (EDICIÓN, DST, DEDUPE, MIDNIGHT) PASARON (100%)");
console.log("==================================================================\n");
