import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api.js';
import { useAction, useDocumentTitle } from '../lib/hooks.js';
import { Button, Card, Field, Input, ErrorNote, Spinner } from '../components/ui.jsx';

export function ForgotPassword() {
  useDocumentTitle('Reset your password');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { execute, pending, error } = useAction(async () => {
    await authApi.requestReset(email);
    setSent(true);
  });

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Reset your password</h1>

      <Card>
        {sent ? (
          // Deliberately the same message whether or not the address exists —
          // anything else turns this form into an account-enumeration oracle.
          <div className="space-y-3">
            <p className="text-sm">
              If that address has an account, a reset link is on its way. It expires in 30
              minutes.
            </p>
            <Button variant="secondary" to="/login" className="w-full">
              Back to sign in
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
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
            <Button type="submit" loading={pending} className="w-full">
              Send reset link
            </Button>
          </form>
        )}
      </Card>
    </div>
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
      <div className="mx-auto max-w-sm">
        <Card>
          <p className="text-sm">
            This reset link is missing its token. Request a new one from{' '}
            <Link to="/forgot-password" style={{ color: 'var(--brand-ink)' }}>
              forgot password
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <Card>
        <form
          className="space-y-4"
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
          <Button type="submit" loading={pending} className="w-full">
            Set new password
          </Button>
        </form>
      </Card>
    </div>
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

  return (
    <div className="mx-auto max-w-sm text-center">
      <Card className="space-y-4">
        {state === 'working' && (
          <>
            <Spinner size={28} />
            <p className="text-sm">Verifying your email…</p>
          </>
        )}
        {state === 'done' && (
          <>
            <h1 className="text-lg font-semibold">Email verified</h1>
            <Button to="/dashboard" className="w-full">
              Go to my polls
            </Button>
          </>
        )}
        {(state === 'failed' || state === 'missing') && (
          <>
            <h1 className="text-lg font-semibold">That link didn't work</h1>
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
              Verification links expire after 24 hours and can only be used once.
            </p>
            <Button variant="secondary" to="/login" className="w-full">
              Back to sign in
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
