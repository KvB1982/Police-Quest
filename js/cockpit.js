// Blaulicht über Möwenbrück – das Cockpit des Streifenwagens (was man sieht, wenn man am Lenkrad sitzt).
//
// Vorbild: die Cockpits im Schwester-Spiel Rennspiel (dort js/supercarbau.js und js/kamera.js). Lenkrad mit Händen und
// der Bildschirm mit Tempo, Gang und Drehzahl kommen von dort (js/cockpitteile.js).
//
// So funktioniert es: Das Cockpit ist eine eigene kleine Szene, in der der Wagen immer gerade bei 0/0 steht.
// Das Spiel malt zuerst die Stadt (mit einer Kamera an der Stelle deiner Augen) und danach das Cockpit obendrauf.
// Wo im Cockpit nichts ist (Scheiben), schaut die Stadt durch. Vorteil: Das Lenkrad ist ganz nah an der Kamera und
// die Stadt reicht kilometerweit – in EINEM Bild gäbe das Flimmern in der Ferne.
//
// Richtungen im Wagen: +z ist vorn, +x ist links, +y ist oben. Du sitzt links.

import * as THREE from 'three';
import { stab, klotz, baueAnzeige, baueLenkrad, lueftung } from './cockpitteile.js';
import { STREIFE } from './fahrphysik.js';

// ---------------------------------------------------------------- Zahlen zum Einstellen
export const AUGE = [0.38, 1.25, -0.05];     // wo deine Augen sind: links, hoch, vor (Meter, von der Mitte des Wagens am Boden)
const BLICK_TIEF = -0.09;                    // so weit schaut man von selbst nach unten (rad) – dann sieht man das Armaturenbrett
const WINKEL = 60, WINKEL_TEMPO = 9;         // Blickwinkel im Stand und so viel weiter bei Höchsttempo (so fühlt sich Tempo nach Tempo an)
const KOPF = 0.05, KOPF_MAX = 0.04;          // Kopf neigt sich in die Kurve: so viel pro "g", höchstens (rad; 0,04 sind gut 2 Grad)
const KOPF_WEICH = 5;                        // so schnell folgt der Kopf (kleiner = ruhiger)
const UMSEHEN = [1.9, 0.5];                  // so weit kann man sich umsehen: zur Seite und nach oben/unten (rad)
const LENKRAD_MAL = 3.2, LENKRAD_WEIT = 1.9; // Lenkrad dreht so viel mehr als die Räder, die Hände gehen höchstens so weit mit (rad)
const INNEN_HELL = 0.8;                      // im Wagen ist es dunkler als draußen (Dach)
const WISCH_TAKT = 1.1;                      // Scheibenwischer: so viele Sekunden für einmal hin und her (bei starkem Regen)

const farbe = (c, rau = 0.85, metall = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rau, metalness: metall });
const leucht = (c, stark = 1) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: stark, roughness: 0.4 });

