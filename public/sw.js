// ─── Equistra Service Worker ────────────────────────────────────────────────
// Strategies:
//   Static assets (/_next/static)  → Cache-first  (content-hashed, immutable)
//   App pages                       → Network-first, 90-day offline fallback
//   Supabase REST GET               → Stale-while-revalidate, 90-day TTL
//   Push notifications              → existing handler preserved
//   Background Sync                 → flushes offline mutation queue via postMessage
// ────────────────────────────────────────────────────────────────────────────

const SW_VERSION = 'v3';
const STATIC_CACHE = `equistra-static-${SW_VERSION}`;
const PAGE_CACHE   = `equistra-pages-${SW_VERSION}`;
const DATA_CACHE   = `equistra-data-${SW_VERSION}`;
const SYNC_TAG     = 'equistra-sync';

const TTL_90_DAYS = 90 * 24 * 60 * 60 * 1000;

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(['/icon-192.png', '/icon-512.png', '/favicon.ico'])
    )
  );
  self.skipWaiting();
});

// ── Activate — purge old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const keepCaches = new Set([STATIC_CACHE, PAGE_CACHE, DATA_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !keepCaches.has(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function isCacheExpired(response) {
  if (!response) return true;
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return false; // no TTL header → keep forever
  return Date.now() - parseInt(cachedAt, 10) > TTL_90_DAYS;
}

async function fetchAndCache(cacheName, request, options = {}) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone and add cache timestamp header
      const headers = new Headers(networkResponse.headers);
      headers.set('sw-cached-at', String(Date.now()));
      const stamped = new Response(await networkResponse.clone().arrayBuffer(), {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers,
      });
      cache.put(request, stamped);
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached && !isCacheExpired(cached)) return cached;
    throw err;
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, non-http(s)
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // 1. Next.js immutable static assets → cache-first (no expiry)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // 2. Supabase REST GET → stale-while-revalidate with 90-day TTL
  if (url.hostname.includes('supabase.co') && url.pathname.startsWith('/rest/v1/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(DATA_CACHE);
        const cached = await cache.match(request);

        // Kick off a network refresh in the background
        const networkPromise = fetchAndCache(DATA_CACHE, request).catch(() => null);

        // Return stale if not expired, else wait for network
        if (cached && !isCacheExpired(cached)) return cached;
        const fresh = await networkPromise;
        return fresh || cached || new Response('Offline', { status: 503 });
      })()
    );
    return;
  }

  // 3. App pages → network-first with 90-day offline fallback
  if (url.origin === self.location.origin && !url.pathname.startsWith('/api/')) {
    event.respondWith(fetchAndCache(PAGE_CACHE, request).catch(async () => {
      // Fallback to cached version if available
      const cached = await caches.match(request);
      return cached || caches.match('/');
    }));
    return;
  }

  // 4. Everything else → pass through
});

// ── Background Sync ───────────────────────────────────────────────────────────
// When the browser regains connectivity it fires the sync event.
// We can't run Supabase SDK in SW, so we message the active client to flush.
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(notifyClientsToFlush());
  }
});

async function notifyClientsToFlush() {
  const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' });
  }
}

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Equistra', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Equistra', {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: data.url ? { url: data.url } : undefined,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (!url) return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
