// Überträgt die Bewegungen der Spielfigur (polizist.glb) auf eine Figur mit anderem Gerüst – gedacht für Menschen aus MakeHuman/MPFB mit dem
// Gerüst "mixamo". Die Knochen heißen dort gleich (mit "mixamorig:" davor), liegen aber anders im Raum und die Ruhe-Haltung ist eine andere
// (Arme schräg nach unten statt waagerecht). Deshalb wird nicht die Drehung im Gelenk kopiert, sondern die Drehung im Raum:
//   neue Drehung = (Drehung der Spielfigur gegenüber ihrer T-Pose) · (Ausgleich der Ruhe-Haltung) · (Ruhe-Drehung der neuen Figur)
const T = THREE, V = (x, y, z) => new T.Vector3(x, y, z);
const kurz = n => n.replace(/^mixamorig:?_?/, '');
// Welcher Knochen der neuen Figur folgt welchem der Spielfigur?
const WIE = n => /^(Left|Right)Hand./.test(n) ? null : n;      // die Finger bleiben, wie MakeHuman sie formt (locker gekrümmt) – das sieht besser aus als die Sammel-Gelenke der Spielfigur
// Zu welchem Kind zeigt ein Knochen? Daraus kommt seine Richtung in der Ruhe-Haltung.
const KIND = { Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head' };
for (const S of ['Left', 'Right']) Object.assign(KIND, { [S + 'Shoulder']: S + 'Arm', [S + 'Arm']: S + 'ForeArm', [S + 'ForeArm']: S + 'Hand', [S + 'UpLeg']: S + 'Leg', [S + 'Leg']: S + 'Foot', [S + 'Foot']: S + 'ToeBase' });

window.uebertrage = async (vorbild, figur) => {
  const A = await ladeGlb(vorbild), Bg = await ladeGlb(figur);
  A.scene.updateMatrixWorld(true); Bg.scene.updateMatrixWorld(true);
  let ha, hb = []; A.scene.traverse(n => { if (n.isSkinnedMesh) ha = n; }); Bg.scene.traverse(n => { if (n.isSkinnedMesh) hb.push(n); });
  // ---- Spielfigur: Eltern, Ruhe-Haltung im Raum
  const ka = ha.skeleton.bones, NA = ka.map(b => b.name), ea = Object.fromEntries(ka.map(b => [b.name, b.parent.isBone ? b.parent.name : null]));
  const ruheA = {}, ortA = {}; ka.forEach((b, i) => { const m = ha.skeleton.boneInverses[i].clone().invert(); ruheA[b.name] = new T.Quaternion().setFromRotationMatrix(m); ortA[b.name] = V().setFromMatrixPosition(m); });
  // ---- neue Figur: alle Knochen (auch die ohne Gewichte), Ruhe-Haltung im Raum = so, wie die Datei geladen wird
  const kb = []; Bg.scene.traverse(n => { if (n.isBone) kb.push(n); });
  const NB = kb.map(b => b.name), KB = Object.fromEntries(kb.map(b => [kurz(b.name), b])), eb = n => { const p = KB[n].parent; return p.isBone ? kurz(p.name) : null; };
  const ruheB = {}, ortB = {}, lokalB = {}; for (const b of kb) { const n = kurz(b.name); ruheB[n] = b.getWorldQuaternion(new T.Quaternion()); ortB[n] = b.getWorldPosition(V()); lokalB[n] = b.quaternion.clone(); }
  const wurzelB = KB.Hips.parent, wurzelQ = wurzelB.getWorldQuaternion(new T.Quaternion()), wurzelM = wurzelB.matrixWorld.clone().invert();
  // ---- Ausgleich der Ruhe-Haltung: dreht die Richtung jedes Knochens der neuen Figur auf die Richtung desselben Knochens der Spielfigur
  const aus = {}; for (const n of Object.keys(KB)) aus[n] = new T.Quaternion();
  for (const [n, k] of Object.entries(KIND)) if (KB[n] && KB[k]) aus[n].setFromUnitVectors(ortB[k].clone().sub(ortB[n]).normalize(), ortA[k].clone().sub(ortA[n]).normalize());
  // Unterarm und Hand: Hier zählt auch die Verdrehung. In der T-Pose der Spielfigur zeigt der Handrücken nach oben; bei MakeHuman zeigt er schräg nach vorn.
  // Deshalb wird nicht nur die Richtung, sondern ein ganzes Achsenkreuz (Richtung + Handrücken) aufeinander gedreht.
  const kreuz = (d, n) => { const x = d.clone().normalize(), z = x.clone().cross(n).normalize(), y = z.clone().cross(x); return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z)); };
  for (const [S, v] of [['Left', 1], ['Right', -1]]) { if (!KB[S + 'HandMiddle1']) continue;
    const rueckenB = ortB[S + 'HandIndex1'].clone().sub(ortB[S + 'Hand']).cross(ortB[S + 'HandPinky1'].clone().sub(ortB[S + 'Hand'])).multiplyScalar(v).normalize(), rueckenA = V(0, 1, 0);
    aus[S + 'ForeArm'] = kreuz(ortA[S + 'Hand'].clone().sub(ortA[S + 'ForeArm']), rueckenA).multiply(kreuz(ortB[S + 'Hand'].clone().sub(ortB[S + 'ForeArm']), rueckenB).invert());
    aus[S + 'Hand'] = kreuz(ortA[S + 'Finger1'].clone().sub(ortA[S + 'Hand']), rueckenA).multiply(kreuz(ortB[S + 'HandMiddle1'].clone().sub(ortB[S + 'Hand']), rueckenB).invert());
    aus[S + 'ToeBase'] = new T.Quaternion(); }
  aus.Head = aus.Neck.clone();
  const mass = (ortB.Hips.y - Math.min(ortB.LeftToeBase.y, ortB.LeftFoot.y)) / (ortA.Hips.y * 0.01), ordnung = Object.keys(KB);      // Reihenfolge von der Hüfte nach außen (so stehen die Knochen in der Datei)
  ordnung.sort((x, y) => { const tief = n => { let t = 0; while (eb(n)) { n = eb(n); t++; } return t; }; return tief(x) - tief(y); });
  const clips = A.animations.map(clip => {
    const spur = Object.fromEntries(clip.tracks.map(s => [s.name, s])), zeiten = spur['Hips.quaternion'].times, werte = Object.fromEntries(ordnung.map(n => [n, []])), huefte = [];
    for (let i = 0; i < zeiten.length; i++) {
      // Haltung der Spielfigur im Raum
      const WA = {}; for (const n of NA) { const s = spur[n + '.quaternion'], q = s ? new T.Quaternion().fromArray(s.values, i * 4) : KA(n); WA[n] = ea[n] ? WA[ea[n]].clone().multiply(q) : q; }
      const WB = {};
      for (const n of ordnung) { const von = WIE(n), e = eb(n);
        if (WA[von]) WB[n] = WA[von].clone().multiply(ruheA[von].clone().invert()).multiply(aus[n]).multiply(ruheB[n]);
        else WB[n] = (e ? WB[e] : wurzelQ).clone().multiply(lokalB[n]);                                   // kein Vorbild: bleibt, wie er am Eltern-Knochen sitzt
        const q = (e ? WB[e] : wurzelQ).clone().invert().multiply(WB[n]), w = werte[n], l = w.length;
        if (l && w[l - 4] * q.x + w[l - 3] * q.y + w[l - 2] * q.z + w[l - 1] * q.w < 0) { q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; }
        w.push(q.x, q.y, q.z, q.w); }
      // Hüfte: Weg der Spielfigur (Zentimeter, gegenüber ihrer Ruhe-Lage) auf die Größe der neuen Figur gebracht
      const hs = spur['Hips.position'], h = V(hs.values[i * 3], hs.values[i * 3 + 1], hs.values[i * 3 + 2]).sub(ortA.Hips).multiplyScalar(0.01 * mass).add(ortB.Hips).applyMatrix4(wurzelM);
      huefte.push(h.x, h.y, h.z);
    }
    const spuren = ordnung.map(n => new T.QuaternionKeyframeTrack(KB[n].name + '.quaternion', zeiten, werte[n]));
    spuren.push(new T.VectorKeyframeTrack(KB.Hips.name + '.position', zeiten, huefte));
    return new T.AnimationClip(clip.name, -1, spuren);
  });
  function KA(n) { return ka[NA.indexOf(n)].quaternion.clone(); }
  return { wurzel: Bg.scene, haut: hb, clips, mass, hoch: new T.Box3().setFromObject(Bg.scene).max.y };
};
window.alsGlb = window.alsGlb || ((wurzel, clips) => new Promise((ok, f) => new GLTFExporter().parse(wurzel, r => { const b = new Uint8Array(r); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); ok(btoa(s)); }, f, { binary: true, animations: clips })));
