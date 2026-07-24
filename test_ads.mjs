import puppeteer from 'puppeteer';
import http from 'http';
import handler from 'serve-handler';

const server = http.createServer((request, response) => {
  return handler(request, response, { public: 'C:/Users/pc/OneDrive/Desktop/temp_nd' });
});

server.listen(3000, async () => {
  console.log('Server running at http://localhost:3000');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  console.log('--- Page Loaded ---');
  
  // Expose a function to wait
  const wait = ms => new Promise(res => setTimeout(res, ms));
  
  // Die in game
  console.log('Triggering Game Over...');
  await page.evaluate(() => {
     if(window.gameOver) window.gameOver();
  });
  
  await wait(1000);
  
  console.log('Clicking Revive Button...');
  await page.evaluate(() => {
     const reviveBtn = document.getElementById('reviveBtn');
     if(reviveBtn) reviveBtn.click();
     else console.log('No revive button found!');
  });
  
  await wait(3000);
  
  console.log('Testing gdsdk directly...');
  const gdsdkType = await page.evaluate(() => typeof gdsdk);
  console.log('typeof gdsdk:', gdsdkType);
  if(gdsdkType !== 'undefined') {
      const showAdRet = await page.evaluate(() => {
          try {
              const res = gdsdk.showAd('rewarded');
              return { type: typeof res, isPromise: res instanceof Promise };
          } catch(e) {
              return { error: e.toString() };
          }
      });
      console.log('gdsdk.showAd() return analysis:', showAdRet);
  }
  
  await browser.close();
  server.close();
  process.exit(0);
});
