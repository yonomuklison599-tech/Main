// Rend le milieu de chaque plan et assemble des planches de contrôle : node verifier_plans.js <timing.json> <dossier>
const { execFileSync } = require('child_process'); const fs = require('fs'), path = require('path');
const { chromium } = require('playwright'); const http = require('http');
(async () => {
  const [tf, outDir] = process.argv.slice(2); fs.mkdirSync(outDir, { recursive: true });
  const srv = http.createServer((q, res) => { const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf' }[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }).listen(0);
  await new Promise(r => srv.on('listening', r));
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('ERREUR PAGE', e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/scene.html?fast`); await p.waitForFunction(() => window.__loaded && window.__ready);
  await p.evaluate(d => window.setTiming(d), JSON.parse(fs.readFileSync(tf, 'utf8')));
  const shots = await p.evaluate(() => window.SHOTS.map((s, i, a) => ({ t: s.t, t1: i + 1 < a.length ? a[i + 1].t : window.DURATION, subj: s.subj, fr: s.fr })));
  for (let i = 0; i < shots.length; i++) { const s = shots[i], tm = (s.t + s.t1) / 2;
    const u = await p.evaluate(t => { window.render(t); return document.getElementById('out').toDataURL('image/jpeg', .7); }, tm);
    fs.writeFileSync(path.join(outDir, `p_${String(i).padStart(3, '0')}.jpg`), Buffer.from(u.split(',')[1], 'base64')); }
  fs.writeFileSync(path.join(outDir, 'plans.json'), JSON.stringify(shots, null, 1));
  await b.close(); srv.close(); console.log(shots.length, 'plans');
})();
