/**
 * RedeemModal.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Inline modal for AppSumo code redemption.
 * Can be embedded in ProfileSettings or triggered from anywhere in the app.
 *
 * Calls the NEW `redeem_stacking_code` RPC (appsumo_codes table).
 * Shows stacking progress: which tier is active and how many more codes needed.
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { X, Ticket, ChevronRight, Loader2, CheckCircle2, XCircle, Zap, Key, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StackingStatus {
  codesRedeemed: number;
  tierLabel: string;
  nextTierLabel: string | null;
  codesNeededForNext: number | null;
  byokUnlocked: boolean;
  monthlyCredits: number;
}

function resolveStackingStatus(codesRedeemed: number, byokUnlocked: boolean): StackingStatus {
  if (codesRedeemed >= 3) {
    return { codesRedeemed, tierLabel: 'AppSumo Tier 3 (B2B)', nextTierLabel: null, codesNeededForNext: null, byokUnlocked: true, monthlyCredits: 1200 };
  }
  if (codesRedeemed === 2) {
    return { codesRedeemed, tierLabel: 'AppSumo Tier 2', nextTierLabel: 'Tier 3 (B2B)', codesNeededForNext: 1, byokUnlocked, monthlyCredits: 500 };
  }
  if (codesRedeemed === 1) {
    return { codesRedeemed, tierLabel: 'AppSumo Tier 1', nextTierLabel: 'Tier 2', codesNeededForNext: 1, byokUnlocked, monthlyCredits: 200 };
  }
  return { codesRedeemed: 0, tierLabel: 'No AppSumo Code', nextTierLabel: 'Tier 1', codesNeededForNext: 1, byokUnlocked, monthlyCredits: 0 };
}

// ─── Stacking Progress Bar ────────────────────────────────────────────────────

function StackingProgress({ status }: { status: StackingStatus }) {
  const steps = [
    { label: 'Tier 1', credits: '200/mo', reached: status.codesRedeemed >= 1 },
    { label: 'Tier 2', credits: '500/mo', reached: status.codesRedeemed >= 2 },
    { label: 'Tier 3 + BYOK', credits: '1,200/mo', reached: status.codesRedeemed >= 3 },
  ];

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stacking Progress</p>
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={cn(
                'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors',
                step.reached
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                  : 'border-border text-muted-foreground',
              )}>
                {step.reached ? '✓' : i + 1}
              </div>
              <p className={cn('text-[10px] text-center font-medium', step.reached ? 'text-emerald-400' : 'text-muted-foreground')}>
                {step.label}
              </p>
              <p className="text-[9px] text-muted-foreground/70">{step.credits}</p>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 flex-1 mb-5 rounded transition-colors', step.reached ? 'bg-emerald-500/50' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>
      {status.nextTierLabel && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ArrowRight className="w-3 h-3 text-primary" />
          Redeem {status.codesNeededForNext} more code to unlock <strong className="text-foreground ml-1">{status.nextTierLabel}</strong>
          {status.nextTierLabel?.includes('3') && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-amber-400 text-[10px]">
              <Key className="w-3 h-3" /> BYOK
            </span>
          )}
        </p>
      )}
      {status.byokUnlocked && (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <Key className="w-3 h-3" />
          <strong>BYOK unlocked</strong> — credit deduction bypassed when you add your OpenAI key
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RedeemModalProps {
  userId: string;
  /** Current codes already redeemed (pass from profile query) */
  initialCodesRedeemed?: number;
  byokUnlocked?: boolean;
  /** Render as inline card (default) or floating modal */
  variant?: 'card' | 'modal';
  open?: boolean;
  onClose?: () => void;
  /** Called after a successful redemption so parent can refresh */
  onSuccess?: (codesRedeemed: number) => void;
}

export function RedeemModal({
  userId,
  initialCodesRedeemed = 0,
  byokUnlocked = false,
  variant = 'card',
  open = true,
  onClose,
  onSuccess,
}: RedeemModalProps) {
  const [code, setCode]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [codesRedeemed, setCodesRedeemed] = useState(initialCodesRedeemed);
  const [successMsg, setSuccessMsg]       = useState('');

  const status = resolveStackingStatus(codesRedeemed, byokUnlocked || codesRedeemed >= 3);

  const handleRedeem = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError('Please enter your AppSumo code.'); return; }

    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      const { data, error: rpcError } = await supabase.rpc('redeem_stacking_code', {
        input_code:     trimmed,
        target_user_id: userId,
      });

      if (rpcError) throw rpcError;

      const result = String(data);

      if (result === 'ok') {
        const newCount = codesRedeemed + 1;
        setCodesRedeemed(newCount);
        const newStatus = resolveStackingStatus(newCount, newCount >= 3);
        setSuccessMsg(`✓ Code activated! You are now on ${newStatus.tierLabel} · ${newStatus.monthlyCredits} credits/mo`);
        setCode('');
        toast.success(newStatus.tierLabel + ' activated!');
        onSuccess?.(newCount);
      } else if (result === 'already_redeemed') {
        setError('This code has already been used.');
      } else if (result === 'invalid_code') {
        setError('Code not found. Check for typos and try again.');
      } else {
        setError('Unexpected error. Please contact support.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const inner = (
    <div className={cn(variant === 'modal' ? 'p-6' : '')}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Activate AppSumo Code</p>
            <p className="text-xs text-muted-foreground">Stacking supported — redeem multiple codes</p>
          </div>
        </div>
        {onClose && variant === 'modal' && (
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Current status */}
      <StackingProgress status={status} />

      {/* Divider */}
      <div className="border-t border-border my-4" />

      {/* Input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">AppSumo License Key</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); setSuccessMsg(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              placeholder="SOV-SUMO-XXXX"
              disabled={busy}
              className={cn(
                'w-full pl-9 pr-3 py-2 rounded-lg text-sm font-mono bg-background border transition-all',
                'focus:outline-none focus:ring-2',
                error
                  ? 'border-red-500/50 focus:ring-red-500/20'
                  : 'border-border focus:ring-primary/20 focus:border-primary/50',
              )}
            />
          </div>
          <Button
            onClick={handleRedeem}
            disabled={busy || !code.trim()}
            className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white px-4 rounded-lg text-sm"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Activate <ChevronRight className="w-3.5 h-3.5 ml-1" /></>}
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-1.5 text-sm text-red-400">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-1.5 text-sm text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* BYOK hint once Tier 3 is active */}
      {(codesRedeemed >= 3 || byokUnlocked) && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 flex items-start gap-2 text-xs text-amber-300">
          <Key className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            BYOK active. Add your OpenAI key in{' '}
            <Link to="/profile" className="underline hover:text-amber-200">Profile → Settings</Link>{' '}
            to bypass all credit limits.
          </span>
        </div>
      )}

      {/* Credits summary */}
      {codesRedeemed > 0 && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-center gap-2 text-xs text-emerald-300">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span><strong>{status.monthlyCredits} credits/mo</strong> · resets every 30 days</span>
        </div>
      )}
    </div>
  );

  if (variant === 'modal') {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
      {inner}
    </div>
  );
}
