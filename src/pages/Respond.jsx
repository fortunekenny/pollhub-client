import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { apiFeatures, pollsApi, responsesApi } from '../lib/api.js';
import { useAsync, useAction, useDocumentTitle } from '../lib/hooks.js';
import { useLiveTallies } from '../lib/useLiveTallies.js';
import { formatCount, relativeTime, CHOICE_TYPES } from '../lib/format.js';
import { Button, Card, Field, Input, Textarea, ErrorNote, Spinner } from '../components/ui.jsx';
import { ResultBars } from '../components/charts/ResultBars.jsx';
import { Turnstile, isTurnstileConfigured } from '../components/Turnstile.jsx';

/**
 * Public respondent page.
 *
 * No auth gate, no nav, no dashboard chrome. The brief treats a login wall
 * here as the single biggest cause of drop-off, so the only thing between the
 * link and the vote is the question itself.
 */
export function Respond() {
  const { slug } = useParams();
  const [answers, setAnswers] = useState({});
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [turnstileError, setTurnstileError] = useState(null);

  // The API rejects every response once TURNSTILE_SECRET_KEY is set and no
  // token arrives, so whether to challenge is the API's call, not a build-time
  // constant here.
  const { data: features } = useAsync(apiFeatures, []);
  const challengeRequired = features?.turnstile === true;
  const challengeUsable = challengeRequired && isTurnstileConfigured();

  const { data, loading, error } = useAsync(() => pollsApi.getBySlug(slug), [slug]);
  const poll = data?.poll;
  const questions = data?.questions ?? [];
  const state = data?.state;

  useDocumentTitle(poll?.title);

  const showLive =
    (data?.resultsVisible || submitted) && poll?.status === 'published';
  const { tallies } = useLiveTallies(poll?.id, { enabled: Boolean(showLive) });

  const { execute, pending, error: submitError } = useAction(async () => {
    const payload = {
      answers: Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        ...(Array.isArray(value) ? { optionIds: value } : { valueText: String(value) }),
      })),
      ...(poll.identityMode === 'name_required' ? { respondentName: name } : {}),
      ...(inviteCode ? { inviteCode } : {}),
      ...(turnstileToken ? { turnstileToken } : {}),
    };
    const result = await responsesApi.submit(slug, payload);
    setSubmitted(result);
  });

  const missing = useMemo(() => {
    if (!questions.length) return [];
    return questions
      .filter((q) => q.required)
      .filter((q) => {
        const value = answers[q.id];
        return Array.isArray(value) ? value.length === 0 : !value;
      })
      .map((q) => q.id);
  }, [questions, answers]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={28} label="Loading poll" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center">
        <h1 className="text-lg font-semibold">
          {error.status === 404 ? 'Poll not found' : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>
          {error.status === 404
            ? 'This link may be wrong, or the poll may have been removed.'
            : error.message}
        </p>
      </Card>
    );
  }

  if (submitted) {
    return (
      <ThankYou
        poll={poll}
        questions={questions}
        tallies={tallies}
        result={submitted}
      />
    );
  }

  if (state?.notYetOpen) {
    return (
      <PollShell poll={poll}>
        <Card className="text-center">
          <h2 className="font-semibold">Not open yet</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
            This poll opens {relativeTime(poll.opensAt)}.
          </p>
        </Card>
      </PollShell>
    );
  }

  if (state?.isClosed) {
    return (
      <PollShell poll={poll}>
        <Card>
          <h2 className="text-center font-semibold">This poll is closed</h2>
          {data.resultsVisible ? (
            <div className="mt-5 space-y-6">
              {questions
                .filter((q) => CHOICE_TYPES.includes(q.type))
                .map((q) => (
                  <div key={q.id}>
                    <h3 className="mb-3 text-sm font-medium">{q.prompt}</h3>
                    <ResultBars options={q.options} tallies={tallies} />
                  </div>
                ))}
            </div>
          ) : (
            <p className="mt-1 text-center text-sm" style={{ color: 'var(--ink-2)' }}>
              Results are not public for this poll.
            </p>
          )}
        </Card>
      </PollShell>
    );
  }

  return (
    <PollShell poll={poll}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          execute().catch(() => {
            // Whatever the failure was — a duplicate vote, a closed poll — the
            // token is spent the moment the API verified it. Re-challenge, or
            // the retry fails as a challenge error instead of the real reason.
            setTurnstileToken(null);
            setTurnstileReset((n) => n + 1);
          });
        }}
      >
        <ErrorNote error={submitError} />

        {poll.identityMode === 'name_required' && (
          <Card>
            <Field label="Your name" htmlFor="name" required>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </Card>
        )}

        {poll.dedupMode === 'invite_code' && (
          <Card>
            <Field
              label="Invite code"
              htmlFor="code"
              required
              hint="The one-time code you were sent."
            >
              <Input
                id="code"
                required
                value={inviteCode}
                placeholder="ABCD-EFGH"
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
            </Field>
          </Card>
        )}

        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            value={answers[question.id]}
            onChange={(value) => setAnswers((a) => ({ ...a, [question.id]: value }))}
          />
        ))}

        {challengeUsable && (
          <div className="space-y-2">
            <Turnstile
              onToken={(token) => {
                setTurnstileToken(token);
                if (token) setTurnstileError(null);
              }}
              onError={setTurnstileError}
              resetSignal={turnstileReset}
            />
            {turnstileError && (
              <p className="text-center text-xs" style={{ color: 'var(--critical)' }} role="alert">
                {turnstileError}
              </p>
            )}
          </div>
        )}

        {/* The API will reject every submission here, and its 403 says only
            that the challenge failed. Saying so up front beats letting the
            respondent answer the whole poll first. */}
        {challengeRequired && !isTurnstileConfigured() && (
          <Card className="text-center text-xs" style={{ color: 'var(--critical)' }} role="alert">
            This poll requires a verification check that is not set up on this
            site. Responses cannot be submitted until VITE_TURNSTILE_SITE_KEY is
            configured.
          </Card>
        )}

        <Button
          type="submit"
          size="lg"
          loading={pending}
          disabled={missing.length > 0 || (challengeRequired && !turnstileToken)}
          className="w-full"
        >
          {missing.length > 0
            ? `${missing.length} question${missing.length > 1 ? 's' : ''} left`
            : challengeRequired && !turnstileToken
              ? 'Complete the verification check'
              : 'Submit'}
        </Button>

        <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
          {poll.identityMode === 'anonymous'
            ? 'Your response is anonymous.'
            : 'Your name will be recorded with your response.'}
        </p>
      </form>
    </PollShell>
  );
}

