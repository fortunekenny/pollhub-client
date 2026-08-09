import { Link } from 'react-router-dom';
import { pollsApi } from '../lib/api.js';
import { useAsync, useDocumentTitle } from '../lib/hooks.js';
import { formatCount, formatDate } from '../lib/format.js';
import { Card, EmptyState, ErrorNote, PageHeader, Spinner, Button } from '../components/ui.jsx';

export function Discover() {
  useDocumentTitle('Discover');
  const { data, loading, error } = useAsync(() => pollsApi.listPublic({ limit: 30 }));
  const polls = data?.polls ?? [];

  return (
    <>
      <PageHeader
        title="Discover"
        description="Public polls anyone can respond to."
      />

      <ErrorNote error={error} className="mb-4" />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} label="Loading public polls" />
        </div>
      ) : polls.length === 0 ? (
        <EmptyState
          title="Nothing public yet"
          description="Polls set to public visibility show up here."
          action={<Button to="/new">Create one</Button>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => (
            <li key={poll.id}>
              <Link to={`/p/${poll.slug}`} className="block h-full">
                <Card className="h-full transition hover:brightness-[0.98]">
                  <h2 className="font-medium">{poll.title}</h2>
                  <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                    {formatCount(poll.responseCount)} responses · {formatDate(poll.createdAt)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
