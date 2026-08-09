import { useState, useEffect } from 'react';
import { notificationsApi } from '../lib/api.js';
import { useAsync, useDocumentTitle } from '../lib/hooks.js';
import { useAuth } from '../lib/auth.jsx';
import { Card, Toggle, PageHeader, Spinner, ErrorNote, Button, Badge } from '../components/ui.jsx';
import { registerWebPush, pushSupport } from '../lib/push.js';

const EVENTS = [
  { key: 'poll_closing', label: 'Poll closing soon' },
  { key: 'response_milestone', label: 'Response milestones' },
  { key: 'results_ready', label: 'Poll closed / results ready' },
];

export function Settings() {
  useDocumentTitle('Settings');
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => notificationsApi.preferences());

  const stored = Object.fromEntries((data?.preferences ?? []).map((p) => [p.event_type, p]));

  return (
    <>
      <PageHeader title="Settings" description={user?.email} />

      <div className="max-w-2xl space-y-4">
        <PushCard />

        <Card>
          <h2 className="text-sm font-semibold">Notifications</h2>
          <p className="mb-4 mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
            Choose how you hear about each event. Everything is on by default.
          </p>

          <ErrorNote error={error} className="mb-3" />

          {loading ? (
            <Spinner size={20} />
          ) : (
            <div className="space-y-5">
              {EVENTS.map((event) => (
                <EventPrefs
                  key={event.key}
                  event={event}
                  // Absent row means opted in — matches the API's default.
                  value={stored[event.key] ?? { email: true, push_mobile: true, push_web: true }}
                  onSaved={reload}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function EventPrefs({ event, value, onSaved }) {
  const [prefs, setPrefs] = useState({
    email: value.email,
    pushMobile: value.push_mobile,
    pushWeb: value.push_web,
  });
  const [saving, setSaving] = useState(false);

  async function update(patch) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    try {
      await notificationsApi.setPreference({ eventType: event.key, ...next });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--line)' }} className="pt-4 first:border-0 first:pt-0">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-medium">{event.label}</h3>
        {saving && <Spinner size={14} />}
      </div>
      <div className="space-y-2.5 pl-1">
        <Toggle
          id={`${event.key}-email`}
          label="Email"
          checked={prefs.email}
          onChange={(v) => update({ email: v })}
        />
        <Toggle
          id={`${event.key}-web`}
          label="Browser notification"
          checked={prefs.pushWeb}
          onChange={(v) => update({ pushWeb: v })}
        />
        <Toggle
          id={`${event.key}-mobile`}
          label="Mobile push"
          description="Requires the PollHub mobile app"
          checked={prefs.pushMobile}
          onChange={(v) => update({ pushMobile: v })}
        />
      </div>
    </div>
  );
}

/**
 * Browser notification opt-in.
 *
 * Permission can only be requested from a user gesture, and once denied it
 * cannot be re-prompted from the page at all — so the denied state gets a real
 * explanation rather than a button that silently does nothing.
 */
function PushCard() {
  const [permission, setPermission] = useState(pushSupport().permission);
  const [status, setStatus] = useState(null);
  const support = pushSupport();

  useEffect(() => {
    setPermission(support.permission);
  }, [support.permission]);

  if (!support.supported) {
    return (
      <Card>
        <h2 className="text-sm font-semibold">Browser notifications</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          This browser doesn't support web push. On iOS, add PollHub to your Home Screen first —
          Safari only allows notifications for installed sites.
        </p>
      </Card>
    );
  }

  if (!support.configured) {
    return (
      <Card>
        <h2 className="text-sm font-semibold">Browser notifications</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          Not configured on this deployment — set the Firebase keys to enable web push.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Browser notifications</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
            Get told when a poll closes, without keeping the tab open.
          </p>
        </div>
        {permission === 'granted' && <Badge tone="good">Enabled</Badge>}
      </div>

      {permission === 'denied' && (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-2)' }}>
          Notifications are blocked for this site. The page can't ask again — re-enable them in
          your browser's site settings (the icon beside the address bar), then reload.
        </p>
      )}

      {permission === 'default' && (
        <Button
          className="mt-3"
          size="sm"
          onClick={async () => {
            const result = await registerWebPush();
            setPermission(Notification.permission);
            setStatus(result);
          }}
        >
          Enable notifications
        </Button>
      )}

      {status?.error && (
        <p className="mt-2 text-xs" style={{ color: 'var(--critical)' }}>
          {status.error}
        </p>
      )}
    </Card>
  );
}
