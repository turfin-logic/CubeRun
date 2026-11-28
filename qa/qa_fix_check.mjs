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

const chromeCandidates = [
  process.env.QA_CHROME,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const executablePath = chromeCandidates.find(p => fs.existsSync(p));
const browser = await puppeteer.launch({
  ...(executablePath ? { executablePath } : {}),
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

    // 1. BUILD_TAG v46, role="radio" 3-mode card selector, idle pause behind Settings, & i18n switch
    out.buildTag = typeof BUILD_TAG !== 'undefined' ? BUILD_TAG : null;
    const modeCards = Array.from(document.querySelectorAll('.mode-card'));
    out.modeCardCount = modeCards.length;
    out.modeCardRadioValid = modeCards.every(c => c.getAttribute('role') === 'radio');
    out.menuLoopActiveAtBoot = rafId !== null;
    showScreen('settings-screen');
    hideScreen('start-screen');
    out.menuLoopStoppedInSettings = rafId === null;
    hideScreen('settings-screen');
    showScreen('start-screen');
    out.menuLoopResumedOnStart = rafId !== null;

    I18n.setLang('es');
    out.esCardTitle = document.querySelector('.mode-card[data-mode="CLASSIC"] .mode-card-title')?.textContent?.trim();
    out.esModeDisplay = document.getElementById('mode-display')?.textContent?.trim();
    I18n.setLang('en');

    document.querySelector('.mode-card[data-mode="TOPDOWN"]')?.click();
    out.modeCardSwitched = document.getElementById('mode-select')?.value === 'TOPDOWN' &&
        document.getElementById('start-screen')?.getAttribute('data-active-mode') === 'TOPDOWN';
    document.querySelector('.mode-card[data-mode="CLASSIC"]')?.click();

    // 2. TOP-DOWN SPEED row removed & #gpg-profile stays hidden even after onPlayGamesProfile
    out.sensBtnRemoved = document.getElementById('topdown-sens-btn') === null;
    window.onPlayGamesProfile({ name: 'TestPlayer', level: 5 });
    const gpgEl = document.getElementById('gpg-profile');
    out.gpgHidden = gpgEl ? getComputedStyle(gpgEl).display === 'none' : true;

    // 3. Vibration icon toggle ON sends 'enable' + 'light', toggle OFF sends 'disable' & silences vibrate()
    window.__hapticMessages = [];
    Settings.vibration = false;
    Settings.toggle('vibration');
    out.vibOnMsgs = window.__hapticMessages.slice();
    window.__hapticMessages = [];
    Settings.toggle('vibration'); // turn OFF
    out.vibOffMsgs = window.__hapticMessages.slice();
    window.__hapticMessages = [];
    vibrate([100, 50, 100]); // MUST NOT vibrate when disabled
    out.vibAfterOff = window.__hapticMessages.slice();
    // Re-enable for remaining checks
    Settings.toggle('vibration');
    const vibBtn = document.getElementById('vib-toggle');
    out.vibIsSvgToggle = Boolean(vibBtn?.querySelector('img')) && vibBtn?.getAttribute('aria-pressed') === 'true' && (vibBtn?.getAttribute('aria-label') || '').includes(':');

    // 4. Persistent banner on startGame (showBanner) & native onBannerOverlay sync
    window.__adMessages = [];
    window.onBannerOverlay(true, 56);
    out.bannerVar = getComputedStyle(document.documentElement).getPropertyValue('--banner-h').trim();
    out.bannerClassOn = document.body.classList.contains('banner-visible');
    window.onBannerOverlay(false, 0);
    out.bannerClassOff = !document.body.classList.contains('banner-visible');

    document.getElementById('mode-select').value = 'TOPDOWN';
    CURRENT_MODE = 'TOPDOWN';
    startGame();
    out.showBannerOnStart = window.__adMessages.includes('showBanner') && !window.__adMessages.includes('hideBanner');

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

    // 7. clientYToGame & 1:1 relative drag tracking (no drag vibration)
    window.__hapticMessages = [];
    CURRENT_MODE = 'TOPDOWN';
    GAME_STATE = STATE.PLAYING;
    player.y = (CEILING + FLOOR - player.height) / 2;
    player.targetY = player.y + player.height / 2;
    handleInput(clientYToGame(300), false); // anchor at 300
    const anchoredTarget = player.targetY;
    handleInput(clientYToGame(330), true); // +30px drag -> +30px (1:1)
    out.dragDelta = player.targetY - anchoredTarget;
    out.dragHaptics = window.__hapticMessages.slice();
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

    // 9. Interstitial OR policy + MIN_RUN_MS 2500 + debt preservation + 30s rewarded gap
    window.__adMessages = [];
    deathsSinceInterstitial = 1; // existing death debt
    lastInterstitialAt = Date.now() - 120000;
    lastRewardedAt = 0;
    lastRetryAt = Date.now() - 5000;
    runStartedAt = Date.now() - 2000; // < 2500ms -> should skip AND preserve deathsSinceInterstitial = 1
    gameOver();
    await new Promise(r => setTimeout(r, 1100));
    out.shortRunAdShown = window.__adMessages.includes('showInterstitial');
    out.debtPreserved = deathsSinceInterstitial === 1;

    // Rewarded ad within 30s should block interstitial even after 2 qualifying deaths
    window.__adMessages = [];
    deathsSinceInterstitial = 1;
    lastInterstitialAt = Date.now() - 5000;
    lastRewardedAt = Date.now() - 10000; // only 10s ago (< 30s)
    lastRetryAt = Date.now() - 5000;
    runStartedAt = Date.now() - 4000;
    activeRunId++;
    GAME_STATE = STATE.PLAYING;
    gameOver();
    await new Promise(r => setTimeout(r, 1100));
    out.rewardedGapBlocked = !window.__adMessages.includes('showInterstitial');

    // 2 qualifying 4s deaths outside rewarded gap -> SHOULD show ad
    window.__adMessages = [];
    deathsSinceInterstitial = 1;
    lastInterstitialAt = Date.now() - 5000;
    lastRewardedAt = Date.now() - 35000; // > 30s
    lastRetryAt = Date.now() - 5000;
    runStartedAt = Date.now() - 4000; // >= 2500ms
    activeRunId++;
    GAME_STATE = STATE.PLAYING;
    gameOver();
    await new Promise(r => setTimeout(r, 1100));
    out.twoDeathsAdShown = window.__adMessages.includes('showInterstitial');

    // 10. openExternal sends openUrl:
    window.__gameMessages = [];
    openExternal('https://play.google.com/store/apps/details?id=com.neondrift.bosslevel');
    out.openExternalMsg = window.__gameMessages[0] || null;

    // 11. Two-tier Remove Ads: legacy migration, tier gates & VIP free perks
    out.legacyMigrationTier = (function(){ try { localStorage.setItem('ndRemoveAds','true'); } catch(e){} return RemoveAds.load(); })();
    window.setNoAdsTier('forced');
    out.forcedTier = RemoveAds.tier() === 'forced' && RemoveAds.active() === true && RemoveAds.isVip() === false;
    out.forcedGetNoAds = window.getNoAds() === true;
    window.__adMessages = [];
    FlutterBridge.showInterstitial();
    out.forcedBlocksInterstitial = window.__adMessages.length === 0; // hard stop inside showInterstitial
    window.setNoAdsTier('all');
    out.vipTier = RemoveAds.tier() === 'all' && RemoveAds.isVip() === true;
    out.vipAdliteBtnOwned = document.getElementById('remove-ads-btn').disabled === true;
    out.vipBtnOwned = /ACTIVE/.test(document.getElementById('remove-all-ads-btn').textContent || '');
    // VIP revive: instant countdown start, zero 'showRewarded' traffic
    window.__adMessages = [];
    GAME_STATE = STATE.GAMEOVER;
    reviveRequestRunId = null;
    window._pendingRevive = false;
    const rBtn = document.getElementById('revive-btn');
    rBtn.disabled = false;
    rBtn.click();
    out.vipReviveInstant = reviveCountdownInterval !== null && !window.__adMessages.includes('showRewarded');
    if (reviveCountdownInterval) { clearInterval(reviveCountdownInterval); reviveCountdownInterval = null; }
    if (reviveCountdownElement) { reviveCountdownElement.remove(); reviveCountdownElement = null; }
    // VIP 2x: instant grant (60 -> 120), zero 'showRewarded' traffic
    window.__adMessages = [];
    GAME_STATE = STATE.GAMEOVER;
    score = 60;
    const dBtn = document.getElementById('double-score-btn');
    dBtn.disabled = false;
    dBtn.classList.remove('double-done');
    dBtn.click();
    out.vipDoubleInstant = String(document.getElementById('finalScore').textContent) === '120' && !window.__adMessages.includes('showRewarded');
    // Tier reset + UI state sanity
    window.setNoAdsTier('none');
    out.noneTier = RemoveAds.tier() === 'none' && window.getNoAds() === false;
    out.noneBtnEnabled = document.getElementById('remove-ads-btn').disabled === false;

    // 12. VIP perk ledger: exactly 1 free revive + 1 free 2x per RUN.
    //     (Repeat-death exploit fix: a 2nd death in the SAME run must hide
    //     both VIP buttons; only a fresh run — resetGame() — re-arms them.)
    window.setNoAdsTier('all');
    resetGame(); // fresh run — the ledger resets HERE (and only here)
    activeRunId++;
    GAME_STATE = STATE.PLAYING;
    score = 60;
    runStartedAt = Date.now() - 5000;
    const rvBtn = document.getElementById('revive-btn');
    const dbBtn = document.getElementById('double-score-btn');
    gameOver(); // death #1 in this run
    out.vipDeath1ReviveShown = rvBtn.style.display !== 'none';
    out.vipDeath1DoubleShown = dbBtn.style.display !== 'none';
    // Spend the free VIP revive (instant countdown, zero ad traffic).
    rvBtn.disabled = false;
    rvBtn.click();
    if (reviveCountdownInterval) { clearInterval(reviveCountdownInterval); reviveCountdownInterval = null; }
    if (reviveCountdownElement) { reviveCountdownElement.remove(); reviveCountdownElement = null; }
    // Spend the free VIP 2x (instant grant, zero ad traffic).
    dbBtn.disabled = false;
    dbBtn.classList.remove('double-done');
    dbBtn.click();
    gameOver(); // death #2, SAME run — both free perks must now hide
    out.vipDeath2ReviveHidden = rvBtn.style.display === 'none';
    out.vipDeath2DoubleHidden = dbBtn.style.display === 'none';
    // A brand-new run (resetGame) re-arms both perks.
    resetGame();
    GAME_STATE = STATE.PLAYING;
    score = 60;
    gameOver();
    out.vipNewRunReviveBack = rvBtn.style.display !== 'none';
    out.vipNewRunDoubleBack = dbBtn.style.display !== 'none';
    window.setNoAdsTier('none');

    return out;
  });

  assert('No runtime pageerrors', pageErrors.length === 0, pageErrors.join('; '));
  assert('BUILD_TAG is v47', res.buildTag === 'v47', res.buildTag);
  assert('3-card mode selector uses role="radio" and switches mode on tap', res.modeCardCount === 3 && res.modeCardRadioValid === true && res.modeCardSwitched === true);
  assert('Menu loop idles behind Settings overlay and resumes on Start', res.menuLoopActiveAtBoot === true && res.menuLoopStoppedInSettings === true && res.menuLoopResumedOnStart === true);
  assert('Mode cards & display localize dynamically on I18n.setLang("es")', res.esCardTitle === 'CLÁSICO' && /CLÁSICO/.test(res.esModeDisplay || ''), `${res.esCardTitle} | ${res.esModeDisplay}`);
  assert('#topdown-sens-btn removed from Settings', res.sensBtnRemoved === true);
  assert('#gpg-profile stays hidden after onPlayGamesProfile', res.gpgHidden === true);
  assert('Vibration toggle ON sends enable + light; OFF sends disable & mutes vibrate()',
    res.vibOnMsgs.includes('enable') && res.vibOnMsgs.includes('light') &&
    res.vibOffMsgs.includes('disable') && res.vibAfterOff.length === 0 && res.vibIsSvgToggle,
    JSON.stringify({ on: res.vibOnMsgs, off: res.vibOffMsgs, afterOff: res.vibAfterOff }));
  assert('onBannerOverlay(true, 56) sets --banner-h & class', res.bannerVar === '56px' && res.bannerClassOn && res.bannerClassOff, res.bannerVar);
  assert('startGame keeps banner visible (showBanner, not hideBanner)', res.showBannerOnStart === true);
  assert('TOPDOWN revive resets y & targetY to center', Math.abs(res.tdReviveY - res.tdExpectedY) < 0.01 && Math.abs(res.tdTargetY - res.tdExpectedTargetY) < 0.01, `y=${res.tdReviveY}`);
  assert('LASER revive resets z=0, zVelocity=0', res.laserZ === 0 && res.laserZV === 0 && Math.abs(res.laserY - res.laserExpectedY) < 0.01);
  assert('TOPDOWN 1:1 relative drag (30px = 30px) with zero drag vibration', Math.abs(res.dragDelta - 30) < 0.5 && res.dragHaptics.length === 0, `delta=${res.dragDelta}`);
  assert('clientYToGame mid maps to VIEW_H/2', Math.abs(res.clientYMid - res.viewH / 2) < 1, `${res.clientYMid}`);
  assert('Space guarded within 450ms of GAMEOVER', res.spaceGuardedImmediately === true);
  assert('Space restarts after 450ms settle', res.spaceWorksAfter450 === true);
  assert('2s run (<2.5s) + 120s gap triggers NO ad & preserves debt', res.shortRunAdShown === false && res.debtPreserved === true);
  assert('30s rewarded->interstitial gap blocks double fullscreen ad', res.rewardedGapBlocked === true);
  assert('2 qualifying 4s deaths outside rewarded gap trigger interstitial', res.twoDeathsAdShown === true);
  assert('openExternal routes openUrl: to GameChannel', res.openExternalMsg === 'openUrl:https://play.google.com/store/apps/details?id=com.neondrift.bosslevel', res.openExternalMsg);
  assert('Legacy ndRemoveAds=true migrates to the forced (AD-LITE) tier', res.legacyMigrationTier === 'forced', res.legacyMigrationTier);
  assert('setNoAdsTier("forced") = AD-LITE: active, not VIP, getNoAds() true', res.forcedTier === true && res.forcedGetNoAds === true, JSON.stringify({ tier: res.forcedTier, getNoAds: res.forcedGetNoAds }));
  assert('AD-LITE tier hard-stops the interstitial (no showInterstitial)', res.forcedBlocksInterstitial === true);
  assert('setNoAdsTier("all") = VIP: tier gates + both tier buttons owned', res.vipTier === true && res.vipAdliteBtnOwned === true && res.vipBtnOwned === true);
  assert('VIP revive grants instantly with zero showRewarded traffic', res.vipReviveInstant === true);
  assert('VIP 2x doubles score instantly (60 -> 120) with zero showRewarded traffic', res.vipDoubleInstant === true);
  assert('setNoAdsTier("none") resets gates & re-enables UPGRADE', res.noneTier === true && res.noneBtnEnabled === true);
  assert('VIP perk ledger: death #1 in a fresh run shows BOTH free perks',
    res.vipDeath1ReviveShown === true && res.vipDeath1DoubleShown === true,
    JSON.stringify({ revive: res.vipDeath1ReviveShown, double: res.vipDeath1DoubleShown }));
  assert('VIP perk ledger: 2nd death in the SAME run hides BOTH VIP buttons',
    res.vipDeath2ReviveHidden === true && res.vipDeath2DoubleHidden === true,
    JSON.stringify({ reviveHidden: res.vipDeath2ReviveHidden, doubleHidden: res.vipDeath2DoubleHidden }));
  assert('VIP perk ledger: a brand-new run (resetGame) re-arms both perks',
    res.vipNewRunReviveBack === true && res.vipNewRunDoubleBack === true,
    JSON.stringify({ revive: res.vipNewRunReviveBack, double: res.vipNewRunDoubleBack }));

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
