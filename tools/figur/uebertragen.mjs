// Überträgt Bewegungen auf eine Figur (uebertragen.js) und malt Probebilder.
//   node uebertragen.mjs <Ordner von three> <figur.glb> <bewegungen_aus.glb> <liste.json>
// Heraus kommt eine Datei nur mit Gerüst und Bewegungen. Alle Figuren mit demselben Gerüst teilen sie sich (js/polizist.js).
// liste.json = [{ "name": "stehen", "datei": "mc/Idle-2.fbx" }, …]; die Dateien müssen vom Server in diesem Ordner erreichbar sein (python3 -m http.server 8777).
import { createRequire } from 'module'; import fs from 'fs'; const { chromium } = createRequire(import.meta.url)('playwright');
const [,, DREI, EIN, AUS, LISTE] = process.argv, NAME = AUS.replace(/.*\//, '').replace('.glb', ''), liste = JSON.parse(fs.readFileSync(LISTE, 'utf8'));
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1600, height: 800 } });
p.on('console', m => console.log(m.type() === 'error' ? '! ' : '  ', m.text().slice(0, 300))); p.on('pageerror', e => console.log('!!', e.message.slice(0, 600)));
await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => r.fulfill({ body: fs.readFileSync(DREI + '/' + r.request().url().split('three@0.160.0/')[1], 'utf8'), contentType: 'text/javascript' }));
await p.goto('http://localhost:8777/schau.html?uebertragen'); await p.waitForFunction('window.fertig');
const r = await p.evaluate(async ([ein, liste]) => { const B = await uebertrage(ein, liste); window.B = B; s.add(B.wurzel); B.mx = new THREE.AnimationMixer(B.wurzel); return { mass: B.mass, hoch: B.hoch }; }, [EIN, liste]);
fs.mkdirSync('bilder', { recursive: true });
// je Bewegung zwei Streifen: von der Seite und schräg von vorn, je 8 Bilder über die ganze Dauer
for (const w of liste) for (const [sicht, von] of [['seite', [5, 1, 0]], ['vorn', [2.2, 1.2, 4.6]]]) {
  await p.evaluate(([clip, von]) => { const c = B.clips.find(c => c.name === clip); B.mx.stopAllAction(); const a = B.mx.clipAction(c); a.play(); const L = []; for (let i = 0; i < 8; i++) L.push({ vor: () => { B.mx.setTime(Math.min(c.duration - 0.001, c.duration * i / 7)); }, von, nach: [0, 0.95, 0] }); reihe(L, 2.1); }, [w.name, von]);
  await p.screenshot({ path: `bilder/${NAME}_${w.name}_${sicht}.png` }); }
// Zum Schluss: nur Gerüst und Bewegungen speichern (die Haut bleibt in der Datei der Figur)
const glb = await p.evaluate(async () => { B.mx.stopAllAction(); return alsGlb(B.geruest(), B.clips); });
fs.writeFileSync(AUS, Buffer.from(glb, 'base64')); console.log(AUS, fs.statSync(AUS).size, 'Maß', r.mass, 'Höhe', r.hoch);
await b.close();
