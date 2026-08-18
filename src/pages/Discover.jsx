import { Link } from 'react-router-dom';
import { pollsApi } from '../lib/api.js';
import { useAsync, useDocumentTitle } from '../lib/hooks.js';
import { formatCount, formatDate } from '../lib/format.js';
import { PollTimer } from '../components/PollTimer.jsx';
import {
  Card,
  EmptyState,
  ErrorNote,
  PageHeader,
  Skeleton,
  Button,
} from '../components/ui.jsx';

/*
 * Skeletons rather than a centred spinner: they hold the shape of the grid
 * that is about to appear, so the page does not reflow when the data lands.
 */
function LoadingGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <Card className="h-full">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-3 h-4 w-1/2" />
            <Skeleton className="mt-5 h-3 w-2/5" />
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function Discover() {
  useDocumentTitle('Discover');
  const { data, loading, error } = useAsync(() => pollsApi.listPublic({ limit: 30 }));
  const polls = data?.polls ?? [];

  return (
    <>
      <PageHeader title="Discover" description="Public polls anyone can respond to." />

      <ErrorNote error={error} className="mb-5" />

      {loading ? (
        <>
          <span className="sr-only" role="status">
            Loading public polls
          </span>
          <LoadingGrid />
        </>
      ) : polls.length === 0 ? (
        <EmptyState
          title="Nothing public yet"
          description="Polls set to public visibility show up here."
          action={<Button to="/new">Create one</Button>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => (
            <li key={poll.id}>
              {/* The whole card is the target — a small title-only link would
                  be a needlessly precise thing to hit on a phone. */}
              <Link to={`/p/${poll.slug}`} className="block h-full rounded-lg">
                <Card interactive className="flex h-full flex-col">
                  <h2 className="font-medium">{poll.title}</h2>
                  <p
                    className="mt-auto pt-4 text-xs"
                    style={{ color: 'var(--muted)' }}
                  >
                    <span data-numeric>{formatCount(poll.responseCount)}</span>{' '}
                    {poll.responseCount === 1 ? 'response' : 'responses'} ·{' '}
                    <time>{formatDate(poll.createdAt)}</time>
                  </p>
                  {/* The component picks the clock: opening soon, closing
                      soon, or how long it has been running. */}
                  <PollTimer
                    poll={poll}
                    className="mt-1 text-xs font-medium"
                    style={{ color: 'var(--brand-ink)' }}
                  />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
