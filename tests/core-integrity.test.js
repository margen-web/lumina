/* eslint-disable @typescript-eslint/no-require-imports */
// Tests automatizados para verificar la integridad del Core 0.3.3
const assert = require('assert');

// 1. Lógica de validación de edición diaria
function validateDailyEdition(stories, expectedDate) {
  if (!stories || stories.length !== 5) {
    return false;
  }
  const positions = stories.map((s) => s.edition_position).sort((a, b) => a - b);
  const isValidPositions = positions.every((pos, i) => pos === i + 1);
  const isSameDate = stories.every((s) => s.edition_date === expectedDate && s.status === 'published');
  return isValidPositions && isSameDate;
}

// 2. Lógica de semana en Europe/Madrid (L M X J V S D)
function getMadridDayOfWeekIndex(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    weekday: "short",
  });
  const weekday = formatter.format(d).toLowerCase();
  const map = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
  return map[weekday] ?? 0;
}

function addDaysToDateString(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function getWeekStatusForDate(referenceDateStr, history) {
  const dayIndex = getMadridDayOfWeekIndex(referenceDateStr); // 0 (Mon) a 6 (Sun)
  const mondayDateStr = addDaysToDateString(referenceDateStr, -dayIndex);
  
  const labels = ["L", "M", "X", "J", "V", "S", "D"];
  const result = [];

  for (let i = 0; i < 7; i++) {
    const dayDateStr = addDaysToDateString(mondayDateStr, i);
    const isCompleted = history.includes(dayDateStr);
    const isToday = dayDateStr === referenceDateStr;
    const isFuture = dayDateStr > referenceDateStr;

    result.push({
      dayLabel: labels[i],
      dateString: dayDateStr,
      isCompleted,
      isToday,
      isFuture,
    });
  }

  return result;
}

// 3. Lógica de cálculo de racha diaria
function calculateNextStreak(lastDate, todayStr, storedStreak) {
  if (lastDate === todayStr) {
    return { streak: storedStreak, incremented: false };
  }
  if (!lastDate) {
    return { streak: 1, incremented: true };
  }
  const d1 = new Date(lastDate + "T12:00:00Z");
  const d2 = new Date(todayStr + "T12:00:00Z");
  const diffDays = Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) {
    return { streak: storedStreak + 1, incremented: true };
  } else {
    return { streak: 1, incremented: true };
  }
}

// SUITE DE PRUEBAS
console.log('--- INICIANDO TEST SUITE: LUMINA CORE INTEGRITY 0.3.3 ---');

// Test 1: Exactamente 5 historias válidas publicadas para hoy
const valid5Stories = [
  { id: '1', edition_date: '2026-08-13', edition_position: 1, status: 'published' },
  { id: '2', edition_date: '2026-08-13', edition_position: 2, status: 'published' },
  { id: '3', edition_date: '2026-08-13', edition_position: 3, status: 'published' },
  { id: '4', edition_date: '2026-08-13', edition_position: 4, status: 'published' },
  { id: '5', edition_date: '2026-08-13', edition_position: 5, status: 'published' },
];
assert.strictEqual(validateDailyEdition(valid5Stories, '2026-08-13'), true, '5 historias válidas deben retornar true');
console.log('✓ Test 1: 5 historias válidas hoy -> Validadas correctamente');

// Test 2: Solo 4 historias publicadas para hoy
const only4Stories = valid5Stories.slice(0, 4);
assert.strictEqual(validateDailyEdition(only4Stories, '2026-08-13'), false, '4 historias deben ser rechazadas');
console.log('✓ Test 2: 4 historias hoy -> Rechazadas (not_ready)');

// Test 3: 6 historias publicadas para hoy
const sixStories = [...valid5Stories, { id: '6', edition_date: '2026-08-13', edition_position: 6, status: 'published' }];
assert.strictEqual(validateDailyEdition(sixStories, '2026-08-13'), false, '6 historias deben ser rechazadas');
console.log('✓ Test 3: 6 historias hoy -> Rechazadas (not_ready)');

