import { notificationsApi } from './api.js';

const CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function pushSupport() {
  const supported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  return {
    supported,
    configured: Boolean(CONFIG.projectId && VAPID_KEY),
    permission: supported ? Notification.permission : 'unsupported',
  };
}

/**
 * Register for web push.
 *
 * Must be called from a user gesture — browsers reject a permission prompt
 * raised on page load, and a denial is permanent for the origin.
 *
 * The Firebase SDK is dynamically imported so it lands in its own chunk. It
 * must never reach the respondent bundle, which is the page held to the
 * < 1.5 s on 3G target.
 */
export async function registerWebPush() {
  const support = pushSupport();
  if (!support.supported) return { error: 'This browser does not support web push' };
  if (!support.configured) return { error: 'Web push is not configured on this deployment' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { error: permission === 'denied' ? 'Notifications were blocked' : 'Permission dismissed' };
  }

  try {
    const [{ initializeApp }, { getMessaging, getToken }] = await Promise.all([
      import('firebase/app'),
      import('firebase/messaging'),
    ]);

    // The service worker cannot read Vite env at runtime, so the config
    // travels in the registration URL and is read back from location.search.
    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${new URLSearchParams(CONFIG)}`,
      { scope: '/' },
    );

    // register() resolves as soon as the registration exists — the worker
    // itself may still be installing. PushManager.subscribe(), which getToken
    // calls into, requires an *active* worker and throws "no active service
    // worker" otherwise. That makes this a first-visit-only failure: by the
    // second attempt the worker has activated on its own, which is exactly
    // what makes it easy to miss in testing.
    await waitUntilActive(registration);

    const app = initializeApp(CONFIG);
    const token = await getToken(getMessaging(app), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return { error: 'Could not obtain a push token' };

    await notificationsApi.registerToken({ token, provider: 'fcm_web', platform: 'web' });
    localStorage.setItem('ph_push_token', token);
    return { token };
  } catch (err) {
    return { error: err.message ?? 'Push registration failed' };
  }
}

/**
 * Resolve once the registration has an active worker.
 *
 * Prefers the registration we just created over navigator.serviceWorker.ready,
 * which resolves for whichever worker controls the scope and would mask a
 * failure to activate this one. The timeout keeps a worker stuck in `installing`
 * — a syntax error in the script, or an importScripts() that cannot be fetched —
 * from hanging the button forever with a spinner and no explanation.
 */
function waitUntilActive(registration, timeoutMs = 10_000) {
  if (registration.active) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const worker = registration.installing ?? registration.waiting;
    if (!worker) {
      reject(new Error('Service worker registered but never started installing'));
      return;
    }

    const timer = setTimeout(() => {
      worker.removeEventListener('statechange', onChange);
      reject(new Error('Service worker did not activate in time'));
    }, timeoutMs);

    function onChange() {
      if (worker.state === 'activated') {
        clearTimeout(timer);
        worker.removeEventListener('statechange', onChange);
        resolve();
      } else if (worker.state === 'redundant') {
        clearTimeout(timer);
        worker.removeEventListener('statechange', onChange);
        reject(new Error('Service worker failed to install'));
      }
    }

    worker.addEventListener('statechange', onChange);
  });
}

/** Revoke on sign-out so a shared computer stops receiving the last user's polls. */
export async function unregisterWebPush() {
  const token = localStorage.getItem('ph_push_token');
  if (!token) return;
  try {
    await notificationsApi.revokeToken(token);
  } finally {
    localStorage.removeItem('ph_push_token');
  }
}
