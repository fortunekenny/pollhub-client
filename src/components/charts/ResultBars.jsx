import { pct, formatCount } from '../../lib/format.js';

/**
 * Horizontal result bars — the default way to read a poll.
 *
 * ONE hue, not a categorical palette: the option label sits beside every bar,
 * so color would be a second encoding of something already named. That also
 * sidesteps the categorical slot cap entirely — a poll with 20 options is
 * still readable here.
 *
 * Horizontal because option labels are prose ("Saturday afternoon at the
 * community hall") and vertical bars would rotate them.
 */
export function ResultBars({ options, tallies, total, leaderHighlight = true }) {
  const counts = options.map((o) => ({ ...o, count: tallies?.[o.id] ?? o.count ?? 0 }));
  const max = Math.max(...counts.map((c) => c.count), 1);
  const sum = total ?? counts.reduce((a, c) => a + c.count, 0);
  const leader = Math.max(...counts.map((c) => c.count));

  return (
    <ul className="space-y-3">
      {counts.map((option) => {
        const share = pct(option.count, sum);
        const isLeader = leaderHighlight && option.count === leader && option.count > 0;

        return (
          <li key={option.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                {option.imageUrl && (
                  <img
                    src={option.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-8 w-8 shrink-0 rounded object-cover"
                    style={{ border: '1px solid var(--line)' }}
                  />
                )}
                <span className="truncate">{option.label ?? 'Untitled option'}</span>
              </span>
              {/* Value labels are always visible — never hover-only. */}
              <span
                className="shrink-0 text-sm tabular-nums"
                style={{ color: 'var(--ink-2)' }}
              >
                <strong style={{ color: 'var(--ink)' }}>{share}%</strong>{' '}
                <span style={{ color: 'var(--muted)' }}>({formatCount(option.count)})</span>
              </span>
            </div>

            <div
              className="h-2.5 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--line)' }}
              role="img"
              aria-label={`${option.label}: ${option.count} responses, ${share} percent`}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${(option.count / max) * 100}%`,
                  // The leader gets the strong step, everything else the base
                  // hue — magnitude is already in the length, so this is just
                  // a readable emphasis, not a second scale.
                  background: isLeader ? 'var(--brand-ink)' : 'var(--brand)',
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
