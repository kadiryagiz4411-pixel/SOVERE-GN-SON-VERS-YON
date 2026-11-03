import { Zap } from 'lucide-react';
import type { PoachTarget } from '@/services/poachingEngine';

export function PoachBanner({
  target,
  busy,
  onDeploy,
}: {
  target: PoachTarget | null;
  busy?: boolean;
  onDeploy: () => void;
}) {
  if (!target?.active) return null;
  const meta = [target.company, target.domain, target.recruiter, target.platform].filter(Boolean).join(' · ');
  return (
    <div className="poach-banner w-full rounded-lg border border-amber-500/40 bg-zinc-950 p-3">
      <p className="text-sm font-semibold text-amber-300 leading-snug">
        ⚡ Instant Poach Detected: This client is actively hiring. Deploy aggressive custom proposal instantly.
      </p>
      {meta ? <p className="mt-1 text-[11px] uppercase tracking-wide text-amber-200/70">{meta}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={onDeploy}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide text-zinc-950 disabled:opacity-60"
      >
        <Zap className="h-3.5 w-3.5" />
        {busy ? 'Deploying…' : 'Poach & Deploy'}
      </button>
    </div>
  );
}
