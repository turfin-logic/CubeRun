import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(rootDir, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}/index.html`;

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--mute-audio'],
});

const checks = [];
function assert(name, cond, detail = '') {
  checks.push({ name, pass: Boolean(cond), detail });
  if (!cond) console.error(`❌ FAIL: ${name} (${detail})`);
  else console.log(`✅ PASS: ${name}${detail ? ' — ' + detail : ''}`);
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, hasTouch: true, isMobile: true });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(String(err)));

  // Mock native channels BEFORE page scripts run
  await page.evaluateOnNewDocument(() => {
    window.__adMessages = [];
    window.__hapticMessages = [];
    window.__gameMessages = [];
    window.AdChannel = { postMessage: m => window.__adMessages.push(m) };
    window.GameHaptics = { postMessage: m => window.__hapticMessages.push(m) };
    window.GameChannel = { postMessage: m => window.__gameMessages.push(m) };
  });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 500));

  const res = await page.evaluate(async () => {
    const out = {};

    // 1. BUILD_TAG v43 & no TDZ errors
    out.buildTag = typeof BUILD_TAG !== 'undefined' ? BUILD_TAG : null;

    // 2. normalizeTopdownSens & cycling
    out.normStr = normalizeTopdownSens('1.3');
    out.normFloat = normalizeTopdownSens(1.05);
    out.normZero = normalizeTopdownSens(0);

    const sensBtn = document.getElementById('topdown-sens-btn');
    Settings.topdownSens = 0; // corrupt
    sensBtn.click();
    out.afterCorruptClick = Settings.topdownSens; // nearest is 1.0 -> next is 1.3
    const cycle = [];
    for (let i = 0; i < 6; i++) {
      sensBtn.click();
      cycle.push(Settings.topdownSens);
    }
    out.sensCycle = cycle;

    // 3. Vibration icon toggle & sends 'vibrate'
    window.__hapticMessages = [];
    Settings.vibration = false;
    Settings.toggle('vibration');
    out.vibMsg = window.__hapticMessages.slice();
    const vibBtn = document.getElementById('vib-toggle');
    out.vibIsSvgToggle = Boolean(vibBtn?.querySelector('img')) && vibBtn?.getAttribute('aria-pressed') === 'true' && (vibBtn?.getAttribute('aria-label') || '').includes(':');

    // 4. Banner hide on startGame & native onBannerOverlay sync
    window.__adMessages = [];
    window.onBannerOverlay(true, 56);
    out.bannerVar = getComputedStyle(document.documentElement).getPropertyValue('--banner-h').trim();
    out.bannerClassOn = document.body.classList.contains('banner-visible');
    window.onBannerOverlay(false, 0);
    out.bannerClassOff = !document.body.classList.contains('banner-visible');

    document.getElementById('mode-select').value = 'TOPDOWN';
    CURRENT_MODE = 'TOPDOWN';
    startGame();
    out.hideBannerCalled = window.__adMessages.includes('hideBanner');

    // 5. TOPDOWN revivePlayer resets to center + targetY
    player.y = FLOOR - player.height;
    player.targetY = CEILING + 20;
    GAME_STATE = STATE.GAMEOVER;
    revivePlayer();
    const expectedCenterY = (CEILING + FLOOR - player.height) / 2;
    out.tdReviveY = player.y;
    out.tdExpectedY = expectedCenterY;
    out.tdTargetY = player.targetY;
    out.tdExpectedTargetY = expectedCenterY + player.height / 2;
    if (reviveCountdownInterval) { clearInterval(reviveCountdownInterval); reviveCountdownInterval = null; }
    if (reviveCountdownElement) { reviveCountdownElement.remove(); reviveCountdownElement = null; }

    // 6. LASER revivePlayer resets z & zVelocity
    CURRENT_MODE = 'LASER';
    player.z = 75;
    player.zVelocity = 9;
    GAME_STATE = STATE.GAMEOVER;
    revivePlayer();
    out.laserZ = player.z;
    out.laserZV = player.zVelocity;
    out.laserY = player.y;
    out.laserExpectedY = FLOOR - player.height - 60;
    if (reviveCountdownInterval) { clearInterval(reviveCountdownInterval); reviveCountdownInterval = null; }
    if (reviveCountdownElement) { reviveCountdownElement.remove(); reviveCountdownElement = null; }

    // 7. clientYToGame & relative drag delta * sens
    CURRENT_MODE = 'TOPDOWN';
    GAME_STATE = STATE.PLAYING;
    Settings.topdownSens = 2.0;
    player.y = (CEILING + FLOOR - player.height) / 2;
    player.targetY = player.y + player.height / 2;
    handleInput(clientYToGame(300), false); // anchor at 300
    const anchoredTarget = player.targetY;
    handleInput(clientYToGame(330), true); // +30px drag @ 2.0x -> +60px
    out.dragDelta = player.targetY - anchoredTarget;
    out.clientYMid = clientYToGame(915 / 2);
    out.viewH = VIEW_H;

    // 8. Space key 450ms guard on GAMEOVER
    GAME_STATE = STATE.GAMEOVER;
    gameOverAt = performance.now();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    out.spaceGuardedImmediately = GAME_STATE === STATE.GAMEOVER;
    gameOverAt = performance.now() - 500;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    out.spaceWorksAfter450 = GAME_STATE === STATE.PLAYING;

    // 9. Interstitial OR policy + MIN_RUN_MS 8000 + debt preservation + 30s rewarded gap
    window.__adMessages = [];
    deathsSinceInterstitial = 2; // existing death debt
    lastInterstitialAt = Date.now() - 120000;
    lastRewardedAt = 0;
    lastRetryAt = Date.now() - 5000;
    runStartedAt = Date.now() - 7000; // < 8000ms -> should skip AND preserve deathsSinceInterstitial = 2
    gameOver();
    await new Promise(r => setTimeout(r, 1100));
    out.shortRunAdShown = window.__adMessages.includes('showInterstitial');
    out.debtPreserved = deathsSinceInterstitial === 2;

    // Rewarded ad within 30s should block interstitial even after 3 qualifying deaths
    window.__adMessages = [];
    deathsSinceInterstitial = 2;
    lastInterstitialAt = Date.now() - 5000;
    lastRewardedAt = Date.now() - 10000; // only 10s ago (< 30s)
    lastRetryAt = Date.now() - 5000;
    runStartedAt = Date.now() - 9000;
    activeRunId++;
    GAME_STATE = STATE.PLAYING;
    gameOver();
    await new Promise(r => setTimeout(r, 1100));
    out.rewardedGapBlocked = !window.__adMessages.includes('showInterstitial');

    // 3 qualifying 9s deaths outside rewarded gap -> SHOULD show ad
    window.__adMessages = [];
    deathsSinceInterstitial = 2;
    lastInterstitialAt = Date.now() - 5000;
    lastRewardedAt = Date.now() - 35000; // > 30s
    lastRetryAt = Date.now() - 5000;
    runStartedAt = Date.now() - 9000; // >= 8000ms
    activeRunId++;
    GAME_STATE = STATE.PLAYING;
    gameOver();
    await new Promise(r => setTimeout(r, 1100));
    out.threeDeathsAdShown = window.__adMessages.includes('showInterstitial');

    // 10. openExternal sends openUrl:
    window.__gameMessages = [];
    openExternal('https://play.google.com/store/apps/details?id=com.neondrift.bosslevel');
    out.openExternalMsg = window.__gameMessages[0] || null;

    return out;
  });

  assert('No runtime pageerrors', pageErrors.length === 0, pageErrors.join('; '));
  assert('BUILD_TAG is v43', res.buildTag === 'v43', res.buildTag);
  assert('normalizeTopdownSens("1.3") -> 1.3', res.normStr === 1.3, res.normStr);
  assert('normalizeTopdownSens(1.05) -> 1.0', res.normFloat === 1.0, res.normFloat);
  assert('normalizeTopdownSens(0) -> 1.0 (no 0.6 reset)', res.normZero === 1.0, res.normZero);
  assert('Corrupt value snaps to 1.0 and advances to 1.3', res.afterCorruptClick === 1.3, res.afterCorruptClick);
  assert('Full 6-step sens cycle intact', JSON.stringify(res.sensCycle) === JSON.stringify([1.6, 2.0, 0.6, 0.8, 1.0, 1.3]), JSON.stringify(res.sensCycle));
  assert('Vibration toggle sends "vibrate" and uses SVG icon-toggle', res.vibMsg.includes('vibrate') && res.vibIsSvgToggle, JSON.stringify(res.vibMsg));
  assert('onBannerOverlay(true, 56) sets --banner-h & class', res.bannerVar === '56px' && res.bannerClassOn && res.bannerClassOff, res.bannerVar);
  assert('startGame sends hideBanner', res.hideBannerCalled === true);
  assert('TOPDOWN revive resets y & targetY to center', Math.abs(res.tdReviveY - res.tdExpectedY) < 0.01 && Math.abs(res.tdTargetY - res.tdExpectedTargetY) < 0.01, `y=${res.tdReviveY}`);
  assert('LASER revive resets z=0, zVelocity=0', res.laserZ === 0 && res.laserZV === 0 && Math.abs(res.laserY - res.laserExpectedY) < 0.01);
  assert('Relative drag delta * sens (30px @ 2.0x = 60px)', Math.abs(res.dragDelta - 60) < 0.5, `delta=${res.dragDelta}`);
  assert('clientYToGame mid maps to VIEW_H/2', Math.abs(res.clientYMid - res.viewH / 2) < 1, `${res.clientYMid}`);
  assert('Space guarded within 450ms of GAMEOVER', res.spaceGuardedImmediately === true);
  assert('Space restarts after 450ms settle', res.spaceWorksAfter450 === true);
  assert('7s run (<8s) + 120s gap triggers NO ad & preserves debt', res.shortRunAdShown === false && res.debtPreserved === true);
  assert('30s rewarded->interstitial gap blocks double fullscreen ad', res.rewardedGapBlocked === true);
  assert('3 qualifying 9s deaths outside rewarded gap trigger interstitial', res.threeDeathsAdShown === true);
  assert('openExternal routes openUrl: to GameChannel', res.openExternalMsg === 'openUrl:https://play.google.com/store/apps/details?id=com.neondrift.bosslevel', res.openExternalMsg);

  // Check overflow at 360px
  await page.setViewport({ width: 360, height: 740, hasTouch: true, isMobile: true });
  await new Promise(r => setTimeout(r, 200));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert('Zero horizontal overflow at 360px', overflow === false);

} finally {
  await browser.close();
  server.close();
}

const passed = checks.filter(c => c.pass).length;
console.log(`\n===== QA SUMMARY: ${passed}/${checks.length} PASSED =====`);
if (passed !== checks.length) process.exit(1);
