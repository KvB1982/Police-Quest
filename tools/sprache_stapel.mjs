// Stimmen in Stapeln erzeugen: mehrere Sätze einer Stimme in EINEM Auftrag bei 3D AI Studio,
// dazwischen „[long pause]“. Danach wird die Aufnahme an den langen Pausen zerschnitten.
// Anleitung: tools/sprache_LIESMICH.md
//
// node tools/sprache_stapel.mjs plan            teilt alle fehlenden Sätze in Stapel (eine Stimme, höchstens 8 Sätze)
// node tools/sprache_stapel.mjs zeig 0 9        zeigt die Stapel 0 bis 9 zum Abschicken (generate_speech)
// node tools/sprache_stapel.mjs hol nr:taskid[:grenze] …   lädt Stapel, schneidet, prüft und legt die Stücke nach sprache/
//    grenze = ab wie vielen Sekunden Stille geschnitten wird (sonst 1,1; manche Stimmen machen kürzere Pausen: 0.9 oder 0.75)
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
const repo = join(dirname(new URL(import.meta.url).pathname), '..'), ziel = join(repo, 'sprache');
// Merkzettel und Roh-Aufnahmen liegen in den Projektdateien (nicht im Repository)
const S = process.env.STIMMEN || '/mnt/project-files/police-quest/stimmen', roh = join(S, 'roh');
const was = process.argv[2];
if (was === 'plan') {
  const fehlt = JSON.parse(execFileSync('node', [join(repo, 'tools/sprache.mjs'), 'json'], { maxBuffer: 1e8 }).toString());
  const stapel = [];
  const proStimme = {};
  for (const f of fehlt) (proStimme[f.stimme + '|' + f.ruhe] ||= []).push(f);
  for (const [k, liste] of Object.entries(proStimme)) {
    let akt = null;
    for (const f of liste) {
      if (!akt || akt.teile.length >= 8 || akt.z + f.sprich.length > 1100) { akt = { stimme: k.split('|')[0], ruhe: +k.split('|')[1], teile: [], z: 0 }; stapel.push(akt); }
      akt.teile.push(f); akt.z += f.sprich.length + 14;
    }
  }
  for (const s of stapel) s.text = s.teile.map(t => t.sprich).join(' [long pause] ');
  writeFileSync(join(S, 'stapel.json'), JSON.stringify(stapel));
  console.log(stapel.length + ' Stapel, ' + fehlt.length + ' Sätze, Credits etwa ' + stapel.reduce((a, s) => a + Math.ceil(s.text.length / 100), 0));
} else if (was === 'zeig') {
  const stapel = JSON.parse(readFileSync(join(S, 'stapel.json'), 'utf8'));
  for (let i = +process.argv[3]; i <= Math.min(+process.argv[4], stapel.length - 1); i++) console.log(`#${i}|${stapel[i].stimme}|${stapel[i].ruhe}|${stapel[i].teile.length}\n${stapel[i].text}\n`);
} else if (was === 'hol') {
  const stapel = JSON.parse(readFileSync(join(S, 'stapel.json'), 'utf8'));
  mkdirSync(roh, { recursive: true });
  const slug = (t, ss) => t.replace(/ß/g, ss).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40).replace(/^_+|_+$/g, '');
  for (const a of process.argv.slice(3)) {
    const [nr, id, grenze] = a.split(':'), st = stapel[+nr], datei = join(roh, `stapel_${String(nr).padStart(3, '0')}_${st.stimme}.mp3`);
    let ok = false;
    for (const ss of ['', 'ss', '_', 'ß']) {
      try { execFileSync('curl', ['-sSf', '-o', datei, `https://s.3daistudio.com/media/audios/${id}_speech_${slug(st.text, ss)}.mp3`], { stdio: 'pipe' }); ok = true; break; } catch (e) { /* nächster */ }
    }
    if (!ok) { console.log(`#${nr} FEHLT (Adresse nicht gefunden) ${slug(st.text, '')}`); continue; }
    const aus = spawnSync('ffmpeg', ['-hide_banner', '-i', datei, '-af', 'silencedetect=noise=-38dB:d=0.2', '-f', 'null', '-']).stderr.toString();
    const lang = +aus.match(/Duration: (\d+):(\d+):([\d.]+)/).slice(1).reduce((s, x) => s * 60 + +x, 0);
    const stille = [...aus.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map(m => ({ ende: +m[1], dauer: +m[2] }));
    // lange Pausen = Schnittstellen; Stille ganz am Anfang oder Ende zählt nicht
    const schnitte = stille.filter(s => s.dauer >= (+grenze || 1.1) && s.ende - s.dauer > 0.15 && s.ende < lang - 0.15);
    const vorn = stille.find(s => s.ende - s.dauer < 0.05), hinten = stille.find(s => s.ende > lang - 0.05);
    const stuecke = []; let ab = vorn ? vorn.ende : 0;
    for (const s of schnitte) { stuecke.push([ab, s.ende - s.dauer]); ab = s.ende; }
    stuecke.push([ab, hinten ? hinten.ende - hinten.dauer : lang]);
    if (stuecke.length !== st.teile.length) { console.log(`#${nr} FALSCH: ${stuecke.length} Stücke statt ${st.teile.length} (Pausen: ${stille.filter(s => s.dauer > 0.7).map(s => s.dauer.toFixed(1)).join(' ')})`); continue; }
    const meld = [];
    if (grenze) console.log('   Längen: ' + st.teile.map((t, i) => (stuecke[i][1] - stuecke[i][0]).toFixed(1) + 's/' + t.sprich.length).join(' '));
    st.teile.forEach((t, i) => {
      const [von, bis] = stuecke[i], d = bis - von + 0.14, tmp = join(S, 'tmp.wav');
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', Math.max(0, von - 0.06).toFixed(3), '-t', d.toFixed(3), '-i', datei, '-ac', '1', '-ar', '32000', tmp]);
      const v = spawnSync('ffmpeg', ['-hide_banner', '-i', tmp, '-af', 'volumedetect', '-f', 'null', '-']).stderr.toString();
      const mittel = +v.match(/mean_volume: ([-\d.]+)/)[1], spitze = +v.match(/max_volume: ([-\d.]+)/)[1];
      const mehr = Math.min(-20 - mittel, -1 - spitze);
      mkdirSync(dirname(join(ziel, t.datei)), { recursive: true });
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-af', `volume=${mehr.toFixed(1)}dB,afade=t=in:d=0.02,afade=t=out:st=${(d - 0.05).toFixed(3)}:d=0.05`, '-b:a', '48k', join(ziel, t.datei)]);
      const proZ = (bis - von) / t.sprich.length;
      appendFileSync(join(S, 'fertig.txt'), `s${nr}.${i}\t${id}\t${t.datei}\t${(bis - von).toFixed(2)}\t${t.sprich.length}\n`);
      if (proZ < 0.045 || proZ > 0.12) meld.push(`${i}: ${(bis - von).toFixed(1)}s für ${t.sprich.length} Zeichen „${t.sprich.slice(0, 30)}“`);
    });
    console.log(`#${nr} ok ${st.teile.length} Stücke, ${lang.toFixed(0)}s` + (meld.length ? '  ?? ' + meld.join(' | ') : ''));
  }
}
