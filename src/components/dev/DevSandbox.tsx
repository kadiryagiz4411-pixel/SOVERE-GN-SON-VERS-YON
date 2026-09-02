/**
 * DevSandbox.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Floating developer panel for role / tier switching and BYOK simulation.
 * Visible ONLY when:
 *   - NODE_ENV === 'development'  (Vite: import.meta.env.DEV)
 *   - OR ?dev_mode=true in the URL query string
 *
 * Controls:
 *  - Subscription tier switcher (writes to localStorage → picked up by DevTierOverride)
 *  - BYOK simulation toggle
 *  - AppSumo code redemption test (calls redeem_stacking_code RPC)
 *
 * How to consume the tier override in hooks/useTierAccess.ts:
 *   const devTier = localStorage.getItem('dev_tier_override');
 *   Use devTier as the effective tier when it is present.
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  Bug, X, ChevronDown, ChevronUp, Key, RefreshCw, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { applyDevAppsumoTier } from '@/lib/ai-engine';

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_TIER_KEY = 'dev_tier_override';
const LS_BYOK_KEY = 'dev_byok_simulate';

const TIERS = [
  { value: 'free',          label: 'Free' },
  { value: 'standard',      label: 'Standard' },
  { value: 'pro',           label: 'Pro' },
  { value: 'elite',         label: 'Elite' },
  { value: 'enterprise',    label: 'Enterprise' },
  { value: 'appsumo_tier1', label: 'AppSumo Tier 1' },
  { value: 'appsumo_tier2', label: 'AppSumo Tier 2' },
  { value: 'appsumo_b2b',   label: 'AppSumo Tier 3 (B2B)' },
] as const;

// ─── Visibility guard ─────────────────────────────────────────────────────────

function isSandboxVisible(): boolean {
  return import.meta.env.DEV === true;
}

// ─── Code test row ────────────────────────────────────────────────────────────

type CodeTestState = 'idle' | 'loading' | 'ok' | 'error';

function CodeTestRow({ userId }: { userId: string | null }) {
  const [testCode, setTestCode]   = useState('SOV-SUMO-T1-DEMO1');
  const [codeState, setCodeState] = useState<CodeTestState>('idle');
  const [codeMsg, setCodeMsg]     = useState('');

  const handleTest = async () => {
    if (!userId) { toast.error('No user logged in'); return; }
    setCodeState('loading');
    setCodeMsg('');
    try {
      const { data, error } = await supabase.rpc('redeem_stacking_code', {
        input_code:     testCode.trim().toUpperCase(),
        target_user_id: userId,
      });
      if (error) throw error;
      const result = String(data);
      setCodeState(result === 'ok' ? 'ok' : 'error');
      setCodeMsg(result);
      toast[result === 'ok' ? 'success' : 'error'](`redeem_stacking_code → ${result}`);
    } catch (err: unknown) {
      setCodeState('error');
      setCodeMsg(err instanceof Error ? err.message : 'rpc error');
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Simulate Code Redemption</p>
      <div className="flex gap-1.5">
        <input
          value={testCode}
          onChange={(e) => setTestCode(e.target.value)}
          className="flex-1 bg-background border border-border rounded-md px-2 py-1 text-xs font-mono"
          placeholder="SOV-SUMO-XXXX"
        />
        <button
          type="button"
          onClick={handleTest}
          disabled={codeState === 'loading'}
          className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 rounded-md px-2 py-1 text-[10px] font-semibold disabled:opacity-50"
        >
          {codeState === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Redeem'}
        </button>
      </div>
      {codeMsg && (
        <div className={cn('flex items-center gap-1 text-[10px]', codeState === 'ok' ? 'text-emerald-400' : 'text-red-400')}>
          {codeState === 'ok'
            ? <CheckCircle2 className="w-3 h-3" />
            : <XCircle className="w-3 h-3" />}
          {codeMsg}
        </div>
      )}

      {/* Demo codes hint */}
      <div className="text-[9px] text-muted-foreground/60 space-y-0.5 pt-0.5">
        <p className="font-medium text-muted-foreground/80">Demo codes (if not yet used):</p>
        {['SOV-SUMO-T1-DEMO1', 'SOV-SUMO-T2-DEMO1', 'SOV-SUMO-T3-DEMO1'].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setTestCode(c)}
            className="block font-mono text-primary/70 hover:text-primary"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DevSandbox() {
  const [visible] = useState(isSandboxVisible);
  const [open, setOpen]     = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>(
    () => localStorage.getItem(LS_TIER_KEY) ?? 'free',
  );
  const [appsumoN, setAppsumoN] = useState<1 | 2 | 3 | 0>(0);
  const [tierBusy, setTierBusy] = useState(false);
  const [byokActive, setByokActive] = useState<boolean>(
    () => localStorage.getItem(LS_BYOK_KEY) === 'true',
  );

  // Resolve userId once
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  const applyAppsumoTier = useCallback(async (n: 1 | 2 | 3) => {
    if (!userId) { toast.error('No user logged in'); return; }
    setTierBusy(true);
    try {
      await applyDevAppsumoTier(userId, n);
      setAppsumoN(n);
      toast.success(`AppSumo tier → ${n} (written to Supabase)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set AppSumo tier');
    } finally {
      setTierBusy(false);
    }
  }, [userId]);

  const applyTier = useCallback((tier: string) => {
    setCurrentTier(tier);
    localStorage.setItem(LS_TIER_KEY, tier);
    toast.success(`Dev plan override → ${tier}`);
  }, []);

  const toggleByok = useCallback(() => {
    const next = !byokActive;
    setByokActive(next);
    localStorage.setItem(LS_BYOK_KEY, String(next));
    toast.info(`BYOK simulation ${next ? 'ON' : 'OFF'}`);
  }, [byokActive]);

  const resetAll = useCallback(() => {
    localStorage.removeItem(LS_TIER_KEY);
    localStorage.removeItem(LS_BYOK_KEY);
    setCurrentTier('free');
    setByokActive(false);
    toast.info('Dev overrides cleared. Reload to restore real session values.');
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Developer Sandbox"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2"
    >
      {/* Panel */}
      {open && (
        <div className="w-72 rounded-2xl border border-dashed border-amber-500/40 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">Dev Sandbox</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={resetAll}
                title="Reset all overrides"
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                AppSumo tier (writes to Supabase)
              </p>
              <div className="grid grid-cols-3 gap-1">
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={tierBusy || !userId}
                    onClick={() => applyAppsumoTier(n)}
                    className={cn(
                      'text-[10px] font-bold rounded-md px-2 py-2 border transition-colors',
                      appsumoN === n
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {n === 3 ? 'T3 BYOK' : `Tier ${n}`}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground/70">
                1 = 100 credits · 2 = 300 + batch/KB · 3 = unlimited BYOK
              </p>
            </div>

            {/* ── Tier switcher ─────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Subscription Tier</p>
              <div className="grid grid-cols-2 gap-1">
                {TIERS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => applyTier(t.value)}
                    className={cn(
                      'text-[10px] font-medium rounded-md px-2 py-1.5 text-left border transition-colors truncate',
                      currentTier === t.value
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── BYOK toggle ─────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">BYOK Simulation</p>
              <button
                type="button"
                onClick={toggleByok}
                className={cn(
                  'flex items-center justify-between w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                  byokActive
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-border hover:border-muted text-muted-foreground',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Custom OpenAI Key
                </span>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded',
                  byokActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-muted text-muted-foreground',
                )}>
                  {byokActive ? 'ON' : 'OFF'}
                </span>
              </button>
              {byokActive && (
                <p className="text-[9px] text-emerald-400/70">
                  batchProposalService will see dev_byok_simulate=true and skip credit deduction.
                </p>
              )}
            </div>

            {/* ── Code redemption test ─────────────────────────────────────── */}
            <CodeTestRow userId={userId} />

            {/* ── Session info ─────────────────────────────────────────────── */}
            <div className="pt-1 border-t border-border space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Session</p>
              <p className="text-[9px] font-mono text-muted-foreground/60 truncate">
                uid: {userId ?? 'not logged in'}
              </p>
              <p className="text-[9px] text-muted-foreground/60">
                Active override: <span className="text-amber-400 font-mono">{currentTier}</span>
              </p>
              <p className="text-[9px] text-muted-foreground/60">
                AppSumo DB tier: <span className="text-amber-400 font-mono">{appsumoN || '—'}</span>
              </p>
              <p className="text-[9px] text-muted-foreground/50 italic">
                AppSumo buttons update profiles.appsumo_tier immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg transition-all',
          'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
        )}
        aria-label={open ? 'Close Dev Sandbox' : 'Open Dev Sandbox'}
        title="Developer Sandbox (dev only)"
      >
        <Bug className="w-3.5 h-3.5" />
        <span>Dev</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>
    </div>
  );
}
