import { useEffect, useState } from 'react';

/**
 * How long a poll has left, or how long it has been running.
 *
 * Every poll has a clock worth showing, but not the same clock. One with a
 * deadline counts down, because the question is "do I have time to answer".
 * One without has no deadline to count toward, so it counts up — "open 3 days"
 * says how established a poll is, which is the next most useful thing and
 * better than the blank space that was there before.
 *
 * `relativeTime` answered either question once and then went stale; a page
 * left open said "in 3 minutes" long after the poll shut.
 */

/**
 * Tick rate follows the number being shown rather than a fixed interval.
 * Seconds only matter under an hour, and a poll open for three weeks does not
 * need a re-render every second to say so — which matters on Discover, where
 * thirty of these can be on screen at once.
 */
function tickRate(ms) {
  const abs = Math.abs(ms);
  if (abs < 3_600_000) return 1_000;
  if (abs < 86_400_000) return 30_000;
  return 60_000;
}

/**
 * Largest two units, second one padded, so the string keeps its width as it
 * ticks: "6d 04h", "4h 09m", "12m 30s". A value that changes width jitters the
 * line around it, which is what makes a live number feel unstable.
 */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  const pad = (n) => String(n).padStart(2, '0');

  if (days > 0) return `${days}d ${pad(hours)}h`;
  if (hours > 0) return `${hours}h ${pad(minutes)}m`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}

/** Milliseconds until `target`, or since it, re-read on a self-adjusting timer. */
export function useTicker(target, { onReachZero } = {}) {
  const targetMs = target ? new Date(target).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetMs === null) return undefined;

    let timer;
    let fired = false;

    function step() {
      const current = Date.now();
      setNow(current);

      const delta = targetMs - current;
      if (delta <= 0 && !fired) {
        fired = true;
        onReachZero?.();
      }
      timer = setTimeout(step, tickRate(delta));
    }

    step();
    return () => clearTimeout(timer);
    // onReachZero is intentionally not a dependency: an inline arrow from the
    // caller would restart the timer on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs]);

  return targetMs === null ? null : targetMs - now;
}

/**
 * @param closesAt   deadline, if the poll has one — counts down
 * @param since      when it started — counts up when there is no deadline
 * @param status     a closed or archived poll shows neither clock
 * @param onExpire   called once when a deadline passes
 */
export function PollTimer({ closesAt, since, status, onExpire, className, style }) {
  const counting = closesAt ?? since ?? null;
  const delta = useTicker(counting, { onReachZero: closesAt ? onExpire : undefined });

  if (status === 'closed' || status === 'archived') {
    return (
      <span className={className} style={style}>
        Closed
      </span>
    );
  }
  if (delta === null) return null;

  // Counting down: delta shrinks toward zero. Counting up: `since` is in the
  // past, so delta is negative and its magnitude is the elapsed time.
  if (closesAt) {
    if (delta <= 0) {
      return (
        <span className={className} style={style}>
          Closing…
        </span>
      );
    }
    return (
      <span className={className} style={style}>
        Closes in{' '}
        <time dateTime={new Date(closesAt).toISOString()} className="tabular-nums">
          {formatDuration(delta)}
        </time>
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      Open{' '}
      <time dateTime={new Date(since).toISOString()} className="tabular-nums">
        {formatDuration(-delta)}
      </time>
    </span>
  );
}
