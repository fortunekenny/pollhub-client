import { useEffect, useRef, useState } from 'react';
import { cx } from './ui.jsx';

/**
 * Drag-to-order input for ranking questions.
 *
 * The respondent drags the options into their preferred order, first place at
 * the top. Every option is always in the list — a ranking is an ordering, not
 * a selection, and the API rejects a partial one because a 3rd place out of 5
 * is not comparable to a 3rd out of 3.
 *
 * Dragging uses pointer events rather than HTML5 drag-and-drop, which does not
 * fire on touch at all — and this page is phone-first. The grip carries
 * `touch-action: none` so a drag does not also scroll the page.
 *
 * Dragging is never the only way to reorder. The grip is a real button: focus
 * it and Arrow Up/Down move the row, which is the only route available by
 * keyboard and the one a screen reader can follow. Each move is announced
 * through a live region, since a silent reorder tells a non-sighted user
 * nothing about what just happened.
 */
export function RankingInput({ options, value, onChange, name }) {
  const order = value?.length ? value : options.map((o) => o.id);
  const byId = new Map(options.map((o) => [o.id, o]));

  const [draggingId, setDraggingId] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const listRef = useRef(null);

  /*
   * The order shown on screen is the answer unless the respondent changes it.
   *
   * Without this a required ranking sits in a state the respondent cannot
   * resolve: the list looks complete, nothing appears unfilled, and the submit
   * button still refuses on the grounds that the question is unanswered.
   */
  useEffect(() => {
    if (!value?.length && options.length) onChange(options.map((o) => o.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.length]);

  function moveTo(id, nextIndex) {
    const current = order.indexOf(id);
    const target = Math.max(0, Math.min(order.length - 1, nextIndex));
    if (current === -1 || current === target) return;

    const next = [...order];
    next.splice(current, 1);
    next.splice(target, 0, id);
    onChange(next);
    return target;
  }

  function moveByKeyboard(id, delta) {
    const target = moveTo(id, order.indexOf(id) + delta);
    if (target === undefined) return;
    setAnnouncement(
      `${byId.get(id)?.label ?? 'Option'} moved to position ${target + 1} of ${order.length}`,
    );
  }

  function endDrag() {
    if (!draggingId) return;
    const position = order.indexOf(draggingId) + 1;
    setAnnouncement(
      `${byId.get(draggingId)?.label ?? 'Option'} dropped at position ${position} of ${order.length}`,
    );
    setDraggingId(null);
  }

  /*
   * Drag tracking lives on the window, not on the row and not behind
   * setPointerCapture.
   *
   * Capture looks like the right tool and is a trap here: reordering moves the
   * row in the DOM, the browser releases the capture implicitly, and the drag
   * dies after exactly one move. Window listeners also mean the pointer can
   * stray outside the list mid-drag and the drag survives.
   *
   * Re-subscribing when `order` changes is deliberate — the handler has to see
   * the current order to compute the next position, not the one it closed over
   * when the drag started.
   */
  useEffect(() => {
    if (!draggingId) return undefined;

    function onMove(event) {
      // The row under the pointer decides the position — far more forgiving
      // than measuring offsets against every row's box.
      const under = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('[data-rank-id]');
      const overId = under?.getAttribute('data-rank-id');
      if (overId && overId !== draggingId) moveTo(draggingId, order.indexOf(overId));
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId, order.join(',')]);

  return (
    <div>
      <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
        Drag to reorder — your first choice at the top. Or focus the grip and use the arrow keys.
      </p>

      <ol ref={listRef} className="space-y-2">
        {order.map((id, index) => {
          const option = byId.get(id);
          if (!option) return null;
          const dragging = draggingId === id;

          return (
            <li
              key={id}
              data-rank-id={id}
              className={cx('rank-row', dragging && 'rank-row-dragging')}
            >
              <span className="rank-position" data-numeric aria-hidden>
                {index + 1}
              </span>

              {option.imageUrl && (
                <img
                  src={option.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-md object-cover"
                  style={{ border: '1px solid var(--line)' }}
                />
              )}

              <span className="min-w-0 flex-1 text-sm">{option.label}</span>

              <button
                type="button"
                className="rank-grip"
                aria-label={`${option.label}: position ${index + 1} of ${order.length}. Use arrow up and arrow down to move.`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDraggingId(id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    moveByKeyboard(id, -1);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    moveByKeyboard(id, 1);
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="9" cy="6" r="1.6" fill="currentColor" />
                  <circle cx="15" cy="6" r="1.6" fill="currentColor" />
                  <circle cx="9" cy="12" r="1.6" fill="currentColor" />
                  <circle cx="15" cy="12" r="1.6" fill="currentColor" />
                  <circle cx="9" cy="18" r="1.6" fill="currentColor" />
                  <circle cx="15" cy="18" r="1.6" fill="currentColor" />
                </svg>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Assertive rather than polite: the reorder is the direct result of the
          key the user just pressed, so it should not queue behind other chatter. */}
      <p aria-live="assertive" className="sr-only">
        {announcement}
      </p>

      {/* The ordering travels in component state; this keeps it in the form for
          anything that reads the DOM, and names the field for autofill tooling. */}
      <input type="hidden" name={name} value={order.join(',')} readOnly />
    </div>
  );
}
