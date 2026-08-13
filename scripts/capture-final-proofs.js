/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\Macro\\.gemini\\antigravity\\brain\\ae2fe8a1-24e6-4d61-ab23-94b3c35bf012';

const FIXTURE_STORIES = [
  {
    id: "story-1",
    edition_date: "2026-08-14",
    edition_position: 1,
    category: "Energía & Clima",
    headline: "Portugal abastece el 71% de su demanda eléctrica anual con fuentes renovables y marca su récord histórico",
    what_changed: "La red eléctrica nacional portuguesa completó doce meses consecutivos con un 71% de generación renovable estructural, consolidando la transición.",
    why_it_matters: "Demuestra la viabilidad técnica y estabilidad de redes de alta penetración renovable a escala de país sin depender de carbón.",
    evidence: "Datos oficiales consolidados por el operador del sistema eléctrico (REN) y validados por Eurostat.",
    evidence_metric: "71%",
    evidence_metric_label: "Generación limpia",
    caveat: "Se mantiene dependencia puntual de gas en picos de demanda invernal.",
    primary_source_name: "Redes Energéticas Nacionais (REN)",
    primary_source_url: "https://www.ren.pt",
    primary_source_type: "institutional_report",
    status: "published",
  },
  {
    id: "story-2",
    edition_date: "2026-08-14",
    edition_position: 2,
    category: "Ciencia & Salud",
    headline: "La inmunoterapia dirigida reduce en un 67% el riesgo de recaída o muerte en leucemia linfoblástica de alto riesgo",
    what_changed: "Ensayo clínico en fase III demuestra eficacia superior del anticuerpo biespecífico frente a quimioterapia convencional en primera línea.",
    why_it_matters: "Abre una alternativa con menor toxicidad sistémica y mayor supervivencia libre de eventos en pacientes pediátricos y adultos jóvenes.",
    evidence: "Estudio aleatorizado multicéntrico publicado en el New England Journal of Medicine.",
    evidence_metric: "-67%",
    evidence_metric_label: "Riesgo de recaída",
    caveat: "Requiere monitorización hospitalaria inicial por riesgo de síndrome de liberación de citoquinas.",
    primary_source_name: "New England Journal of Medicine",
    primary_source_url: "https://www.nejm.org",
    primary_source_type: "scientific_paper",
    status: "published",
  },
  {
    id: "story-3",
    edition_date: "2026-08-14",
    edition_position: 3,
    category: "Biodiversidad",
    headline: "La mayor reserva marina del Atlántico Sur consolida 690.000 km² de protección estricta para la recuperación de biomasa",
    what_changed: "Finaliza la delimitación satelital y el régimen de patrulla de alta mar en aguas de ultramar, cerrando el área a la pesca industrial.",
    why_it_matters: "Crea un corredor biológico clave para especies pelágicas amenazadas y permite la regeneración de pesquerías adyacentes.",
    evidence: "Evaluación de biomasa marina realizada por el Centro de Ciencias del Medio Ambiente (Cefas).",
    evidence_metric: "690.000 km²",
    evidence_metric_label: "Área protegida",
    caveat: "La eficacia a largo plazo dependerá de la financiación continuada del patrullaje por satélite.",
    primary_source_name: "Cefas Marine Science",
    primary_source_url: "https://www.cefas.co.uk",
    primary_source_type: "scientific_paper",
    status: "published",
  },
  {
    id: "story-4",
    edition_date: "2026-08-14",
    edition_position: 4,
    category: "Tecnología",
    headline: "Investigadores del MIT desarrollan un sistema de desalinización solar pasiva que no se satura con sal",
    what_changed: "Un diseño termohalino por convección permite producir agua potable continua con luz solar sin atascos de salmuera ni piezas móviles.",
    why_it_matters: "Reduce drásticamente el coste del agua desalinizada para comunidades costeras sin acceso a red eléctrica.",
    evidence: "Prototipo validado durante 1.200 horas de operación continua en Joule (Cell Press).",
    evidence_metric: "$0,20 / m³",
    evidence_metric_label: "Coste estimado",
    caveat: "La producción por metro cuadrado de colector requiere escalado industrial para grandes urbes.",
    primary_source_name: "Joule (Cell Press)",
    primary_source_url: "https://www.cell.com/joule",
    primary_source_type: "scientific_paper",
    status: "published",
  },
  {
    id: "story-5",
    edition_date: "2026-08-14",
    edition_position: 5,
    category: "Educación",
    headline: "Los programas de tutoría individualizada logran recuperar hasta 1,5 años de retraso lector en escuelas vulnerables",
    what_changed: "Evaluación de impacto a gran escala demuestra que sesiones de 30 minutos tres veces por semana cierran brechas de aprendizaje.",
    why_it_matters: "Ofrece una intervención educativa con evidencia causal sólida frente al abandono escolar temprano.",
    evidence: "Metaanálisis de la Education Endowment Foundation sobre 45.000 alumnos en 300 centros.",
    evidence_metric: "+1,5 años",
    evidence_metric_label: "Progreso lector",
    caveat: "Requiere tutores capacitados y supervisión pedagógica para no perder efectividad.",
    primary_source_name: "Education Endowment Foundation",
    primary_source_url: "https://educationendowmentfoundation.org.uk",
    primary_source_type: "institutional_report",
    status: "published",
  },
];

