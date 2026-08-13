import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api.js';
import { useAction, useDocumentTitle } from '../lib/hooks.js';
import { Button, Field, Input, ErrorNote, Spinner } from '../components/ui.jsx';
import { AuthShell } from '../components/AuthShell.jsx';

/**
 * The tick that confirms a one-way action completed.
 *
 * Sized and coloured like the empty-state marks so a success screen reads as
 * part of the same family rather than as a different app.
 */
function StatusMark({ tone = 'good', children }) {
  return (
    <span
      aria-hidden
      className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-full"
      style={{
        background: `color-mix(in srgb, var(--${tone}) 14%, transparent)`,
        color: `var(--${tone})`,
      }}
    >
      {children}
    </span>
  );
}

export function ForgotPassword() {
  useDocumentTitle('Reset your password');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { execute, pending, error } = useAction(async () => {
    await authApi.requestReset(email);
    setSent(true);
  });

  return (
    <AuthShell
      title="Reset your password"
      description={sent ? undefined : 'We will email you a link to choose a new one.'}
    >
      {sent ? (
        // Deliberately the same message whether or not the address exists —
        // anything else turns this form into an account-enumeration oracle.
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <StatusMark>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </StatusMark>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            If that address has an account, a reset link is on its way. It expires in 30 minutes.
          </p>
          <Button variant="secondary" to="/login" className="mt-2 w-full">
            Back to sign in
          </Button>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            execute().catch(() => {});
          }}
        >
          <ErrorNote error={error} />
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={pending} size="lg" className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const token = params.get('token');

  const { execute, pending, error } = useAction(async () => {
    await authApi.resetPassword({ token, password });
    navigate('/login', { replace: true });
  });

  if (!token) {
    return (
      <AuthShell title="Reset link incomplete">
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          This reset link is missing its token. Request a new one from{' '}
          <Link to="/forgot-password" className="hover:underline" style={{ color: 'var(--brand-ink)' }}>
            forgot password
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          execute().catch(() => {});
        }}
      >
        <ErrorNote error={error} />
        <Field label="New password" htmlFor="password" hint="At least 8 characters.">
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" loading={pending} size="lg" className="w-full">
          Set new password
        </Button>
      </form>
    </AuthShell>
  );
}

export function VerifyEmail() {
  useDocumentTitle('Verifying your email');
  const [params] = useSearchParams();
  const [state, setState] = useState('working');
  const token = params.get('token');

  useEffect(() => {
    if (!token) {
      setState('missing');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setState('done'))
      .catch(() => setState('failed'));
  }, [token]);

  const TITLES = {
    working: 'Verifying your email',
    done: 'Email verified',
    failed: "That link didn't work",
    missing: "That link didn't work",
  };

  return (
    <AuthShell title={TITLES[state]}>
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        {state === 'working' && (
          <>
            <Spinner size={28} label="Verifying your email" />
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
              One moment…
            </p>
          </>
        )}

        {state === 'done' && (
          <>
            <StatusMark>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </StatusMark>
            <Button to="/dashboard" className="mt-2 w-full">
              Go to my polls
            </Button>
          </>
        )}

        {(state === 'failed' || state === 'missing') && (
          <>
            <StatusMark tone="critical">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4.5M12 16h.01" />
              </svg>
            </StatusMark>
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
              Verification links expire after 24 hours and can only be used once.
            </p>
            <Button variant="secondary" to="/login" className="mt-2 w-full">
              Back to sign in
            </Button>
          </>
        )}
      </div>
    </AuthShell>
  );
}
