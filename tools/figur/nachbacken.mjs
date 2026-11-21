// Setzt eine neue Figur (klein.glb) auf Gerüst und Bewegungen von polizist.glb und speichert sie als GLB.
//   node nachbacken.mjs <Ordner mit three> <Name>     (vorher in diesem Ordner: python3 -m http.server 8777)
import { createRequire } from 'module'; import fs from 'fs'; const { chromium } = createRequire(import.meta.url)('playwright');
const [,, DREI, NAME = 'otto', DREH = '-1.5708'] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1600, height: 800 } });
p.on('console', m => m.type() === 'error' && console.log('!', m.text().slice(0, 300))); p.on('pageerror', e => console.log('!!', e.message.slice(0, 600)));
await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => r.fulfill({ body: fs.readFileSync(DREI + '/' + r.request().url().split('three@0.160.0/')[1], 'utf8'), contentType: 'text/javascript' }));
await p.goto('http://localhost:8777/schau.html?nach'); await p.waitForFunction('window.fertig');
const r = await p.evaluate(async ([name, dreh]) => { const B = await backeNach({ name, dreh: +dreh }); window.B = B; s.add(B.wurzel); B.mx = new THREE.AnimationMixer(B.wurzel); const g = await alsGlb(B.wurzel, B.clips); return { mess: B.mess, glb: g }; }, [NAME, DREH]);
console.log(r.mess); fs.writeFileSync(NAME + '.glb', Buffer.from(r.glb, 'base64')); console.log('glb', fs.statSync(NAME + '.glb').size);
const strip = async (name, clip, n, von) => { await p.evaluate(([clip, n, von]) => { const c = B.clips.find(c => c.name === clip); B.mx.stopAllAction(); const a = B.mx.clipAction(c); a.play(); const L = []; for (let i = 0; i < n; i++) L.push({ vor: () => { B.mx.setTime(c.duration * i / n); }, von, nach: [0, 0.95, 0] }); reihe(L, 2.1); }, [clip, n, von]); await p.screenshot({ path: `bilder/${NAME}_${name}.png` }); };
await strip('stehen', 'stehen', 4, [0, 1, 5]); await p.evaluate(() => reihe([{ von: [0, 1, 5], nach: [0, 0.95, 0] }, { von: [5, 1, 0], nach: [0, 0.95, 0] }, { von: [0, 1, -5], nach: [0, 0.95, 0] }, { von: [3, 2.5, 3], nach: [0, 0.95, 0] }], 2.1)); await p.screenshot({ path: `bilder/${NAME}_rund.png` });
await strip('gehen_seite', 'gehen', 8, [5, 1, 0]); await strip('gehen_vorn', 'gehen', 8, [1.5, 1.2, 5]);
await strip('laufen_seite', 'laufen', 8, [5, 1, 0]); await strip('laufen_vorn', 'laufen', 8, [1.5, 1.2, 5]);
await b.close();
