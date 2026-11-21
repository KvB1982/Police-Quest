// Baut aus der Figur (klein.glb, ohne Knochen) und der Bewegung (lauf.fbx) eine Spielfigur mit Knochen und drei Bewegungen.
const T = THREE, V = (x, y, z) => new T.Vector3(x, y, z), glatt = (v, a, b) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const KETTE = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'];
const SEITE = ['Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot', 'ToeBase'];
const ECHT = [...KETTE, ...SEITE.map(n => 'Left' + n), ...SEITE.map(n => 'Right' + n)];       // diese Knochen gibt es in den Aufnahmen
const FINGER = ['Finger1', 'Finger2', 'Finger3', 'Thumb'];                                     // diese bauen wir selbst dazu: drei Gelenke für alle vier Finger zusammen, eins für den Daumen
const NAMEN = [...ECHT, ...FINGER.map(n => 'Left' + n), ...FINGER.map(n => 'Right' + n)];
// So stark sind die Finger gekrümmt (Winkel in Bogenmaß für Gelenk 1, 2, 3 und den Daumen)
const KRUMM = { stehen: [0.32, 0.5, 0.36, 0.35], gehen: [0.4, 0.58, 0.4, 0.4], laufen: [0.85, 1.15, 0.7, 0.55] };
const gegen = n => n.startsWith('Left') ? 'Right' + n.slice(4) : n.startsWith('Right') ? 'Left' + n.slice(5) : n;

