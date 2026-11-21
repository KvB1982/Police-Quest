// Malt den Stadtplan als Bild-Datei (SVG) zum Ansehen:  node tools/plan.mjs [datei.svg]
// Dazu ein paar Zahlen: wie viele Straßen, Kreuzungen, Häuser – und welche Kanten sehr kurz sind.
import { PLAN as P, BESONDERE, UFER, FLEET, GLEIS, GROSS } from '../js/stadtplan.js';
import fs from 'fs';
const R = [-880, -200, 900, 900], f = n => n.toFixed(1);
const FARBE = { alt: '#c98f72', city: '#c9b8a4', reihe: '#d4a184', speicher: '#a8705a', einzel: '#d9a98a', wohnblock: '#c5c9cf', gewerbe: '#b9c0c6', besonders: '#e8554a' };
let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${R[0]} ${R[1]} ${R[2] - R[0]} ${R[3] - R[1]}" width="${(R[2] - R[0]) * 1.4}" height="${(R[3] - R[1]) * 1.4}"><rect x="${R[0]}" y="${R[1]}" width="2000" height="1200" fill="#cfe3b8"/>`;
s += `<rect x="${R[0]}" y="${R[1]}" width="2000" height="${UFER - R[1]}" fill="#8fc0dc"/><rect x="${FLEET[0]}" y="${FLEET[1]}" width="${FLEET[2] - FLEET[0]}" height="${FLEET[3] - FLEET[1]}" fill="#8fc0dc"/>`;
s += `<rect x="${GLEIS[0]}" y="${GLEIS[1]}" width="${GLEIS[2] - GLEIS[0]}" height="1000" fill="#b8ad9c"/>`;
for (const t of P.teiche) s += `<ellipse cx="${t.x}" cy="${t.z}" rx="${t.rx}" ry="${t.rz}" fill="#8fc0dc"/>`;
for (const W of P.wege) s += `<polyline points="${W.pts.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="none" stroke="#eee8dc" stroke-width="${W.b + 2 * W.geh}" stroke-linejoin="round"/>`;
for (const W of P.wege) s += `<polyline points="${W.pts.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="none" stroke="${W.art === 'autobahn' ? '#f0a040' : W.art === 'ring' || W.b > 12 ? '#ffe08a' : W.art === 'gasse' ? '#f4efe4' : '#ffffff'}" stroke-width="${W.b}" stroke-linejoin="round"/>`;
for (const h of P.haeuser) s += `<polygon points="${h.ecken.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="${FARBE[h.typ] || '#999'}" stroke="#7a5a4a" stroke-width="0.3"/>`;
for (const b of P.baeume) s += `<circle cx="${f(b.x)}" cy="${f(b.z)}" r="1.6" fill="#5f9a4a"/>`;
for (const p of P.parker) s += `<circle cx="${f(p.x)}" cy="${f(p.z)}" r="1" fill="#445"/>`;
for (const k of P.knoten) s += `<circle cx="${f(k.x)}" cy="${f(k.z)}" r="${Math.max(1.5, k.r)}" fill="none" stroke="#d33" stroke-width="0.4"/>`;
for (const b of BESONDERE) s += `<text x="${(b.r[0] + b.r[2]) / 2}" y="${b.r[1] - 2}" font-size="9" text-anchor="middle" fill="#600">${b.schild.split(' ')[0]}</text>`;
s += `<rect x="${GROSS[0]}" y="${GROSS[1]}" width="${GROSS[2] - GROSS[0]}" height="${GROSS[3] - GROSS[1]}" fill="none" stroke="#06c" stroke-dasharray="6 4"/></svg>`;
fs.writeFileSync(process.argv[2] || 'tools/plan.svg', s);
console.log(`${P.wege.length} Straßen · ${P.knoten.length} Kreuzungen · ${P.kanten.length} Kanten · ${P.haeuser.length} Häuser · ${P.baeume.length} Bäume · ${P.laternen.length} Laternen · ${P.parker.length} parkende Autos`);
const kurz = P.kanten.filter(e => e.l < 14).map(e => `${e.weg.name} ${f(e.l)} m bei ${f(P.knoten[e.a].x)}/${f(P.knoten[e.a].z)}`);
console.log(`kurze Kanten (${kurz.length}):`, kurz.join(' · '));
console.log('Brücken über das Fleet:', P.bruecken.map(q => q.map(f).join('…')).join(' · '), '· Bahnübergänge:', P.uebergaenge.map(q => q.map(f).join('…')).join(' · '));
console.log('eng gesetzt:', BESONDERE.filter(b => b.eng).map(b => b.schild).join(', ') || 'nichts');
