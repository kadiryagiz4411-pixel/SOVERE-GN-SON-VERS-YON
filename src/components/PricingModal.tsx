/**
 * In-app upgrade modal for Polar subscription plans.
 */
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Star } from 'lucide-react';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';
import { createCheckout } from '@/config/plans';
import { sanitizeCheckoutUrl } from '@/lib/checkout';
import { formatUsd, PLAN_PRICES_USD } from '@/config/money';

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  highlightTier?: string;
  currentTier?: string;
}

export function PricingModal({ open, onClose, currentTier }: PricingModalProps) {
  const navigate = useNavigate();

  const onKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onKey]);

  if (!open) return null;

  const plans = [
    { id: 'standard' as const, label: 'Standard', price: PLAN_PRICES_USD.standard.monthly },
    { id: 'pro' as const, label: 'Pro', price: PLAN_PRICES_USD.pro.monthly },
    { id: 'elite' as const, label: 'Elite', price: PLAN_PRICES_USD.elite.monthly },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Upgrade Sovereign</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a monthly plan. Checkout is processed securely by Polar.
          </p>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-sm font-semibold">{plan.label}</p>
              <p className="text-lg font-bold">{formatUsd(plan.price)}/mo</p>
              {currentTier === plan.id ? (
                <p className="text-xs text-emerald-400">Current plan</p>
              ) : (
                <CheckoutButton
                  href={sanitizeCheckoutUrl(createCheckout(plan.id, 'monthly'))}
                  planId={plan.id}
                  billingCycle="monthly"
                  className="w-full text-xs"
                >
                  Choose {plan.label}
                </CheckoutButton>
              )}
            </div>
          ))}
        </div>
        <div className="px-6 pb-5 flex items-center justify-between gap-4 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>14-day money-back guarantee on subscriptions.</span>
          </div>
          <button
            type="button"
            onClick={() => { onClose(); navigate('/pricing'); }}
            className="text-xs text-primary hover:underline"
          >
            Compare all plans
          </button>
        </div>
      </div>
    </div>
  );
}

export default PricingModal;
