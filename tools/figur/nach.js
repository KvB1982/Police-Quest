// Baut eine weitere Figur mit Knochen – ohne die Bewegungs-Aufnahmen. Gerüst und Bewegungen kommen aus der fertigen Spielfigur (polizist.glb),
// nur die Haut ist neu: Die neue Figur (klein.glb, T-Pose) wird auf das Gerüst gelegt, dann wird ausgerechnet, welcher Knochen welche Stelle bewegt.
// Die Rechnung der Gewichte ist dieselbe wie in bake.js.
const T = THREE, V = (x, y, z) => new T.Vector3(x, y, z), glatt = (v, a, b) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const KETTE = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'];

window.backeNach = async (opt = {}) => {
  // ---- Vorbild: Gerüst, Ruhe-Haltung (T-Pose, in Zentimetern) und Bewegungen der Spielfigur
  const vor = await ladeGlb(opt.vorbild || 'polizist.glb'); let alt; vor.scene.traverse(n => { if (n.isSkinnedMesh) alt = n; });
  const sk = alt.skeleton, NAMEN = sk.bones.map(b => b.name), ruhe = {};
  sk.bones.forEach((b, i) => { const m = sk.boneInverses[i].clone().invert(); ruhe[b.name] = { p: V().setFromMatrixPosition(m), m }; });
  const Pv = alt.geometry.attributes.position; let vorMaxX = 0; for (let i = 0; i < Pv.count; i++) vorMaxX = Math.max(vorMaxX, Math.abs(Pv.getX(i)));
  // ---- die neue Figur: drehen (sie schaut nach +x, soll nach +z), auf die Größe des Gerüsts bringen (Zentimeter)
  const glb = await ladeGlb(opt.figur || 'klein.glb'); let netz; glb.scene.traverse(n => { if (n.isMesh) netz = n; });
  const geo = netz.geometry.clone(); geo.rotateY(opt.dreh ?? -Math.PI / 2); geo.computeBoundingBox();
  let P = geo.attributes.position; const y0 = geo.boundingBox.min.y;
  let sy = 0, sn = 0; for (let i = 0; i < P.count; i++) if (Math.abs(P.getX(i)) > 0.3) { sy += P.getY(i) - y0; sn++; }
  const mass = ruhe.LeftArm.p.y / (sy / sn);
  geo.translate(0, -y0, 0); geo.scale(mass, mass, mass); geo.computeBoundingBox();
  const mitteX = (geo.boundingBox.min.x + geo.boundingBox.max.x) / 2; geo.translate(-mitteX, 0, 0);
  P = geo.attributes.position;
  let schritt = 0; for (let y = 60; y < 110; y += 1) { let n = 0; for (let i = 0; i < P.count; i++) if (Math.abs(P.getY(i) - y) < 1 && Math.abs(P.getX(i)) < 1.2) n++; if (n > 2) { schritt = y; break; } }
  let fx = 0, fn = 0, fz = 0; for (let i = 0; i < P.count; i++) if (P.getY(i) < 12) { fx += Math.abs(P.getX(i)); fz += P.getZ(i); fn++; } fx /= fn; fz /= fn;
  // vorn/hinten: Der Rücken auf Höhe der Brust liegt so weit hinter der Wirbelsäule wie beim Vorbild (der Bauch darf weiter nach vorn stehen)
  const ruecken = (Q, y) => { let z = 1e9; for (let i = 0; i < Q.count; i++) if (Math.abs(Q.getY(i) - y) < 4 && Math.abs(Q.getX(i)) < 8) z = Math.min(z, Q.getZ(i)); return z; };
  const brust = ruhe.Spine2.p.y;
  geo.translate(0, 0, ruecken(Pv, brust) - ruecken(P, brust));
  // Arme auf die Länge des Vorbilds bringen (ab der Schulter gestreckt oder gestaucht), damit Ellbogen und Hand auf den Knochen liegen
  const armAb = ruhe.LeftArm.p.x; let maxX = 0; for (let i = 0; i < P.count; i++) maxX = Math.max(maxX, Math.abs(P.getX(i)));
  const armMal = (vorMaxX - armAb) / (maxX - armAb), armY = ruhe.LeftArm.p.y;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), ax = Math.abs(x); if (ax > armAb && P.getY(i) > armY - 22) P.setX(i, Math.sign(x) * (armAb + (ax - armAb) * armMal)); }
  // Beine gerade stellen: Die Figur steht breitbeinig, das Gerüst hat die Beine senkrecht unter der Hüfte.
  const beinX = ruhe.LeftUpLeg.p.x + 0.8, weg = fx - beinX;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y < schritt) { const x = P.getX(i), t = (schritt - y) / schritt; P.setX(i, x - Math.sign(x) * Math.min(Math.abs(x), weg * t)); } }
  geo.computeVertexNormals(); geo.computeBoundingBox();
  const mess = { mass, armMal, hoch: geo.boundingBox.max.y, breit: geo.boundingBox.max.x, schritt, fussX: fx, vorSchritt: null };
  // ---- Hände ausmessen (wie in bake.js)
  const hand = {};
  for (const [S, v] of [['Left', 1], ['Right', -1]]) {
    let mx = 0; for (let i = 0; i < P.count; i++) if (P.getX(i) * v > mx) mx = P.getX(i) * v;
    const mitte = (x0, x1) => { const m = V(0, 0, 0); let n = 0; for (let i = 0; i < P.count; i++) { const x = P.getX(i) * v; if (x > x0 && x < x1) { m.add(V(P.getX(i), P.getY(i), P.getZ(i))); n++; } } return m.multiplyScalar(1 / n); };
    const o = mitte(mx - 21.5, mx - 19.5), spitze = mitte(mx - 1.2, mx + 1), d = spitze.clone().sub(o); d.y = 0; const lang = d.length(); d.normalize();
    hand[S] = { o, d, quer: V(-d.z, 0, d.x).multiplyScalar(v), k: [0.47 * lang, 0.68 * lang, 0.84 * lang] };
  }
  // ---- Gewichte: Welcher Knochen bewegt welche Stelle?
  const J = n => ruhe[n].p, nr = Object.fromEntries(NAMEN.map((n, i) => [n, i]));
  const si = new Uint16Array(P.count * 4), sw = new Float32Array(P.count * 4), G = [];
  const achsel = J('LeftArm').y - (opt.achsel ?? 13);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ax = Math.abs(x), S = x >= 0 ? 'Left' : 'Right', g = {};
    const gib = (n, w) => { if (w > 0.001) g[n] = (g[n] || 0) + w; };
    const rumpf = w0 => { let rest = w0; for (let k = KETTE.length - 1; k >= 1; k--) { const t = glatt(y, J(KETTE[k]).y - 5, J(KETTE[k]).y + 5); gib(KETTE[k], rest * t); rest *= 1 - t; } gib('Hips', rest); };
    const rumpfS = w0 => { const sh = glatt(ax, 4, 12) * glatt(y, J('Spine2').y - 5, J('Spine2').y + 5) * (1 - glatt(y, J('Neck').y + 2, J('Neck').y + 7)); gib(S + 'Shoulder', w0 * sh); rumpf(w0 * (1 - sh)); };
    // Arm: nur auf Höhe der Arme – ein breiter Bauch oder das Holster gehören nicht dazu
    if (y > armY - 22 && (ax > armAb + 9 || (ax > armAb - 5 && y > achsel))) {
      const a = glatt(ax, armAb - 9, armAb + 8), e = glatt(ax, J('LeftForeArm').x - 5, J('LeftForeArm').x + 5), H = hand[S], hx = Math.abs(H.o.x), h = glatt(ax, hx - 2, hx + 2.5);
      const px = x - H.o.x, pz = z - H.o.z, u = px * H.d.x + pz * H.d.z, q = px * H.quer.x + pz * H.quer.z;
      const dau = glatt(q, 4.5, 7.5) * glatt(u, 1, 4), f1 = glatt(u, H.k[0] - 1.2, H.k[0] + 1.2) * (1 - dau), f2 = glatt(u, H.k[1] - 1, H.k[1] + 1), f3 = glatt(u, H.k[2] - 0.9, H.k[2] + 0.9);
      rumpfS(1 - a); gib(S + 'Arm', a * (1 - e)); gib(S + 'ForeArm', a * e * (1 - h)); const hw = a * e * h;
      gib(S + 'Hand', hw * (1 - dau) * (1 - f1)); gib(S + 'Thumb', hw * dau); gib(S + 'Finger1', hw * f1 * (1 - f2)); gib(S + 'Finger2', hw * f1 * f2 * (1 - f3)); gib(S + 'Finger3', hw * f1 * f2 * f3);
    } else if (y < schritt + 9 && !(y > schritt - 2 && ax > J('LeftUpLeg').x + 13)) {
      const b = glatt(y, schritt + 9, schritt - 6), k = glatt(y, J('LeftLeg').y + 5, J('LeftLeg').y - 5), f = glatt(y, J('LeftFoot').y + 5, J('LeftFoot').y - 2), zeh = glatt(z, J('LeftToeBase').z - 2, J('LeftToeBase').z + 3) * (y < 9 ? 1 : 0);
      const mitte = glatt(ax, 0, 3);
      gib('Hips', (1 - b) + b * (1 - mitte) * (1 - k)); const bb = b * (mitte + (1 - mitte) * k);
      gib(S + 'UpLeg', bb * (1 - k)); gib(S + 'Leg', bb * k * (1 - f)); gib(S + 'Foot', bb * k * f * (1 - zeh)); gib(S + 'ToeBase', bb * k * f * zeh);
    } else rumpfS(1);
    G.push(g);
  }
  // Gewichte an Schulter und Oberarm glätten
  const gruppe = new Map(), gNr = new Int32Array(P.count), stellen = [];
  for (let i = 0; i < P.count; i++) { const k = Math.round(P.getX(i) * 50) + '_' + Math.round(P.getY(i) * 50) + '_' + Math.round(P.getZ(i) * 50); if (!gruppe.has(k)) { gruppe.set(k, stellen.length); stellen.push({ i: [], nach: new Set() }); } gNr[i] = gruppe.get(k); stellen[gNr[i]].i.push(i); }
  const idx = geo.index.array; for (let t = 0; t < idx.length; t += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) stellen[gNr[idx[t + a]]].nach.add(gNr[idx[t + b]]);
  const weich = stellen.map(s => { const i = s.i[0], ax = Math.abs(P.getX(i)), y = P.getY(i); return y > J('Spine1').y && ax > 3 && ax < J('LeftForeArm').x - 6; });
  for (let runde = 0; runde < (opt.glatt ?? 8); runde++) { const neu = stellen.map((s, k) => { if (!weich[k]) return null; const m = {}; let n = 0; for (const o of s.nach) { for (const [b, w] of Object.entries(G[stellen[o].i[0]])) m[b] = (m[b] || 0) + w; n++; } const g = G[s.i[0]], aus = {}; for (const b of new Set([...Object.keys(m), ...Object.keys(g)])) aus[b] = 0.5 * (g[b] || 0) + 0.5 * (m[b] || 0) / n; return aus; });
    neu.forEach((g, k) => { if (g) for (const i of stellen[k].i) G[i] = g; }); }
  for (let i = 0; i < P.count; i++) {
    const top = Object.entries(G[i]).sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((s, e) => s + e[1], 0);
    top.forEach(([n, w], k) => { si[i * 4 + k] = nr[n]; sw[i * 4 + k] = w / sum; });
  }
  geo.setAttribute('skinIndex', new T.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new T.BufferAttribute(sw, 4));
  // ---- neue Haut auf das Gerüst des Vorbilds setzen: die alte Haut fliegt raus, Knochen und Bewegungen bleiben
  const wurzel = vor.scene.getObjectByName('Figur') || alt.parent;
  const mat = netz.material.clone(); mat.roughness = 0.85; mat.metalness = 0;
  const haut = new T.SkinnedMesh(geo, mat); haut.name = opt.name || 'Figur2';
  alt.parent.add(haut); alt.parent.remove(alt);
  haut.bind(new T.Skeleton(sk.bones, sk.boneInverses), alt.bindMatrix);
  return { wurzel, haut, clips: vor.animations, mess, NAMEN };
};
window.alsGlb = (wurzel, clips) => new Promise((ok, f) => new GLTFExporter().parse(wurzel, r => { const b = new Uint8Array(r); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); ok(btoa(s)); }, f, { binary: true, animations: clips }));
