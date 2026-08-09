import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Button, cx } from './ui.jsx';

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
      className="rounded-lg px-2.5 py-1.5 text-xs capitalize"
      style={{ color: 'var(--ink-2)' }}
      aria-label={`Theme: ${theme}. Switch to ${next}.`}
      title={`Theme: ${theme}`}
    >
      {theme === 'dark' ? '◐' : theme === 'light' ? '○' : '◑'}
    </button>
  );
}

const navLink = ({ isActive }) =>
  cx('rounded-lg px-3 py-1.5 text-sm transition', isActive ? 'font-medium' : '');

export function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header style={{ borderBottom: '1px solid var(--ring)', background: 'var(--surface)' }}>
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/" className="mr-2 text-lg font-semibold tracking-tight">
            Poll<span style={{ color: 'var(--brand)' }}>Hub</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/discover" className={navLink} style={{ color: 'var(--ink-2)' }}>
              Discover
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/dashboard" className={navLink} style={{ color: 'var(--ink-2)' }}>
                My polls
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Link
                  to="/settings"
                  className="hidden text-sm sm:block"
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

      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer
        className="mx-auto max-w-6xl px-4 py-10 text-xs"
        style={{ color: 'var(--muted)' }}
      >
        PollHub — create a poll or survey in under two minutes.
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
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link to="/" className="text-sm font-semibold tracking-tight">
          Poll<span style={{ color: 'var(--brand)' }}>Hub</span>
        </Link>
      </div>
      <main id="main" className="mx-auto max-w-2xl px-4 pb-16">
        <Outlet />
      </main>
    </div>
  );
}
