/**
 * OutOfCreditsModal — shown when remaining_credits hits 0.
 * Offers: upgrade to Pro Monthly OR stack another AppSumo code.
 */
import { X, Zap, Ticket, RefreshCw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface OutOfCreditsModalProps {
  open: boolean;
  onClose: () => void;
  resetDate?: Date | null;
  subscriptionTier?: string;
}

function daysLeft(d: Date | null | undefined): string {
  if (!d) return '30 days';
  const days = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
  return days === 1 ? '1 day' : `${days} days`;
}

export function OutOfCreditsModal({
  open, onClose, resetDate, subscriptionTier = 'free',
}: OutOfCreditsModalProps) {
  if (!open) return null;

  const isAppSumo = subscriptionTier.startsWith('appsumo');
  const days = daysLeft(resetDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <Zap className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Out of Monthly Credits</h2>
          <p className="text-sm text-slate-400 mt-1">
            {isAppSumo
              ? `Your ${days} will reset your credits. Need more now?`
              : 'Upgrade to keep generating AI-powered CVs and proposals.'}
          </p>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {/* Option 1: Monthly plan upgrade */}
          <Link
            to="/settings/billing"
            onClick={onClose}
            className="flex items-center gap-4 p-4 rounded-xl border border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/70 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">Upgrade to Pro — $25/month</p>
              <p className="text-xs text-slate-400 mt-0.5">Unlimited AI optimisations, no credit limits</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors shrink-0" />
          </Link>

          {/* Option 2: Stack AppSumo code */}
          <Link
            to="/redeem"
            onClick={onClose}
            className="flex items-center gap-4 p-4 rounded-xl border border-teal-500/40 bg-teal-500/5 hover:bg-teal-500/10 hover:border-teal-500/70 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">Stack Another AppSumo Code</p>
              <p className="text-xs text-slate-400 mt-0.5">Have a second code? Add 50 more monthly credits</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors shrink-0" />
          </Link>

          {/* Wait for reset (AppSumo only) */}
          {isAppSumo && resetDate && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
              <RefreshCw className="w-4 h-4 text-slate-500 shrink-0" />
              <p className="text-xs text-slate-400">
                Credits auto-reset in <span className="text-slate-200 font-medium">{days}</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 pb-5">
          Questions? <a href="mailto:support@sovereignapp.io" className="text-slate-500 hover:text-slate-300">Contact support</a>
        </p>
      </div>
    </div>
  );
}
