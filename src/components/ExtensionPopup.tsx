import { useEffect, useState } from 'react';
import { MonsterScore } from '@/components/MonsterScore';
import { PoachBanner } from '@/components/PoachBanner';
import { ResumeArmorPanel } from '@/components/ResumeArmorPanel';
import type { PoachTarget } from '@/services/poachingEngine';

type WorkspaceMode = 'b2c' | 'b2b';

function safeMode(value: unknown): WorkspaceMode {
  return value === 'b2b' ? 'b2b' : 'b2c';
}

export function WorkspaceModeSwitcher({
  value,
  onChange,
}: {
  value: WorkspaceMode;
  onChange: (next: WorkspaceMode) => void;
}) {
  const [mode, setMode] = useState<WorkspaceMode>(() => safeMode(value));

  useEffect(() => {
    setMode(safeMode(value));
  }, [value]);

  const select = (next: WorkspaceMode) => {
    const safe = safeMode(next);
    setMode(safe);
    try {
      onChange(safe);
    } catch (err) {
      console.error('[sovereign] workspace switch', err);
    }
  };

  const tabClass = (active: boolean) =>
    [
      'w-full rounded-md px-2 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em]',
      'pointer-events-auto cursor-pointer border',
      active
        ? 'border-amber-400/70 bg-gradient-to-r from-amber-300 to-amber-600 text-zinc-950'
        : 'border-transparent bg-transparent text-zinc-400 hover:text-zinc-200',
    ].join(' ');

  return (
    <div
      className="grid w-full grid-cols-2 gap-1.5 rounded-lg border border-amber-500/40 bg-zinc-950 p-2 pointer-events-auto"
      role="tablist"
      aria-label="Workspace mode"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') select('b2b');
        if (event.key === 'ArrowLeft') select('b2c');
      }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'b2c'}
        tabIndex={mode === 'b2c' ? 0 : -1}
        className={tabClass(mode === 'b2c')}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          select('b2c');
        }}
      >
        B2C Personal
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'b2b'}
        tabIndex={mode === 'b2b' ? 0 : -1}
        className={tabClass(mode === 'b2b')}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          select('b2b');
        }}
      >
        B2B Agency
      </button>
    </div>
  );
}

export function ExtensionGrowthStack({
  score,
  target,
  jobText,
  busy,
  onDeploy,
}: {
  score: number;
  target: PoachTarget | null;
  jobText: string;
  busy?: boolean;
  onDeploy: () => void;
}) {
  return (
    <div className="space-y-3">
      <PoachBanner
        target={target}
        busy={busy}
        onDeploy={() => {
          try {
            onDeploy();
          } catch (err) {
            console.error('[sovereign] poach deploy', err);
          }
        }}
      />
      <MonsterScore score={score} />
      <ResumeArmorPanel jobText={jobText} />
    </div>
  );
}
