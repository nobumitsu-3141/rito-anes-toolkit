/* 小児麻酔オールインワン｜離島麻酔ツールキット — Service Worker
   完全オフライン + 自動更新。
   ・install: アプリ一式を HTTPキャッシュをバイパスして取得しキャッシュ → skipWaiting で即待機解除
   ・activate: 旧キャッシュを削除 → clients.claim()（ページ側の controllerchange が発火し自動リロード）
   ・fetch: キャッシュ優先（オフライン確実）。無ければネットワーク。
   アプリを更新したら必ず CACHE のバージョン文字列を上げること（index.html のフッター build 表記も合わせる）。 */
const CACHE = 'rito-peds-v2.0.5';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // cache:'reload' でブラウザのHTTPキャッシュを使わず常に最新を取得
      return Promise.all(ASSETS.map(function (u) {
        return fetch(new Request(u, { cache: 'reload' }))
          .then(function (resp) { if (resp && resp.ok) return c.put(u, resp); })
          .catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k.startsWith('rito-peds-') && k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* キャッシュ優先（オフライン確実）。無ければネットワーク、取得できた新規GETは追記。
   ナビゲーション要求がオフラインで失敗したら index.html を返す。 */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