// Der kleine Einsatz-Bildschirm in der Mitte: zeigt Rufname, Blaulicht-Stufe und die Uhrzeit des Spiels.
function baueEinsatzSchirm(breite, hoehe) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = Math.round(256 * hoehe / breite);
  const g = cv.getContext('2d'), B = cv.width, H = cv.height;
  const bild = new THREE.CanvasTexture(cv); bild.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(breite, hoehe), new THREE.MeshBasicMaterial({ map: bild, toneMapped: false }));
  mesh.rotation.y = Math.PI;
  let zuletzt = '';
  function male(stufe, uhr, funk, privat) {
    const key = stufe + '|' + uhr + '|' + (funk ? 1 : 0) + (privat ? 'p' : '');
    if (key === zuletzt) return; zuletzt = key;
    g.fillStyle = '#08111f'; g.fillRect(0, 0, B, H);
    if (privat) {       // dein eigenes Auto: Statt der Einsatz-Anzeige läuft hier nur das Radio
      g.textBaseline = 'middle'; g.textAlign = 'center';
      g.fillStyle = '#ffb347'; g.font = `bold ${H * 0.26}px sans-serif`; g.fillText(uhr || '', B * 0.5, H * 0.3);
      g.fillStyle = '#9fb3d1'; g.font = `bold ${H * 0.13}px sans-serif`; g.fillText('📻 Radio Möwenwelle 98,4', B * 0.5, H * 0.68);
      bild.needsUpdate = true; return;
    }
    g.fillStyle = '#12233f'; g.fillRect(0, 0, B, H * 0.2);
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = '#cfe0ff'; g.font = `bold ${H * 0.13}px sans-serif`; g.fillText('MÖWE 14', B * 0.05, H * 0.105);
    g.textAlign = 'right'; g.fillText(uhr || '', B * 0.95, H * 0.105);
    // drei Felder: aus · Blaulicht · Blaulicht mit Sirene (das gewählte leuchtet)
    const felder = [['AUS', '#3a4658'], ['BLAU', '#1e66ff'], ['SIRENE', '#ff3b30']];
    g.textAlign = 'center'; g.font = `bold ${H * 0.12}px sans-serif`;
    felder.forEach(([text, f], i) => {
      const x = B * (0.05 + i * 0.31), w = B * 0.28, y = H * 0.3, h = H * 0.3, an = stufe === i;
      g.fillStyle = an ? f : '#141d2c'; g.fillRect(x, y, w, h);
      g.strokeStyle = an ? '#ffffff' : '#2a3850'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
      g.fillStyle = an ? '#ffffff' : '#62728c'; g.fillText(text, x + w / 2, y + h / 2);
    });
    // Funk: Zeile unten, blinkt gelb, wenn die Leitstelle ruft
    g.fillStyle = funk ? '#ffd23a' : '#17263c'; g.fillRect(B * 0.05, H * 0.7, B * 0.9, H * 0.22);
    g.fillStyle = funk ? '#201800' : '#7f93b3'; g.font = `bold ${H * 0.12}px sans-serif`;
    g.fillText(funk ? '📻 LEITSTELLE RUFT' : 'Funk: Kanal 2 · bereit', B * 0.5, H * 0.815);
    bild.needsUpdate = true;
  }
  male(0, '', false);
  return { mesh, male };
}

