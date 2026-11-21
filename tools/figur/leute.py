import json, subprocess, sys
F = dict(brauen='eyebrow001', wimpern='eyelashes01', sparen=0.4)
M = dict(brauen='eyebrow006', sparen=0.4)
NAVY = [0.16, 0.2, 0.38]
L = {
 'selin': dict(F, gender=0.0, age=0.6, weight=0.4, muscle=0.5, height=0.55, haut='callharvey3d_midtoned_female', haare='bob01', augenfarbe='brown',
               kleidung=['toigo_female_double-breasted_suit', 'toigo_ankle_boots_female'], toenen={'double-breasted': dict(farbe=NAVY, hell=2.6)}, farbe={'boots': [0.15, 0.15, 0.15]}),
 'petersen': dict(F, gender=0.0, age=0.85, weight=0.6, muscle=0.3, height=0.4, haut='old_caucasian_female', haare='bob02', augenfarbe='blue',
               kleidung=['toigo_fisherman_sweater', 'toigo_wool_pants', 'shoes03', 'kwnet_at_optical_glasses'], toenen={'sweater': dict(farbe=[0.48, 0.31, 0.63], hell=2.4)}),
 'hanne': dict(F, gender=0.0, age=0.65, weight=0.7, muscle=0.4, height=0.45, haut='toigo_light_skin_female_ginger', haare='rehmanpolanski_hair_bun_brown', augenfarbe='green',
               kleidung=['joepal_crude_t-shirt_female', 'toigo_wool_pants', 'shoes05'], farbe={'hair_bun': [1.25, 0.6, 0.45]}),
 'harms': dict(M, gender=1.0, age=0.68, weight=0.75, muscle=0.5, height=0.5, haut='middleage_caucasian_male', haare='short04', augenfarbe='grey',
               kleidung=['male_casualsuit01', 'shoes04'], farbe={'short04': [1.5, 1.5, 1.5]}),
 'erzieherin': dict(F, gender=0.0, age=0.45, weight=0.45, muscle=0.4, height=0.5, haut='young_caucasian_female', haare='ponytail01', augenfarbe='brown',
               kleidung=['toigo_basic_tucked_t-shirt', 'cortu_cargo_pants', 'shoes06'], toenen={'t-shirt': dict(farbe=[0.91, 0.42, 0.54], hell=1.8)}),
 'baecker': dict(M, gender=1.0, age=0.62, weight=0.85, muscle=0.4, height=0.5, haut='middleage_caucasian_male', haare='short02', augenfarbe='brown',
               kleidung=['elvs_crude_t-shirt_male', 'toigo_wool_pants', 'shoes05', 'jujube_newsboy_cap'], toenen={'wool_pants': dict(farbe=[0.92, 0.92, 0.9], hell=4.0)}),
 'verletzte': dict(F, gender=0.0, age=0.52, weight=0.45, muscle=0.4, height=0.5, haut='young_caucasian_female2', haare='long01', augenfarbe='blue',
               kleidung=['female_casualsuit02', 'shoes02']),
 'unfallfahrer': dict(M, gender=1.0, age=0.42, weight=0.3, muscle=0.4, height=0.55, haut='young_caucasian_male2', haare='cortu_short_messy_hair', augenfarbe='brown',
               kleidung=['male_casualsuit05', 'shoes06'], toenen={'casualsuit05': dict(farbe=[0.29, 0.31, 0.34], hell=1.6, ohne=[0, 0.55, 0.6, 1])}),
 'zeugin': dict(F, gender=0.0, age=0.5, weight=0.4, muscle=0.6, height=0.5, haut='onlytheghosts_young_eurasian_female', haare='elvs_french_braid_variation', augenfarbe='brown',
               kleidung=['female_sportsuit01', 'shoes05']),
 'opfer': dict(F, gender=0.0, age=0.9, weight=0.55, muscle=0.3, height=0.35, haut='old_caucasian_female', haare='toigo_curled_under_bob_with_bangs', augenfarbe='grey',
               kleidung=['toigo_fisherman_sweater', 'toigo_long_full_skirt', 'toigo_mj_cloth_shoes'], toenen={'sweater': dict(farbe=[0.54, 0.44, 0.66], hell=2.4), 'bob': dict(farbe=[0.85, 0.83, 0.78], hell=2.2)}),
 'w1': dict(M, gender=1.0, age=0.6, weight=0.55, muscle=0.5, height=0.5, haut='middleage_caucasian_male', haare='short04', augenfarbe='blue',
               kleidung=['male_casualsuit05', 'shoes02'], toenen={'casualsuit05': dict(farbe=[0.2, 0.62, 0.27], ohne=[0, 0.55, 0.6, 1])}),
 'w2': dict(M, gender=1.0, age=0.5, weight=0.4, muscle=0.5, height=0.5, haut='young_caucasian_male', haare='short02', augenfarbe='brown',
               kleidung=['male_casualsuit05', 'shoes06'], toenen={'casualsuit05': dict(farbe=[0.2, 0.62, 0.27], ohne=[0, 0.55, 0.6, 1])}, farbe={'short02': [1.2, 0.85, 0.6]}),
 'w3': dict(M, gender=1.0, age=0.55, weight=0.5, muscle=0.6, height=0.6, haut='toigo_light_skin_male_freckles', haare='short01', augenfarbe='blue',
               kleidung=['male_casualsuit05', 'shoes01'], toenen={'casualsuit05': dict(farbe=[0.9, 0.5, 0.15], ohne=[0, 0.55, 0.6, 1]), 'short01': dict(farbe=[0.85, 0.68, 0.32], hell=3.0)}),
 'm1': dict(M, gender=1.0, age=0.7, weight=0.6, muscle=0.4, height=0.45, haut='middleage_asian_male', haare='short03', augenfarbe='brown',
               kleidung=['male_casualsuit01', 'shoes01'], stoff={'casualsuit01': 'male_casualsuit01/toigo_male_casual_suit_01_khaki/male_casualsuit01_Khaki.png'}, farbe={'short03': [0.35, 0.3, 0.3]}),
 'brinkmann': dict(M, gender=1.0, age=0.8, weight=0.62, muscle=0.45, height=0.5, haut='old_caucasian_male', haare='short02', augenfarbe='grey',
               kleidung=['male_elegantsuit01', 'shoes04'], stoff={'elegantsuit01': 'male_elegantsuit01/toigo_male_elegant_suit_olive/PFAD'}, toenen={'short02': dict(farbe=[0.62, 0.62, 0.62], hell=2.6)}),
}

