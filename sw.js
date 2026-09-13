// เครื่องมือ PDF — service worker
// กลยุทธ์: precache หน้าแอปเอง, ส่วนไฟล์จาก CDN (pdf-lib, pdf.js, ฟอนต์) จะถูกเก็บลงแคช
// อัตโนมัติหลังโหลดสำเร็จครั้งแรก แล้วใช้จากแคชได้ทันทีในครั้งถัดไปแม้ไม่มีเน็ต

const CACHE_VERSION = 'pdf-tools-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // App shell: cache-first, fall back to network
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  } else {
    // Third-party (pdf-lib, pdf.js, Google Fonts, etc.): try network first,
    // cache a copy on success, fall back to cache when offline
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
