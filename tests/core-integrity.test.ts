import assert from "node:assert";
import { validateDailyEdition } from "../src/lib/edition";
import {
  getTodayDateString,
  getMadridDayOfWeekIndex,
  getWeekStatusForDate,
  getDaysDifference,
} from "../src/lib/streak";
import { StoryItem } from "../src/lib/supabase";

console.log("==================================================================");
console.log("  LUMINA CORE INTEGRITY 0.3.4 — PRODUCTION CODE TEST SUITE");
console.log("==================================================================\n");

// -----------------------------------------------------------------------------
// 1. TESTS REALES DE EDICIÓN DIARIA (src/lib/edition.ts)
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

// Test 1.4: Historias de fechas mezcladas (ayer + hoy)
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

// Test 1.5: Posiciones discontinuas (1, 2, 4, 5, 6)
const gapPositions = [
  createMockStory("s1", todayDate, 1),
  createMockStory("s2", todayDate, 2),
  createMockStory("s3", todayDate, 4),
  createMockStory("s4", todayDate, 5),
  createMockStory("s5", todayDate, 6),
];
assert.strictEqual(
  validateDailyEdition(gapPositions, todayDate),
  false,
  "Debe rechazar posiciones no consecutivas"
);
console.log("✓ 1.5: Posiciones discontinuas (1, 2, 4, 5, 6) -> RECHAZADO");

// Test 1.6: Historias no publicadas (status = 'draft')
const withDraft = [
  createMockStory("s1", todayDate, 1),
  { ...createMockStory("s2", todayDate, 2), status: "draft" as const },
  createMockStory("s3", todayDate, 3),
  createMockStory("s4", todayDate, 4),
  createMockStory("s5", todayDate, 5),
];
assert.strictEqual(
  validateDailyEdition(withDraft, todayDate),
  false,
  "Debe rechazar historias en borrador"
);
console.log("✓ 1.6: Historia en estado draft -> RECHAZADO");

// -----------------------------------------------------------------------------
// 2. TESTS DE HORARIO Y DST EN EUROPE/MADRID (src/lib/streak.ts)
// -----------------------------------------------------------------------------
console.log("\n--- 2. PRUEBAS EXPLÍCITAS DE TIMEZONE Y DST EN EUROPE/MADRID ---");

// Test 2.1: Medianoche de Invierno en Europe/Madrid (CET / UTC+1)
// 2026-01-15T22:59:59Z corresponde a 23:59:59 del 15 de enero en Madrid
const winterBeforeMidnight = new Date("2026-01-15T22:59:59.000Z");
assert.strictEqual(
  getTodayDateString(winterBeforeMidnight),
  "2026-01-15",
  "22:59:59 UTC en invierno debe ser 15 de enero en Madrid"
);

// 2026-01-15T23:00:01Z corresponde a 00:00:01 del 16 de enero en Madrid
const winterAfterMidnight = new Date("2026-01-15T23:00:01.000Z");
assert.strictEqual(
  getTodayDateString(winterAfterMidnight),
  "2026-01-16",
  "23:00:01 UTC en invierno debe ser 16 de enero en Madrid"
);
console.log("✓ 2.1: Medianoche de Invierno (CET UTC+1) delimitada al segundo exacto (23:00 UTC)");

// Test 2.2: Medianoche de Verano en Europe/Madrid (CEST / UTC+2)
// 2026-07-15T21:59:59Z corresponde a 23:59:59 del 15 de julio en Madrid
const summerBeforeMidnight = new Date("2026-07-15T21:59:59.000Z");
assert.strictEqual(
  getTodayDateString(summerBeforeMidnight),
  "2026-07-15",
  "21:59:59 UTC en verano debe ser 15 de julio en Madrid"
);

// 2026-07-15T22:00:01Z corresponde a 00:00:01 del 16 de julio en Madrid
const summerAfterMidnight = new Date("2026-07-15T22:00:01.000Z");
assert.strictEqual(
  getTodayDateString(summerAfterMidnight),
  "2026-07-16",
  "22:00:01 UTC en verano debe ser 16 de julio en Madrid"
);
console.log("✓ 2.2: Medianoche de Verano (CEST UTC+2) delimitada al segundo exacto (22:00 UTC)");

