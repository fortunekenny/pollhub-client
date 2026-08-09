/*
 * Firebase Cloud Messaging service worker.
 *
 * MUST be served from the site root — its scope cannot cover the dashboard
 * from a subdirectory.
 *
 * Cloudflare sits in front of this file in production. Give it an explicit
 * cache rule with a short TTL: a long-cached service worker is sticky, and a
 * broken push registration survives redeploys until the cached copy expires.
 *
 * Config arrives as query params because a service worker cannot read the
 * build's environment variables at runtime — see lib/push.js.
 */
/* eslint-env serviceworker */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? 'PollHub', {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // Collapse repeat notifications for the same poll rather than stacking.
    tag: payload.data?.pollId ?? 'pollhub',
    data: { link: payload.fcmOptions?.link ?? payload.data?.link ?? '/dashboard' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab rather than opening a duplicate.
      for (const client of clients) {
        if (client.url.includes(link) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(link);
    }),
  );
});
