import { Link } from 'react-router-dom';
import { Card, Button } from './ui.jsx';
import { Wordmark } from './Layout.jsx';

/**
 * Shared frame for the four auth screens.
 *
 * They were drifting apart — different heading spacing, and the divider and
 * Google button existed only on one of them. One frame keeps them identical,
 * which matters more here than anywhere else in the app: this is where a
 * mismatch reads as a phishing page rather than as untidiness.
 */
export function AuthShell({ title, description, children, footer }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-stretch py-6 sm:py-10">
      <Link to="/" className="mb-8 self-center">
        <Wordmark />
      </Link>

      <h1 className="text-2xl font-semibold">{title}</h1>
      {description && (
        <p className="mt-1.5 mb-7 text-sm" style={{ color: 'var(--ink-2)' }}>
          {description}
        </p>
      )}

      <Card elevation={2}>{children}</Card>

      {footer && <div className="mt-5 text-sm">{footer}</div>}
    </div>
  );
}

/**
 * The label sits on the surface colour to punch a gap in the rule behind it,
 * so the two never overlap regardless of the label's width.
 */
export function OrDivider({ label = 'or' }) {
  return (
    <div className="relative py-1 text-center" aria-hidden>
      <span
        className="absolute inset-x-0 top-1/2 block h-px"
        style={{ background: 'var(--line)' }}
      />
      <span
        className="relative px-3 text-xs"
        style={{ background: 'var(--surface)', color: 'var(--muted)' }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Full page navigation, not fetch: the OAuth redirect has to leave the SPA and
 * come back. The mark is Google's own, which is what makes the button
 * recognisable at a glance rather than just another secondary action.
 */
export function GoogleButton({ href, children = 'Continue with Google' }) {
  return (
    <Button as="a" href={href} variant="secondary" className="w-full">
      <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
        />
      </svg>
      {children}
    </Button>
  );
}
