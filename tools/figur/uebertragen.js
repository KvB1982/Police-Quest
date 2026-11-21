// Überträgt Bewegungs-Aufnahmen auf eine Figur mit anderem Gerüst.
// Quelle: eine Aufnahme als FBX (Mixamo: Knochen heißen "mixamorig…Hips" usw., Ruhe-Haltung T-Pose) oder eine fertige Spielfigur als GLB.
// Ziel: ein Mensch aus MakeHuman/MPFB (Gerüst "mixamo", Arme in Ruhe schräg nach unten) oder Kim/Otto (30 Knochen, je Hand drei Sammel-Gelenke für die Finger).
// Die Knochen heißen überall gleich, liegen aber anders im Raum. Deshalb wird nicht die Drehung im Gelenk kopiert, sondern die Drehung im Raum:
//   neue Drehung = (Drehung der Quelle gegenüber ihrer Ruhe-Haltung) · (Ausgleich der Ruhe-Haltung) · (Ruhe-Drehung der neuen Figur)
const T = THREE, V = (x, y, z) => new T.Vector3(x, y, z), Q = () => new T.Quaternion();
const kurz = n => n.replace(/^mixamorig\d*:?_?/, '');
const BPS = 30;                         // so viele Bilder pro Sekunde werden gespeichert
const FINGER = [0.2, 0.3, 0.2];         // so weit (im Bogenmaß) krümmen sich die drei Glieder jedes Fingers, wenn die Quelle keine Finger hat
const SENKE = 0.45;                     // Kim und Otto: so weit sinken die Schultern gegenüber der T-Pose (wie in bake.js)
// Zu welchem Kind zeigt ein Knochen? Daraus kommt seine Richtung in der Ruhe-Haltung.
const KIND = { Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head' };
for (const S of ['Left', 'Right']) { Object.assign(KIND, { [S + 'Shoulder']: S + 'Arm', [S + 'Arm']: S + 'ForeArm', [S + 'ForeArm']: S + 'Hand', [S + 'UpLeg']: S + 'Leg', [S + 'Leg']: S + 'Foot', [S + 'Foot']: S + 'ToeBase' });
  for (const F of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let g = 1; g <= 3; g++) KIND[S + 'Hand' + F + g] = S + 'Hand' + F + (g + 1); }
// Kim und Otto haben statt einzelner Finger drei Sammel-Gelenke und einen Daumen. Die werden fest gekrümmt: locker oder ("faust": true) zur Faust.
const KRUMM = { locker: [0.32, 0.5, 0.36, 0.35], faust: [0.85, 1.15, 0.7, 0.55], griff: [1.25, 1.45, 1.0, 0.75] };      // Winkel für die drei Sammel-Gelenke und den Daumen (wie in bake.js)
const kreuz = (d, n) => { const x = d.clone().normalize(), z = x.clone().cross(n).normalize(), y = z.clone().cross(x); return Q().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z)); };

// ---- Eine Quelle lesen: Gerüst, Ruhe-Haltung und alle Bilder der Bewegung (Drehung jedes Knochens im Raum, Ort der Hüfte in Zentimetern)
async function lies(datei) {
  const fbx = /\.fbx$/i.test(datei), g = fbx ? await ladeFbx(datei) : await ladeGlb(datei), wurzel = fbx ? g : g.scene, alle = fbx ? g.animations : g.animations;
  let haut; wurzel.traverse(n => { if (n.isSkinnedMesh && !haut) haut = n; });
  const ka = haut.skeleton.bones, N = ka.map(b => kurz(b.name)), eltern = Object.fromEntries(ka.map(b => [kurz(b.name), b.parent.isBone ? kurz(b.parent.name) : null]));
  const ruhe = {}, ort = {}; ka.forEach((b, i) => { const m = haut.skeleton.boneInverses[i].clone().invert(); ruhe[N[i]] = Q().setFromRotationMatrix(m); ort[N[i]] = V().setFromMatrixPosition(m); });
  const tiefe = n => { let t = 0; while (eltern[n]) { n = eltern[n]; t++; } return t; }, reihe = N.map((n, i) => i).sort((x, y) => tiefe(N[x]) - tiefe(N[y]));      // Eltern vor Kindern
  const mx = new T.AnimationMixer(wurzel), hips = ka[N.indexOf('Hips')];
  const bilder = name => { const clip = name ? alle.find(c => c.name === name) : alle.slice().sort((a, b) => b.duration - a.duration)[0]; mx.stopAllAction(); const a = mx.clipAction(clip); a.play(); const L = [], n = Math.round(clip.duration * BPS);
    for (let f = 0; f <= n; f++) { mx.setTime(Math.min(clip.duration - 1e-4, f / BPS)); const W = {}; for (const i of reihe) { const b = ka[i], e = eltern[N[i]]; W[N[i]] = e ? W[e].clone().multiply(b.quaternion) : b.quaternion.clone(); } L.push({ W, h: hips.position.clone() }); }
    return L; };
  return { N, eltern, ruhe, ort, bilder };
}

