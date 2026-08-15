import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle } from '../lib/hooks.js';
import { Button, Card, Spinner } from '../components/ui.jsx';

/**
 * Landing point for the Google sign-in redirect.
 *
 * The API cannot return a token in a response body here — Google navigates the
 * browser to it, so the response is a page. It redirects to this route with the
 * token in the fragment instead, which this component trades for a session.
 *
 * A fragment is used rather than a query string because it never leaves the
 * browser: no access log, no Referer header, no server-side copy of a
 * credential that is valid for the next fifteen minutes.
 */
export function OAuthCallback() {
  useDocumentTitle('Signing in');
  const { adoptSession } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  // StrictMode mounts effects twice in development. Adopting the same token
  // twice is harmless, but the second run reads an already-cleared fragment
  // and would report a spurious failure.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    const failure = params.get('error');

    // Drop the credential from the address bar before anything can await:
    // otherwise it sits in history, and in whatever the user pastes next.
    window.history.replaceState(null, '', window.location.pathname);

    if (failure) {
      setError(failure);
      return;
    }
    if (!token) {
      setError('No sign-in token was returned.');
      return;
    }

    adoptSession(token)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => setError('That sign-in could not be completed. Please try again.'));
  }, [adoptSession, navigate]);

  if (error) {
    return (
      <Card className="mx-auto max-w-sm text-center">
        <h1 className="text-lg font-semibold">Sign-in failed</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>
          {error}
        </p>
        <div className="mt-5">
          <Button to="/login">Back to sign in</Button>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
          Or <Link to="/" className="hover:underline">return home</Link>.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex justify-center py-24">
      <Spinner size={28} label="Completing sign-in" />
    </div>
  );
}
