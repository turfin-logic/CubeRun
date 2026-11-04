#!/usr/bin/env node
/**
 * Cube Run — Autonomous E2E QA (headless browser)
 * Runs in GitHub Actions (and locally: node qa/e2e_check.mjs).
 * Verifies: menu boot, canvas, achievements screen, real gameplay round,
 * game-over stats, and collects console errors.
 */
import { chromium } from 'playwright';

const BASE = process.env.QA_URL || 'https://turfin-logic.github.io/CubeRun/';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });

const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push('console: ' + m.text());
});

try {
  // 1. Game boots
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#start-screen.active', { timeout: 45000 });
  check('Game boots (start screen active)', true);

  // 2. Canvas renders
  const canvasOk = await page.evaluate(() => {
    const c = document.getElementById('gameCanvas');
    return !!(c && c.width > 0 && c.height > 0);
  });
  check('Canvas renders', canvasOk);

  // 3. Game JS live (bridge globals)
  const jsOk = await page.evaluate(() =>
    typeof window.getGameState === 'function' &&
    typeof window.FlutterBridge === 'object'
  );
  check('Game JS bridge globals live', jsOk);

  // 4. Achievements screen: 9 awards rendered
  await page.click('#menu-achievements-btn');
  await page.waitForTimeout(400);
  const awardCount = await page.locator('#awards-grid .award').count();
  check('Achievements: 9 awards rendered', awardCount === 9, `found ${awardCount}`);
  const statsOk = await page.evaluate(() =>
    ['stat-highest-combo', 'stat-best-score', 'stat-rounds', 'stat-login-days']
      .every((id) => document.getElementById(id) !== null)
  );
  check('Statistics panel present', statsOk);
  await page.click('#achievements-back-btn');
  await page.waitForTimeout(300);

  // 5. Real gameplay: switch to LASER (guaranteed beams → death), start
  await page.click('#mode-next');
  await page.click('#mode-next');
  await page.click('#start-btn');
  await page.waitForTimeout(1500);
  const state1 = await page.evaluate(() => window.getGameState && window.getGameState());
  check('Game starts (PLAYING state)', state1 === 'PLAYING', `state=${state1}`);

  // Jump a few times (LASER input)
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(200, 400);
    await page.waitForTimeout(1500);
    const st = await page.evaluate(() => window.getGameState && window.getGameState());
    if (st !== 'PLAYING') break;
  }

  // 6. Round ends → game over screen with real stats
  let gameOver = false;
  for (let i = 0; i < 30; i++) {
    const st = await page.evaluate(() => window.getGameState && window.getGameState());
    if (st === 'GAMEOVER') { gameOver = true; break; }
    await page.waitForTimeout(1000);
    const st2 = await page.evaluate(() => window.getGameState && window.getGameState());
    if (st2 === 'GAMEOVER') { gameOver = true; break; }
  }
  check('Round reaches GAMEOVER', gameOver);
  if (gameOver) {
    const finalScore = await page.evaluate(() => document.getElementById('finalScore').textContent);
    check('Game-over stats render', finalScore !== null, `finalScore=${finalScore}`);
  }

  // 7. Page errors: fail only on hard pageerrors (console errors are noisy
  //    by design — ad networks etc. — so they are reported, not fatal)
  check('No uncaught page errors', consoleErrors.filter((e) => e.startsWith('pageerror')).length === 0,
    consoleErrors.join(' | ').slice(0, 200));

  // Screenshot for artifact
  await page.screenshot({ path: 'qa_screenshot.png', fullPage: false });
} catch (err) {
  check('QA script completed without crash', false, err.message);
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n===== QA SUMMARY: ${results.length - failed.length}/${results.length} PASSED =====`);
if (consoleErrors.length) {
  console.log('Console errors (informational):');
  consoleErrors.slice(0, 10).forEach((e) => console.log('  ' + e.slice(0, 160)));
}
process.exit(failed.length ? 1 : 0);
