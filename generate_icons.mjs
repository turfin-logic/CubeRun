import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // HTML with a simple canvas to draw an icon
    const html = `
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; background:transparent;">
            <canvas id="c" width="512" height="512"></canvas>
            <script>
                const ctx = document.getElementById('c').getContext('2d');
                ctx.fillStyle = '#0f172a'; // dark background
                ctx.fillRect(0,0,512,512);
                
                // Draw a cyan cube
                ctx.fillStyle = '#00f0ff';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 20;
                ctx.fillRect(156, 156, 200, 200);
            </script>
        </body>
        </html>
    `;
    
    await page.setContent(html);
    
    // Capture 512x512
    await page.setViewport({width: 512, height: 512});
    await page.screenshot({path: 'icon-512.png', clip: {x:0, y:0, width:512, height:512}});
    
    // Capture 192x192
    await page.evaluate(() => {
        const c = document.getElementById('c');
        c.width = 192; c.height = 192;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,192,192);
        ctx.fillStyle = '#00f0ff'; ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 10;
        ctx.fillRect(58, 58, 76, 76);
    });
    await page.setViewport({width: 192, height: 192});
    await page.screenshot({path: 'icon-192.png', clip: {x:0, y:0, width:192, height:192}});
    
    await browser.close();
    console.log('Icons generated successfully.');
    process.exit(0);
})();
