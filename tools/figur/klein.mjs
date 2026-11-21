// Verkleinert die Figur aus 3D AI Studio: weniger Dreiecke, kleineres Bild. Noch ohne Knochen.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, simplify, flatten, joinPrimitives } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
const [,, ein, aus, ziel = 30000] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const d = await io.read(ein), r = d.getRoot();
for (const t of r.listTextures()) { const b = await sharp(Buffer.from(t.getImage())).removeAlpha().resize(1024, 1024).jpeg({ quality: 88 }).toBuffer(); t.setImage(b).setMimeType('image/jpeg'); }
await MeshoptSimplifier.ready;
let t = 0; for (const m of r.listMeshes()) for (const p of m.listPrimitives()) t += p.getIndices().getCount() / 3;
await d.transform(flatten(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: ziel / t, error: 0.01 }), prune(), dedup());
t = 0; for (const m of r.listMeshes()) for (const p of m.listPrimitives()) { t += p.getIndices().getCount() / 3; const P = p.getAttribute('POSITION'); console.log('min', P.getMin([]), 'max', P.getMax([]), [...p.listSemantics()]); }
console.log('Dreiecke', t, r.listNodes().map(n => [n.getName(), n.getScale(), n.getRotation()]));
await io.write(aus, d);
