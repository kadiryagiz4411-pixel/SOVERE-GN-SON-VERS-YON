import * as React from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonProps } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import {
  attachAffiliateTracking,
  attachCheckoutIdentity,
  getBillingFallbackUrl,
  isBrokenCheckoutUrl,
  parseCheckoutTarget,
  sanitizeCheckoutUrl,
} from '@/lib/checkout';
import { createHostedCheckout } from '@/lib/billing/startCheckout';
import { getGuestState } from '@/lib/guestMode';

export function openHostedCheckout(
  checkoutUrl: string,
  userEmail?: string | null,
  userId?: string | null,
): void {
  const safeBase = isBrokenCheckoutUrl(checkoutUrl) ? getBillingFallbackUrl() : sanitizeCheckoutUrl(checkoutUrl);
  const enrichedUrl = attachAffiliateTracking(attachCheckoutIdentity(safeBase, userEmail, userId));
  const finalUrl = /^https?:\/\//i.test(enrichedUrl)
    ? enrichedUrl
    : (enrichedUrl.startsWith('/') ? enrichedUrl : getBillingFallbackUrl());

  try {
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.error('[Checkout] Open failed', err, { finalUrl });
    toast.error('Could not open checkout. Please disable your ad blocker and try again.');
  }
}

interface CheckoutButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  overlay?: boolean;
  planId?: string;
  billingCycle?: string;
}

export const CheckoutButton = React.forwardRef<HTMLAnchorElement, CheckoutButtonProps>(
  ({ href, variant = 'default', size = 'default', className, children, overlay = true, onClick, planId, billingCycle, ...props }, ref) => {
    const { user, session } = useSession();
    const [busy, setBusy] = React.useState(false);
    const inferred = parseCheckoutTarget(href);
    const resolvedPlanId = planId || inferred.planId || 'standard';
    const resolvedCycle = resolvedPlanId === 'single_pass'
      ? 'once'
      : (billingCycle || inferred.billingCycle || 'monthly');
    const safeHref = attachCheckoutIdentity(href || getBillingFallbackUrl(resolvedPlanId, resolvedCycle), user?.email, user?.id);

    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (!overlay) return;
      event.preventDefault();

      const open = (url: string) => openHostedCheckout(url, user?.email, user?.id);

      setBusy(true);
      void createHostedCheckout({
        userId: user?.id,
        email: user?.email,
        planId: resolvedPlanId,
        billingCycle: resolvedCycle,
        accessToken: session?.access_token,
        guestId: user ? undefined : getGuestState().id,
      })
        .then(open)
        .catch((err) => {
          console.warn('[Checkout] Hosted checkout failed', err);
          toast.error(err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
          open(safeHref);
        })
        .finally(() => setBusy(false));
    };

    return (
      <a
        ref={ref}
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant, size }), className, busy && 'opacity-70 pointer-events-none')}
        aria-busy={busy}
        onClick={handleClick}
        {...props}
      >
        {children}
      </a>
    );
  }
);

CheckoutButton.displayName = 'CheckoutButton';