window.backe = async (opt = {}) => {
  const fbx = await ladeFbx('lauf.fbx'); fbx.updateMatrixWorld(true);
  const alt = Object.fromEntries(ECHT.map(n => [n, fbx.getObjectByName(n)]));
  const eltern = Object.fromEntries(ECHT.map(n => [n, ECHT.includes(alt[n].parent.name) ? alt[n].parent.name : null]));
  for (const S of ['Left', 'Right']) { eltern[S + 'Finger1'] = S + 'Hand'; eltern[S + 'Finger2'] = S + 'Finger1'; eltern[S + 'Finger3'] = S + 'Finger2'; eltern[S + 'Thumb'] = S + 'Hand'; }
  // Ruhe-Haltung (T-Pose): Lage und Drehung jedes Knochens in der Welt
  const ruhe = {}; for (const n of ECHT) ruhe[n] = { p: alt[n].getWorldPosition(V()), w: alt[n].getWorldQuaternion(new T.Quaternion()), l: alt[n].quaternion.clone(), lp: alt[n].position.clone() };
  // ---- alle Bilder einer Bewegungs-Datei auslesen (30 Bilder pro Sekunde)
  const lies = async (datei, o) => { o = o || await ladeFbx(datei); const A = Object.fromEntries(ECHT.map(n => [n, o.getObjectByName(n)]));
    const clip = o.animations[0], mx = new T.AnimationMixer(o), aus = []; mx.clipAction(clip).play();
    for (let f = 0; f / 30 < clip.duration; f++) { mx.setTime(f / 30); const q = {}; for (const n of NAMEN) q[n] = A[n] ? A[n].quaternion.clone() : new T.Quaternion(); aus.push({ q, h: A.Hips.position.clone() }); }
    mx.stopAllAction(); return aus; };
  const mische = (a, b, t) => { const q = {}; for (const n of NAMEN) q[n] = a.q[n].clone().slerp(b.q[n], t); return { q, h: a.h.clone().lerp(b.h, t) }; };
  // Welt-Drehungen einer Haltung ausrechnen (von der Hüfte nach außen)
  const welt = P => { const W = {}; for (const n of NAMEN) W[n] = eltern[n] ? W[eltern[n]].clone().multiply(P.q[n]) : P.q[n].clone(); return W; };
  const lokal = W => { const q = {}; for (const n of NAMEN) q[n] = eltern[n] ? W[eltern[n]].clone().invert().multiply(W[n]) : W[n].clone(); return q; };
  // Einen Doppelschritt herausschneiden: N Bilder ab Bild "ab". Die letzten Bilder werden in den Anfang überblendet, damit es rund läuft.
  // Läuft die Figur dabei schräg, wird sie gerade gedreht. Zurück: die Bilder und das Tempo in Metern pro Sekunde.
  const zyklus = (B, ab, N, weich = 6) => { const aus = [];
    const dx = B[ab + N].h.x - B[ab].h.x, dz = B[ab + N].h.z - B[ab].h.z, gerade = new T.Quaternion().setFromAxisAngle(V(0, 1, 0), -Math.atan2(dx, dz));
    for (let i = 0; i < N; i++) { let P = { q: B[ab + i].q, h: B[ab + i].h.clone() }; P.h.x -= B[ab].h.x + dx * i / N; P.h.z = 0;
      if (i >= N - weich) { const v = { q: B[ab + i - N].q, h: B[ab + i - N].h.clone() }; v.h.x -= B[ab].h.x + dx * (i - N) / N; v.h.z = 0; P = mische(P, v, (i - (N - weich - 1)) / (weich + 1)); }
      P = { q: { ...P.q, Hips: gerade.clone().multiply(P.q.Hips) }, h: P.h.applyQuaternion(gerade) }; aus.push(P); }
    return { bilder: aus, tempo: Math.hypot(dx, dz) / 100 / (N / 30) }; };
  // ---- die Figur: drehen (sie schaut nach +x, soll nach +z), auf die Größe des Gerüsts bringen (Zentimeter)
  const glb = await ladeGlb('klein.glb'); let netz; glb.scene.traverse(n => { if (n.isMesh) netz = n; });
  const geo = netz.geometry.clone(); geo.rotateY(-Math.PI / 2); geo.computeBoundingBox();
  let P = geo.attributes.position; const y0 = geo.boundingBox.min.y;
  let sy = 0, sn = 0; for (let i = 0; i < P.count; i++) if (Math.abs(P.getX(i)) > 0.3) { sy += P.getY(i) - y0; sn++; }
  const mass = ruhe.LeftArm.p.y / (sy / sn);
  geo.translate(0, -y0, 0); geo.scale(mass, mass, mass); geo.computeBoundingBox();
  const mitteX = (geo.boundingBox.min.x + geo.boundingBox.max.x) / 2; geo.translate(-mitteX, 0, 0);
  P = geo.attributes.position;
  // Schritt (wo die Beine zusammenlaufen) und Stand der Füße ausmessen
  let schritt = 0; for (let y = 60; y < 110; y += 1) { let n = 0; for (let i = 0; i < P.count; i++) if (Math.abs(P.getY(i) - y) < 1 && Math.abs(P.getX(i)) < 1.2) n++; if (n > 2) { schritt = y; break; } }
  let fx = 0, fn = 0, fz = 0; for (let i = 0; i < P.count; i++) if (P.getY(i) < 12) { fx += Math.abs(P.getX(i)); fz += P.getZ(i); fn++; } fx /= fn; fz /= fn;
  let hz = 0, hn = 0; for (let i = 0; i < P.count; i++) if (Math.abs(P.getY(i) - 110) < 8) { hz += P.getZ(i); hn++; } hz /= hn;
  const mess = { mass, hoch: geo.boundingBox.max.y, breit: geo.boundingBox.max.x, schritt, fussX: fx, fussZ: fz, bauchZ: hz };
  // nach vorn/hinten ausrichten: der Bauch sitzt über der Hüfte des Gerüsts
  geo.translate(0, 0, ruhe.Spine.p.z - hz + 1);
  // Beine gerade stellen: Die Figur steht breitbeinig, das Gerüst hat die Beine senkrecht unter der Hüfte.
  const beinX = ruhe.LeftUpLeg.p.x + 0.8, weg = fx - beinX;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y < schritt) { const x = P.getX(i), t = (schritt - y) / schritt; P.setX(i, x - Math.sign(x) * Math.min(Math.abs(x), weg * t)); } }
  geo.computeVertexNormals();
  // ---- Hände ausmessen: wo das Handgelenk ist, wohin die Finger zeigen, wie lang die Hand ist. Daraus die Finger-Knochen.
  const hand = {};
  for (const [S, v] of [['Left', 1], ['Right', -1]]) {
    let maxX = 0; for (let i = 0; i < P.count; i++) if (P.getX(i) * v > maxX) maxX = P.getX(i) * v;
    const mitte = (x0, x1) => { const m = V(0, 0, 0); let n = 0; for (let i = 0; i < P.count; i++) { const x = P.getX(i) * v; if (x > x0 && x < x1) { m.add(V(P.getX(i), P.getY(i), P.getZ(i))); n++; } } return m.multiplyScalar(1 / n); };
    const o = mitte(maxX - 21.5, maxX - 19.5), spitze = mitte(maxX - 1.2, maxX + 1), d = spitze.clone().sub(o); d.y = 0; const lang = d.length(); d.normalize();
    const quer = V(-d.z, 0, d.x).multiplyScalar(v);                    // zeigt zur Daumen-Seite
    hand[S] = { o, d, quer, lang, v, k: [0.47 * lang, 0.68 * lang, 0.84 * lang], achse: V(-d.z, 0, d.x), mal: -1 };      // um "achse" gedreht krümmen sich die Finger nach unten
    const ort = { Finger1: o.clone().addScaledVector(d, hand[S].k[0]), Finger2: o.clone().addScaledVector(d, hand[S].k[1]), Finger3: o.clone().addScaledVector(d, hand[S].k[2]), Thumb: o.clone().addScaledVector(d, 3).addScaledVector(quer, 4) };
    for (const f of FINGER) { const n = S + f, e = eltern[n], ew = ruhe[e].w.clone().invert();
      ruhe[n] = { p: ort[f], w: new T.Quaternion(), l: ew.clone(), lp: ort[f].clone().sub(ruhe[e].p).applyQuaternion(ew) }; }
  }
  // Finger krümmen: setzt in einer Haltung die Finger-Knochen (die Aufnahmen bewegen die Finger nicht)
  const krumm = (P, w) => { const q = { ...P.q };
    for (const S of ['Left', 'Right']) { const H = hand[S], R = (achse, winkel) => new T.Quaternion().setFromAxisAngle(achse, winkel);
      q[S + 'Finger1'] = ruhe[S + 'Finger1'].l.clone().multiply(R(H.achse, -w[0])); q[S + 'Finger2'] = R(H.achse, -w[1]); q[S + 'Finger3'] = R(H.achse, -w[2]);
      q[S + 'Thumb'] = ruhe[S + 'Thumb'].l.clone().multiply(R(H.d, w[3] * H.v)); }
    return { q, h: P.h }; };
  const gehenB = await lies('lauf.fbx', fbx), laufenB = await lies('sprint.fbx');
  const gehen = zyklus(gehenB, opt.G0 ?? 5, opt.GN ?? 39, 5), laufen = zyklus(laufenB, opt.L0 ?? 129, opt.LN ?? 24);
  // ---- Stehen: Arme hängen locker herunter, der Brustkorb hebt sich ein wenig beim Atmen
  const steh = atem => { const W = {}; for (const n of NAMEN) W[n] = ruhe[n].w.clone();
    const dreh = (n, achse, winkel) => { const d = new T.Quaternion().setFromAxisAngle(achse, winkel); for (const m of NAMEN) { let k = m, drin = false; while (k) { if (k === n) drin = true; k = eltern[k]; } if (drin) W[m].premultiply(d); } };
    for (const [s, v] of [['Left', 1], ['Right', -1]]) { dreh(s + 'Arm', V(0, 0, 1), -v * 1.44); dreh(s + 'Arm', V(1, 0, 0), 0.05); dreh(s + 'ForeArm', V(1, 0, 0), -0.22); dreh(s + 'ForeArm', V(0, 1, 0), -v * 0.25); }
    dreh('Spine2', V(1, 0, 0), -0.012 * atem); dreh('LeftShoulder', V(0, 0, 1), 0.012 * atem); dreh('RightShoulder', V(0, 0, 1), -0.012 * atem);
    return { q: lokal(W), h: ruhe.Hips.lp.clone().add(V(0, -0.6 + 0.25 * atem, 0)) }; };
  const stehen = [0, 0.5, 1, 0.5, 0].map(steh);

  // ---- Gewichte: Welcher Knochen bewegt welche Stelle? Gerechnet in der T-Pose, Stück für Stück.
  const J = n => ruhe[n].p, nr = Object.fromEntries(NAMEN.map((n, i) => [n, i]));
  const si = new Uint16Array(P.count * 4), sw = new Float32Array(P.count * 4);
  const armAb = J('LeftArm').x, achsel = J('LeftArm').y - (opt.achsel ?? 13);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ax = Math.abs(x), S = x >= 0 ? 'Left' : 'Right', g = {};
    const gib = (n, w) => { if (w > 0.001) g[n] = (g[n] || 0) + w; };
    // Rumpf von unten nach oben
    const rumpf = w0 => { let rest = w0; for (let k = KETTE.length - 1; k >= 1; k--) { const t = glatt(y, J(KETTE[k]).y - 5, J(KETTE[k]).y + 5); gib(KETTE[k], rest * t); rest *= 1 - t; } gib('Hips', rest); };
    if (ax > armAb + 9 || (ax > armAb - 5 && y > achsel)) {            // Arm
      const a = glatt(ax, armAb - 5, armAb + 6), e = glatt(ax, J('LeftForeArm').x - 5, J('LeftForeArm').x + 5), H = hand[S], hx = Math.abs(H.o.x), h = glatt(ax, hx - 2, hx + 2.5);
      const px = x - H.o.x, pz = z - H.o.z, u = px * H.d.x + pz * H.d.z, q = px * H.quer.x + pz * H.quer.z;      // u = wie weit vorn an der Hand, q = wie weit zur Daumen-Seite
      const dau = glatt(q, 4.5, 7.5) * glatt(u, 1, 4), f1 = glatt(u, H.k[0] - 1.2, H.k[0] + 1.2) * (1 - dau), f2 = glatt(u, H.k[1] - 1, H.k[1] + 1), f3 = glatt(u, H.k[2] - 0.9, H.k[2] + 0.9);
      rumpf(1 - a); gib(S + 'Arm', a * (1 - e)); gib(S + 'ForeArm', a * e * (1 - h)); const hw = a * e * h;
      gib(S + 'Hand', hw * (1 - dau) * (1 - f1)); gib(S + 'Thumb', hw * dau); gib(S + 'Finger1', hw * f1 * (1 - f2)); gib(S + 'Finger2', hw * f1 * f2 * (1 - f3)); gib(S + 'Finger3', hw * f1 * f2 * f3);
    } else if (y < schritt + 9 && !(y > schritt - 2 && ax > J('LeftUpLeg').x + 13)) {                    // Bein
      const b = glatt(y, schritt + 9, schritt - 6), k = glatt(y, J('LeftLeg').y + 5, J('LeftLeg').y - 5), f = glatt(y, J('LeftFoot').y + 5, J('LeftFoot').y - 2), zeh = glatt(z, J('LeftToeBase').z - 2, J('LeftToeBase').z + 3) * (y < 9 ? 1 : 0);
      const mitte = glatt(ax, 0, 3);                                    // genau in der Mitte gehört die Hose zu beiden Beinen ein wenig – dort hält die Hüfte fest
      gib('Hips', (1 - b) + b * (1 - mitte) * (1 - k)); const bb = b * (mitte + (1 - mitte) * k);
      gib(S + 'UpLeg', bb * (1 - k)); gib(S + 'Leg', bb * k * (1 - f)); gib(S + 'Foot', bb * k * f * (1 - zeh)); gib(S + 'ToeBase', bb * k * f * zeh);
    } else rumpf(1);
    const top = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((s, e) => s + e[1], 0);
    top.forEach(([n, w], k) => { si[i * 4 + k] = nr[n]; sw[i * 4 + k] = w / sum; });
  }
  geo.setAttribute('skinIndex', new T.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new T.BufferAttribute(sw, 4));
  // ---- neues Gerüst nur aus den Knochen, die gebraucht werden
  const neu = {}; for (const n of NAMEN) { const b = new T.Bone(); b.name = n; neu[n] = b; }
  for (const n of NAMEN) { if (eltern[n]) { neu[eltern[n]].add(neu[n]); neu[n].position.copy(ruhe[n].lp); neu[n].quaternion.copy(ruhe[n].l); } else { neu[n].position.copy(ruhe[n].p); neu[n].quaternion.copy(ruhe[n].w); } }
  const mat = netz.material.clone(); mat.roughness = 0.85; mat.metalness = 0;
  const haut = new T.SkinnedMesh(geo, mat); haut.name = 'Polizist';
  const wurzel = new T.Group(); wurzel.name = 'Figur'; wurzel.add(neu.Hips); wurzel.add(haut);
  wurzel.updateMatrixWorld(true); haut.bind(new T.Skeleton(NAMEN.map(n => neu[n])));
  wurzel.scale.setScalar(0.01);            // Zentimeter → Meter
  // ---- Bewegungen als Spuren
  const spur = (name, liste, bps) => { const zeiten = [...liste.keys(), liste.length].map(i => i / bps), alle = [...liste, liste[0]], spuren = [];
    for (const n of NAMEN) { const w = []; let vor = null; for (const P of alle) { const q = P.q[n].clone(); if (vor && vor.dot(q) < 0) { q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; } vor = q; w.push(q.x, q.y, q.z, q.w); } spuren.push(new T.QuaternionKeyframeTrack(n + '.quaternion', zeiten, w)); }
    spuren.push(new T.VectorKeyframeTrack('Hips.position', zeiten, alle.flatMap(P => [P.h.x, P.h.y, P.h.z])));
    return new T.AnimationClip(name, -1, spuren); };
  for (const P of stehen) { P.h.x = 0; P.h.z = 0; }
  const clips = [spur('stehen', stehen.map(P => krumm(P, KRUMM.stehen)), 1.1), spur('gehen', gehen.bilder.map(P => krumm(P, KRUMM.gehen)), 30), spur('laufen', laufen.bilder.map(P => krumm(P, KRUMM.laufen)), 30)];
  mess.tempoGehen = gehen.tempo; mess.tempoLaufen = laufen.tempo;
  return { wurzel, haut, clips, mess, ruhe, NAMEN };
};
window.alsGlb = (wurzel, clips) => new Promise((ok, f) => new GLTFExporter().parse(wurzel, r => { const b = new Uint8Array(r); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); ok(btoa(s)); }, f, { binary: true, animations: clips }));
