// Blaulicht über Möwenbrück – der "Service Worker". Das ist ein kleiner Helfer, den der Browser im Hintergrund laufen lässt.
// Er merkt sich alle Dateien des Spiels in einem Zwischenspeicher (Cache). Dadurch startet das Spiel
// auf iPad und iPhone auch ohne Internet, wenn es vorher einmal mit Internet geladen wurde. (Vorbild: sw.js in Powershot.)
//
// Zwei Regeln:
//   1. Programm-Dateien (HTML, CSS, JavaScript): zuerst im Internet nachsehen, damit Änderungen sofort
//      ankommen. Nur wenn kein Internet da ist, nehmen wir die gemerkte Datei.
//   2. Große Dateien (Modelle, Bodenbilder, Geräusche, Musik, three.js): zuerst die gemerkte Datei nehmen –
//      das spart jedes Mal viele Megabyte Herunterladen.
//
// Wenn du ein Modell, ein Geräusch oder ein Musikstück austauschst (gleicher Dateiname, neuer Inhalt), erhöhe VERSION um 1.
// Dann wirft der Helfer den alten Speicher weg und lädt alles frisch.

const VERSION = 1;
const CACHE = 'blaulicht-v' + VERSION;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  // Alte Speicher (von früheren Versionen) aufräumen
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

// Holt eine Datei aus dem Internet und merkt sie sich (nur wenn sie wirklich ganz angekommen ist)
async function holen(request) {
  const antwort = await fetch(request);
  if (antwort.status === 200) (await caches.open(CACHE)).put(request, antwort.clone());
  return antwort;
}

// Gehört die Adresse zum Spiel? (eigene Dateien und three.js von jsDelivr)
function gehoertDazu(url) {
  return url.origin === self.location.origin || url.hostname === 'cdn.jsdelivr.net';
}

// Beim allerersten Start lädt die Seite ihre Dateien, bevor der Helfer mithören kann.
// Deshalb schickt uns die Seite danach eine Liste dieser Dateien (siehe index.html) und wir holen sie nach.
self.addEventListener('message', (event) => {
  const liste = (event.data && event.data.merken) || [];
  event.waitUntil((async () => {
    for (const adresse of liste) {
      try {
        if (!gehoertDazu(new URL(adresse))) continue;
        if (!(await caches.match(adresse, { ignoreVary: true }))) await holen(new Request(adresse));
      } catch (e) { /* diese Datei klappt nicht – beim nächsten Start wieder versuchen */ }
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!gehoertDazu(url)) return;
  const eigene = url.origin === self.location.origin;

  const gross = !eigene || /\/(assets|sounds|musik|icons)\//.test(url.pathname);
  event.respondWith((async () => {
    // ignoreVary: Die gemerkte Datei passt auch dann, wenn der Browser beim Nachfragen andere Kopfzeilen mitschickt
    // (sonst findet er three.js ohne Internet nicht wieder).
    const gemerkt = await caches.match(request, { ignoreSearch: eigene && !gross, ignoreVary: true });
    if (gross) return gemerkt || holen(request);                 // Regel 2
    try { return await holen(request); }                         // Regel 1
    catch (e) { if (gemerkt) return gemerkt; throw e; }
  })());
});