JEANS_F = [0, 0.47, 0.77, 1]
L['selin'].update(haare='toigo_blunt_bob'); L['selin']['toenen']['blunt_bob'] = dict(farbe=[0.16, 0.13, 0.12], hell=2.0)
L['petersen'].update(kleidung=['female_elegantsuit01', 'toigo_ballet_flats'], toenen={'elegantsuit': dict(farbe=[0.5, 0.33, 0.66], hell=3.2, ohne=[0, 0, 0.75, 0.5])})
L['opfer'].update(kleidung=['female_elegantsuit01', 'toigo_mj_cloth_shoes'], toenen={'elegantsuit': dict(farbe=[0.62, 0.55, 0.8], hell=3.6, ohne=[0, 0, 0.75, 0.5]), 'bob': dict(farbe=[0.85, 0.83, 0.78], hell=2.2)})
L['hanne'].update(kleidung=['female_casualsuit01', 'shoes05'], toenen={'casualsuit': dict(farbe=[0.96, 0.96, 0.94], hell=2.6, ohne=JEANS_F)})
L['erzieherin'].update(kleidung=['female_casualsuit01', 'shoes06'], toenen={'casualsuit': dict(farbe=[0.91, 0.42, 0.54], hell=2.6, ohne=JEANS_F)})
L['verletzte'].update(kleidung=['toigo_female_suit_2', 'toigo_ankle_boots_female'], toenen={'suit_2': dict(farbe=[0.25, 0.5, 0.54], hell=1.6, ohne=[0.55, 0, 1, 0.55])})
L['zeugin'].update(kleidung=['toigo_fisherman_sweater', 'cortu_cargo_pants', 'shoes05'], toenen={'sweater': dict(farbe=[0.88, 0.69, 0.19], hell=2.6)})
L['harms']['sparen'] = 0.75; L['m1']['sparen'] = 0.75
L['m1'].update(haare='short04'); L['m1']['farbe'] = {'short04': [0.5, 0.45, 0.45]}
L['unfallfahrer'].update(haare='short03')
L['w3'].update(height=0.5); L['w3']['toenen']['casualsuit05'] = dict(farbe=[1.0, 0.52, 0.1], hell=2.8, ohne=[0, 0.55, 0.6, 1])
L['baecker']['toenen']['cap'] = dict(farbe=[0.95, 0.95, 0.93], hell=2.0)
L['petersen'].update(haare='toigo_inverted_bob'); L['petersen']['toenen'] = {'elegantsuit': dict(farbe=[0.5, 0.33, 0.66], hell=3.2, ohne=[0, 0, 0.78, 0.53]), 'bob': dict(farbe=[0.8, 0.8, 0.82], hell=2.4)}
L['opfer']['toenen']['elegantsuit']['ohne'] = [0, 0, 0.78, 0.53]
L['zeugin'].update(kleidung=['female_casualsuit01', 'shoes05'], toenen={'casualsuit': dict(farbe=[0.88, 0.69, 0.19], hell=2.6, ohne=JEANS_F)})
L['petersen'].update(haare='rehmanpolanski_hair_bun_brown'); L['petersen']['toenen']['hair_bun'] = dict(farbe=[0.8, 0.8, 0.82], hell=1.7); del L['petersen']['toenen']['bob']
# Passanten für die Straßen (p1 … p8), dazu Notärztin und Sanitäter für den Rettungswagen. Alle ausgedacht.
ROT = [0.86, 0.2, 0.12]
L.update({
 'p1': dict(F, gender=0.0, age=0.45, weight=0.45, muscle=0.5, height=0.55, haut='young_african_female', haare='afro01', augenfarbe='brown',
            kleidung=['female_casualsuit01', 'shoes05'], toenen={'casualsuit': dict(farbe=[0.15, 0.55, 0.55], hell=2.6, ohne=JEANS_F)}),
 'p2': dict(M, gender=1.0, age=0.62, weight=0.6, muscle=0.5, height=0.55, haut='middleage_african_male', haare='short01', augenfarbe='brown',
            kleidung=['male_casualsuit02', 'shoes02']),
 'p3': dict(F, gender=0.0, age=0.6, weight=0.45, muscle=0.4, height=0.42, haut='middleage_asian_female', haare='toigo_blunt_bob_with_bangs', augenfarbe='brown',
            kleidung=['toigo_female_suit_2', 'toigo_ankle_boots_female'], toenen={'suit_2': dict(farbe=[0.6, 0.25, 0.3], hell=1.6, ohne=[0.55, 0, 1, 0.55])}),
 'p4': dict(M, gender=1.0, age=0.45, weight=0.4, muscle=0.5, height=0.5, haut='young_asian_male', haare='short03', augenfarbe='brown',
            kleidung=['male_casualsuit03', 'shoes06']),
 'p5': dict(F, gender=0.0, age=0.88, weight=0.6, muscle=0.3, height=0.38, haut='old_caucasian_female', haare='bob02', augenfarbe='blue',
            kleidung=['female_elegantsuit01', 'toigo_ballet_flats'], toenen={'elegantsuit': dict(farbe=[0.75, 0.68, 0.52], hell=3.2, ohne=[0, 0, 0.78, 0.53]), 'bob02': dict(farbe=[0.82, 0.82, 0.84], hell=2.2)}),
 'p6': dict(M, gender=1.0, age=0.85, weight=0.65, muscle=0.35, height=0.48, haut='old_caucasian_male', haare='short02', augenfarbe='grey',
            kleidung=['male_casualsuit04', 'shoes04'], toenen={'short02': dict(farbe=[0.7, 0.7, 0.7], hell=2.6)}),
 'p7': dict(F, gender=0.0, age=0.42, weight=0.4, muscle=0.6, height=0.52, haut='toigo_light_skin_female_freckles', haare='ponytail01', augenfarbe='green',
            kleidung=['female_sportsuit01', 'shoes05']),
 'p8': dict(M, gender=1.0, age=0.5, weight=0.5, muscle=0.6, height=0.6, haut='toigo_light_skin_male_bronze', haare='cortu_short_messy_hair', augenfarbe='brown',
            kleidung=['male_casualsuit06', 'shoes01']),
 'aerztin': dict(F, gender=0.0, age=0.55, weight=0.45, muscle=0.5, height=0.5, haut='middleage_caucasian_female', haare='ponytail01', augenfarbe='brown',
            kleidung=['male_worksuit01', 'shoes04'], toenen={'worksuit': dict(farbe=ROT, hell=2.2)}),
 'sani': dict(M, gender=1.0, age=0.48, weight=0.55, muscle=0.6, height=0.55, haut='young_caucasian_male2', haare='short04', augenfarbe='blue',
            kleidung=['male_worksuit01', 'shoes04'], toenen={'worksuit': dict(farbe=ROT, hell=2.2)}),
})
# Kolleginnen und Kollegen der Wache im dunkelblauen Einsatzanzug (eine richtige Uniform gibt es in den Paketen nicht). Alle ausgedacht.
BLAU = [0.11, 0.14, 0.3]
L.update({
 'pol1': dict(M, gender=1.0, age=0.6, weight=0.55, muscle=0.65, height=0.62, haut='middleage_caucasian_male', haare='short04', augenfarbe='blue',
            kleidung=['male_worksuit01', 'shoes04'], toenen={'worksuit': dict(farbe=BLAU, hell=2.2)}, farbe={'short04': [0.75, 0.55, 0.38]}),
 'pol2': dict(F, gender=0.0, age=0.45, weight=0.45, muscle=0.6, height=0.52, haut='young_caucasian_female', haare='ponytail01', augenfarbe='green',
            kleidung=['male_worksuit01', 'shoes04'], toenen={'worksuit': dict(farbe=BLAU, hell=2.2)}),
 'pol3': dict(M, gender=1.0, age=0.48, weight=0.5, muscle=0.6, height=0.58, haut='young_african_male', haare='short01', augenfarbe='brown',
            kleidung=['male_worksuit01', 'shoes04'], toenen={'worksuit': dict(farbe=BLAU, hell=2.2)}),
 'pol4': dict(F, gender=0.0, age=0.62, weight=0.5, muscle=0.5, height=0.48, haut='middleage_asian_female', haare='toigo_blunt_bob', augenfarbe='brown',
            kleidung=['male_worksuit01', 'shoes04'], toenen={'worksuit': dict(farbe=BLAU, hell=2.2), 'blunt_bob': dict(farbe=[0.12, 0.1, 0.1], hell=2.0)}),
})
L['p4'].update(haare='short04'); L['p4']['farbe'] = {'short04': [0.3, 0.27, 0.27]}
L['p5'].update(haare='toigo_curled_under_bob'); L['p5']['toenen'] = {'elegantsuit': dict(farbe=[0.75, 0.68, 0.52], hell=3.2, ohne=[0, 0, 0.78, 0.53]), 'bob': dict(farbe=[0.84, 0.84, 0.86], hell=2.2)}
L['p7'].update(kleidung=['female_casualsuit01', 'shoes05'], toenen={'casualsuit': dict(farbe=[0.5, 0.68, 0.92], hell=2.6, ohne=JEANS_F)})
L['p8'].update(haare='short02'); L['p8']['farbe'] = {'short02': [1.1, 0.8, 0.55]}
import glob, os
D = os.path.expanduser('~/.config/blender/5.3/extensions/.user/user_default/mpfb/data/clothes/')
p = [x for x in glob.glob(D + 'male_elegantsuit01/toigo_male_elegant_suit_olive/*.png') if 'norm' not in x.lower()][0]; L['brinkmann']['stoff']['elegantsuit01'] = p[len(D):]
json.dump(L, open('leute.json', 'w'), indent=1)
for n in (sys.argv[1:] or L):
    print('==', n, flush=True); subprocess.run(['./bau.sh', n, json.dumps(L[n]), '512'])
