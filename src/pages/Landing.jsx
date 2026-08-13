import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle } from '../lib/hooks.js';
import { Button, Card } from '../components/ui.jsx';

const POINTS = [
  {
    title: 'Published in under two minutes',
    body: 'One question, a few options, a link. No account needed to respond.',
    icon: (
      <path d="M12 6.5v6l3.5 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
    ),
  },
  {
    title: 'Results that update live',
    body: 'Watch the tally move as responses land — no refreshing, no exporting.',
    icon: <path d="M5 19V11M12 19V5M19 19v-5" />,
  },
  {
    title: 'Duplicate protection you choose',
    body: 'From open voting to one-time invite codes, set per poll. The results say which was used.',
    icon: <path d="M12 3.5 5 6.5v5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9v-5l-7-3Z" />,
  },
];

/*
 * The hero visual.
 *
 * Built from the same tokens and bar treatment the real results view uses,
 * rather than a stock illustration: it themes correctly in dark mode, adds no
 * network request against the respondent page's 3G budget, and shows the
 * actual product instead of a decoration that only resembles it.
 */
const PREVIEW_ROWS = [
  { label: 'Friday', pct: 62, color: 'var(--s1)' },
  { label: 'Saturday', pct: 28, color: 'var(--s3)' },
  { label: 'Sunday', pct: 10, color: 'var(--s4)' },
];

function ResultsPreview() {
  return (
    <div className="card elev-3 w-full max-w-sm p-6" aria-hidden>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Team dinner — which night?</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ background: 'color-mix(in srgb, var(--good) 14%, transparent)', color: 'var(--good)' }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--good)' }} />
          Live
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {PREVIEW_ROWS.map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span>{row.label}</span>
              <span data-numeric style={{ color: 'var(--ink-2)' }}>
                {row.pct}%
              </span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full"
              style={{ background: 'color-mix(in srgb, var(--ink) 8%, transparent)' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${row.pct}%`, background: row.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs" style={{ color: 'var(--muted)' }}>
        <span data-numeric>128</span> responses · updated just now
      </p>
    </div>
  );
}

export function Landing() {
  useDocumentTitle();
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-20 sm:space-y-24">
      {/* Two columns from `lg` up, stacked below: the headline and its call to
          action always come first in source order, so the small-screen reading
          order stays correct without a second layout. */}
      <section className="grid items-center gap-12 pt-4 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-10">
        <div className="text-center lg:text-left">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: 'var(--brand-wash)', color: 'var(--brand-ink)' }}
          >
            Free · no account needed to respond
          </span>

          <h1 className="mt-5 text-4xl font-semibold sm:text-5xl">
            Settle it with a poll,
            <br />
            not a group chat.
          </h1>

          <p
            className="mx-auto mt-5 max-w-lg text-base lg:mx-0"
            style={{ color: 'var(--ink-2)' }}
          >
            Create a poll or survey on any topic, share a link or QR code, and watch the results
            come in live.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Button size="lg" to={isAuthenticated ? '/new' : '/signup'}>
              {isAuthenticated ? 'Create a poll' : 'Get started — free'}
            </Button>
            <Button size="lg" variant="secondary" to="/discover">
              Browse public polls
            </Button>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <ResultsPreview />
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
        {POINTS.map((point) => (
          <Card key={point.title}>
            <span
              aria-hidden
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: 'var(--brand-wash)', color: 'var(--brand-ink)' }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {point.icon}
              </svg>
            </span>
            <h2 className="mt-4 font-medium">{point.title}</h2>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>
              {point.body}
            </p>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-2xl text-center">
        <h2 className="text-xl font-semibold">Quick Votes and full surveys</h2>
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-2)' }}>
          A Quick Vote is one question and instant results. A Survey adds multiple questions,
          rating scales, and free text — with completion and drop-off analytics on the other side.
        </p>
        <p className="mt-6 text-sm font-medium">
          <Link to="/signup" className="hover:underline" style={{ color: 'var(--brand-ink)' }}>
            Create your first poll →
          </Link>
        </p>
      </section>
    </div>
  );
}

export function NotFound() {
  useDocumentTitle('Not found');
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <span
        aria-hidden
        className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'var(--brand-wash)', color: 'var(--brand-ink)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.1-2.5 3.6M12 17h.01" />
        </svg>
      </span>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>
        That link may be wrong, or the poll may have been removed.
      </p>
      <Button to="/" className="mt-7">
        Back home
      </Button>
    </div>
  );
}
