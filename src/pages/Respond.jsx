import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { apiFeatures, pollsApi, responsesApi } from '../lib/api.js';
import { useAsync, useAction, useDocumentTitle } from '../lib/hooks.js';
import { useLiveTallies } from '../lib/useLiveTallies.js';
import { formatCount, relativeTime, CHOICE_TYPES } from '../lib/format.js';
import { Button, Card, Field, Input, Textarea, ErrorNote, Skeleton } from '../components/ui.jsx';
import { ResultBars } from '../components/charts/ResultBars.jsx';
import { RankingResults } from '../components/charts/RankingResults.jsx';
import { Turnstile, isTurnstileConfigured } from '../components/Turnstile.jsx';
import { RankingInput } from '../components/RankingInput.jsx';
import { Countdown } from '../components/Countdown.jsx';

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
  const { tallies, responseCount: liveCount } = useLiveTallies(poll?.id, {
    enabled: Boolean(showLive),
  });

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
    // Shaped like the poll that is about to load. On the slow connections this
    // page is measured against, a centred spinner says only "wait"; this says
    // what is coming and holds its position when it lands.
    return (
      <div className="space-y-6">
        <span className="sr-only" role="status">
          Loading poll
        </span>
        <div>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
        </div>
        <Card>
          <Skeleton className="h-4 w-2/3" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <span
          aria-hidden
          className="inline-flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--critical) 12%, transparent)',
            color: 'var(--critical)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4.5M12 16h.01" />
          </svg>
        </span>
        <h1 className="text-lg font-semibold">
          {error.status === 404 ? 'Poll not found' : 'Something went wrong'}
        </h1>
        <p className="max-w-sm text-sm" style={{ color: 'var(--ink-2)' }}>
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
        liveCount={liveCount}
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
                    {q.type === 'ranking' ? (
                      <RankingResults options={q.options} />
                    ) : (
                      <ResultBars options={q.options} tallies={tallies} />
                    )}
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

        {/* Stuck to the bottom of the viewport and lifted off the page, so on
            a long survey the action stays in reach instead of sitting somewhere
            below the fold. The fade keeps the questions from colliding with it
            as they scroll underneath. */}
        <div
          className="sticky bottom-0 -mx-4 mt-2 px-4 pt-4 pb-4"
          style={{
            background:
              'linear-gradient(to top, var(--plane) 0%, var(--plane) 68%, transparent 100%)',
          }}
        >
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

          <p className="mt-3 text-center text-xs" style={{ color: 'var(--muted)' }}>
            {poll.identityMode === 'anonymous'
              ? 'Your response is anonymous.'
              : 'Your name will be recorded with your response.'}
          </p>
        </div>
      </form>
    </PollShell>
  );
}

function PollShell({ poll, children }) {
  return (
    <div className="space-y-6">
      {poll.coverUrl && (
        <img
          src={poll.coverUrl}
          alt=""
          className="aspect-[16/6] w-full rounded-xl object-cover"
          style={{ border: '1px solid var(--line)', boxShadow: 'var(--elev-1)' }}
        />
      )}
      <div>
        <h1 className="text-2xl font-semibold">{poll.title}</h1>
        {poll.description && (
          <p className="mt-2 text-base" style={{ color: 'var(--ink-2)' }}>
            {poll.description}
          </p>
        )}
        {poll.closesAt && (
          <p
            className="mt-3 inline-flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--muted)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5.2l3 1.8" />
            </svg>
            {/* Ticks, because a respondent deciding whether to answer now is
                exactly who needs to know it shuts in four minutes. */}
            <Countdown closesAt={poll.closesAt} />
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
        <legend className="mb-4 text-base font-medium">
          {question.prompt}
          {!question.required && (
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted)' }}>
              optional
            </span>
          )}
        </legend>

        {/* Ranking is in CHOICE_TYPES because it stores option ids, but it is
            an ordering rather than a selection — so it gets its own control
            and must be checked before the generic choice branch. */}
        {question.type === 'ranking' && (
          <RankingInput
            options={question.options}
            value={selected}
            onChange={onChange}
            name={`q-${question.id}`}
          />
        )}

        {question.type !== 'ranking' && CHOICE_TYPES.includes(question.type) && (
          <div className={question.options.some((o) => o.imageUrl) ? 'grid gap-2 sm:grid-cols-2' : 'space-y-2'}>
            {question.options.map((option) => {
              const isSelected = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  aria-pressed={isSelected}
                  // Whole row is the hit target — a 48px tap area rather than
                  // a 16px radio dot, because this is a phone-first page.
                  className="option-row"
                  data-selected={isSelected || undefined}
                >
                  <span
                    className="option-mark"
                    style={{ borderRadius: isMulti ? '0.3rem' : '9999px' }}
                    aria-hidden
                  >
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </span>

                  {option.imageUrl && (
                    <img
                      src={option.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-md object-cover"
                      style={{ border: '1px solid var(--line)' }}
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
                className="rating-button"
                data-selected={value === String(n) || undefined}
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

function ThankYou({ poll, questions, tallies, result, liveCount }) {
  // The count from the submit response is right at the instant of voting; the
  // socket keeps it right while this screen stays open.
  const total = liveCount ?? result.responseCount;
  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <span
          aria-hidden
          className="inline-flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--good) 14%, transparent)',
            color: 'var(--good)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h1 className="text-xl font-semibold">Response recorded</h1>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          <span data-numeric>{formatCount(total)}</span> responses so far.
        </p>
        {/* Someone who has just voted and is watching the numbers move is the
            likeliest person on the site to want to know how long is left. */}
        {poll.closesAt && (
          <Countdown
            closesAt={poll.closesAt}
            className="text-xs font-medium"
            style={{ color: 'var(--brand-ink)' }}
          />
        )}
      </Card>

      {result.resultsVisible ? (
        <Card className="space-y-6">
          <h2 className="text-base font-semibold">Results</h2>
          {questions
            .filter((q) => CHOICE_TYPES.includes(q.type))
            .map((q) => (
              <div key={q.id}>
                <h3 className="mb-3 text-sm font-medium">{q.prompt}</h3>
                {q.type === 'ranking' ? (
                  /* Patched with the figures returned by the submit, so the
                     confirmation reflects the ranking just cast rather than
                     the standings as they were when the page loaded. */
                  <RankingResults
                    options={q.options.map((o) => ({
                      ...o,
                      count: result.tallies?.[o.id] ?? o.count,
                      rankSum: result.rankSums?.[o.id] ?? o.rankSum,
                    }))}
                  />
                ) : (
                  <ResultBars
                    options={q.options}
                    tallies={{ ...tallies, ...(result.tallies ?? {}) }}
                  />
                )}
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

      <p className="text-center text-sm font-medium">
        <a href="/signup" className="hover:underline" style={{ color: 'var(--brand-ink)' }}>
          Create your own poll — free
        </a>
      </p>
    </div>
  );
}
