// node render.js <mots.json> <sortie.mp4> [step]  — rend scene.html image par image
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs');
(async () => {
  const [wordsFile, out, stepArg] = process.argv.slice(2);
  const FPS = 30, step = +(stepArg || 1);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(__dirname, 'scene.html'));
  await page.evaluate(w => window.setTiming(w), JSON.parse(fs.readFileSync(wordsFile, 'utf8')));
  await page.evaluate(() => window.ready);
  const dur = await page.evaluate(() => window.DURATION);
  const n = Math.ceil(dur * FPS);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS / step), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `fps=${FPS}`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < n; i += step) {
    const url = await page.evaluate(t => { window.render(t); return document.getElementById('c').toDataURL('image/jpeg', 0.93); }, i / FPS);
    if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.error(`frame ${i}/${n}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
})();
