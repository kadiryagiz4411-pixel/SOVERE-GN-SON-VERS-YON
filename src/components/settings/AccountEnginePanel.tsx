import { useEffect, useState } from 'react';
import { Key, PauseCircle, Ticket, Loader2, ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RedeemModal } from '@/components/auth/RedeemModal';
import { fetchProfileByAuthId } from '@/lib/profileQuery';
import { numericAppSumoTier, canUseFeature } from '@/lib/appsumoGating';
import { hasActiveAppSumoLicense } from '@/lib/displayTier';
import { saveEncryptedOpenAiKey, setAccountPaused } from '@/lib/ai-engine';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';
import { getCheckoutUrl } from '@/lib/lemonsqueezy';
import { APPSUMO_PRODUCT_URLS } from '@/config/appsumo';

export function AccountEnginePanel({ userId }: { userId: string }) {
  const { hasBYOKAccess, user } = useSession();
  const [codes, setCodes] = useState(0);
  const [tier, setTier] = useState(0);
  const [licensed, setLicensed] = useState(false);
  const [showByokKey, setShowByokKey] = useState(false);
  const [paused, setPaused] = useState(false);
  const [byokKey, setByokKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await fetchProfileByAuthId(userId,
      'appsumo_tier, appsumo_codes_count, appsumo_plan, is_appsumo, plan_tier, subscription_status, encrypted_openai_key, subscription_tier, plan_type',
    );
    const row = (data ?? {}) as Record<string, unknown>;
    setCodes(Number(row.appsumo_codes_count ?? 0));
    setTier(numericAppSumoTier(row));
    setLicensed(hasActiveAppSumoLicense({
      isAppsumo: row.is_appsumo === true || row.is_appsumo_user === true,
      appsumoLicenseKey: String(row.appsumo_license_key ?? row.appsumo_code ?? ''),
      appsumoCodesCount: Number(row.appsumo_codes_count ?? 0),
      appsumoPlan: String(row.appsumo_plan ?? ''),
      planType: String(row.plan_type ?? ''),
      subscriptionTier: String(row.subscription_tier ?? ''),
    }));
    setPaused(Boolean(row.is_account_paused) || row.subscription_status === 'paused');
    const stored = String(row.encrypted_openai_key ?? row.custom_openai_key ?? '');
    setHasStoredKey(stored.length > 0);
  };

  useEffect(() => { void load(); }, [userId]);

  const showByok = hasBYOKAccess || canUseFeature(tier, 'byok_setup');

  // LINK ROUTING RULES:
  // AppSumo LTD users  → exclusive AppSumo.com marketplace URLs (never LS checkout)
  // SaaS / non-AppSumo → exclusive Lemon Squeezy checkout URLs (never AppSumo)
  const isAppsumoUser = licensed;

  // AppSumo upgrade: direct them to the next AppSumo tier product page.
  // tier 1 → tier 2 (Pro), tier 2 → tier 3 (B2B/Agency), tier 3 → same max tier.
  const appsumoUpgradeHref = tier >= 2
    ? APPSUMO_PRODUCT_URLS.tier3
    : tier >= 1
      ? APPSUMO_PRODUCT_URLS.tier2
      : APPSUMO_PRODUCT_URLS.tier1;

  // SaaS upgrade: resolve from Lemon Squeezy checkout config.
  const saasUpgradeTier = 'tier_3'; // always direct SaaS users to the Elite tier default
  const saasUpgradeHref = getCheckoutUrl(saasUpgradeTier, user?.email, user?.id ?? userId);

  return (
    <div id="byok" className="mt-6 space-y-6">
      <RedeemModal
        userId={userId}
        initialCodesRedeemed={codes}
        byokUnlocked={tier >= 3}
        onSuccess={() => { void load(); }}
      />

      {/* AppSumo LTD users: always link to AppSumo.com — never LS checkout */}
      {isAppsumoUser ? (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Upgrade AppSumo tier</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              AppSumo LTD upgrades are purchased exclusively on AppSumo.com — not through Lemon Squeezy.
            </p>
          </div>
          {tier < 3 ? (
            <a
              href={appsumoUpgradeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              {tier >= 2 ? 'Upgrade to B2B / Agency on AppSumo' : 'Upgrade to Pro on AppSumo'}
            </a>
          ) : (
            <p className="text-xs text-emerald-400 font-medium">
              ✓ You are on the highest AppSumo tier (B2B / Agency).
            </p>
          )}
        </div>
      ) : (
        /* SaaS users: always use Lemon Squeezy checkout — never AppSumo */
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Upgrade plan</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Opens a Lemon Squeezy checkout with your account email pre-filled for webhook matching.
            </p>
          </div>
          <CheckoutButton href={saasUpgradeHref} overlay className="w-full">
            Upgrade subscription
          </CheckoutButton>
        </div>
      )}

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
            AppSumo Agency uses your OpenAI key and skips credit deduction. {hasStoredKey ? 'A key is already saved.' : 'No key saved yet.'}
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
          Custom OpenAI key setup unlocks on AppSumo Agency (stack 3 codes).
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
