import { useEffect, useRef, useState } from 'react';

const WS_URL =
  import.meta.env.VITE_WS_URL ??
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

/**
 * Subscribe to a poll's live tallies.
 *
 * Returns `{ tallies, status, connection }`, where `tallies` is
 * `{ optionId: count }` seeded from the server snapshot and then updated by
 * deltas. Reconnects with backoff, because a phone that locks its screen
 * drops the socket and the respondent should not have to reload.
 */
export function useLiveTallies(pollId, { enabled = true } = {}) {
  const [tallies, setTallies] = useState({});
  const [pollStatus, setPollStatus] = useState(null);
  const [connection, setConnection] = useState('idle');
  const socketRef = useRef(null);
  const attemptRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !pollId) return undefined;

    let closedByUs = false;

    function connect() {
      setConnection('connecting');
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        attemptRef.current = 0;
        setConnection('open');
        socket.send(JSON.stringify({ type: 'subscribe', pollId }));
      });

      socket.addEventListener('message', (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.type === 'snapshot') setTallies(msg.tallies ?? {});
        // Deltas carry absolute counts per changed option, so merging is safe
        // even if a frame was missed while the tab was backgrounded.
        else if (msg.type === 'tally') setTallies((prev) => ({ ...prev, ...msg.tallies }));
        else if (msg.type === 'status') setPollStatus(msg.status);
        else if (msg.type === 'error') setConnection('rejected');
      });

      socket.addEventListener('close', () => {
        if (closedByUs) return;
        setConnection('closed');

        // Capped exponential backoff — a server restart must not turn into a
        // reconnect storm from every open poll page at once.
        attemptRef.current += 1;
        const delay = Math.min(1000 * 2 ** (attemptRef.current - 1), 30_000);
        timerRef.current = setTimeout(connect, delay);
      });

      socket.addEventListener('error', () => socket.close());
    }

    connect();

    return () => {
      closedByUs = true;
      clearTimeout(timerRef.current);
      socketRef.current?.close();
    };
  }, [pollId, enabled]);

  return { tallies, pollStatus, connection };
}