function PollShell({ poll, children }) {
  return (
    <div className="space-y-5">
      {poll.coverUrl && (
        <img
          src={poll.coverUrl}
          alt=""
          className="h-40 w-full rounded-xl object-cover"
          style={{ border: '1px solid var(--ring)' }}
        />
      )}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{poll.title}</h1>
        {poll.description && (
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
            {poll.description}
          </p>
        )}
        {poll.closesAt && (
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            Closes {relativeTime(poll.closesAt)}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function QuestionCard({ question, value, onChange }) {
  const isMulti = question.type === 'multi_choice';
  const selected = Array.isArray(value) ? value : [];

  function toggle(optionId) {
    if (isMulti) {
      onChange(
        selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId],
      );
    } else {
      onChange([optionId]);
    }
  }

  return (
    <Card>
      <fieldset>
        <legend className="mb-3 font-medium">
          {question.prompt}
          {!question.required && (
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted)' }}>
              optional
            </span>
          )}
        </legend>

        {CHOICE_TYPES.includes(question.type) && (
          <div className={question.options.some((o) => o.imageUrl) ? 'grid gap-2 sm:grid-cols-2' : 'space-y-2'}>
            {question.options.map((option) => {
              const isSelected = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  aria-pressed={isSelected}
                  // Whole row is the hit target — a 44px tap area rather than
                  // a 16px radio dot, because this is a phone-first page.
                  className="flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm transition"
                  style={{
                    borderColor: isSelected ? 'var(--brand)' : 'var(--ring)',
                    background: isSelected
                      ? 'color-mix(in srgb, var(--brand) 8%, transparent)'
                      : 'transparent',
                  }}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center border"
                    style={{
                      borderRadius: isMulti ? '0.25rem' : '9999px',
                      borderColor: isSelected ? 'var(--brand)' : 'var(--axis)',
                      background: isSelected ? 'var(--brand)' : 'transparent',
                      color: '#fff',
                      fontSize: 12,
                    }}
                    aria-hidden
                  >
                    {isSelected ? '✓' : ''}
                  </span>

                  {option.imageUrl && (
                    <img
                      src={option.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded object-cover"
                    />
                  )}
                  <span className="min-w-0">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {question.type === 'rating' && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: question.config?.max ?? 5 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(String(n))}
                aria-pressed={value === String(n)}
                className="h-11 w-11 rounded-lg border text-sm tabular-nums transition"
                style={{
                  borderColor: value === String(n) ? 'var(--brand)' : 'var(--ring)',
                  background: value === String(n) ? 'var(--brand)' : 'transparent',
                  color: value === String(n) ? '#fff' : 'var(--ink)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {question.type === 'short_text' && (
          <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        )}

        {question.type === 'long_text' && (
          <Textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        )}
      </fieldset>
    </Card>
  );
}

function ThankYou({ poll, questions, tallies, result }) {
  return (
    <div className="space-y-5">
      <Card className="text-center">
        <p className="text-2xl" aria-hidden>
          ✓
        </p>
        <h1 className="mt-2 text-lg font-semibold">Response recorded</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          {formatCount(result.responseCount)} responses so far.
        </p>
      </Card>

      {result.resultsVisible ? (
        <Card className="space-y-6">
          <h2 className="text-sm font-semibold">Results</h2>
          {questions
            .filter((q) => CHOICE_TYPES.includes(q.type))
            .map((q) => (
              <div key={q.id}>
                <h3 className="mb-3 text-sm font-medium">{q.prompt}</h3>
                <ResultBars
                  options={q.options}
                  tallies={{ ...tallies, ...(result.tallies ?? {}) }}
                />
              </div>
            ))}
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Updating live as responses arrive.
          </p>
        </Card>
      ) : (
        <Card className="text-center text-sm" style={{ color: 'var(--ink-2)' }}>
          {poll.resultsMode === 'after_close'
            ? 'Results will be published when the poll closes.'
            : 'The creator has kept results private.'}
        </Card>
      )}

      <p className="text-center text-sm">
        <a href="/signup" style={{ color: 'var(--brand-ink)' }}>
          Create your own poll — free
        </a>
      </p>
    </div>
  );
}
