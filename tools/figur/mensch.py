# Baut einen Menschen mit MakeHuman/MPFB (ohne Fenster) und speichert ihn als GLB mit dem Gerüst "mixamo".
#   python3 mensch.py aus.glb '{"gender":0,"age":0.7,"haut":"middleage_caucasian_female","haare":"bob01","kleidung":["shoes01"]}'
# Die Teile (Haut, Haare, Kleidung …) kommen aus den CC0-Paketen von MakeHuman. Sie müssen im Daten-Ordner von MPFB ausgepackt liegen.
import sys, bpy, os, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mh
HumanService, TargetService, HOP, AssetService = mh.start()
aus, wahl = sys.argv[1], json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
DATEN = os.path.expanduser('~/.config/blender/5.3/extensions/.user/user_default/mpfb/data')
GROSS_BILD = wahl.get('bild', 1024)          # so viele Bildpunkte dürfen die Farbbilder höchstens haben

def finde(ordner, name, endung):             # "clothes", "shoes01" -> die Datei shoes01/….mhclo
    if not name: return None
    if name.endswith(endung): return os.path.join(DATEN, ordner, name)
    treffer = sorted(glob.glob(os.path.join(DATEN, ordner, name, '*' + endung)))
    if not treffer: raise SystemExit(f'nicht gefunden: {ordner}/{name}')
    return treffer[0]

for o in list(bpy.data.objects): bpy.data.objects.remove(o)
makro = TargetService.get_default_macro_info_dict()
makro['race'] = {'asian': 0.0, 'caucasian': 1.0, 'african': 0.0}
for k, v in wahl.items():
    if k in makro: makro[k] = v
h = HumanService.create_human(macro_detail_dict=makro, scale=0.1)
rig = HumanService.add_builtin_rig(h, "mixamo")
if wahl.get('haut'): HumanService.set_character_skin(finde('skins', wahl['haut'], '.mhmat'), h, skin_type='GAMEENGINE')
teile = []
def dazu(ordner, name, art):
    if not name: return
    t = HumanService.add_mhclo_asset(finde(ordner, name, '.mhclo'), h, asset_type=art, material_type='GAMEENGINE', subdiv_levels=0)
    t['teil'] = art; teile.append(t); return t
augen = dazu('eyes', wahl.get('augen', 'low-poly'), 'Eyes')
dazu('eyebrows', wahl.get('brauen'), 'Eyebrows')
dazu('eyelashes', wahl.get('wimpern'), 'Eyelashes')
dazu('hair', wahl.get('haare'), 'Hair')
for k in wahl.get('kleidung', []): dazu('clothes', k, 'Clothes')

# Augenfarbe: das Bild der Augen austauschen (blue, brown, brownlight, green, grey … aus eyes/materials)
if augen and wahl.get('augenfarbe'):
    bild = bpy.data.images.load(os.path.join(DATEN, 'eyes', 'materials', wahl['augenfarbe'] + '_eye.png'))
    for n in augen.material_slots[0].material.node_tree.nodes:
        if n.type == 'TEX_IMAGE': n.image = bild

# Formen fest einrechnen, alles Versteckte (Hilfs-Geometrie, Haut unter der Kleidung) wirklich löschen, Glättung weg
for o in [h] + teile:
    bpy.context.view_layer.objects.active = o
    for x in bpy.data.objects: x.select_set(x == o)
    if o.data.shape_keys: bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
    for m in list(o.modifiers):
        if m.type == 'MASK': bpy.ops.object.modifier_apply(modifier=m.name)
        elif m.type != 'ARMATURE': o.modifiers.remove(m)
    if o.get('teil') == 'Clothes' and wahl.get('sparen', 1) < 1 and len(o.data.polygons) > 3000:      # Kleidung hat sehr viele Dreiecke – hier reicht ein Teil davon
        m = o.modifiers.new('sparen', 'DECIMATE'); m.ratio = wahl['sparen']; bpy.ops.object.modifier_apply(modifier=m.name)
    if o.get('teil') in ('Hair', 'Eyebrows', 'Eyelashes', 'Eyes'):      # hängt alles fest am Kopf – sonst bleiben einzelne Haar-Spitzen in der Luft stehen
        for g in list(o.vertex_groups): o.vertex_groups.remove(g)
        o.vertex_groups.new(name='mixamorig:Head').add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    for g in list(o.vertex_groups):
        if not g.name.startswith('mixamorig'): o.vertex_groups.remove(g)
    print('TEIL', o.name, 'Punkte', len(o.data.vertices), 'Dreiecke', sum(len(p.vertices) - 2 for p in o.data.polygons), [s.material.name if s.material else None for s in o.material_slots])

