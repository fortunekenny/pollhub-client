import { pollsApi } from '../lib/api.js';
import { useCopy } from '../lib/hooks.js';
import { Button, Card } from './ui.jsx';

export function SharePanel({ poll }) {
  const { copy, copied } = useCopy();
  const url = poll.share?.url ?? `${location.origin}/p/${poll.slug}`;

  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold">Share</h2>

      <div className="flex flex-wrap items-center gap-2">
        <code
          className="min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--plane)', color: 'var(--ink-2)' }}
        >
          {url}
        </code>
        <Button size="sm" onClick={() => copy(url)}>
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Served by the API as an SVG so it scales for print and slides. */}
        <img
          src={pollsApi.qrUrl(poll.id)}
          alt={`QR code linking to ${poll.title}`}
          width={128}
          height={128}
          className="rounded-lg"
          style={{ background: '#fff', padding: 8, border: '1px solid var(--ring)' }}
        />
        <div className="space-y-2 text-sm">
          <p style={{ color: 'var(--ink-2)' }}>
            Scan to open the poll — useful on a slide or a printed handout.
          </p>
          <Button size="sm" variant="secondary" as="a" href={pollsApi.qrUrl(poll.id)} download={`poll-${poll.slug}.svg`}>
            Download QR
          </Button>
        </div>
      </div>

      {poll.visibility === 'private' && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          This poll is private — only people you invite can respond. Issue invite codes below.
        </p>
      )}
    </Card>
  );
}
