/*
 * Push service worker.
 *
 * MUST be served from the site root — its scope cannot cover the dashboard
 * from a subdirectory.
 *
 * Deliberately has NO dependencies. It previously pulled the Firebase SDK from
 * gstatic.com with importScripts at the top level, which is a fragile place for
 * a network call: Chrome terminates an idle service worker and re-evaluates
 * this whole file every time a push arrives. A slow or blocked CDN fetch at
 * that moment throws before the push listener is registered, and the
 * notification is dropped with no error anywhere — the browser has nothing to
 * report to, and FCM has already returned 200 to the sender.
 *
 * The SDK was only ever used here to unwrap the payload and call
 * showNotification. The Push API can do both natively. Firebase is still used
 * in the page (lib/push.js) to mint the registration token, which is the part
 * that genuinely needs it.
 *
 * Cloudflare sits in front of this file in production. Give it an explicit
 * cache rule with a short TTL: a long-cached service worker is sticky, and a
 * broken push registration survives redeploys until the cached copy expires.
 */
/* eslint-env serviceworker */

const FALLBACK_TITLE = 'PollHub';
const FALLBACK_LINK = '/dashboard';

/**
 * FCM delivers its own JSON envelope. Shapes vary by how the message was
 * composed, so read defensively rather than assuming one layout: a payload
 * that fails to parse should still produce a visible notification.
 */
function readPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json() ?? {};
  } catch {
    return { notification: { body: event.data.text() } };
  }
}

self.addEventListener('push', (event) => {
  const payload = readPayload(event);
  const notification = payload.notification ?? {};
  const data = payload.data ?? {};

  const title = notification.title ?? data.title ?? FALLBACK_TITLE;
  const body = notification.body ?? data.body ?? '';
  const link =
    payload.fcmOptions?.link ??
    notification.click_action ??
    data.link ??
    FALLBACK_LINK;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // Collapse repeat notifications for the same poll rather than stacking.
      tag: data.pollId ?? 'pollhub',
      data: { link },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? FALLBACK_LINK;

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

// Take over immediately instead of waiting for every old tab to close. A user
// who has just fixed their notifications should not have to close the tab they
// fixed them in before the new worker handles anything.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
