/**
 * Redeem.tsx — AppSumo multi-tier code redemption page (/redeem)
 *
 * Shows a distinct tier-specific success screen for:
 *   Tier 1 ($49)   — 50 credits / ATS core
 *   Tier 2 ($99)   — 200 credits / advanced B2C
 *   B2B Tier ($149) — 1,000 credits / bulk screening
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { redeemAppSumoCode } from '@/services/creditService';
import { AppSumoBadge } from '@/components/AppSumoBadge';
import {
  TIER_ACTIVATION_MESSAGES,
  DEFAULT_ACTIVATION_MESSAGE,
  APPSUMO_TIER_CONFIGS,
  type TierActivationMessage,
} from '@/utils/tierPermissions';
import { Button } from '@/components/ui/button';
import {
  Ticket, Zap, CheckCircle2, XCircle, Loader2,
  ChevronRight, ArrowLeft, ShieldCheck, Star, Users, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type RedeemState = 'idle' | 'loading' | 'success' | 'error';

// ─── Tier success panel ───────────────────────────────────────────────────────

interface TierSuccessPanelProps {
  msg: TierActivationMessage;
  creditLimit: number;
  tier: string;
  onNavigate: () => void;
}

function TierSuccessPanel({ msg, creditLimit, tier, onNavigate }: TierSuccessPanelProps) {
  const isB2B   = tier === 'appsumo_b2b';
  const isTier2 = tier === 'appsumo_tier2';

  const accentColor  = isB2B   ? 'text-amber-400'
                     : isTier2 ? 'text-violet-400'
                     : 'text-blue-400';
  const borderColor  = isB2B   ? 'border-amber-500/30 bg-amber-500/5'
                     : isTier2 ? 'border-violet-500/30 bg-violet-500/5'
                     : 'border-blue-500/30 bg-blue-500/5';
  const iconColor    = isB2B   ? 'bg-amber-500/10 border-amber-500/30'
                     : isTier2 ? 'bg-violet-500/10 border-violet-500/30'
                     : 'bg-blue-500/10 border-blue-500/30';
  const Icon = isB2B ? Users : isTier2 ? Sparkles : Zap;

  return (
    <div className="p-8 text-center">
      {/* Icon */}
      <div className={cn('w-16 h-16 mx-auto mb-4 rounded-2xl border flex items-center justify-center', iconColor)}>
        <Icon className={cn('w-8 h-8', accentColor)} />
      </div>

      {/* Badge */}
      <span className={cn('inline-block text-xs font-semibold px-3 py-1 rounded-full border mb-3', borderColor, accentColor)}>
        {msg.badge}
      </span>

      {/* Headline */}
      <h2 className="text-2xl font-bold text-foreground mb-1">{msg.headline}</h2>
      <p className="text-sm text-muted-foreground mb-5">{msg.subline}</p>

      {/* Credits badge */}
      <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium mb-6', borderColor, accentColor)}>
        <Zap className="w-4 h-4" />
        {msg.creditsLine}
      </div>

      {/* Feature list */}
      <div className="text-left rounded-xl border border-border bg-background p-4 mb-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Unlocked for you:
        </p>
        <ul className="space-y-2">
          {msg.features.map(f => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2 className={cn('w-4 h-4 shrink-0 mt-0.5', accentColor)} />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={onNavigate}
        className={cn(
          'w-full h-11 font-semibold',
          isB2B   ? 'bg-amber-500 hover:bg-amber-600 text-black'
          : isTier2 ? 'bg-violet-600 hover:bg-violet-700 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white',
        )}
      >
        Go to Dashboard
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>

      <p className="text-xs text-muted-foreground mt-3">
        Redirecting automatically in a few seconds…
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Redeem() {
  const navigate = useNavigate();
  const [userId, setUserId]           = useState<string | null>(null);
  const [code, setCode]               = useState('');
  const [state, setState]             = useState<RedeemState>('idle');
  const [errorMsg, setErrorMsg]       = useState('');
  const [activatedTier, setActivatedTier]     = useState<string>('');
  const [activationMsg, setActivationMsg]     = useState<TierActivationMessage | null>(null);
  const [creditLimit, setCreditLimit]         = useState(0);

  // Load current user — redirect to auth if not signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) navigate('/auth?redirect=/redeem');
    });
  }, [navigate]);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast.error('Please enter your AppSumo code.');
      return;
    }
    if (!userId) {
      navigate('/auth?redirect=/redeem');
      return;
    }

    setState('loading');
    setErrorMsg('');

    const result = await redeemAppSumoCode(code.trim(), userId);

    if (result.success) {
      const tier = result.newTier ?? 'appsumo_tier1';
      const msg  = TIER_ACTIVATION_MESSAGES[tier] ?? DEFAULT_ACTIVATION_MESSAGE;

      setActivatedTier(tier);
      setActivationMsg(msg);
      setCreditLimit(result.monthlyLimit ?? 50);
      setState('success');
      toast.success(`${msg.headline} — ${msg.creditsLine}`);

      // Auto-redirect
      setTimeout(() => navigate(tier === 'appsumo_b2b' ? '/b2b' : '/dashboard'), 4_000);
    } else {
      setState('error');
      setErrorMsg(result.message);
      toast.error(result.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRedeem();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors self-start max-w-md w-full"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <AppSumoBadge className="mx-auto mb-5" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Activate Your Lifetime Deal
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter the code from your AppSumo purchase email.
          </p>
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          {state === 'success' && activationMsg ? (
            <TierSuccessPanel
              msg={activationMsg}
              creditLimit={creditLimit}
              tier={activatedTier}
              onNavigate={() => navigate(activatedTier === 'appsumo_b2b' ? '/b2b' : '/dashboard')}
            />
          ) : (
            <div className="p-6">
              {/* Input */}
              <label className="block text-sm font-medium text-foreground mb-2">
                AppSumo Code
              </label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); setState('idle'); setErrorMsg(''); }}
                    onKeyDown={handleKeyDown}
                    placeholder="APPSM-SOVR-XXXXX"
                    disabled={state === 'loading'}
                    className={cn(
                      'w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-mono bg-background border',
                      'focus:outline-none focus:ring-2 transition-all',
                      state === 'error'
                        ? 'border-red-500/60 focus:ring-red-500/20'
                        : 'border-border focus:ring-primary/20 focus:border-primary/50',
                    )}
                  />
                </div>
                <Button
                  onClick={handleRedeem}
                  disabled={state === 'loading' || !code.trim()}
                  className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4"
                >
                  {state === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Activate <ChevronRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </div>

              {/* Error */}
              {state === 'error' && errorMsg && (
                <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{errorMsg}</p>
                </div>
              )}

              {/* ── 3-tier preview grid ── */}
              <div className="border-t border-border mt-6 pt-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Choose your tier:
                </p>
                <div className="space-y-3">
                  {APPSUMO_TIER_CONFIGS.map(cfg => (
                    <div
                      key={cfg.tier}
                      className={cn(
                        'rounded-xl border p-3.5 transition-all',
                        cfg.borderColor, cfg.bgColor,
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('text-sm font-bold', cfg.color)}>{cfg.label}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', cfg.color, cfg.borderColor)}>
                              {cfg.badge}
                            </span>
                          </div>
                          <p className={cn('text-xs font-semibold', cfg.color)}>
                            ${cfg.price} one-time · {cfg.credits} credits/mo
                          </p>
                          <ul className="mt-2 space-y-0.5">
                            {cfg.features.slice(0, 3).map(f => (
                              <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <Star className={cn('w-3 h-3 shrink-0 mt-0.5', cfg.color)} />
                                <span className={cfg.highlighted?.includes(f) ? 'font-medium text-foreground' : ''}>{f}</span>
                              </li>
                            ))}
                            {cfg.features.length > 3 && (
                              <li className="text-xs text-muted-foreground pl-4.5">
                                +{cfg.features.length - 3} more…
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stacking note */}
                <p className="mt-4 text-xs text-muted-foreground flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Stacking supported</strong> — redeeming a same-tier code adds more credits.
                    Redeeming a higher-tier code upgrades your plan.
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          Verified securely. No payment info required to activate.
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Need an account?{' '}
          <button
            onClick={() => navigate('/auth?mode=signup&redirect=/redeem')}
            className="text-primary hover:underline"
          >
            Sign up free
          </button>
        </p>
      </div>
    </div>
  );
}
