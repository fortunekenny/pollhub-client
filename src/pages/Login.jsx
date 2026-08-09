import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { authApi } from '../lib/api.js';
import { useAction, useDocumentTitle } from '../lib/hooks.js';
import { Button, Card, Field, Input, ErrorNote } from '../components/ui.jsx';

export function Login() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });

  const { execute, pending, error } = useAction(async () => {
    await login(form);
    // Return them to whatever they were trying to reach.
    navigate(location.state?.from ?? '/dashboard', { replace: true });
  });

  const fieldErrors = error?.fieldErrors ?? {};

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--ink-2)' }}>
        Sign in to manage your polls.
      </p>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            execute().catch(() => {});
          }}
        >
          <ErrorNote error={error?.status === 422 ? null : error} />

          <Field label="Email" htmlFor="email" error={fieldErrors.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              invalid={Boolean(fieldErrors.email)}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>

          <Field label="Password" htmlFor="password" error={fieldErrors.password}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              invalid={Boolean(fieldErrors.password)}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>

          <Button type="submit" loading={pending} className="w-full">
            Sign in
          </Button>

          <div className="relative py-1 text-center">
            <span className="relative z-10 px-2 text-xs" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
              or
            </span>
            <span
              className="absolute left-0 right-0 top-1/2 -z-0 block h-px"
              style={{ background: 'var(--line)' }}
            />
          </div>

          {/* Full page navigation, not fetch: the OAuth redirect has to leave
              the SPA and come back. */}
          <Button as="a" href={authApi.googleUrl()} variant="secondary" className="w-full">
            Continue with Google
          </Button>
        </form>
      </Card>

      <div className="mt-4 flex justify-between text-sm">
        <Link to="/forgot-password" style={{ color: 'var(--brand-ink)' }}>
          Forgot password?
        </Link>
        <Link to="/signup" style={{ color: 'var(--brand-ink)' }}>
          Create an account
        </Link>
      </div>
    </div>
  );
}
