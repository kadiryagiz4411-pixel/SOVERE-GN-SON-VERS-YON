import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { evaluateFitScore, type FitScoreResult } from '@/lib/fitScore';
import { trackEvent } from '@/lib/analytics';

type TesterVariant = 'page' | 'landing' | 'dashboard';

interface FitScorePanicTesterProps {
  variant?: TesterVariant;
  signedIn?: boolean;
}

export function FitScorePanicTester({ variant = 'page', signedIn = false }: FitScorePanicTesterProps) {
  const [job, setJob] = useState('');
  const [proposal, setProposal] = useState('');
  const [result, setResult] = useState<FitScoreResult | null>(null);

  const compact = variant === 'dashboard';
  const unlockHref = signedIn
    ? '/dashboard?rewrite=1'
    : '/auth?mode=signup&intent=rewrite';

  const canScore = job.trim().length >= 40 && proposal.trim().length >= 40;

  const scoreLabel = useMemo(() => {
    if (!result) return null;
    return result.panic
      ? result.warning
      : `Fit Score: ${result.score}%`;
  }, [result]);

  const handleScore = () => {
    if (!canScore) return;
    const next = evaluateFitScore(job, proposal);
    setResult(next);
    trackEvent('fit_score_checked', { value: next.score, source: variant });
  };

  return (
    <section className={compact ? 'rounded-2xl border border-amber-500/20 bg-zinc-950/70 p-5' : 'relative overflow-hidden rounded-3xl border border-amber-500/20 bg-zinc-950/80 p-6 md:p-10'}>
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Free inbound magnet</p>
        {variant === 'page' ? (
          <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">Upwork Proposal & Resume Match Checker</h1>
        ) : (
          <h2 className={`mt-2 font-black text-white ${compact ? 'text-xl' : 'text-3xl md:text-4xl'}`}>
            Upwork Proposal & Resume Match Checker
          </h2>
        )}
        <p className="mt-2 max-w-2xl text-sm text-zinc-400 md:text-base">
          Paste the job brief and your draft. Sovereign scores the overlap instantly — no account required.
        </p>
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-zinc-300">Job description</span>
          <Textarea
            value={job}
            onChange={(event) => setJob(event.target.value)}
            rows={compact ? 6 : 9}
            placeholder="Paste the Upwork, LinkedIn, or freelance job brief…"
            className="min-h-[140px] border-amber-500/20 bg-black text-zinc-100"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-zinc-300">Freelancer proposal or resume</span>
          <Textarea
            value={proposal}
            onChange={(event) => setProposal(event.target.value)}
            rows={compact ? 6 : 9}
            placeholder="Paste the proposal, cover letter, or resume text…"
            className="min-h-[140px] border-amber-500/20 bg-black text-zinc-100"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleScore} disabled={!canScore} className="bg-amber-400 text-black hover:bg-amber-300">
          <Sparkles className="mr-2 h-4 w-4" />
          Check Fit Score
        </Button>
        {!canScore ? (
          <p className="text-xs text-zinc-500">Add at least 40 characters in each field.</p>
        ) : null}
      </div>

      {result ? (
        <div className="mt-6 space-y-4">
          <div className={`rounded-2xl border p-5 ${result.panic ? 'border-orange-500/50 bg-orange-950/40' : 'border-emerald-500/30 bg-emerald-950/20'}`}>
            <p
              className={`font-black leading-tight ${result.panic ? 'text-2xl text-orange-400 md:text-4xl' : 'text-2xl text-emerald-300 md:text-3xl'}`}
            >
              {scoreLabel}
            </p>
            {result.panic ? (
              <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-orange-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {result.summary}
              </p>
            ) : (
              <p className="mt-3 text-sm text-emerald-100/80">{result.summary}</p>
            )}
            <div className="mt-4 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
              <span>Keyword overlap {result.keyword}%</span>
              <span>Hook strength {result.hooks}%</span>
              <span>Format {result.format}%</span>
            </div>
          </div>

          <Button asChild className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:from-amber-300 hover:to-yellow-400">
            <Link to={unlockHref} onClick={() => trackEvent('fit_score_rewrite_cta', { value: result.score, source: variant })}>
              <Wand2 className="mr-2 h-4 w-4" />
              Unlock instant AI rewriting with Sovereign
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
