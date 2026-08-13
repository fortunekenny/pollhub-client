import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { authApi } from '../lib/api.js';
import { useAction, useDocumentTitle } from '../lib/hooks.js';
import { Button, Field, Input, ErrorNote } from '../components/ui.jsx';
import { AuthShell, OrDivider, GoogleButton } from '../components/AuthShell.jsx';

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
    <AuthShell
      title="Welcome back"
      description="Sign in to manage your polls."
      footer={
        <div className="flex justify-between">
          <Link to="/forgot-password" className="hover:underline" style={{ color: 'var(--brand-ink)' }}>
            Forgot password?
          </Link>
          <Link to="/signup" className="hover:underline" style={{ color: 'var(--brand-ink)' }}>
            Create an account
          </Link>
        </div>
      }
    >
      <form
        className="space-y-5"
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

        <Button type="submit" loading={pending} size="lg" className="w-full">
          Sign in
        </Button>

        <OrDivider />

        <GoogleButton href={authApi.googleUrl()} />
      </form>
    </AuthShell>
  );
}
