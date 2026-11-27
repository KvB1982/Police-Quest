// Blaulicht über Möwenbrück – Fahrphysik des Streifenwagens nachmessen (ohne Bildschirm).
//   node tools/fahren.mjs
// Misst Beschleunigung, Bremsweg, Wendekreis, Kurven bei verschiedenem Tempo, Zickzack (kein Dreher) und Ausrollen
// und prüft, ob die Zahlen in einem vernünftigen Bereich liegen. Vorbild: tools/fahrgefuehl.mjs im Rennspiel.
import { schritt, halt, stoss, STREIFE } from '../js/fahrphysik.js';

const DT = 1 / 60, V_MAX = 19, V_BLAU = 26;
const neu = (v = 0) => halt({ x: 0, z: 0, h: 0, v: 0 }) && Object.assign(halt({ x: 0, z: 0, h: 0 }), { v });
let fehler = 0;
const pruef = (ok, text) => { console.log((ok ? '  ✓ ' : '  ✗ ') + text); if (!ok) fehler++; };
const z1 = x => x.toFixed(1);
// So schräg rutscht das Heck gerade (Winkel an der Hinterachse). Unter 3 m/s zählt es nicht: Da rollt der Wagen nur.
const heck = a => Math.abs(a.v) > 3 ? Math.abs(Math.atan2(a.q - STREIFE.b * a.r, Math.abs(a.v))) : 0;

console.log('Beschleunigen');
{
  const a = neu(); let t = 0, t50 = 0, tMax = 0;
  while (t < 30) { schritt(a, { gas: 1 }, DT, V_BLAU); t += DT; if (!t50 && a.v * 3.6 >= 50) t50 = t; if (!tMax && a.v >= V_BLAU * 0.98) { tMax = t; break; } }
  pruef(t50 > 1.5 && t50 < 4, `0–50 km/h in ${z1(t50)} s`);
  pruef(tMax > 4 && tMax < 12, `bis ${Math.round(V_BLAU * 3.6)} km/h (mit Blaulicht) in ${z1(tMax)} s, Gang ${a.gang}, ${Math.round(a.drehzahl)} U/min`);
  const b = neu(); for (let i = 0; i < 1200; i++) schritt(b, { gas: 1 }, DT, V_MAX);
  pruef(Math.abs(b.v - V_MAX) < 1, `ohne Blaulicht bleibt er bei ${Math.round(b.v * 3.6)} km/h`);
}
console.log('Bremsen');
for (const kmh of [50, 90]) {
  const a = neu(kmh / 3.6); let t = 0;
  while (a.v > 0.05 && t < 10) { schritt(a, { brems: 1 }, DT, V_BLAU); t += DT; }
  pruef(kmh === 50 ? a.z > 5 && a.z < 12 : a.z > 18 && a.z < 36, `von ${kmh} km/h steht er nach ${z1(a.z)} m (${z1(t)} s)`);
}
{
  const a = neu(50 / 3.6); let t = 0; while (a.v > 0 && t < 30) { schritt(a, {}, DT, V_BLAU); t += DT; }
  pruef(a.v === 0 && a.z > 25 && a.z < 120, `ausrollen von 50 km/h: ${z1(a.z)} m in ${z1(t)} s, dann steht er`);
}
console.log('Rückwärts');
{
  const a = neu(); for (let i = 0; i < 300; i++) schritt(a, { brems: 1 }, DT, V_MAX);
  pruef(a.v < -3 && a.v >= -STREIFE.rueck - 0.01 && a.gang === 0, `Bremse im Stand = rückwärts, bis ${z1(-a.v * 3.6)} km/h`);
  for (let i = 0; i < 240; i++) schritt(a, { gas: 1 }, DT, V_MAX);
  pruef(a.v > 3, 'danach Gas: bremst und fährt wieder vorwärts');
}
console.log('Kurven (Lenkung voll links, Tempo gehalten)');
for (const kmh of [10, 30, 50, 70, 90]) {
  const a = neu(kmh / 3.6); let quer = 0;
  for (let i = 0; i < 360; i++) { schritt(a, { gas: a.v < kmh / 3.6 ? 1 : 0, lenk: 1 }, DT, V_BLAU); quer = Math.max(quer, heck(a)); }
  const radius = a.v / Math.max(1e-6, Math.abs(a.r));
  pruef(a.r > 0 && radius < kmh * kmh / 130 + 8 && quer < 0.3, `${kmh} km/h: Kreis mit ${z1(radius)} m Halbmesser, rutscht höchstens ${z1(quer * 57.3)}° quer, Tempo ${Math.round(a.v * 3.6)} km/h`);
}
console.log('Zickzack bei 70 km/h mit Vollgas (Tasten: ganz oder gar nicht)');
{
  const a = neu(70 / 3.6); let quer = 0, drehMax = 0;
  for (let i = 0; i < 900; i++) { schritt(a, { gas: 1, lenk: Math.floor(i / 45) % 2 ? 1 : -1 }, DT, V_BLAU); quer = Math.max(quer, heck(a)); drehMax = Math.max(drehMax, Math.abs(a.r)); }
  pruef(quer < 0.4 && Math.abs(a.h) < 1.2, `kein Dreher: höchstens ${z1(quer * 57.3)}° quer, Richtung am Ende ${z1(a.h * 57.3)}°`);
}
console.log('Vollbremsung in der Kurve bei 80 km/h');
{
  const a = neu(80 / 3.6); for (let i = 0; i < 60; i++) schritt(a, { gas: 1, lenk: 1 }, DT, V_BLAU);
  const h0 = a.h; let quer = 0;
  for (let i = 0; i < 240; i++) { schritt(a, { brems: 1, lenk: 1 }, DT, V_BLAU); quer = Math.max(quer, heck(a)); }
  pruef(quer < 0.45 && a.v < 0.5, `bleibt in der Spur: höchstens ${z1(quer * 57.3)}° quer, lenkt dabei ${z1((a.h - h0) * 57.3)}° weiter`);
}
console.log('Abbiegen an der Kreuzung: mit 50 km/h ankommen, bremsen, 90° links');
{
  // So fährt ein Kind mit Tasten: Bremse, dann voll einlenken, dann Gas. Wie viel Platz braucht das?
  const a = neu(50 / 3.6); let i = 0;
  for (; a.v > 7; i++) schritt(a, { brems: 1 }, DT, V_MAX);
  const z0 = a.z;
  for (; a.h < Math.PI / 2 && i < 2000; i++) schritt(a, { gas: 0.5, lenk: 1 }, DT, V_MAX);
  pruef(a.z - z0 < 12 && a.x > 0 && a.x < 14, `Bogen braucht ${z1(a.z - z0)} m nach vorn und ${z1(a.x)} m zur Seite (links ist +x)`);
}
console.log('Anstoßen');
{
  const a = neu(15); a.h = 0.5;       // schräg auf eine Wand zu, die quer vor ihm steht (bei z = 0)
  a.x = 0; a.z = 0.2; const hart = stoss(a, a.x, a.z, a.x, 0, DT);
  pruef(hart > 5 && Math.abs(a.v) < 15 && Math.abs(Math.cos(a.h) * a.v - Math.sin(a.h) * a.q) < 0.01, `Stoß ${z1(hart)} m/s: Tempo in die Wand ist weg, entlang bleiben ${z1(Math.hypot(a.v, a.q))} m/s`);
}
console.log(fehler ? `\n${fehler} Prüfung(en) nicht bestanden.` : '\nAlles in Ordnung.');
process.exit(fehler ? 1 : 0);
