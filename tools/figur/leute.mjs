import { createRequire } from 'module'; import fs from 'fs'; const { chromium } = createRequire(import.meta.url)('playwright');
const DREI = process.argv[2], leute = process.argv.slice(3).map(x => x.split(':'));
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1500, height: 420 } });
p.on('pageerror', e => console.log('!!', e.message.slice(0, 300)));
await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => r.fulfill({ body: fs.readFileSync(DREI + '/' + r.request().url().split('three@0.160.0/')[1], 'utf8'), contentType: 'text/javascript' }));
await p.goto('http://localhost:8777/leute.html'); await p.waitForFunction('window.fertig');
for (const [n, art, clip, zeit] of leute) { const h = await p.evaluate(([n, a, c, z]) => zeig(n, a, c || 'stehen', +(z || 1)), [n, art, clip, zeit]); await p.waitForTimeout(300); await p.evaluate(([n, a, c, z]) => zeig(n, a, c || 'stehen', +(z || 1)), [n, art, clip, zeit]); await p.screenshot({ path: `bilder/L_${n}.png` }); console.log(n, h.toFixed(2)); }
await b.close();
