import { openMonsterTweet } from '@/lib/monsterScore';

export function MonsterScore({
  score,
  compact = false,
}: {
  score: number;
  compact?: boolean;
}) {
  const safe = Math.max(0, Math.min(99, Math.round(Number(score) || 0)));
  const r = compact ? 28 : 46;
  const size = compact ? 72 : 120;
  const circ = 2 * Math.PI * r;
  const dash = circ * (safe / 100);

  return (
    <div className={`w-full rounded-lg border border-amber-500/40 bg-zinc-950 ${compact ? 'p-3' : 'p-4'}`}>
      <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg className="absolute inset-0 -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={r} stroke="#27272a" strokeWidth="8" fill="none" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="#F59E0B"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="butt"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <span className={`font-black text-amber-400 ${compact ? 'text-lg' : 'text-3xl'}`}>{safe}</span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-400">/100</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-500">Monster Score</p>
          <p className={`mt-1 font-semibold text-zinc-100 ${compact ? 'text-sm' : 'text-base'}`}>
            {safe}/100 · listing destroyed
          </p>
          <p className="mt-1 text-xs text-zinc-400">Keyword density, hook force, and format lock.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => openMonsterTweet(safe)}
        className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-amber-500/40 bg-zinc-950 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide text-amber-300"
      >
        Share Monster Score to X 𝕏
      </button>
    </div>
  );
}