// figur = GLB der Figur, liste = [{ name, datei, clip?, von?, bis?, amOrt?, fest?, senke? }]
//   von/bis = Ausschnitt in Sekunden · amOrt = der Weg nach vorn wird herausgerechnet (für Geh- und Lauf-Schleifen) · fest = Hüfte bleibt seitlich, wo sie am Anfang war
window.uebertrage = async (figur, liste) => {
  const Bg = await ladeGlb(figur); Bg.scene.updateMatrixWorld(true);
  const hb = []; Bg.scene.traverse(n => { if (n.isSkinnedMesh) hb.push(n); });
  // Haare, Brauen und Wimpern sind Bilder mit Löchern: Durchsichtig gemalt würden sie im Spiel flimmern, deshalb wird hart ausgeschnitten.
  for (const m of hb) { const mat = m.material; if (mat.transparent) { mat.transparent = false; mat.alphaTest = 0.3; mat.depthWrite = true; mat.side = T.DoubleSide; } }
  // ---- neue Figur: alle Knochen (auch die ohne Gewichte), Ruhe-Haltung im Raum
  const kb = []; Bg.scene.traverse(n => { if (n.isBone) kb.push(n); });
  const KB = Object.fromEntries(kb.map(b => [kurz(b.name), b])), eb = n => { const p = KB[n].parent; return p.isBone ? kurz(p.name) : null; };
  const sammel = !!KB.LeftFinger1;                                    // Kim oder Otto
  const ruheB = {}, ortB = {}, lokalB = {};
  if (sammel) { const sk = hb[0].skeleton, wm = KB.Hips.parent.matrixWorld;                // Ruhe-Haltung aus der Datei (T-Pose), nicht die Haltung, in der die Datei gerade steht
    sk.bones.forEach((b, i) => { const m = wm.clone().multiply(sk.boneInverses[i].clone().invert()), n = kurz(b.name); ruheB[n] = Q(); ortB[n] = V(); m.decompose(ortB[n], ruheB[n], V()); });
    for (const n of Object.keys(KB)) { const e = eb(n); lokalB[n] = e ? ruheB[e].clone().invert().multiply(ruheB[n]) : KB[n].parent.getWorldQuaternion(Q()).invert().multiply(ruheB[n]); }
  } else for (const b of kb) { const n = kurz(b.name); ruheB[n] = b.getWorldQuaternion(Q()); ortB[n] = b.getWorldPosition(V()); lokalB[n] = b.quaternion.clone(); }
  const wurzelB = KB.Hips.parent, wurzelQ = wurzelB.getWorldQuaternion(Q()), wurzelM = wurzelB.matrixWorld.clone().invert();
  const ordnung = Object.keys(KB), tief = n => { let t = 0; while (eb(n)) { n = eb(n); t++; } return t; }; ordnung.sort((x, y) => tief(x) - tief(y));      // von der Hüfte nach außen
  const unter = (n, m) => { let k = m; while (k) { if (k === n) return true; k = eb(k); } return false; };
  const boden = Math.min(ortB.LeftToeBase.y, ortB.LeftFoot.y);
  // Finger locker krümmen (nur wenn die Quelle keine Finger hat): jedes Glied ein Stück zur Handfläche
  const lockerB = Object.fromEntries(Object.entries(lokalB).map(([n, q]) => [n, q.clone()]));
  for (const [S, v] of [['Left', 1], ['Right', -1]]) { if (!KB[S + 'HandMiddle1']) continue;
    const ruecken = ortB[S + 'HandIndex1'].clone().sub(ortB[S + 'Hand']).cross(ortB[S + 'HandPinky1'].clone().sub(ortB[S + 'Hand'])).multiplyScalar(v).normalize();
    for (const [F, mal] of [['Index', 0.8], ['Middle', 1], ['Ring', 1.1], ['Pinky', 1.2], ['Thumb', 0.3]]) for (let g = 1; g <= 3; g++) { const n = S + 'Hand' + F + g, k = S + 'Hand' + F + (g + 1); if (!KB[n] || !KB[k]) continue;
      const d = ortB[k].clone().sub(ortB[n]).normalize(), achse = d.clone().cross(ruecken.clone().negate()).normalize();
      lockerB[n].multiply(ruheB[n].clone().invert().multiply(Q().setFromAxisAngle(achse, FINGER[g - 1] * mal)).multiply(ruheB[n])); } }

  // Kim und Otto: Haltung der Sammel-Gelenke (im eigenen Gelenk gerechnet)
  const sammelQ = art => { const q = {}, w = KRUMM[art];
    for (const [S, v] of [['Left', 1], ['Right', -1]]) { const d = ortB[S + 'Finger3'].clone().sub(ortB[S + 'Finger1']); d.y = 0; d.normalize(); const achse = V(-d.z, 0, d.x), R = (a, wi) => Q().setFromAxisAngle(a, wi);
      q[S + 'Finger1'] = lokalB[S + 'Finger1'].clone().multiply(R(achse, -w[0])); q[S + 'Finger2'] = lokalB[S + 'Finger2'].clone().multiply(R(achse, -w[1])); q[S + 'Finger3'] = lokalB[S + 'Finger3'].clone().multiply(R(achse, -w[2]));
      q[S + 'Thumb'] = lokalB[S + 'Thumb'].clone().multiply(R(d, w[3] * v)); }
    return q; };
  const quellen = {}, clips = []; let mass = 1;
  for (const w of liste) {
    const A = quellen[w.datei] || (quellen[w.datei] = await lies(w.datei)), ortA = A.ort, ruheA = A.ruhe;
    const WIE = n => A.ruhe[n] ? n : null;
    // ---- Ausgleich der Ruhe-Haltung: dreht die Richtung jedes Knochens der neuen Figur auf die Richtung desselben Knochens der Quelle
    const aus = {}; for (const n of ordnung) aus[n] = Q();
    for (const [n, k] of Object.entries(KIND)) if (KB[n] && KB[k] && ortA[n] && ortA[k]) aus[n].setFromUnitVectors(ortB[k].clone().sub(ortB[n]).normalize(), ortA[k].clone().sub(ortA[n]).normalize());
    // Unterarm und Hand: Hier zählt auch die Verdrehung. Deshalb wird ein ganzes Achsenkreuz (Richtung + Handrücken) aufeinander gedreht.
    for (const [S, v] of [['Left', 1], ['Right', -1]]) { if (!KB[S + 'HandMiddle1'] || !ortA[S + 'HandMiddle1']) continue;
      const rk = o => o[S + 'HandIndex1'].clone().sub(o[S + 'Hand']).cross(o[S + 'HandPinky1'].clone().sub(o[S + 'Hand'])).multiplyScalar(v).normalize(), rA = rk(ortA), rB = rk(ortB);
      aus[S + 'ForeArm'] = kreuz(ortA[S + 'Hand'].clone().sub(ortA[S + 'ForeArm']), rA).multiply(kreuz(ortB[S + 'Hand'].clone().sub(ortB[S + 'ForeArm']), rB).invert());
      aus[S + 'Hand'] = kreuz(ortA[S + 'HandMiddle1'].clone().sub(ortA[S + 'Hand']), rA).multiply(kreuz(ortB[S + 'HandMiddle1'].clone().sub(ortB[S + 'Hand']), rB).invert()); }
    aus.Head = aus.Neck.clone(); aus.LeftShoulder = Q(); aus.RightShoulder = Q();      // das Schlüsselbein bleibt, wie die Figur gebaut ist, und macht nur die Bewegung mit
    for (const S of ['Left', 'Right']) if (aus[S + 'ToeBase']) aus[S + 'ToeBase'] = Q();
    mass = (ortB.Hips.y - boden) / (ortA.Hips.y * 0.01);
    let B = A.bilder(w.clip); if (w.von != null || w.bis != null) B = B.slice(Math.round((w.von || 0) * BPS), w.bis != null ? Math.round(w.bis * BPS) + 1 : undefined);
    if (B.length < 2) B = [B[0], B[0]];
    const h0 = B[0].h, h1 = B[B.length - 1].h, werte = Object.fromEntries(ordnung.map(n => [n, []])), huefte = [], zeiten = B.map((_, i) => i / BPS);
    const hatFinger = !!A.ruhe.LeftHandMiddle1, fest = sammel ? sammelQ(w.griff ? 'griff' : w.faust ? 'faust' : 'locker') : {};
    B.forEach((P, i) => { const WB = {};
      for (const n of ordnung) { const von = WIE(n), e = eb(n);
        if (von) WB[n] = P.W[von].clone().multiply(ruheA[von].clone().invert()).multiply(aus[n]).multiply(ruheB[n]);
        else WB[n] = (e ? WB[e] : wurzelQ).clone().multiply(fest[n] || (hatFinger ? lokalB : lockerB)[n]); }
      if (sammel) for (const [S, v] of [['Left', 1], ['Right', -1]]) { const d = Q().setFromAxisAngle(V(0, 0, 1), -v * (w.senke ?? SENKE)), z = d.clone().invert();      // Schultern senken, der Arm behält seine Richtung
        for (const m of ordnung) { if (unter(S + 'Shoulder', m)) WB[m].premultiply(d); if (unter(S + 'Arm', m)) WB[m].premultiply(z); } }
      // "eng": Beine um so viele Grad zusammenrücken (manche Aufnahme steht sehr breitbeinig). Die Füße bleiben flach auf dem Boden.
      if (w.eng) for (const [S, v] of [['Left', 1], ['Right', -1]]) { const d = Q().setFromAxisAngle(V(0, 0, 1), -v * w.eng * Math.PI / 180);
        for (const m of ordnung) if (unter(S + 'UpLeg', m) && !unter(S + 'Foot', m)) WB[m].premultiply(d); }
      for (const n of ordnung) { const e = eb(n), q = (e ? WB[e] : wurzelQ).clone().invert().multiply(WB[n]), l = werte[n], k = l.length;
        if (k && l[k - 4] * q.x + l[k - 3] * q.y + l[k - 2] * q.z + l[k - 1] * q.w < 0) { q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; }
        l.push(q.x, q.y, q.z, q.w); }
      // Hüfte: Weg der Quelle (Zentimeter, gegenüber ihrer Ruhe-Lage) auf die Größe der neuen Figur gebracht
      const t = i / (B.length - 1), h = P.h.clone();
      if (w.amOrt) { h.x -= h0.x + (h1.x - h0.x) * t - ortA.Hips.x; h.z -= h0.z + (h1.z - h0.z) * t - ortA.Hips.z; }
      else { h.x -= h0.x - ortA.Hips.x; h.z -= h0.z - ortA.Hips.z; }                       // die Bewegung beginnt immer dort, wo die Figur steht
      h.sub(ortA.Hips).multiplyScalar(0.01 * mass).add(ortB.Hips).applyMatrix4(wurzelM); huefte.push(h.x, h.y, h.z); });
    const spuren = ordnung.map(n => new T.QuaternionKeyframeTrack(KB[n].name + '.quaternion', zeiten, werte[n]));
    spuren.push(new T.VectorKeyframeTrack(KB.Hips.name + '.position', zeiten, huefte));
    clips.push(new T.AnimationClip(w.name, -1, spuren));
    console.log('Bewegung', w.name, 'aus', w.datei, B.length, 'Bilder');
  }
  // Nur das Gerüst (ohne Haut) – daraus wird die Datei mit den Bewegungen, die sich alle Figuren mit diesem Gerüst teilen
  const geruest = () => { for (const m of hb) m.removeFromParent(); for (const b of kb) { const n = kurz(b.name); b.quaternion.copy(lokalB[n]); } return Bg.scene; };
  return { wurzel: Bg.scene, haut: hb, clips, mass, hoch: new T.Box3().setFromObject(Bg.scene).max.y, geruest };
};
window.alsGlb = window.alsGlb || ((wurzel, clips) => new Promise((ok, f) => new GLTFExporter().parse(wurzel, r => { const b = new Uint8Array(r); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); ok(btoa(s)); }, f, { binary: true, animations: clips })));
