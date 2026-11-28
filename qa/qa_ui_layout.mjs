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
  const filePath = path.join(rootDir, urlPath === '/' ? 'index.html' : urlPath);
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
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));

  await page.evaluateOnNewDocument(() => {
    window.AdChannel = { postMessage: () => {} };
    window.GameHaptics = { postMessage: () => {} };
    window.GameChannel = { postMessage: () => {} };
  });

  await page.setViewport({ width: 412, height: 915, hasTouch: true, isMobile: true });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 400));

  // 1. Canvas Size Invariance Check across full gameplay + banner toggle lifecycle
  const canvasDims = await page.evaluate(() => {
    const snap = (label) => {
      const c = document.getElementById('gameCanvas');
      return { label, w: c.clientWidth, h: c.clientHeight };
    };
    const list = [];
    window.onBannerOverlay(true, 50);
    list.push(snap('menu_banner_on'));
    startGame();
    window.onBannerOverlay(false, 0);
    list.push(snap('play_banner_off'));
    GAME_STATE = STATE.PLAYING;
    score = 100;
    gameOver();
    window.onBannerOverlay(true, 50);
    list.push(snap('gameover_banner_on'));
    revivePlayer();
    if (reviveCountdownInterval) { clearInterval(reviveCountdownInterval); reviveCountdownInterval = null; }
    if (reviveCountdownElement) { reviveCountdownElement.remove(); reviveCountdownElement = null; }
    list.push(snap('revive_banner_on'));
    quitToMenu();
    list.push(snap('menu_return'));
    return list;
  });
  const baseW = canvasDims[0].w, baseH = canvasDims[0].h;
  const canvasInvariant = canvasDims.every(d => d.w === baseW && d.h === baseH);
  assert('Canvas clientWidth/Height strictly invariant across start/gameover/revive/menu + banner toggles', canvasInvariant, JSON.stringify(canvasDims));

  // 2. Inactive screen pointer-events & rapid ghost-tap guard check
  const screenStates = await page.evaluate(async () => {
    hideAllScreens();
    showScreen('settings-screen');
    await new Promise(r => setTimeout(r, 180)); // let 150ms fade-out finish
    const settingsCS = getComputedStyle(document.getElementById('settings-screen'));
    const startCS = getComputedStyle(document.getElementById('start-screen'));
    const res = {
      settingsPointer: settingsCS.pointerEvents,
      settingsVis: settingsCS.visibility,
      startPointer: startCS.pointerEvents,
      startVis: startCS.visibility,
    };
    showScreen('pause-screen');
    res.lockActive = performance.now() < screenTransitionLockUntil;
    hideAllScreens();
    showScreen('start-screen');
    return res;
  });
  assert('Inactive screen has pointer-events:none & visibility:hidden + transition lock armed',
    screenStates.settingsPointer === 'auto' && screenStates.startPointer === 'none' && screenStates.startVis === 'hidden' && screenStates.lockActive === true,
    JSON.stringify(screenStates));

  // 3. Touch-device hint hiding check
  const hintCheck = await page.evaluate(() => {
    hideAllScreens();
    showScreen('game-over-screen');
    const retryHint = document.querySelector('.retry-hint');
    return getComputedStyle(retryHint).display;
  });
  assert('.retry-hint hidden on touch device', hintCheck === 'none', hintCheck);

  // 4. 2-State Matrix (Banner OFF/ON) x Viewports (320px, 360px, 412px) x All 6 Screens
  const viewports = [
    { width: 320, height: 640 },
    { width: 360, height: 740 },
    { width: 412, height: 915 },
  ];
  const screenIds = ['start-screen', 'settings-screen', 'pause-screen', 'game-over-screen', 'tutorial-screen', 'achievements-screen'];

  let matrixFails = [];
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, hasTouch: true, isMobile: true });
    await new Promise(r => setTimeout(r, 150));
    for (const bannerOn of [false, true]) {
      const bannerH = bannerOn ? 50 : 0;
      const diag = await page.evaluate((bOn, bH, screens, vw, vh) => {
        window.onBannerOverlay(bOn, bH);
        // Make optional game-over buttons & remove-ads row visible to test worst-case layout density
        document.getElementById('revive-btn').style.display = 'block';
        document.getElementById('double-score-btn').style.display = 'block';
        document.getElementById('remove-ads-row').style.display = 'flex';
        const issues = [];
        const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
        if (overflow) issues.push(`horizontal_overflow:${document.documentElement.scrollWidth}>${document.documentElement.clientWidth}`);

        for (const sid of screens) {
          hideAllScreens();
          showScreen(sid);
          const scr = document.getElementById(sid);
          const scrRect = scr.getBoundingClientRect();
          const btns = Array.from(scr.querySelectorAll('button, a')).filter(el => {
            const cs = getComputedStyle(el);
            return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
          });
          // Pairwise bounding-box overlap & banner overlap check
          for (let i = 0; i < btns.length; i++) {
            const r1 = btns[i].getBoundingClientRect();
            // Icon buttons >= 44px; dock buttons >= 36px
            if (btns[i].classList.contains('icon-toggle') && (r1.width < 44 || r1.height < 44)) {
              issues.push(`${sid}:${btns[i].id}:target<44px(${r1.width}x${r1.height})`);
            }
            if (r1.right > vw + 1 || r1.left < -1) {
              issues.push(`${sid}:${btns[i].id || btns[i].className}:clipped_x`);
            }
            for (let j = i + 1; j < btns.length; j++) {
              const r2 = btns[j].getBoundingClientRect();
              const overlapX = r1.left < r2.right - 2 && r1.right > r2.left + 2;
              const overlapY = r1.top < r2.bottom - 2 && r1.bottom > r2.top + 2;
              if (overlapX && overlapY) {
                issues.push(`${sid}:overlap(${btns[i].id || btns[i].textContent.trim().slice(0,8)},${btns[j].id || btns[j].textContent.trim().slice(0,8)})`);
              }
            }
          }
        }
        return issues;
      }, bannerOn, bannerH, screenIds, vp.width, vp.height);

      if (diag.length > 0) {
        matrixFails.push(`${vp.width}x${vp.height}[banner=${bannerOn}]: ${diag.join(', ')}`);
      }
    }
  }
  assert('6 screens x 3 viewports (320/360/412) x 2 banner states: zero overflow, clipping or button overlaps', matrixFails.length === 0, matrixFails.join(' | '));

  // 5. Floating modals re-center above the banner (never bottom-stretch):
  //    the center shifts up by exactly banner-h/2 with symmetric padding.
  const modalCenter = await page.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    hideAllScreens();
    window.onBannerOverlay(false, 0);
    showScreen('settings-screen');
    await sleep(280);
    const offEl = document.getElementById('settings-screen');
    const off = offEl.getBoundingClientRect();
    const offPad = `${getComputedStyle(offEl).paddingTop}/${getComputedStyle(offEl).paddingBottom}`;
    window.onBannerOverlay(true, 50);
    await sleep(280);
    const onEl = document.getElementById('settings-screen');
    const on = onEl.getBoundingClientRect();
    const onCS = getComputedStyle(onEl);
    window.onBannerOverlay(false, 0);
    hideAllScreens();
    showScreen('start-screen');
    return {
      shift: off.top - on.top,
      padOff: offPad,
      padOn: `${onCS.paddingTop}/${onCS.paddingBottom}`,
      maxHeight: onCS.maxHeight,
    };
  });
  assert('Settings modal re-centers above the banner (shift = banner-h/2) with symmetric padding',
    Math.abs(modalCenter.shift - 25) < 2 && modalCenter.padOn === modalCenter.padOff,
    JSON.stringify(modalCenter));

  // 6. Multi-locale stress test (EN, RU, ES, PT, DE, FR, ID) on 320px & 360px
  await page.setViewport({ width: 320, height: 640, hasTouch: true, isMobile: true });
  await new Promise(r => setTimeout(r, 200));
  const localeFails = await page.evaluate(() => {
    window.onBannerOverlay(true, 50);
    const langs = I18n.langs ? I18n.langs() : ['en', 'ru', 'es', 'pt', 'de', 'fr'];
    const issues = [];
    for (const l of langs) {
      I18n.setLang(l);
      for (const sid of ['start-screen', 'settings-screen', 'game-over-screen']) {
        hideAllScreens();
        showScreen(sid);
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
          issues.push(`${l}:${sid}:overflow(${document.documentElement.scrollWidth}>${document.documentElement.clientWidth})`);
        }
        const remRow = document.getElementById('remove-ads-row');
        if (sid === 'settings-screen' && remRow) {
          // Both tier cards must stay inside the modal with their buttons
          // fully inside their own cards in every locale at the smallest
          // supported width.
          remRow.style.display = 'flex';
          const rowRect = remRow.getBoundingClientRect();
          for (const bid of ['remove-ads-btn', 'remove-all-ads-btn']) {
            const btnEl = document.getElementById(bid);
            const b = btnEl?.getBoundingClientRect();
            const card = btnEl?.closest('.ads-tier-card')?.getBoundingClientRect();
            if (!b || !card || b.width === 0) { issues.push(`${l}:${bid}:missing`); continue; }
            if (b.right > card.right + 2 || b.bottom > card.bottom + 2 || b.left < card.left - 2 || b.top < card.top - 2) {
              issues.push(`${l}:${bid}:button-escapes-card`);
            }
            if (rowRect.right < b.right - 1) { issues.push(`${l}:${bid}:outside-row`); }
          }
        }
      }
    }
    I18n.setLang('en');
    return issues;
  });
  assert('Multi-locale stress test across all dictionaries at 320px passes zero overflow & remove-ads overlap', localeFails.length === 0, localeFails.join(', '));
  assert('Zero pageerrors during UI layout suite', errs.length === 0, errs.join('; '));

} finally {
  await browser.close();
  server.close();
}

const passed = checks.filter(c => c.pass).length;
console.log(`\n===== UI LAYOUT QA SUMMARY: ${passed}/${checks.length} PASSED =====`);
if (passed !== checks.length) process.exit(1);
