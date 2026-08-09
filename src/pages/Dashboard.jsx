import { useState } from 'react';
import { Link } from 'react-router-dom';
import { pollsApi } from '../lib/api.js';
import { useAsync, useDocumentTitle } from '../lib/hooks.js';
import { formatCount, formatDate, relativeTime } from '../lib/format.js';
import {
  Button,
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  PageHeader,
  Spinner,
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

export function Dashboard() {
  useDocumentTitle('My polls');
  const [status, setStatus] = useState('');

  const { data, loading, error, reload } = useAsync(
    () => pollsApi.list(status ? { status } : {}),
    [status],
  );

  const polls = data?.polls ?? [];

  return (
    <>
      <PageHeader
        title="My polls"
        description="Everything you've created, live or draft."
        actions={<Button to="/new">New poll</Button>}
      />

      <div className="mb-5 flex flex-wrap gap-1" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatus(f.key)}
            aria-pressed={status === f.key}
            className="rounded-lg px-3 py-1.5 text-sm transition"
            style={
              status === f.key
                ? { background: 'var(--surface)', border: '1px solid var(--ring)' }
                : { color: 'var(--ink-2)' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <ErrorNote error={error} className="mb-4" />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} label="Loading your polls" />
        </div>
      ) : polls.length === 0 ? (
        <EmptyState
          title={status ? `No ${status} polls` : 'No polls yet'}
          description="Create a Quick Vote for a single question, or a Survey for something longer."
          action={<Button to="/new">Create your first poll</Button>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {polls.map((poll) => (
            <li key={poll.id}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/polls/${poll.id}`}
                    className="font-medium hover:underline"
                  >
                    {poll.title}
                  </Link>
                  <Badge tone={STATUS_TONE[poll.status]}>{poll.status}</Badge>
                </div>

                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                  <div className="flex gap-1">
                    <dt>Responses</dt>
                    <dd className="tabular-nums font-medium" style={{ color: 'var(--ink-2)' }}>
                      {formatCount(poll.responseCount)}
                    </dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>{poll.type === 'vote' ? 'Quick Vote' : 'Survey'}</dt>
                  </div>
                  {poll.closesAt && poll.status === 'published' && (
                    <div className="flex gap-1">
                      <dt>Closes</dt>
                      <dd>{relativeTime(poll.closesAt)}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-auto flex flex-wrap gap-2 pt-1">
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
                    onClick={async () => {
                      await pollsApi.duplicate(poll.id);
                      reload();
                    }}
                  >
                    Duplicate
                  </Button>
                </div>

                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Created {formatDate(poll.createdAt)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
