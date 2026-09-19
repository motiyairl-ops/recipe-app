// Service Worker בסיסי: שומר במטמון את קבצי המעטפת של האפליקציה (HTML/CSS/JS/אייקונים)
// כדי שהאפליקציה תיפתח מהר גם ברשת חלשה. קריאות ל-Supabase (הנתונים עצמם) תמיד עוברות ברשת.

const CACHE_NAME = "recipe-app-shell-v2";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/config.js",
  "./js/supabaseClient.js",
  "./js/db.js",
  "./js/state.js",
  "./js/imageUtils.js",
  "./js/backup.js",
  "./js/ui/common.js",
  "./js/ui/login.js",
  "./js/ui/list.js",
  "./js/ui/detail.js",
  "./js/ui/form.js",
  "./js/ui/categories.js",
  "./js/ui/cooking.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
  "./icons/apple-touch-icon-152.png",
  "./icons/apple-touch-icon-167.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // רק בקשות GET מאותו מקור נשמרות במטמון; כל השאר (כולל Supabase) עוברות ישירות לרשת.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
