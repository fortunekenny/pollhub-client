import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { authApi } from '../lib/api.js';
import { useAction, useDocumentTitle } from '../lib/hooks.js';
import { Button, Field, Input, ErrorNote } from '../components/ui.jsx';
import { AuthShell, OrDivider, GoogleButton } from '../components/AuthShell.jsx';

export function Signup() {
  useDocumentTitle('Create an account');
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const { execute, pending, error } = useAction(async () => {
    await signup(form);
    navigate('/dashboard', { replace: true });
  });

  const fieldErrors = error?.fieldErrors ?? {};

  return (
    <AuthShell
      title="Create your account"
      description="Free, and your first poll takes about a minute."
      footer={
        <p className="text-center" style={{ color: 'var(--ink-2)' }}>
          Already have an account?{' '}
          <Link to="/login" className="hover:underline" style={{ color: 'var(--brand-ink)' }}>
            Sign in
          </Link>
        </p>
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

        <Field label="Name" htmlFor="name" error={fieldErrors.name}>
          <Input
            id="name"
            autoComplete="name"
            required
            value={form.name}
            invalid={Boolean(fieldErrors.name)}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>

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

        <Field
          label="Password"
          htmlFor="password"
          hint="At least 8 characters."
          error={fieldErrors.password}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            invalid={Boolean(fieldErrors.password)}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>

        <Button type="submit" loading={pending} size="lg" className="w-full">
          Create account
        </Button>

        <OrDivider />

        <GoogleButton href={authApi.googleUrl()} />
      </form>
    </AuthShell>
  );
}
