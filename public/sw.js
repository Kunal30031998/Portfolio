/* Service worker — stale-while-revalidate for static, network-first for HTML.
   Bump CACHE on every release so old assets are evicted. */
const CACHE = 'kunal-portfolio-v2';

// Pre-cache only the cheapest, most-likely-needed assets.
// We DO NOT pre-cache deepState.mp3 (~13MB) or PDFs.
const PRECACHE = ['/'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

const isHTML = (req) =>
  req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

const isAnalytics = (url) =>
  url.includes('googletagmanager.com') ||
  url.includes('google-analytics.com') ||
  url.includes('github-contributions-api');

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = req.url;

  // Only http/https — chrome-extension:// etc. are unsupported by Cache API
  if (!url.startsWith('http')) return;

  // Never intercept analytics / dynamic APIs
  if (isAnalytics(url)) return;

  // Never cache the heavy audio file — let the browser + CF CDN handle range requests
  if (url.endsWith('.mp3')) return;

  // HTML: network-first so deploys roll out instantly, fall back to cache offline
  if (isHTML(req)) {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const clone = r.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
          return r;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/')))
    );
    return;
  }

  // Static: stale-while-revalidate
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((r) => {
          if (r && r.status === 200 && r.type !== 'opaque') {
            const clone = r.clone();
            caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return r;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
