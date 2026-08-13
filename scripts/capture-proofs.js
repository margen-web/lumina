/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\Macro\\.gemini\\antigravity\\brain\\ae2fe8a1-24e6-4d61-ab23-94b3c35bf012';

async function run() {
  console.log('Launching browser with msedge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const takeScreenshot = async (filename, width, height, isDark = false, setupFn) => {
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: isDark ? 'dark' : 'light' },
    ]);
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    if (setupFn) {
      await setupFn(page, height);
    }
    
    await new Promise(r => setTimeout(r, 600));
    const outPath = path.join(ARTIFACTS_DIR, filename);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`Saved: ${filename}`);
  };

  try {
    // 1. Story 1/5 - 390x844 (Light)
    await takeScreenshot('proof_1_story1_390x844.png', 390, 844, false, async (p) => {
      await p.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('theme', 'light');
      });
      await p.reload({ waitUntil: 'networkidle0' });
    });

    // 2. Story 2/5 - 390x844 (Light)
    await takeScreenshot('proof_2_story2_390x844.png', 390, 844, false, async (p) => {
      await p.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('theme', 'light');
      });
      await p.reload({ waitUntil: 'networkidle0' });
      await p.evaluate(() => {
        const el = document.querySelectorAll('article')[1];
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    });

    // 3. Story 5/5 - 390x844 (Light)
    await takeScreenshot('proof_3_story5_390x844.png', 390, 844, false, async (p) => {
      await p.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('theme', 'light');
      });
      await p.reload({ waitUntil: 'networkidle0' });
      await p.evaluate(() => {
        const el = document.querySelectorAll('article')[4];
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    });

    // 4. End screen con streak - 390x844 (Light)
    await takeScreenshot('proof_4_end_streak_390x844.png', 390, 844, false, async (p) => {
      await p.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('theme', 'light');
        localStorage.setItem('lumina_streak_count', '12');
        localStorage.setItem('lumina_last_completed_date', '2026-08-12');
      });
      await p.reload({ waitUntil: 'networkidle0' });
      await p.evaluate(() => {
        const el = document.getElementById('end-of-feed');
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    });

    // 5. Reopen same day - 390x844 (Light)
    await takeScreenshot('proof_5_reopen_same_day_390x844.png', 390, 844, false, async (p) => {
      const today = new Date().toISOString().split('T')[0];
      await p.evaluate((d) => {
        localStorage.clear();
        localStorage.setItem('theme', 'light');
        localStorage.setItem('lumina_last_completed_edition', d);
        localStorage.setItem('lumina_last_completed_date', d);
        localStorage.setItem('lumina_streak_count', '12');
      }, today);
      await p.reload({ waitUntil: 'networkidle0' });
    });

    // 6. Settings Modal - 390x844 (Light)
    await takeScreenshot('proof_6_settings_390x844.png', 390, 844, false, async (p) => {
      await p.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('theme', 'light');
      });
      await p.reload({ waitUntil: 'networkidle0' });
      await p.click('button[aria-label="Abrir ajustes"]');
      await new Promise(r => setTimeout(r, 400));
    });

    // 7. Dark Mode Story - 390x844 (Dark)
    await takeScreenshot('proof_7_dark_story_390x844.png', 390, 844, true, async (p) => {
      await p.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('theme', 'dark');
      });
      await p.reload({ waitUntil: 'networkidle0' });
      await p.evaluate(() => {
        const el = document.querySelectorAll('article')[0];
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    });

    // 8. 375x667 - Long headline + long summary (Light)
    await takeScreenshot('proof_8_long_headline_375x667.png', 375, 667, false, async (p) => {
      await p.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('theme', 'light');
      });
      await p.reload({ waitUntil: 'networkidle0' });
      await p.evaluate(() => {
        const el = document.querySelectorAll('article')[0];
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    });

    // 9. 412x915 - Story Android (Light)
    await takeScreenshot('proof_9_android_412x915.png', 412, 915, false, async (p) => {
      await p.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('theme', 'light');
      });
      await p.reload({ waitUntil: 'networkidle0' });
      await p.evaluate(() => {
        const el = document.querySelectorAll('article')[1];
        if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    });

    // 10. Initial transition noise -> light frame
    await takeScreenshot('proof_10_noise_to_light.png', 390, 844, false, async (p) => {
      await p.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('theme', 'light');
      });
      await p.goto('http://localhost:3000');
      await new Promise(r => setTimeout(r, 120));
    });

    console.log('All refined proofs captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Error running capture proofs:', err);
  process.exit(1);
});
