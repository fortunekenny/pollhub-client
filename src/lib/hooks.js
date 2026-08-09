import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async loader on mount and whenever `deps` change.
 *
 * Guards against setting state after unmount and against a slow first request
 * overwriting a fast second one.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const runIdRef = useRef(0);

  const run = useCallback(async () => {
    const runId = ++runIdRef.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loader();
      if (runId === runIdRef.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (runId === runIdRef.current) setState({ data: null, error, loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => {
      // Invalidate in-flight results so a late resolve cannot set state.
      runIdRef.current += 1;
    };
  }, [run]);

  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}

/** Async action with pending + error state, for form submits. */
export function useAction(fn) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setPending(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [fn],
  );

  return { execute, pending, error, setError };
}

/** Copy text and report success for ~2s, for share buttons. */
export function useCopy() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API needs a secure context; fall back to a temp textarea.
      const el = document.createElement('textarea');
      el.value = text;
      document.body.append(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return { copy, copied };
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · PollHub` : 'PollHub';
  }, [title]);
}
