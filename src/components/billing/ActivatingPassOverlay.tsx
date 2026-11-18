interface ActivatingPassOverlayProps {
  open: boolean;
  message?: string;
  ready?: boolean;
}

export function ActivatingPassOverlay({ open, message, ready }: ActivatingPassOverlayProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-slate-950 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
        <h2 className="text-lg font-semibold text-slate-100">
          {ready ? 'Your pass is active' : 'Activating your pass...'}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {message || 'Payment received. Unlocking your Single Pass. This usually takes a few seconds.'}
        </p>
      </div>
    </div>
  );
}
