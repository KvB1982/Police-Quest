# Baut einen Menschen mit MakeHuman/MPFB (ohne Fenster) und speichert ihn als GLB mit dem Gerüst "mixamo".
#   python3 mensch.py aus.glb '{"gender":1,"age":0.6,"weight":0.7}'
import sys, bpy, os, json, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mh
HumanService, TargetService, HOP, AssetService = mh.start()
aus, wahl = sys.argv[1], json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
makro = TargetService.get_default_macro_info_dict()
makro['race'] = {'asian': 0.0, 'caucasian': 1.0, 'african': 0.0}
for k, v in wahl.items():
    if k in makro: makro[k] = v
h = HumanService.create_human(macro_detail_dict=makro, scale=0.1)
rig = HumanService.add_builtin_rig(h, "mixamo")
# Formen fest einrechnen, Hilfs-Geometrie (Rock, Haar-Helm, Gelenk-Würfel) löschen
bpy.context.view_layer.objects.active = h
for o in bpy.data.objects: o.select_set(o == h)
if h.data.shape_keys: bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
for m in list(h.modifiers):
    if m.type == 'MASK': h.modifiers.remove(m)
koerper = h.vertex_groups['body'].index
bm = bmesh.new(); bm.from_mesh(h.data); schicht = bm.verts.layers.deform.verify()
weg = [v for v in bm.verts if koerper not in v[schicht]]
bmesh.ops.delete(bm, geom=weg, context='VERTS'); bm.to_mesh(h.data); bm.free()
for g in list(h.vertex_groups):
    if not g.name.startswith('mixamorig'): h.vertex_groups.remove(g)
print('Punkte', len(h.data.vertices), 'Maße', tuple(round(x, 3) for x in h.dimensions))
bpy.ops.export_scene.gltf(filepath=aus, export_format='GLB', export_yup=True)
print('gespeichert', aus, os.path.getsize(aus))
