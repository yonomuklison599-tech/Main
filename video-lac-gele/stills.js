const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [wordsFile, outDir, ...times] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('PAGE ERROR', e));
  await p.goto('file://' + path.resolve(__dirname, 'scene.html'));
  await p.evaluate(w => window.setWords(w), JSON.parse(fs.readFileSync(wordsFile, 'utf8'))); await p.evaluate(() => window.ready);
  for (const t of times) { const u = await p.evaluate(t => { window.render(t); return document.getElementById('c').toDataURL('image/jpeg', .85); }, +t);
    fs.writeFileSync(path.join(outDir, `s_${t}.jpg`), Buffer.from(u.split(',')[1], 'base64')); }
  await b.close();
})();