async function capture() {
  console.log("Launching Edge for Final Visual Freeze Proofs (390x844)...");
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const takeProof = async (filename, isDark, storageConfig, scrollAction) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: isDark ? 'dark' : 'light' },
    ]);

    // Interceptar fetch en el navegador para devolver exactamente las 5 historias publicadas
    await page.evaluateOnNewDocument((fixtures, storage) => {
      // Configurar localStorage antes de cargar React
      localStorage.clear();
      for (const [k, v] of Object.entries(storage)) {
        localStorage.setItem(k, v);
      }

      // Interceptar fetch para peticiones a Supabase lumina_stories
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const url = String(args[0]);
        if (url.includes('lumina_stories')) {
          return new Response(JSON.stringify(fixtures), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Content-Range': '0-4/5',
            },
          });
        }
        return originalFetch.apply(this, args);
      };
    }, FIXTURE_STORIES, storageConfig);

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    if (scrollAction) {
      await page.evaluate(scrollAction);
      await new Promise((r) => setTimeout(r, 600));
    }

    const outPath = path.join(ARTIFACTS_DIR, filename);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`✓ Captured: ${filename}`);
    await page.close();
  };

  try {
    // 1. STORY 1/5 — LIGHT MODE (390x844)
    await takeProof(
      'proof_final_1_story1_light.png',
      false,
      {
        theme: 'light',
        lumina_streak_count: '12',
        lumina_last_completed_date: '2026-08-13',
        lumina_streak_history: JSON.stringify(['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13']),
      },
      () => {
        const el = document.querySelectorAll('article')[0];
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    );

    // 2. STORY 5/5 — LIGHT MODE (390x844)
    await takeProof(
      'proof_final_2_story5_light.png',
      false,
      {
        theme: 'light',
        lumina_streak_count: '12',
        lumina_last_completed_date: '2026-08-13',
        lumina_streak_history: JSON.stringify(['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13']),
      },
      () => {
        const el = document.querySelectorAll('article')[4];
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    );

    // 3. END SCREEN — LIGHT MODE (390x844)
    await takeProof(
      'proof_final_3_end_screen_light.png',
      false,
      {
        theme: 'light',
        lumina_streak_count: '12',
        lumina_last_completed_date: '2026-08-13',
        lumina_streak_history: JSON.stringify(['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13']),
      },
      () => {
        const el = document.getElementById('end-of-feed');
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    );

    // 4. STORY — DARK MODE (390x844)
    await takeProof(
      'proof_final_4_story_dark.png',
      true,
      {
        theme: 'dark',
        lumina_streak_count: '12',
        lumina_last_completed_date: '2026-08-13',
      },
      () => {
        const el = document.querySelectorAll('article')[0];
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    );

    console.log("All 4 Final Visual Freeze Proofs captured successfully!");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("Error capturing final proofs:", err);
  process.exit(1);
});