export function baueCockpit() {
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(WINKEL, 1, 0.05, 30);
  kamera.rotation.order = 'YXZ';
  const [ax, ay, az] = AUGE;

  // ---- Licht: kommt in jedem Bild von draußen (Farbe und Stärke von Himmel und Sonne), nur dunkler – und das Blaulicht blitzt mit.
  const himmelLicht = new THREE.HemisphereLight('#ffffff', '#55524a', 1);
  const sonnenLicht = new THREE.DirectionalLight('#fff4e0', 1); szene.add(sonnenLicht.target);
  const blauLicht = new THREE.PointLight('#2a6bff', 0, 6, 1.2); blauLicht.position.set(0, 1.75, 0.9);
  const geraeteLicht = new THREE.PointLight('#9fc4ff', 0.25, 1.6, 1.5); geraeteLicht.position.set(ax, 1.0, 0.55);   // die Anzeigen leuchten ein wenig auf Hände und Lenkrad
  szene.add(himmelLicht, sonnenLicht, blauLicht, geraeteLicht);

  // ---- Stoffe
  const brett = farbe(0x2b2d33, 0.8), weich = farbe(0x3b3e46, 0.95), dunkel = farbe(0x0e0f11, 1), sitz = farbe(0x30343c, 0.95);
  const himmelStoff = farbe(0x8f9299, 1), alu = farbe(0xaeb3bb, 0.3, 0.9), gummi = farbe(0x08090a, 0.9);
  const lack = new THREE.MeshStandardMaterial({ color: 0xb4bac1, roughness: 0.38, metalness: 0.35 });       // der Streifenwagen ist silbern
  const blau = farbe(0x1f5fd0, 0.5), glas = new THREE.MeshBasicMaterial({ color: 0x6f8296, toneMapped: false });
  const add = m => { szene.add(m); return m; };

  // ---- Motorhaube: weiß, fällt nach vorn ab, an den Seiten etwas runder. Hinten das blaue Band der Polizei-Folie.
  add(klotz(1.5, 0.05, 1.26, lack, 0, 0.945, 1.93, 0.06));
  for (const s of [-1, 1]) add(klotz(0.24, 0.05, 1.24, lack, s * 0.83, 0.925, 1.92, 0.07, 0, -s * 0.2));
  add(klotz(1.5, 0.012, 0.3, blau, 0, 0.99, 1.5, 0.06));
  // Wischer-Kasten zwischen Haube und Scheibe
  add(klotz(1.76, 0.05, 0.12, gummi, 0, 0.965, 1.27));

  // ---- Armaturenbrett: Platte bis zur Scheibe, Front zum Fahrer, Naht, Zierleiste
  const brettOben = 0.96, brettHinten = 0.74;
  add(klotz(1.78, 0.06, 0.52, brett, 0, brettOben - 0.03, brettHinten + 0.26));
  add(klotz(1.78, 0.4, 0.06, weich, 0, brettOben - 0.23, brettHinten + 0.03, -0.12));
  add(klotz(1.78, 0.012, 0.01, alu, 0, brettOben - 0.2, brettHinten - 0.012));
  // Lüftungsdüsen: zwei außen, zwei in der Mitte
  for (const x of [0.78, -0.78, 0.13, -0.13]) { const d = lueftung(0.045, alu, dunkel); d.position.set(x, brettOben - 0.11, brettHinten - 0.005); add(d); }
  // Handschuhfach vor dem Beifahrersitz
  add(klotz(0.44, 0.16, 0.012, brett, -0.44, brettOben - 0.3, brettHinten - 0.012, -0.12));
  add(klotz(0.07, 0.014, 0.012, alu, -0.44, brettOben - 0.24, brettHinten - 0.02));

  // ---- Boden, Wand zum Motorraum, Türen, Dach: überall dort, wo man sonst auf die Straße schauen würde
  add(klotz(1.84, 0.04, 3.3, dunkel, 0, 0.3, -0.45));
  add(klotz(1.84, 0.66, 0.05, dunkel, 0, 0.63, 1.2));
  for (const s of [-1, 1]) {
    add(klotz(0.06, 0.68, 3.3, weich, s * 0.91, 0.65, -0.45));                      // Tür und Seitenwand bis zur Fensterkante
    add(klotz(0.1, 0.04, 2.3, brett, s * 0.88, 0.97, -0.05));                       // Fensterkante
    add(klotz(0.09, 0.06, 0.5, brett, s * 0.85, 0.8, 0.05));                        // Armlehne
    add(klotz(0.03, 0.02, 0.12, alu, s * 0.87, 0.9, 0.38));                         // Türgriff
    // Scheibensäule vorn (A), Säule hinter der Vordertür (B), Säule hinten (C), Dachholm
    add(stab([s * 0.87, 0.96, 1.22], [s * 0.72, 1.5, 0.52], 0.045, brett));
    add(stab([s * 0.9, 0.98, -0.5], [s * 0.76, 1.5, -0.5], 0.05, brett));
    add(stab([s * 0.9, 0.98, -1.75], [s * 0.74, 1.5, -1.45], 0.07, brett));
    add(stab([s * 0.74, 1.5, 0.52], [s * 0.75, 1.5, -1.5], 0.04, brett));
    add(klotz(0.34, 0.012, 0.15, himmelStoff, s * 0.38, 1.475, 0.47, -0.3));        // Sonnenblende
    // Außenspiegel: Gehäuse in Wagenfarbe, Glas zum Fahrer
    add(klotz(0.2, 0.12, 0.07, gummi, s * 1.06, 1.05, 1.0, 0, -s * 0.25));
    const g = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.095), glas); g.position.set(s * 1.055, 1.05, 0.962); g.rotation.y = Math.PI - s * 0.25; add(g);
    add(klotz(0.12, 0.03, 0.05, gummi, s * 0.95, 1.0, 1.03));
  }
  add(klotz(1.56, 0.04, 2.1, himmelStoff, 0, 1.525, -0.5));                          // Dachhimmel
  add(klotz(1.5, 0.06, 0.08, brett, 0, 1.5, 0.52));                                  // Dachkante über der Scheibe
  add(klotz(1.5, 0.08, 0.1, brett, 0, 1.49, -1.47));                                 // Dachkante über der Heckscheibe
  // Innenspiegel
  add(stab([0, 1.47, 0.5], [0, 1.42, 0.46], 0.01, brett));
  add(klotz(0.25, 0.07, 0.025, brett, 0, 1.4, 0.455));
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(0.23, 0.055), glas); g.position.set(0, 1.4, 0.441); g.rotation.y = Math.PI; add(g); }

  // ---- Sitze: deiner (man sieht ihn nur beim Umsehen), der von Otto, hinten die Bank mit Trenngitter
  for (const x of [ax, -ax]) {
    add(klotz(0.5, 0.12, 0.5, sitz, x, 0.5, az - 0.05));
    add(klotz(0.48, 0.66, 0.12, sitz, x, 0.86, az - 0.36, -0.12));
    add(klotz(0.26, 0.2, 0.1, sitz, x, 1.3, az - 0.43));
  }
  add(klotz(1.6, 0.14, 0.5, sitz, 0, 0.5, -1.15));
  add(klotz(1.6, 0.6, 0.12, sitz, 0, 0.84, -1.45, -0.15));
  add(klotz(1.6, 0.04, 0.5, dunkel, 0, 0.97, -1.72));                                // Hutablage
  // Trenngitter hinter den Vordersitzen (dahinter sitzen die Festgenommenen): Rahmen und Stäbe
  add(klotz(1.6, 0.03, 0.03, alu, 0, 1.46, -0.56)); add(klotz(1.6, 0.03, 0.03, alu, 0, 1.0, -0.56));
  for (let i = -5; i <= 5; i++) add(klotz(0.012, 0.46, 0.012, alu, i * 0.15, 1.23, -0.56));

  // ---- Mittelkonsole: Einsatz-Bildschirm, Blaulicht-Schalter, Funkgerät mit Hörer, Schalthebel, Handbremse
  const schirm = baueEinsatzSchirm(0.24, 0.13);
  schirm.mesh.position.set(0, brettOben + 0.045, brettHinten + 0.045); schirm.mesh.rotation.x = 0.14; schirm.mesh.rotation.y = Math.PI - 0.22; add(schirm.mesh);
  add(klotz(0.27, 0.16, 0.03, brett, 0, brettOben + 0.045, brettHinten + 0.065, -0.14, -0.22));
  add(stab([0, brettOben - 0.02, brettHinten + 0.1], [0, brettOben + 0.02, brettHinten + 0.08], 0.018, brett));
  add(klotz(0.26, 0.34, 0.5, brett, 0, 0.58, 0.5, -0.5));                             // Konsole fällt zum Schalthebel ab
  add(klotz(0.26, 0.26, 0.95, brett, 0, 0.5, -0.05));
  // Funkgerät: Kasten mit kleiner grüner Anzeige und Drehknöpfen, daneben der Hörer am Spiralkabel
  add(klotz(0.2, 0.06, 0.02, dunkel, 0, 0.77, 0.642, -0.5));
  add(klotz(0.09, 0.028, 0.006, leucht(0x41ff8a, 0.9), 0.035, 0.775, 0.628, -0.5));
  for (const x of [-0.045, -0.08]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.014, 10), alu); k.rotation.x = Math.PI / 2 - 0.5; k.position.set(x, 0.775, 0.626); add(k); }
  add(klotz(0.05, 0.16, 0.035, dunkel, -0.17, 0.74, 0.64, -0.5, 0, 0.1));            // Hörer
  for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.004, 5, 8), dunkel); r.position.set(-0.17 + i * 0.012, 0.64 - i * 0.012, 0.6 - i * 0.02); r.rotation.x = 1.1; add(r); }
  // Schalter für Blaulicht und Sirene: drei Lämpchen, die wirklich zeigen, was an ist
  const lampAus = leucht(0x7a8698, 0.5), lampBlau = leucht(0x1e66ff, 0), lampSirene = leucht(0xff3b30, 0);
  [lampAus, lampBlau, lampSirene].forEach((m, i) => { add(klotz(0.04, 0.022, 0.008, m, 0.06 - i * 0.06, 0.705, 0.602, -0.5)); add(klotz(0.05, 0.034, 0.012, dunkel, 0.06 - i * 0.06, 0.7, 0.61, -0.5)); });
  // Schalthebel (Automatik) und Handbremse
  add(stab([0, 0.63, 0.22], [0, 0.74, 0.25], 0.012, alu)); { const k = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), gummi); k.position.set(0, 0.755, 0.253); k.scale.set(1, 1.2, 1.3); add(k); }
  add(klotz(0.1, 0.012, 0.16, dunkel, 0, 0.633, 0.22));
  add(stab([-0.06, 0.64, -0.1], [-0.06, 0.68, 0.07], 0.014, gummi));
  // Becherhalter mit Kaffeebecher (Otto trinkt viel Kaffee)
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 12), farbe(0xe9e4d8, 0.7)); b.position.set(0.05, 0.68, -0.18); add(b);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.012, 12), farbe(0x3a2a20, 0.6)); d.position.set(0.05, 0.735, -0.18); add(d); }

  // ---- Lenkrad mit Händen (Kims Uniform: dunkelblaue Ärmel), dahinter Lenksäule und die beiden Hebel
  const ly = ay - 0.37, lz = az + 0.58;
  const lenk = baueLenkrad('rund', { r: 0.18, naht: 0x1f5fd0, handschuh: 0x17181b, aermel: 0x18233f, weit: LENKRAD_WEIT });
  lenk.halter.position.set(ax, ly, lz); lenk.halter.rotation.x = 0.4; add(lenk.halter);
  add(stab([ax, ly, lz + 0.02], [ax, ly - 0.09, brettHinten + 0.05], 0.03, brett, 0.038));
  for (const s of [-1, 1]) add(stab([ax, ly - 0.03, lz + 0.09], [ax + s * 0.21, ly - 0.015, lz + 0.07], 0.008, dunkel));

  // ---- Anzeige hinter dem Lenkrad: zeigt wirklich Tempo, Gang und Drehzahl. Drumherum das Gehäuse.
  const anz = baueAnzeige(0.27, 0.088, { art: 'rund', farbe: '#5aa2ff' });
  // Sie sitzt so tief, dass man sie – wie im echten Auto – zwischen Lenkradkranz und Nabe hindurch sieht.
  const anzY = brettOben - 0.072;
  anz.mesh.position.set(ax, anzY, brettHinten - 0.062); anz.mesh.rotation.x = 0.2; add(anz.mesh);
  add(klotz(0.31, 0.12, 0.03, dunkel, ax, anzY, brettHinten - 0.04, 0.2));
  add(klotz(0.4, 0.03, 0.14, brett, ax, brettOben + 0.012, brettHinten + 0.06, -0.08));       // kleines Dach gegen die Sonne
  for (const s of [-1, 1]) add(klotz(0.02, 0.13, 0.1, brett, ax + s * 0.165, anzY + 0.005, brettHinten - 0.03));

  // ---- Scheibenwischer: Die beiden Arme liegen unten auf der Scheibe und wischen bei Regen.
  // Die Gruppe ist so gekippt, dass ihre y-Richtung die Scheibe hinaufzeigt; die Arme drehen sich dann flach auf der Scheibe.
  const wischer = [0.52, -0.2].map(x => {
    const fuss = new THREE.Group(); fuss.position.set(x, 0.99, 1.22); fuss.rotation.x = -0.99;
    const arm = new THREE.Group(); fuss.add(arm);
    arm.add(klotz(0.022, 0.56, 0.012, gummi, 0, 0.28, 0.012)); arm.add(klotz(0.012, 0.5, 0.02, gummi, 0, 0.3, 0.004));
    arm.rotation.z = 1.5; add(fuss); return arm;
  });
  let wischZeit = 0;

  szene.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = true; } });

  // Für die Anzeige braucht das Bauteil aus dem Rennspiel die Wagen-Werte unter anderen Namen.
  const zeig = { u: 0, drehzahl: 0, gang: 1, p: { gaenge: 5, drehzahlMin: 0, drehzahlMax: 7000, vMax: 50 } };
  const sonneOrt = new THREE.Vector3();
  let kopf = 0, frisch = true;

  // Stellt die Welt-Kamera an die Stelle deiner Augen und die Cockpit-Kamera passend dazu.
  //   a = der Wagen (x, z, h, v, ay, kippen, nicken …), blickW/blickN = wie weit man sich umsieht (zur Seite / nach oben)
  function blick(welt, a, blickW, blickN, dt) {
    const sh = Math.sin(a.h), ch = Math.cos(a.h);
    const w = Math.max(-UMSEHEN[0], Math.min(UMSEHEN[0], blickW)), n = Math.max(-UMSEHEN[1], Math.min(UMSEHEN[1], blickN));
    // Der Kopf neigt sich in die Kurve (weich), wie im Rennspiel
    const kopfZiel = Math.max(-KOPF_MAX, Math.min(KOPF_MAX, (a.ay || 0) / 9.81 * KOPF));
    kopf = frisch ? kopfZiel : kopf + (kopfZiel - kopf) * Math.min(1, dt * KOPF_WEICH); frisch = false;
    const tempo = Math.min(1, Math.abs(a.v) / 26), winkel = WINKEL + tempo * WINKEL_TEMPO;
    const nick = (a.nicken || 0) * 0.5;
    welt.rotation.order = 'YXZ';
    welt.position.set(a.x + sh * az + ch * ax, ay, a.z + ch * az - sh * ax);
    welt.rotation.set(BLICK_TIEF + n - nick, a.h + w + Math.PI, kopf);
    if (Math.abs(welt.fov - winkel) > 0.01) { welt.fov = winkel; welt.updateProjectionMatrix(); }
    kamera.position.set(ax, ay, az);
    kamera.rotation.set(BLICK_TIEF + n + nick, w + Math.PI, kopf + (a.kippen || 0));       // im Wagen sieht man zusätzlich, wie sich die Karosserie neigt
    if (kamera.fov !== welt.fov || kamera.aspect !== welt.aspect) { kamera.fov = welt.fov; kamera.aspect = welt.aspect; kamera.updateProjectionMatrix(); }
  }

  // Einmal pro Bild: Lenkrad, Anzeigen, Licht, Wischer.
  //   s = { blaulicht: 0 | 1 | 2, blink: true/false, uhr: 'Text', funk: true/false, oben, sonne (die Lichter der Stadt), sonneRichtung, regen: 0…1 }
  function schritt(dt, a, s) {
    lenk.stelle(-(a.lenkWinkel || 0) * LENKRAD_MAL);
    zeig.u = a.v; zeig.drehzahl = a.drehzahl; zeig.gang = a.gang || 1; zeig.p.drehzahlMax = STREIFE.drehzahlMax + 500; zeig.p.vMax = s.max || 26;
    anz.male(zeig);
    schirm.male(s.blaulicht, s.uhr, s.funk && Math.floor(performance.now() / 400) % 2 === 0, s.privat);
    lampAus.emissiveIntensity = s.blaulicht || s.privat ? 0 : 0.5; lampBlau.emissiveIntensity = s.blaulicht ? 2 : 0; lampSirene.emissiveIntensity = s.blaulicht === 2 ? 2 : 0;
    // Licht von draußen: gleiche Farben, etwas dunkler; die Sonne steht für den Wagen woanders, wenn er sich dreht
    if (s.oben) { himmelLicht.color.copy(s.oben.color); himmelLicht.groundColor.copy(s.oben.groundColor); himmelLicht.intensity = s.oben.intensity * INNEN_HELL; }
    if (s.sonne && s.sonneRichtung) {
      sonnenLicht.color.copy(s.sonne.color); sonnenLicht.intensity = s.sonne.intensity * INNEN_HELL;
      const sh = Math.sin(a.h), ch = Math.cos(a.h), r = s.sonneRichtung;
      sonneOrt.set(r.x * ch - r.z * sh, Math.max(0.25, r.y), r.x * sh + r.z * ch).multiplyScalar(10);
      sonnenLicht.position.copy(sonneOrt); sonnenLicht.target.position.set(0, 1, 0);
    }
    blauLicht.intensity = s.blaulicht ? (s.blink ? 2.4 : 0.7) : 0; blauLicht.position.x = s.blink ? 0.4 : -0.4;
    // Scheibenwischer: erst ab etwas Regen, bei starkem Regen schneller
    const regen = s.regen || 0;
    if (regen > 0.08 || wischZeit % 1 > 0.02) wischZeit += dt / (WISCH_TAKT * (regen > 0.5 ? 1 : 1.8)); else wischZeit = 0;
    const hin = 0.5 - 0.5 * Math.cos((wischZeit % 1) * Math.PI * 2);
    for (const w of wischer) w.rotation.z = 1.5 - hin * 1.25;
  }

  return { szene, kamera, blick, schritt, neu() { frisch = true; } };
}
