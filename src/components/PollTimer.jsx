import { useEffect, useState } from 'react';
import { formatDate } from '../lib/format.js';

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
  // Anything under a day shows seconds, so it has to tick every second to be
  // worth showing at all. Past a day the smallest unit on screen is an hour,
  // and a re-render per second would be 3,600 of them to change one digit.
  return Math.abs(ms) < 86_400_000 ? 1_000 : 60_000;
}

/**
 * Seconds are always the last unit under a day, so the number visibly moves.
 * An "Xh YYm" reading sits unchanged for a full minute, which reads as broken
 * rather than as a clock — the whole point of putting it on screen live.
 *
 * Past a day, seconds are noise: "6d 04h" is what a reader wants, and ticking
 * the last digit of it 86,400 times a day changes nothing they can use.
 *
 * Units are zero-padded so the string keeps its width as it counts. A value
 * that changes width jitters the line around it.
 */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  const pad = (n) => String(n).padStart(2, '0');

  if (days > 0) return `${days}d ${pad(hours)}h`;
  if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
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
 * Decide which clock a poll deserves.
 *
 * Four states, in priority order, because more than one can be true at once —
 * a repeating poll that has closed has both a past opening and a future one.
 *
 *   waiting   published, but its opening is still ahead   → counts down to it
 *   between   closed, and its series opens another round  → counts down to it
 *   closing   published with a deadline                   → counts down to it
 *   running   published, open, no deadline                → counts up
 *
 * A closed poll that is not repeating has no clock at all — nothing is
 * counting, so it reports the date it shut and stops.
 */
function clockFor(poll) {
  if (!poll) return null;
  const now = Date.now();
  const ahead = (v) => v && new Date(v).getTime() > now;
  const live = poll.status === 'published';

  if (live && ahead(poll.opensAt)) {
    return { mode: 'waiting', target: poll.opensAt, label: 'Opens in' };
  }
  // Between rounds: the round is over but the series is not.
  if (!live && ahead(poll.nextOpensAt)) {
    return { mode: 'between', target: poll.nextOpensAt, label: 'Opens in' };
  }
  if (poll.status === 'closed' || poll.status === 'archived') {
    // No target: nothing is counting, so no timer is started for this poll.
    // closesAt is exact for a scheduled close; a poll shut by hand has none,
    // and updatedAt is when that happened.
    return { mode: 'done', closedAt: poll.closesAt ?? poll.updatedAt ?? null };
  }
  if (!live) return null; // a draft has no clock

  if (poll.closesAt) return { mode: 'closing', target: poll.closesAt, label: 'Closes in' };

  const started = poll.publishedAt ?? poll.opensAt ?? poll.createdAt;
  return started ? { mode: 'running', target: started, label: 'Has been open for' } : null;
}

/**
 * @param poll      the poll, in whatever shape the list or detail endpoint returns
 * @param onExpire  called once when a countdown reaches zero
 */
export function PollTimer({ poll, onExpire, className, style }) {
  const clock = clockFor(poll);
  const counting = clock?.target ?? null;
  // Only a countdown has an expiry worth reporting; a count-up never ends.
  const delta = useTicker(counting, {
    onReachZero: clock && clock.mode !== 'running' ? onExpire : undefined,
  });

  if (!clock) return null;

  if (clock.mode === 'done') {
    return (
      <span className={className} style={style}>
        {clock.closedAt ? (
          <>
            Closed on <time dateTime={new Date(clock.closedAt).toISOString()}>{formatDate(clock.closedAt)}</time>
          </>
        ) : (
          'Closed'
        )}
      </span>
    );
  }
  if (delta === null) return null;

  // Counting down, delta shrinks toward zero. Counting up, the target is in
  // the past, so delta is negative and its magnitude is the elapsed time.
  const countingUp = clock.mode === 'running';

  if (!countingUp && delta <= 0) {
    return (
      <span className={className} style={style}>
        {clock.mode === 'closing' ? 'Closing…' : 'Opening…'}
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      {clock.label}{' '}
      <time dateTime={new Date(clock.target).toISOString()} className="tabular-nums">
        {formatDuration(countingUp ? -delta : delta)}
      </time>
    </span>
  );
}