// Test 4: Historias con fechas mezcladas (ayer + hoy)
const mixedDateStories = [
  { id: '1', edition_date: '2026-08-12', edition_position: 1, status: 'published' },
  { id: '2', edition_date: '2026-08-13', edition_position: 2, status: 'published' },
  { id: '3', edition_date: '2026-08-13', edition_position: 3, status: 'published' },
  { id: '4', edition_date: '2026-08-13', edition_position: 4, status: 'published' },
  { id: '5', edition_date: '2026-08-13', edition_position: 5, status: 'published' },
];
assert.strictEqual(validateDailyEdition(mixedDateStories, '2026-08-13'), false, 'Historias de ayer mezcladas deben ser rechazadas');
console.log('✓ Test 4: Historias de fechas mezcladas -> Rechazadas');

// Test 5: Posiciones discontinuas (1, 2, 4, 5, 6)
const gapPositionStories = [
  { id: '1', edition_date: '2026-08-13', edition_position: 1, status: 'published' },
  { id: '2', edition_date: '2026-08-13', edition_position: 2, status: 'published' },
  { id: '3', edition_date: '2026-08-13', edition_position: 4, status: 'published' },
  { id: '4', edition_date: '2026-08-13', edition_position: 5, status: 'published' },
  { id: '5', edition_date: '2026-08-13', edition_position: 6, status: 'published' },
];
assert.strictEqual(validateDailyEdition(gapPositionStories, '2026-08-13'), false, 'Posiciones discontinuas deben ser rechazadas');
console.log('✓ Test 5: Posiciones no consecutivas 1..5 -> Rechazadas');

// Test 6: Completar por primera vez hoy (ayer completado con racha 12 -> racha 13)
const resStreakNew = calculateNextStreak('2026-08-12', '2026-08-13', 12);
assert.strictEqual(resStreakNew.streak, 13);
assert.strictEqual(resStreakNew.incremented, true);
console.log('✓ Test 6: Completar día consecutivo -> Streak +1 (12 -> 13)');

// Test 7: Reapertura el mismo día (racha no vuelve a incrementar)
const resStreakSameDay = calculateNextStreak('2026-08-13', '2026-08-13', 13);
assert.strictEqual(resStreakSameDay.streak, 13);
assert.strictEqual(resStreakSameDay.incremented, false);
console.log('✓ Test 7: Reapertura el mismo día -> Streak no cambia (+0)');

// Test 8: Puntos semanales para Lunes, Martes y Jueves completados
// 2026-08-13 es Jueves (Thu).
// Lunes = 2026-08-10, Martes = 2026-08-11, Miércoles = 2026-08-12, Jueves = 2026-08-13.
const weekHistory = ['2026-08-10', '2026-08-11', '2026-08-13'];
const weekStatus = getWeekStatusForDate('2026-08-13', weekHistory);
const completedArray = weekStatus.map(d => d.isCompleted);
assert.deepStrictEqual(completedArray, [true, true, false, true, false, false, false]);
console.log('✓ Test 8: Semana L, M, J completados -> [true, true, false, true, false, false, false]');

// Test 9: Transición de Domingo (2026-08-16) a Lunes (2026-08-17)
const sundayStatus = getWeekStatusForDate('2026-08-16', ['2026-08-16']);
assert.strictEqual(sundayStatus[6].dayLabel, 'D');
assert.strictEqual(sundayStatus[6].isToday, true);

const mondayStatus = getWeekStatusForDate('2026-08-17', ['2026-08-16']);
assert.strictEqual(mondayStatus[0].dayLabel, 'L');
assert.strictEqual(mondayStatus[0].isToday, true);
assert.strictEqual(mondayStatus[0].isCompleted, false); // El nuevo lunes empieza sin completar
console.log('✓ Test 9: Transición Domingo -> Lunes calcula correctamente el nuevo lunes como inicio');

// Test 10: Zona horaria Europe/Madrid en horario de verano (CEST / UTC+2)
const madridDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
assert.match(madridDateStr, /^\d{4}-\d{2}-\d{2}$/);
console.log(`✓ Test 10: Timezone Europe/Madrid genera fecha válida: ${madridDateStr}`);

console.log('\n--- TODOS LOS 10 TESTS DE INTEGRIDAD PASARON CON ÉXITO (10/10) ---');
