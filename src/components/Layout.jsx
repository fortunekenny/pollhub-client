import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Button, cx } from './ui.jsx';

/**
 * The wordmark.
 *
 * Three ascending bars — the result view of a poll, which is the thing the
 * product is actually for. Inline SVG rather than an image file: it inherits
 * the theme, costs no request, and stays sharp at any density.
 */
export function Wordmark({ size = 'md' }) {
  const bar = size === 'sm' ? 3 : 3.5;
  const dim = size === 'sm' ? 18 : 22;
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={dim} height={dim} viewBox="0 0 24 24" aria-hidden fill="none">
        <rect x="2.5" y="13" width={bar * 1.6} height="8" rx="1.6" fill="var(--brand)" opacity="0.45" />
        <rect x="9.5" y="8" width={bar * 1.6} height="13" rx="1.6" fill="var(--brand)" opacity="0.72" />
        <rect x="16.5" y="3" width={bar * 1.6} height="18" rx="1.6" fill="var(--brand)" />
      </svg>
      <span className={cx('font-semibold tracking-tight', size === 'sm' ? 'text-sm' : 'text-base')}>
        PollHub
      </span>
    </span>
  );
}

const THEME_ICON = {
  light: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  ),
  dark: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
    </svg>
  ),
  system: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.75" y="4" width="18.5" height="13" rx="2" />
      <path d="M8 20.5h8" />
    </svg>
  ),
};

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'system');

  useEffect(() => {
    if (theme === 'system') {
      delete document.documentElement.dataset.theme;
      localStorage.removeItem('ph_theme');
    } else {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem('ph_theme', theme);
    }
  }, [theme]);

  const next = { system: 'light', light: 'dark', dark: 'system' }[theme];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="btn btn-ghost h-9 w-9 !px-0"
      aria-label={`Theme: ${theme}. Switch to ${next}.`}
      title={`Theme: ${theme}`}
    >
      {THEME_ICON[theme]}
    </button>
  );
}

/*
 * Active nav state is a filled pill, not a colour change. Colour alone would
 * be the only signal for anyone who cannot separate the two hues, and the
 * weight shift on its own is too quiet to find at a glance.
 */
const navLinkClass = ({ isActive }) =>
  cx(
    'rounded-md px-3 py-1.5 text-sm transition-colors',
    isActive ? 'font-medium' : 'hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]',
  );

const navLinkStyle = ({ isActive }) =>
  isActive
    ? { background: 'var(--brand-wash)', color: 'var(--brand-ink)' }
    : { color: 'var(--ink-2)' };

export function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/*
       * Sticky, because the primary action lives up here and a long results
       * page would otherwise strand it off-screen. Translucent with a blur so
       * content reads as passing underneath rather than colliding with it.
       */}
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="mr-1 shrink-0">
            <Wordmark />
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/discover" className={navLinkClass} style={navLinkStyle}>
              Discover
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/dashboard" className={navLinkClass} style={navLinkStyle}>
                My polls
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Link
                  to="/settings"
                  className="hidden rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] sm:block"
                  style={{ color: 'var(--ink-2)' }}
                >
                  {user?.name}
                </Link>
                <Button size="sm" to="/new">
                  New poll
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" to="/login">
                  Sign in
                </Button>
                <Button size="sm" to="/signup">
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <Outlet />
      </main>

      <footer style={{ borderTop: '1px solid var(--line)' }}>
        <div
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-xs"
          style={{ color: 'var(--muted)' }}
        >
          <span>PollHub — create a poll or survey in under two minutes.</span>
          <nav className="flex gap-4">
            <Link to="/discover" className="hover:underline">
              Discover
            </Link>
            <Link to="/login" className="hover:underline">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/**
 * Minimal shell for respondent pages.
 *
 * No nav, no sign-in prompt: this page is the acquisition surface, and the
 * brief treats anything resembling a login wall as the main cause of
 * drop-off. The only outbound link is the wordmark.
 */
export function RespondentLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <Link to="/">
          <Wordmark size="sm" />
        </Link>
      </div>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16">
        <Outlet />
      </main>
      <footer
        className="mx-auto w-full max-w-2xl px-4 py-8 text-xs"
        style={{ color: 'var(--muted)' }}
      >
        Powered by PollHub
      </footer>
    </div>
  );
}
