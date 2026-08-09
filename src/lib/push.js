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
