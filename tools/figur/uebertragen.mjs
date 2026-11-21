// Überträgt die Bewegungen aus polizist.glb auf eine Figur aus MakeHuman (uebertragen.js) und malt Probebilder.
//   node uebertragen.mjs <Ordner von three> <figur.glb> <aus.glb>      (vorher hier: python3 -m http.server 8777; polizist.glb muss im Ordner liegen)
import { createRequire } from 'module'; import fs from 'fs'; const { chromium } = createRequire(import.meta.url)('playwright');
const [,, DREI, EIN, AUS] = process.argv, NAME = AUS.replace(/.*\//, '').replace('.glb', '');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1600, height: 800 } });
p.on('console', m => m.type() === 'error' && console.log('!', m.text().slice(0, 300))); p.on('pageerror', e => console.log('!!', e.message.slice(0, 600)));
await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => r.fulfill({ body: fs.readFileSync(DREI + '/' + r.request().url().split('three@0.160.0/')[1], 'utf8'), contentType: 'text/javascript' }));
await p.goto('http://localhost:8777/schau.html?uebertragen'); await p.waitForFunction('window.fertig');
const r = await p.evaluate(async ein => { const B = await uebertrage('polizist.glb', ein); window.B = B; s.add(B.wurzel); B.mx = new THREE.AnimationMixer(B.wurzel); return { glb: await alsGlb(B.wurzel, B.clips), mass: B.mass, hoch: B.hoch }; }, EIN);
fs.writeFileSync(AUS, Buffer.from(r.glb, 'base64')); console.log(AUS, fs.statSync(AUS).size, 'Maß', r.mass, 'Höhe', r.hoch);
fs.mkdirSync('bilder', { recursive: true });
const strip = async (name, clip, n, von) => { await p.evaluate(([clip, n, von]) => { const c = B.clips.find(c => c.name === clip); B.mx.stopAllAction(); const a = B.mx.clipAction(c); a.play(); const L = []; for (let i = 0; i < n; i++) L.push({ vor: () => { B.mx.setTime(c.duration * i / n); }, von, nach: [0, 0.95, 0] }); reihe(L, 2.1); }, [clip, n, von]); await p.screenshot({ path: `bilder/${NAME}_${name}.png` }); };
await p.evaluate(() => { const c = B.clips.find(c => c.name === 'stehen'); B.mx.clipAction(c).play(); reihe([[0, 1, 5], [3.5, 1, 3.5], [5, 1, 0], [0, 1, -5], [-5, 1, 0], [-3.5, 1, 3.5]].map(von => ({ vor: () => B.mx.setTime(0), von, nach: [0, 0.95, 0] })), 2.1); }); await p.screenshot({ path: `bilder/${NAME}_stehen.png` });
await strip('gehen_seite', 'gehen', 8, [5, 1, 0]); await strip('gehen_vorn', 'gehen', 8, [1.5, 1.2, 5]); await strip('laufen_seite', 'laufen', 8, [5, 1, 0]);
await b.close();
