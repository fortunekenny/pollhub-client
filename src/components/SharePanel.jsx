import { pollsApi } from '../lib/api.js';
import { useCopy } from '../lib/hooks.js';
import { Button, Card } from './ui.jsx';

export function SharePanel({ poll }) {
  const { copy, copied } = useCopy();

  /*
   * Built from the browser's own origin, not from the API's share.url.
   *
   * That field comes from PUBLIC_POLL_BASE_URL on the server, so a deployment
   * whose env drifted hands out a link to localhost — which is what happened
   * here. The page being linked to is a client route on this origin, and the
   * client is the one thing that always knows that address correctly.
   *
   * The QR below is still rendered server-side from the same env var, so it
   * can disagree with this link until the deployment is fixed.
   */
  const url = `${location.origin}/p/${poll.slug}`;

  return (
    <Card className="space-y-5">
      <h2 className="text-base font-semibold">Share</h2>

      <div className="flex flex-wrap items-center gap-2">
        <code
          className="min-w-0 flex-1 truncate rounded-md px-3 py-2.5 text-sm"
          style={{
            background: 'var(--plane)',
            color: 'var(--ink-2)',
            border: '1px solid var(--line)',
          }}
        >
          {url}
        </code>
        {/* The label swaps to a tick on success rather than firing a toast:
            the confirmation belongs on the control that was pressed. */}
        <Button size="sm" onClick={() => copy(url)}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h8" />
              </svg>
              Copy link
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        {/* Served by the API as an SVG so it scales for print and slides. The
            white plate is fixed, not themed: a QR inverted in dark mode is a
            QR that many scanners refuse. */}
        <img
          src={pollsApi.qrUrl(poll.id)}
          alt={`QR code linking to ${poll.title}`}
          width={128}
          height={128}
          className="rounded-lg"
          style={{
            background: '#fff',
            padding: 10,
            border: '1px solid var(--line)',
            boxShadow: 'var(--elev-1)',
          }}
        />
        <div className="space-y-3 text-sm">
          <p style={{ color: 'var(--ink-2)' }}>
            Scan to open the poll — useful on a slide or a printed handout.
          </p>
          <Button
            size="sm"
            variant="secondary"
            as="a"
            href={pollsApi.qrUrl(poll.id)}
            download={`poll-${poll.slug}.svg`}
          >
            Download QR
          </Button>
        </div>
      </div>

      {poll.visibility === 'private' && (
        <p
          className="rounded-md px-3 py-2.5 text-xs"
          style={{ background: 'var(--brand-wash)', color: 'var(--brand-ink)' }}
        >
          This poll is private — only people you invite can respond. Issue invite codes below.
        </p>
      )}
    </Card>
  );
}
