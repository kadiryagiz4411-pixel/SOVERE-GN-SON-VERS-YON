/**
 * OutOfCreditsModal — shown when remaining_credits hits 0.
 */
import { X, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatUsd, SINGLE_PASS_USD } from '@/config/money';

interface OutOfCreditsModalProps {
  open: boolean;
  onClose: () => void;
  resetDate?: Date | null;
  subscriptionTier?: string;
}

export function OutOfCreditsModal({
  open, onClose,
}: OutOfCreditsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-6 pb-4 border-b border-slate-800 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <Zap className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Out of Monthly Credits</h2>
          <p className="text-sm text-slate-400 mt-1">
            Upgrade to keep generating CVs and proposals.
          </p>
        </div>

        <div className="p-6 space-y-3">
          <Link
            to="/pricing#single-pass"
            onClick={onClose}
            className="flex items-center gap-4 p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/70 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">Single Pass. {formatUsd(SINGLE_PASS_USD)}</p>
              <p className="text-xs text-slate-400 mt-0.5">One generation, no subscription</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
          </Link>
          <Link
            to="/settings/billing"
            onClick={onClose}
            className="flex items-center gap-4 p-4 rounded-xl border border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/70 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">Upgrade to Pro</p>
              <p className="text-xs text-slate-400 mt-0.5">More monthly credits and full toolkit</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors shrink-0" />
          </Link>
        </div>

        <p className="text-center text-xs text-slate-600 pb-5">
          Questions? <a href="mailto:support@sovereignapp.io" className="text-slate-500 hover:text-slate-300">Contact support</a>
        </p>
      </div>
    </div>
  );
}