# Haut, Augen und Kleidung sind nie durchsichtig – nur Haare, Brauen und Wimpern haben Löcher im Bild
for o in [h] + teile:
    if o.get('teil') in ('Hair', 'Eyebrows', 'Eyelashes'): continue
    for s in o.material_slots:
        for n in s.material.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                for l in list(n.inputs['Alpha'].links): s.material.node_tree.links.remove(l)
                n.inputs['Alpha'].default_value = 1.0

# Einfärben: "farbe": {"boots": [0.1, 0.1, 0.1]} malt das Farbbild jedes Teils, dessen Name "boots" enthält, mit dieser Farbe an (mal gerechnet)
import numpy as np
for wort, f in wahl.get('farbe', {}).items():
    for o in [h] + teile:
        if wort not in o.name: continue
        for s in o.material_slots:
            for n in s.material.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image and any(l.to_socket.name == 'Base Color' for l in n.outputs['Color'].links):
                    b = n.image; px = np.array(b.pixels[:]).reshape(-1, 4); px[:, :3] *= np.array(f); b.pixels[:] = px.ravel(); b.update(); print('gefärbt', o.name, b.name)

# Anderer Stoff: "stoff": {"casualsuit01": "male_casualsuit01/toigo_male_casual_suit_01_khaki/male_casualsuit01_Khaki.png"} tauscht das Farbbild aus (Pfad ab dem Ordner clothes)
# Umfärben: "toenen": {"casualsuit05": {"farbe": [0.2, 0.6, 0.25], "ohne": [0, 0.55, 0.6, 1]}} macht das Bild erst grau und dann farbig –
#   so wird aus einer grauen Jacke eine grüne. "ohne" = ein Feld im Bild (links, oben, rechts, unten von 0 bis 1), das bleibt, wie es ist (zum Beispiel die Hose).
def farbbilder(o):
    for s in o.material_slots:
        for n in s.material.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image and any(l.to_socket.name == 'Base Color' for l in n.outputs['Color'].links): yield n
for wort, pfad in wahl.get('stoff', {}).items():
    for o in teile:
        if wort in o.name:
            for n in farbbilder(o): n.image = bpy.data.images.load(os.path.join(DATEN, 'clothes', pfad)); print('Stoff', o.name, pfad)
for wort, t in wahl.get('toenen', {}).items():
    for o in [h] + teile:
        if wort not in o.name: continue
        for n in farbbilder(o):
            b = n.image; br, ho = b.size; px = np.array(b.pixels[:]).reshape(ho, br, 4)
            grau = px[:, :, :3].mean(axis=2, keepdims=True); neu = np.clip(grau * t.get('hell', 2.0), 0, 1) * np.array(t['farbe'])
            if 'ohne' in t:
                x0, y0, x1, y1 = t['ohne']; z0, z1 = int((1 - y1) * ho), int((1 - y0) * ho); alt = px[z0:z1, int(x0 * br):int(x1 * br), :3].copy()
                px[:, :, :3] = neu; px[z0:z1, int(x0 * br):int(x1 * br), :3] = alt
            else: px[:, :, :3] = neu
            b.pixels[:] = px.ravel(); b.update(); print('getönt', o.name, b.name)

# Stoff glänzt nicht wie Lack: Kleidung und Haare matt machen
for o in teile:
    for sl in o.material_slots:
        for n in sl.material.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                for l in list(n.inputs['Roughness'].links): sl.material.node_tree.links.remove(l)
                n.inputs['Roughness'].default_value = max(0.85, n.inputs['Roughness'].default_value)

# Farbbilder verkleinern
for b in bpy.data.images:
    if b.size[0] > GROSS_BILD:
        f = GROSS_BILD / b.size[0]; b.scale(GROSS_BILD, max(1, int(b.size[1] * f)))
print('Maße', tuple(round(x, 3) for x in h.dimensions))
bpy.ops.export_scene.gltf(filepath=aus, export_format='GLB', export_yup=True)
print('gespeichert', aus, os.path.getsize(aus))
