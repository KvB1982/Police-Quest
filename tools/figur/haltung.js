// Baut die Bewegung "stehen" einer fertigen Figur neu – so, wie ein Mensch wirklich dasteht:
//   • das Gewicht ruht auf EINEM Bein, das Becken schiebt sich darüber und kippt, das andere Bein ist locker (Knie leicht gebeugt, Fuß etwas vor)
//   • die Schultern kippen als Ausgleich in die andere Richtung, der Kopf bleibt gerade
//   • die Arme hängen NEBEN dem Körper (nicht daran geklebt), die Ellbogen sind leicht gebeugt, die Hände liegen vor den Oberschenkeln
//   • nichts steht still: atmen, ganz langsam das Gewicht verlagern, sich umsehen
// Ausgangspunkt ist das erste Bild der alten Bewegung "stehen" (darin stecken schon die gesenkten Schultern und die gekrümmten Finger).
const T = THREE, V = (x, y, z) => new T.Vector3(x, y, z), X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);

// Zahlen zum Einstellen (Winkel in Bogenmaß, Längen in Zentimetern). seite: +1 = Gewicht auf dem linken Bein, -1 = auf dem rechten.
const STAND = {
  seite: 1, dauer: 9, bps: 10,
  arm: 0.15,          // so weit stehen die Oberarme zusätzlich vom Körper ab
  armZurueck: 0.06,   // Oberarm ein wenig nach hinten (der Ellbogen sitzt hinter der Schulter)
  ellbogen: 0.14,     // so viel stärker als bisher sind die Ellbogen gebeugt
  handDreh: 0.2,      // Unterarm eindrehen: Der Handrücken zeigt schräg nach vorn
  becken: 2.6,        // so weit schiebt sich das Becken über das Standbein
  kipp: 0.05,         // so stark kippt das Becken (die Seite des lockeren Beins hängt)
  knie: 0.20,         // Oberschenkel des lockeren Beins nach vorn
  breit: 0.035,       // Beine etwas auseinander
  fuss: 0.16,         // Füße nach außen gedreht
  rund: 0.03,         // oberer Rücken leicht rund, Kopf etwas vor
  zurueck: 0,         // ganzer Oberkörper nach hinten gelehnt (für einen Bauch)
  blick: 0.10,        // so weit dreht sich der Kopf beim Umsehen
};

