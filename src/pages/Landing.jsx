import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle } from '../lib/hooks.js';
import { Button, Card } from '../components/ui.jsx';

const POINTS = [
  {
    title: 'Published in under two minutes',
    body: 'One question, a few options, a link. No account needed to respond.',
  },
  {
    title: 'Results that update live',
    body: 'Watch the tally move as responses land — no refreshing, no exporting.',
  },
  {
    title: 'Duplicate protection you choose',
    body: 'From open voting to one-time invite codes, set per poll. The results say which was used.',
  },
];

export function Landing() {
  useDocumentTitle();
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-14">
      <section className="mx-auto max-w-2xl pt-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Settle it with a poll,
          <br />
          not a group chat.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base" style={{ color: 'var(--ink-2)' }}>
          Create a poll or survey on any topic, share a link or QR code, and watch the results come
          in live. Free, and no account needed to respond.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button size="lg" to={isAuthenticated ? '/new' : '/signup'}>
            {isAuthenticated ? 'Create a poll' : 'Get started — free'}
          </Button>
          <Button size="lg" variant="secondary" to="/discover">
            Browse public polls
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {POINTS.map((point) => (
          <Card key={point.title}>
            <h2 className="font-medium">{point.title}</h2>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>
              {point.body}
            </p>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-2xl text-center">
        <h2 className="text-lg font-semibold">Quick Votes and full surveys</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>
          A Quick Vote is one question and instant results. A Survey adds multiple questions,
          rating scales, and free text — with completion and drop-off analytics on the other side.
        </p>
        <p className="mt-4 text-sm">
          <Link to="/signup" style={{ color: 'var(--brand-ink)' }}>
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
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>
        That link may be wrong, or the poll may have been removed.
      </p>
      <Button to="/" className="mt-6">
        Back home
      </Button>
    </div>
  );
}
