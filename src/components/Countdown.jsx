import { useEffect, useState } from 'react';

/**
 * Live time remaining until a poll closes.
 *
 * `relativeTime` answers this once and then goes stale — a page left open says
 * "in 3 minutes" long after the poll shut. A closing deadline is the one thing
 * on these pages a respondent may be watching, so it ticks.
 *
 * The tick rate follows the number being shown rather than a fixed interval:
 * seconds only matter in the last hour, and a poll closing next week does not
 * need 604,800 re-renders to say so.
 */
function tickRate(ms) {
  if (ms <= 0) return null; // nothing left to count
  if (ms < 3_600_000) return 1_000; // under an hour: show seconds
  if (ms < 86_400_000) return 30_000; // under a day: minutes drift slowly
  return 60_000;
}

function parts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

/**
 * Largest two units, so the value stays readable at every scale: "6d 4h",
 * "4h 09m", "12m 30s". Padding the second unit stops the text jittering in
 * width as it counts down, which is what makes a ticking number feel unstable.
 */
export function formatRemaining(ms) {
  if (ms <= 0) return 'Closed';
  const { days, hours, minutes, seconds } = parts(ms);
  const pad = (n) => String(n).padStart(2, '0');

  if (days > 0) return `${days}d ${pad(hours)}h`;
  if (hours > 0) return `${hours}h ${pad(minutes)}m`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}

export function useCountdown(target, { onExpire } = {}) {
  const targetMs = target ? new Date(target).getTime() : null;
  const [remaining, setRemaining] = useState(() =>
    targetMs === null ? null : targetMs - Date.now(),
  );

  useEffect(() => {
    if (targetMs === null) {
      setRemaining(null);
      return undefined;
    }

    let timer;
    let fired = false;

    function step() {
      const left = targetMs - Date.now();
      setRemaining(left);

      if (left <= 0) {
        // The poll is closed as far as this page is concerned; the server's
        // job confirms it within the minute. Say so once, not every tick.
        if (!fired) {
          fired = true;
          onExpire?.();
        }
        return;
      }
      timer = setTimeout(step, tickRate(left));
    }

    step();
    return () => clearTimeout(timer);
    // onExpire is deliberately not a dependency: a caller passing an inline
    // arrow would otherwise restart the timer on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs]);

  return remaining;
}

/**
 * @param closesAt   when the poll shuts
 * @param prefix     leading word, e.g. "Closes in"
 * @param onExpire   called once when the deadline passes
 */
export function Countdown({ closesAt, prefix = 'Closes in', onExpire, className, style }) {
  const remaining = useCountdown(closesAt, { onExpire });
  if (remaining === null) return null;

  const expired = remaining <= 0;

  return (
    <span className={className} style={style}>
      {expired ? 'Closed' : `${prefix} `}
      {!expired && (
        // tabular-nums keeps the digits from shifting the line as they change.
        <time dateTime={new Date(closesAt).toISOString()} className="tabular-nums">
          {formatRemaining(remaining)}
        </time>
      )}
    </span>
  );
}
