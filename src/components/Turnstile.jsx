import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile challenge.
 *
 * The API treats the challenge as an escalation, not a hard gate: it verifies
 * a token only when TURNSTILE_SECRET_KEY is configured, and rejects a response
 * outright when configured but no token arrives (integrations/turnstile.js).
 * So this widget must render wherever the API reports turnstile:true — a
 * deployment with the secret set and no site key here cannot accept a vote.
 *
 * Rendered explicitly rather than via the auto-scanning `cf-turnstile` class,
 * because the respondent form mounts after the script would have scanned.
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Whether a site key was built into this bundle. */
export function isTurnstileConfigured() {
  return Boolean(SITE_KEY);
}

// Shared across mounts: the script installs one global, and loading it twice
// races two copies of that global against each other.
let scriptPromise = null;

function loadTurnstileScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => {
      // Drop the cached rejection so a later mount can retry — a blocked
      // request on one page load should not poison the whole session.
      scriptPromise = null;
      script.remove();
      reject(new Error('Could not load the verification challenge'));
    });
    document.head.append(script);
  });

  return scriptPromise;
}

/**
 * @param onToken  called with a token, or null whenever the current one stops
 *                 being usable (expiry, error, or an explicit reset)
 * @param onError  called with a human-readable reason the challenge is unusable
 * @param resetSignal  increment to discard the current token and re-challenge
 */
export function Turnstile({ onToken, onError, resetSignal = 0 }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  // Held in a ref so a re-render with new closures does not tear down and
  // re-render the widget, which would visibly flicker and drop a valid token.
  const handlers = useRef({ onToken, onError });
  handlers.current = { onToken, onError };

  useEffect(() => {
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => handlers.current.onToken(token),
          // Turnstile tokens expire after a few minutes. A respondent reading
          // a long poll can easily outlast one, and submitting an expired
          // token fails identically to sending none.
          'expired-callback': () => handlers.current.onToken(null),
          'error-callback': () => {
            handlers.current.onToken(null);
            handlers.current.onError?.('The verification challenge could not be completed.');
          },
        });
      })
      .catch((err) => {
        if (!cancelled) handlers.current.onError?.(err.message);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (resetSignal === 0) return;
    if (widgetIdRef.current === null || !window.turnstile) return;

    // A token is single-use: the moment the API verifies one, Cloudflare
    // retires it. Reusing it after a failed submit would be rejected as a
    // failed challenge, hiding whatever actually went wrong.
    window.turnstile.reset(widgetIdRef.current);
    handlers.current.onToken(null);
  }, [resetSignal]);

  return <div ref={containerRef} className="flex justify-center" />;
}
