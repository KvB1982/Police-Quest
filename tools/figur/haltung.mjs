// Baut "stehen" einer fertigen Figur neu (haltung.js) und malt Probebilder von allen Seiten.
//   node haltung.mjs <Ordner von three> <ein.glb> <aus.glb> ['{"seite":-1,"arm":0.3}']     (vorher hier: python3 -m http.server 8777)
import { createRequire } from 'module'; import fs from 'fs'; const { chromium } = createRequire(import.meta.url)('playwright');
const [,, DREI, EIN, AUS, OPT = '{}'] = process.argv, NAME = AUS.replace(/.*\//, '').replace('.glb', '');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1600, height: 800 } });
p.on('console', m => m.type() === 'error' && console.log('!', m.text().slice(0, 300))); p.on('pageerror', e => console.log('!!', e.message.slice(0, 600)));
await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => r.fulfill({ body: fs.readFileSync(DREI + '/' + r.request().url().split('three@0.160.0/')[1], 'utf8'), contentType: 'text/javascript' }));
await p.goto('http://localhost:8777/schau.html?haltung'); await p.waitForFunction('window.fertig');
const g = await p.evaluate(async ([ein, opt]) => { const B = await neuStehen(ein, JSON.parse(opt)); window.B = B; s.add(B.wurzel); B.mx = new THREE.AnimationMixer(B.wurzel); const c = B.clips.find(c => c.name === 'stehen'); B.mx.clipAction(c).play(); B.dauer = c.duration; return alsGlb(B.wurzel, B.clips); }, [EIN, OPT]);
fs.writeFileSync(AUS, Buffer.from(g, 'base64')); console.log(AUS, fs.statSync(AUS).size);
fs.mkdirSync('bilder', { recursive: true });
const rund = [[0, 1, 5], [3.5, 1, 3.5], [5, 1, 0], [0, 1, -5], [-5, 1, 0], [-3.5, 1, 3.5]];
await p.evaluate(rund => reihe(rund.map(von => ({ vor: () => B.mx.setTime(0), von, nach: [0, 0.95, 0] })), 2.1), rund); await p.screenshot({ path: `bilder/${NAME}_haltung.png` });
await p.evaluate(() => reihe([0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ vor: () => B.mx.setTime(B.dauer * i / 8), von: [1.2, 1.1, 5], nach: [0, 0.95, 0] })), 2.1)); await p.screenshot({ path: `bilder/${NAME}_zeit.png` });
await p.evaluate(() => reihe([[0, 1.3, 5], [4, 1.3, 3], [-4, 1.3, 3], [0, 1.3, -5]].map(von => ({ vor: () => B.mx.setTime(0), von, nach: [0, 1.25, 0] })), 1.0)); await p.screenshot({ path: `bilder/${NAME}_oben.png` });
await b.close();