// Test 2.3: Transición de Cambio de Hora de Primavera / Marzo (Adelanto 02:00 -> 03:00)
// Domingo 29 de marzo de 2026: a las 01:00 UTC los relojes en Madrid pasan de 02:00 a 03:00
const marchBeforeDST = new Date("2026-03-29T00:59:00.000Z"); // 01:59 CET
const marchAfterDST = new Date("2026-03-29T01:01:00.000Z");  // 03:01 CEST
assert.strictEqual(getTodayDateString(marchBeforeDST), "2026-03-29");
assert.strictEqual(getTodayDateString(marchAfterDST), "2026-03-29");
assert.strictEqual(getMadridDayOfWeekIndex("2026-03-29"), 6); // Domingo
console.log("✓ 2.3: Transición DST de Marzo (salto 02:00->03:00) calculada sin desfase de fecha");

// Test 2.4: Transición de Cambio de Hora de Otoño / Octubre (Retraso 03:00 -> 02:00)
// Domingo 25 de octubre de 2026: a las 01:00 UTC los relojes pasan de 03:00 a 02:00
const octBeforeDST = new Date("2026-10-25T00:59:00.000Z"); // 02:59 CEST
const octAfterDST = new Date("2026-10-25T01:01:00.000Z");  // 02:01 CET
assert.strictEqual(getTodayDateString(octBeforeDST), "2026-10-25");
assert.strictEqual(getTodayDateString(octAfterDST), "2026-10-25");
assert.strictEqual(getMadridDayOfWeekIndex("2026-10-25"), 6); // Domingo
console.log("✓ 2.4: Transición DST de Octubre (retraso 03:00->02:00) calculada sin desfase de fecha");

// Test 2.5: Transición de Domingo a Lunes (Cambio de semana ISO)
const sundayDateStr = "2026-08-16"; // Domingo
const mondayDateStr = "2026-08-17"; // Lunes
assert.strictEqual(getMadridDayOfWeekIndex(sundayDateStr), 6, "Domingo debe ser index 6");
assert.strictEqual(getMadridDayOfWeekIndex(mondayDateStr), 0, "Lunes debe ser index 0");

const sundayWeek = getWeekStatusForDate(sundayDateStr, [sundayDateStr]);
assert.strictEqual(sundayWeek[0].dateString, "2026-08-10"); // Lunes de la semana previa
assert.strictEqual(sundayWeek[6].dateString, "2026-08-16"); // Domingo
assert.strictEqual(sundayWeek[6].isToday, true);

const mondayWeek = getWeekStatusForDate(mondayDateStr, [sundayDateStr]);
assert.strictEqual(mondayWeek[0].dateString, "2026-08-17"); // Nuevo Lunes
assert.strictEqual(mondayWeek[0].isToday, true);
assert.strictEqual(mondayWeek[0].isCompleted, false);
console.log("✓ 2.5: Transición Domingo -> Lunes reinicia la constelación semanal en el nuevo Lunes");

// -----------------------------------------------------------------------------
// 3. TESTS DE CONSTELACIÓN SEMANAL L M X J V S D
// -----------------------------------------------------------------------------
console.log("\n--- 3. CONSTELACIÓN SEMANAL (L M X J V S D) ---");

// Test 3.1: Jueves 13 de agosto de 2026 con Lunes (10), Martes (11) y Jueves (13) completados
const mockHistory = ["2026-08-10", "2026-08-11", "2026-08-13"];
const weekCalculated = getWeekStatusForDate("2026-08-13", mockHistory);

const labels = weekCalculated.map((d) => d.dayLabel);
assert.deepStrictEqual(labels, ["L", "M", "X", "J", "V", "S", "D"]);

const completionBools = weekCalculated.map((d) => d.isCompleted);
assert.deepStrictEqual(
  completionBools,
  [true, true, false, true, false, false, false],
  "Debe iluminar únicamente L, M y J"
);
console.log("✓ 3.1: Lunes, Martes y Jueves completados -> [true, true, false, true, false, false, false]");

// -----------------------------------------------------------------------------
// 4. TESTS DE DIFERENCIA DE DÍAS Y CONTINUIDAD DE RACHA
// -----------------------------------------------------------------------------
console.log("\n--- 4. DIFERENCIAS DE DÍAS Y CONTINUIDAD ---");
assert.strictEqual(getDaysDifference("2026-08-12", "2026-08-13"), 1, "Días consecutivos");
assert.strictEqual(getDaysDifference("2026-08-10", "2026-08-13"), 3, "Salto de 3 días");
assert.strictEqual(getDaysDifference("2026-08-13", "2026-08-13"), 0, "Mismo día");
console.log("✓ 4.1: Diferencia en días de calendario calculada con precisión");

console.log("\n==================================================================");
console.log("  TODAS LAS PRUEBAS SOBRE CÓDIGO REAL PASARON EXITOSAMENTE (100%)");
console.log("==================================================================\n");
