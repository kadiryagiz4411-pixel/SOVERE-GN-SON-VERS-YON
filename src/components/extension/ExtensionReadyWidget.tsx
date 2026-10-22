import { useState } from 'react';
import { Puzzle } from 'lucide-react';
import { useSovereignExtension } from '@/hooks/useSovereignExtension';
import { ExtensionSetupModal } from '@/components/extension/ExtensionSetupModal';
import { cn } from '@/lib/utils';

export function ExtensionReadyWidget({ compact = false }: { compact?: boolean }) {
  const { connected, version } = useSovereignExtension();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => { if (!connected) setOpen(true); }}
        className={cn(
          'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
          connected
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-violet-500/30 bg-violet-500/10 hover:border-violet-400/50',
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-violet-400')} />
          <Puzzle className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-xs font-semibold text-slate-100">
            {connected ? 'Extension Connected' : 'Get Extension'}
          </span>
        </div>
        {!compact && (
          <p className="mt-1 text-[10px] leading-snug text-slate-400">
            {connected
              ? `Sovereign Extension Ready${version ? ` · v${version}` : ''}`
              : 'Download the Chrome / Edge side panel and load it unpacked.'}
          </p>
        )}
      </button>
      <ExtensionSetupModal open={open} onOpenChange={setOpen} />
    </>
  );
}
