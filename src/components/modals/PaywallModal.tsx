import { Link } from 'react-router-dom';
import { Crown, RefreshCw, Ticket, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APPSUMO_CREDIT_EXHAUSTED_MESSAGE } from '@/config/appsumo';
import type { PaywallKind } from '@/lib/paywall';

interface PaywallModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  kind?: Exclude<PaywallKind, 'none'>;
  dismissible?: boolean;
}

const COPY: Record<Exclude<PaywallKind, 'none'>, {
  title: string;
  body: string;
  cta: string;
  icon: typeof Crown;
}> = {
  saas_upgrade: {
    title: 'Upgrade your account',
    body: 'Your monthly credits are used up. Renew or upgrade to keep generating CVs, proposals, and extension scrapes.',
    cta: 'Upgrade Account',
    icon: Crown,
  },
  saas_renew: {
    title: 'Renew your subscription',
    body: 'Your plan has expired or payment did not go through. Renew to restore CV, proposal, and extension access.',
    cta: 'Renew Subscription',
    icon: RefreshCw,
  },
  appsumo_credits: {
    title: 'Monthly AppSumo credits reached',
    body: APPSUMO_CREDIT_EXHAUSTED_MESSAGE,
    cta: 'Upgrade AppSumo Tier',
    icon: Zap,
  },
};

export function PaywallModal({
  open,
  onOpenChange,
  kind = 'saas_upgrade',
  dismissible = true,
}: PaywallModalProps) {
  if (!open) return null;

  const copy = COPY[kind] ?? COPY.saas_upgrade;
  const Icon = copy.icon;
  const isAppsumo = kind === 'appsumo_credits';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => {
          if (dismissible) onOpenChange?.(false);
        }}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10">
          <Icon className="h-7 w-7 text-amber-300" />
        </div>
        <h2 className="text-center text-xl font-bold text-slate-50">{copy.title}</h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-400">{copy.body}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400">
            <Link to="/pricing" onClick={() => onOpenChange?.(false)}>
              {copy.cta}
            </Link>
          </Button>
          {isAppsumo && (
            <Button asChild variant="outline" className="w-full">
              <Link to="/redeem" onClick={() => onOpenChange?.(false)}>
                <Ticket className="mr-1.5 h-4 w-4" />
                Redeem a higher AppSumo code
              </Link>
            </Button>
          )}
          {dismissible && (
            <Button variant="ghost" className="w-full text-slate-400" onClick={() => onOpenChange?.(false)}>
              Not now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaywallModal;