window.neuStehen = async (datei, opt = {}) => {
  const E = { ...STAND, ...opt }, s = E.seite;
  const glb = await ladeGlb(datei); let haut; glb.scene.traverse(n => { if (n.isSkinnedMesh) haut = n; });
  const knochen = haut.skeleton.bones, NAMEN = knochen.map(b => b.name), B = Object.fromEntries(knochen.map(b => [b.name, b]));
  const eltern = Object.fromEntries(knochen.map(b => [b.name, b.parent && b.parent.isBone ? b.parent.name : null]));
  const alt = T.AnimationClip.findByName(glb.animations, 'stehen');
  // Nur einmal anwenden: Die Rechnung geht von der schlichten Bewegung aus bake.js aus (wenige Bilder). Auf die neue Bewegung noch einmal angewendet, würde alles doppelt gedreht.
  if (alt.tracks[0].times.length > 8) throw new Error('Diese Figur hat die neue Haltung schon. Bitte die Datei aus bake.js oder nach.js nehmen.');
  const q0 = {}; for (const n of NAMEN) q0[n] = B[n].quaternion.clone();
  let h0 = B.Hips.position.clone();
  for (const sp of alt.tracks) { const [n, was] = sp.name.split('.'); if (was === 'quaternion' && q0[n]) q0[n].fromArray(sp.values, 0); else if (was === 'position' && n === 'Hips') h0 = V(sp.values[0], sp.values[1], sp.values[2]); }
  const welt = q => { const W = {}; for (const n of NAMEN) W[n] = eltern[n] ? W[eltern[n]].clone().multiply(q[n]) : q[n].clone(); return W; };
  const lokal = W => { const q = {}; for (const n of NAMEN) q[n] = eltern[n] ? W[eltern[n]].clone().invert().multiply(W[n]) : W[n].clone(); return q; };
  const unter = (n, m) => { let k = m; while (k) { if (k === n) return true; k = eltern[k]; } return false; };
  const beinLang = Math.abs(B.LeftLeg.position.length()) + Math.abs(B.LeftFoot.position.length());
  const W0 = welt(q0), LI = s > 0 ? 'Left' : 'Right', RE = s > 0 ? 'Right' : 'Left';      // LI = Standbein, RE = lockeres Bein
  const bild = t => {
    const W = {}; for (const n of NAMEN) W[n] = W0[n].clone();
    const dreh = (n, achse, winkel) => { const d = new T.Quaternion().setFromAxisAngle(achse, winkel); for (const m of NAMEN) if (unter(n, m)) W[m].premultiply(d); };
    const w = k => Math.sin(2 * Math.PI * k * t / E.dauer), w2 = (k, p) => Math.sin(2 * Math.PI * k * t / E.dauer + p);
    const atem = w(3), wiege = w(1);
    // ---- Becken: schiebt sich über das Standbein und kippt. Die Beine gleichen das aus, damit die Füße stehen bleiben.
    const dx = s * E.becken + 0.7 * wiege, kipp = s * (E.kipp + 0.006 * wiege);
    dreh('Hips', Z, kipp); dreh('Hips', X, -E.zurueck * 0.4);
    for (const S of ['Left', 'Right']) { const v = S === 'Left' ? 1 : -1;
      dreh(S + 'UpLeg', Z, -kipp); dreh(S + 'UpLeg', X, E.zurueck * 0.4);
      dreh(S + 'UpLeg', Z, -dx / beinLang + v * E.breit); dreh(S + 'Foot', Z, dx / beinLang - v * E.breit);
      dreh(S + 'UpLeg', Y, v * E.fuss); }
    // lockeres Bein: Oberschenkel vor, Unterschenkel fast senkrecht, Fuß flach und etwas weiter ausgedreht
    dreh(RE + 'UpLeg', X, -E.knie); dreh(RE + 'Leg', X, E.knie + 0.05); dreh(RE + 'Foot', X, -0.05); dreh(RE + 'UpLeg', Y, -s * 0.12);
    // ---- Rücken: gleicht das gekippte Becken aus, die Schultern kippen zur anderen Seite. Dazu atmen und ganz leicht drehen.
    dreh('Spine', Z, -kipp * 0.8); dreh('Spine1', Z, -kipp * 0.7); dreh('Neck', Z, kipp * 0.5);
    dreh('Spine', X, -E.zurueck * 0.6); dreh('Spine2', X, E.rund - 0.012 * atem); dreh('Spine1', X, -0.006 * atem); dreh('Neck', X, E.rund * 1.6 + 0.008 * atem); dreh('Head', X, -E.rund * 1.2 + 0.02 * w2(2, 1));
    dreh('Spine1', Y, -s * 0.05 + 0.02 * w2(1, 1)); dreh('Head', Y, s * 0.06 + E.blick * w2(1, 2) + 0.03 * w(2));
    // ---- Arme: hängen neben dem Körper, Ellbogen gebeugt, Hände vor den Oberschenkeln. Beim Atmen heben sich die Schultern ein wenig.
    for (const S of ['Left', 'Right']) { const v = S === 'Left' ? 1 : -1, eigen = S === LI ? 1 : 0.8;
      dreh(S + 'Shoulder', Z, v * 0.010 * (atem + 1));
      dreh(S + 'Arm', Z, v * (E.arm * eigen + 0.008 * atem)); dreh(S + 'Arm', X, E.armZurueck + 0.012 * w2(2, v));
      dreh(S + 'ForeArm', X, -(E.ellbogen * (S === LI ? 0.85 : 1.1) + 0.02 * w2(2, 1 + v))); dreh(S + 'ForeArm', Y, -v * E.handDreh);
      dreh(S + 'Hand', X, 0.12); }
    // Das Standbein-Hüftgelenk hebt sich beim Kippen – das ganze Becken sinkt um dieses Stück, damit der Fuß am Boden bleibt.
    const hebt = Math.abs(B.LeftUpLeg.position.x) * Math.sin(Math.abs(kipp));
    return { q: lokal(W), h: V(h0.x + dx, h0.y - hebt + 0.15 * atem, h0.z - E.zurueck * 6) };
  };
  const N = Math.round(E.dauer * E.bps), bilder = [...Array(N).keys()].map(i => bild(i / E.bps)), alle = [...bilder, bilder[0]], zeiten = alle.map((_, i) => i / E.bps), spuren = [];
  for (const n of NAMEN) { const werte = []; let vor = null; for (const P of alle) { const q = P.q[n].clone(); if (vor && vor.dot(q) < 0) { q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; } vor = q; werte.push(q.x, q.y, q.z, q.w); } spuren.push(new T.QuaternionKeyframeTrack(n + '.quaternion', zeiten, werte)); }
  spuren.push(new T.VectorKeyframeTrack('Hips.position', zeiten, alle.flatMap(P => [P.h.x, P.h.y, P.h.z])));
  const clips = glb.animations.map(c => c.name === 'stehen' ? new T.AnimationClip('stehen', -1, spuren) : c);
  const wurzel = glb.scene.children.length === 1 ? glb.scene.children[0] : glb.scene;
  return { wurzel, haut, clips };
};
window.alsGlb = window.alsGlb || ((wurzel, clips) => new Promise((ok, f) => new GLTFExporter().parse(wurzel, r => { const b = new Uint8Array(r); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); ok(btoa(s)); }, f, { binary: true, animations: clips })));
