// node render.js <timing.json> <sortie.mp4|dossier> [--stills t1 t2 ...] [--from s --to s]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http'), path = require('path'), fs = require('fs');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf' };
function serve(root) { return new Promise(r => { const s = http.createServer((q, res) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); });
  s.listen(0, '127.0.0.1', () => r(s)); }); }
(async () => {
  const args = process.argv.slice(2); const timing = JSON.parse(fs.readFileSync(args[0], 'utf8')); const out = args[1];
  const stills = args.includes('--stills') ? args.slice(args.indexOf('--stills') + 1).map(Number) : null;
  const from = args.includes('--from') ? +args[args.indexOf('--from') + 1] : 0, to = args.includes('--to') ? +args[args.indexOf('--to') + 1] : Infinity;
  const srv = await serve(__dirname); const port = srv.address().port;
  const GPU = args.includes('--gpu'), HD = args.includes('--hd');
  const browser = await chromium.launch({ args: GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=metal'] : ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message)); page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  const QS = [HD ? 'hd' : '', args.includes('--clean') ? 'clean' : ''].filter(Boolean).join('&');
  await page.goto(`http://127.0.0.1:${port}/scene.html${QS ? '?' + QS : ''}`);
  await page.waitForFunction(() => window.__loaded && window.__ready, null, { timeout: 60000 });
  const dur = await page.evaluate(d => window.setTiming(d), timing);
  const grab = t => page.evaluate(t => { window.render(t); return document.getElementById('out').toDataURL('image/jpeg', 0.92); }, t);
  if (stills) { fs.mkdirSync(out, { recursive: true }); for (const t of stills) { const t0 = Date.now(); const u = await grab(t);
      fs.writeFileSync(path.join(out, `s_${t.toFixed(2).padStart(6, '0')}.jpg`), Buffer.from(u.split(',')[1], 'base64')); console.error(`t=${t} ${Date.now() - t0} ms`); } }
  else {
    const FPS = args.includes('--fps') ? +args[args.indexOf('--fps') + 1] : 30, n0 = Math.floor(from * FPS), n1 = Math.min(Math.ceil(dur * FPS), Math.ceil(to * FPS));
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const T0 = Date.now();
    for (let i = n0; i < n1; i++) { const u = await grab(i / FPS); if (!ff.stdin.write(Buffer.from(u.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 100 === 0) console.error(`image ${i}/${n1}  ${((Date.now() - T0) / (i - n0 + 1)).toFixed(0)} ms/img`); }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close(); srv.close();
})();
