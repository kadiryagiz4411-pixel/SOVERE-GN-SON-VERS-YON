import { useEffect, useState } from 'react';
import { Key, PauseCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { WorkspaceModeSwitcher } from '@/components/ExtensionPopup';
import { fetchProfileByAuthId } from '@/lib/profileQuery';
import { saveEncryptedOpenAiKey, setAccountPaused } from '@/lib/ai-engine';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';
import { createCheckout } from '@/config/plans';
import { sanitizeCheckoutUrl } from '@/lib/checkout';

export function AccountEnginePanel({ userId }: { userId: string }) {
  const { hasBYOKAccess, user } = useSession();
  const [agencyMode, setAgencyMode] = useState(() => {
    try { return localStorage.getItem('sovereign.workspaceMode') === 'b2b'; } catch { return false; }
  });
  const [showByokKey, setShowByokKey] = useState(false);
  const [paused, setPaused] = useState(false);
  const [byokKey, setByokKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await fetchProfileByAuthId(userId,
      'subscription_status, encrypted_openai_key, subscription_tier, plan_type',
    );
    const row = (data ?? {}) as Record<string, unknown>;
    setPaused(Boolean(row.is_account_paused) || row.subscription_status === 'paused');
    const stored = String(row.encrypted_openai_key ?? row.custom_openai_key ?? '');
    setHasStoredKey(stored.length > 0);
  };

  useEffect(() => { void load(); }, [userId]);

  const upgradeHref = sanitizeCheckoutUrl(createCheckout('elite', 'monthly'));

  return (
    <div id="byok" className="mt-6 space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Upgrade plan</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Opens a secure Polar checkout with your account email for webhook matching.
          </p>
        </div>
        <CheckoutButton href={upgradeHref} planId="elite" billingCycle="monthly" className="w-full">
          Upgrade subscription
        </CheckoutButton>
      </div>

      {hasBYOKAccess ? (
        <div className="rounded-xl border border-amber-500/30 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold">Bring Your Own Key (BYOK)</h3>
            <span className="text-[10px] uppercase tracking-wide rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-2 py-0.5">
              UNLIMITED
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Elite and Enterprise can use your OpenAI key and skip credit deduction. {hasStoredKey ? 'A key is already saved.' : 'No key saved yet.'}
          </p>
          <div className="relative">
            <Input
              type={showByokKey ? 'text' : 'password'}
              autoComplete="off"
              placeholder="sk-..."
              value={byokKey}
              onChange={(e) => setByokKey(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              aria-label={showByokKey ? 'Hide key' : 'Show key'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowByokKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showByokKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
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
          Custom OpenAI key setup unlocks on Elite and Enterprise.
        </div>
      )}

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold text-amber-200">Workspace</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Switch between Personal and B2B Agency without leaving this page.
          </p>
        </div>
        <WorkspaceModeSwitcher
          value={agencyMode ? 'b2b' : 'b2c'}
          onChange={(next) => {
            const on = next === 'b2b';
            setAgencyMode(on);
            try { localStorage.setItem('sovereign.workspaceMode', next); } catch { /* ignore */ }
            toast.success(on ? 'Agency Mode on' : 'Personal mode on');
          }}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <PauseCircle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <Label htmlFor="freeze-account" className="text-sm font-semibold">Freeze / Pause account</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Temporarily lock generation without wiping credits, CRM, or knowledge-base data.
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
    </div>
  );
}
