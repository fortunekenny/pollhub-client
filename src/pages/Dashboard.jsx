import { useState } from 'react';
import { Link } from 'react-router-dom';
import { pollsApi } from '../lib/api.js';
import { useAsync, useDocumentTitle } from '../lib/hooks.js';
import { formatCount, formatDate, relativeTime } from '../lib/format.js';
import {
  Button,
  Badge,
  Card,
  Dot,
  EmptyState,
  ErrorNote,
  PageHeader,
  Skeleton,
} from '../components/ui.jsx';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'published', label: 'Live' },
  { key: 'closed', label: 'Closed' },
  { key: 'archived', label: 'Archived' },
];

const STATUS_TONE = {
  draft: 'neutral',
  published: 'good',
  closed: 'neutral',
  archived: 'neutral',
};

/**
 * Segmented filter.
 *
 * One recessed track holding the options, with the selected one raised out of
 * it on the surface colour. The group reads as a single control with one
 * choice made, rather than as five separate buttons that happen to sit
 * together — and `aria-pressed` still carries the state for screen readers.
 */
function StatusFilter({ value, onChange }) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-lg p-1"
      role="group"
      aria-label="Filter by status"
      style={{ background: 'color-mix(in srgb, var(--ink) 6%, transparent)' }}
    >
      {FILTERS.map((f) => {
        const active = value === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            aria-pressed={active}
            className="rounded-md px-3 py-1.5 text-sm transition-colors"
            style={
              active
                ? {
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontWeight: 500,
                    boxShadow: 'var(--elev-1)',
                  }
                : { color: 'var(--ink-2)' }
            }
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

function LoadingGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i}>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-3 w-3/5" />
            <div className="mt-6 flex gap-2">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function Dashboard() {
  useDocumentTitle('My polls');
  const [status, setStatus] = useState('');
  // Which row is mid-duplicate, so the button that was pressed is the one that
  // shows the spinner rather than the whole grid going busy.
  const [duplicating, setDuplicating] = useState(null);

  const { data, loading, error, reload } = useAsync(
    () => pollsApi.list(status ? { status } : {}),
    [status],
  );

  const polls = data?.polls ?? [];

  async function duplicate(id) {
    setDuplicating(id);
    try {
      await pollsApi.duplicate(id);
      await reload();
    } finally {
      setDuplicating(null);
    }
  }

  return (
    <>
      <PageHeader
        title="My polls"
        description="Everything you've created, live or draft."
        actions={<Button to="/new">New poll</Button>}
      />

      <div className="mb-6">
        <StatusFilter value={status} onChange={setStatus} />
      </div>

      <ErrorNote error={error} className="mb-5" />

      {loading ? (
        <>
          <span className="sr-only" role="status">
            Loading your polls
          </span>
          <LoadingGrid />
        </>
      ) : polls.length === 0 ? (
        <EmptyState
          title={status ? `No ${status} polls` : 'No polls yet'}
          description="Create a Quick Vote for a single question, or a Survey for something longer."
          action={<Button to="/new">Create your first poll</Button>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {polls.map((poll) => (
            <li key={poll.id}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/polls/${poll.id}`}
                    className="text-base font-medium hover:underline"
                  >
                    {poll.title}
                  </Link>
                  <Badge tone={STATUS_TONE[poll.status]}>
                    <Dot tone={STATUS_TONE[poll.status]} />
                    {poll.status}
                  </Badge>
                </div>

                {/* The response count is the number people come here to read,
                    so it gets size and full-strength ink; everything beside it
                    stays secondary. */}
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold" data-numeric>
                    {formatCount(poll.responseCount)}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
                    {poll.responseCount === 1 ? 'response' : 'responses'}
                  </span>
                </div>

                <dl
                  className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
                  style={{ color: 'var(--muted)' }}
                >
                  <div className="flex gap-1">
                    <dt className="sr-only">Type</dt>
                    <dd>{poll.type === 'vote' ? 'Quick Vote' : 'Survey'}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="sr-only">Created</dt>
                    <dd>
                      Created <time>{formatDate(poll.createdAt)}</time>
                    </dd>
                  </div>
                  {poll.closesAt && poll.status === 'published' && (
                    <div className="flex gap-1">
                      <dt>Closes</dt>
                      <dd>{relativeTime(poll.closesAt)}</dd>
                    </div>
                  )}
                </dl>

                <div
                  className="mt-auto flex flex-wrap gap-2 pt-5"
                  style={{ borderTop: '1px solid var(--line)' }}
                >
                  <Button size="sm" variant="secondary" to={`/polls/${poll.id}`}>
                    {poll.status === 'draft' ? 'Continue editing' : 'Results'}
                  </Button>
                  {poll.status !== 'draft' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      as="a"
                      href={`/p/${poll.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open poll ↗
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={duplicating === poll.id}
                    disabled={duplicating !== null}
                    onClick={() => duplicate(poll.id)}
                  >
                    Duplicate
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
