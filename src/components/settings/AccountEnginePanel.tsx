import { useEffect, useState } from 'react';
import { Key, PauseCircle, Ticket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RedeemModal } from '@/components/auth/RedeemModal';
import { fetchProfileByAuthId } from '@/lib/profileQuery';
import { numericAppSumoTier, canUseFeature } from '@/lib/appsumoGating';
import { saveEncryptedOpenAiKey, setAccountPaused } from '@/lib/ai-engine';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';

export function AccountEnginePanel({ userId }: { userId: string }) {
  const { hasBYOKAccess } = useSession();
  const [codes, setCodes] = useState(0);
  const [tier, setTier] = useState(0);
  const [paused, setPaused] = useState(false);
  const [byokKey, setByokKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await fetchProfileByAuthId(userId,
      'appsumo_tier, appsumo_codes_count, is_account_paused, subscription_status, encrypted_openai_key, custom_openai_key, subscription_tier, plan_type, byok_unlocked',
    );
    const row = (data ?? {}) as Record<string, unknown>;
    setCodes(Number(row.appsumo_codes_count ?? 0));
    setTier(numericAppSumoTier(row));
    setPaused(Boolean(row.is_account_paused) || row.subscription_status === 'paused');
    const stored = String(row.encrypted_openai_key ?? row.custom_openai_key ?? '');
    setHasStoredKey(stored.length > 0);
  };

  useEffect(() => { void load(); }, [userId]);

  const showByok = hasBYOKAccess || canUseFeature(tier, 'byok_setup');

  return (
    <div id="byok" className="mt-6 space-y-6">
      <RedeemModal
        userId={userId}
        initialCodesRedeemed={codes}
        byokUnlocked={tier >= 3}
        onSuccess={() => { void load(); }}
      />

      {showByok ? (
        <div className="rounded-xl border border-amber-500/30 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold">Bring Your Own Key (BYOK)</h3>
            <span className="text-[10px] uppercase tracking-wide rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-2 py-0.5">
              UNLIMITED
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tier 3 uses your OpenAI key and skips credit deduction. {hasStoredKey ? 'A key is already saved.' : 'No key saved yet.'}
          </p>
          <Input
            type="password"
            autoComplete="off"
            placeholder="sk-..."
            value={byokKey}
            onChange={(e) => setByokKey(e.target.value)}
          />
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await saveEncryptedOpenAiKey(userId, byokKey);
                setHasStoredKey(Boolean(byokKey.trim()));
                setByokKey('');
                toast.success('OpenAI key saved');
              } catch {
                toast.error('Could not save key');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save API key'}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          Custom OpenAI key setup unlocks at AppSumo Tier 3 (stack 3 codes).
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <PauseCircle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <Label htmlFor="freeze-account" className="text-sm font-semibold">Freeze / Pause account</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Temporarily lock AI execution without wiping credits, CRM, or knowledge-base data.
            </p>
          </div>
        </div>
        <Switch
          id="freeze-account"
          checked={paused}
          onCheckedChange={async (next) => {
            setPaused(next);
            await setAccountPaused(userId, next);
            toast.success(next ? 'Account paused' : 'Account unpaused');
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Ticket className="w-3.5 h-3.5" />
        Stacked codes: {Math.min(codes, 3)} / 3 · AppSumo tier {tier}
      </p>
    </div>
  );
}
