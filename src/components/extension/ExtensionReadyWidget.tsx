import { useState } from 'react';
import { Download, Puzzle } from 'lucide-react';
import { useSovereignExtension } from '@/hooks/useSovereignExtension';
import { ExtensionSetupModal } from '@/components/extension/ExtensionSetupModal';
import { cn } from '@/lib/utils';

/** Pre-built zip — generated at build-time by scripts/buildExtensionZip.mjs */
const ZIP_URL = '/sovereign-extension.zip';

export function ExtensionReadyWidget({ compact = false }: { compact?: boolean }) {
  const { connected, version } = useSovereignExtension();
  const [open, setOpen] = useState(false);

  if (connected) {
    return (
      <div className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <Puzzle className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-xs font-semibold text-slate-100">Extension Connected</span>
        </div>
        {!compact && (
          <p className="mt-1 text-[10px] leading-snug text-slate-400">
            {`Sovereign Extension Ready${version ? ` · v${version}` : ''}`}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="w-full rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2.5">
        {/* Setup guide trigger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 text-left"
        >
          <span className="h-2 w-2 rounded-full bg-violet-400" />
          <Puzzle className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-xs font-semibold text-slate-100">Get Extension</span>
        </button>

        {!compact && (
          <div className="mt-2 flex items-center gap-2">
            {/* Direct download — plain anchor, zero JS failure modes */}
            <a
              href={ZIP_URL}
              download="sovereign-extension.zip"
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 hover:text-violet-200',
              )}
            >
              <Download className="h-3 w-3" />
              Download .zip
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Setup guide →
            </button>
          </div>
        )}
      </div>

      <ExtensionSetupModal open={open} onOpenChange={setOpen} />
    </>
  );
}
