import * as React from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonProps } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import {
  attachCheckoutIdentity,
  getLemonStoreUrl,
  isBrokenCheckoutUrl,
  sanitizeCheckoutUrl,
} from '@/lib/lemonsqueezy';

export function ensureLemonSqueezyReady(): boolean {
  try {
    if (typeof window.createLemonSqueezy === 'function') {
      window.createLemonSqueezy();
    }
    return typeof window.LemonSqueezy?.Url?.Open === 'function';
  } catch (err) {
    console.error('[LemonSqueezy] SDK init failed', err);
    return false;
  }
}

/**
 * Append Lemon Squeezy checkout parameters:
 *  - checkout[redirect_url] → /dashboard?payment=success
 *  - checkout[email]        → pre-fills the email field if provided
 *  - checkout[custom][user_id]
 */
export function buildLemonSqueezyUrl(
  baseUrl: string,
  userEmail?: string | null,
  userId?: string | null,
): string {
  return attachCheckoutIdentity(sanitizeCheckoutUrl(baseUrl), userEmail, userId);
}

/**
 * Opens a Lemon Squeezy hosted checkout from the *current* URL/variant.
 * Always call this on click — do not rely on a stale `.lemonsqueezy-button` bind.
 */
export function openLemonSqueezyCheckout(
  checkoutUrl: string,
  userEmail?: string | null,
  userId?: string | null,
): void {
  const safeBase = isBrokenCheckoutUrl(checkoutUrl) ? getLemonStoreUrl() : sanitizeCheckoutUrl(checkoutUrl);
  const enrichedUrl = buildLemonSqueezyUrl(safeBase, userEmail, userId);

  try {
    const ready = ensureLemonSqueezyReady();
    if (ready && window.LemonSqueezy?.Url?.Open) {
      window.LemonSqueezy.Url.Open(enrichedUrl);
      return;
    }
    console.warn('[LemonSqueezy] Overlay not ready, redirecting to checkout', { enrichedUrl });
    window.location.href = enrichedUrl;
  } catch (err) {
    console.error('[LemonSqueezy] Checkout open failed', err, { enrichedUrl });
    try {
      window.location.href = enrichedUrl;
    } catch (fallbackErr) {
      console.error('[LemonSqueezy] Fallback redirect also failed', fallbackErr);
      toast.error('Could not open checkout. Please disable your ad blocker and try again.');
    }
  }
}

interface CheckoutButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  /** Set to false to open in a new tab instead of the LS overlay */
  overlay?: boolean;
}

/**
 * Lemon Squeezy checkout link.
 * Click always uses the live `href` (monthly vs yearly) via Url.Open —
 * never a first-render overlay bind that can stick to the yearly variant.
 */
export const CheckoutButton = React.forwardRef<HTMLAnchorElement, CheckoutButtonProps>(
  ({ href, variant = 'default', size = 'default', className, children, overlay = true, onClick, ...props }, ref) => {
    const { user } = useSession();
    const safeHref = buildLemonSqueezyUrl(href, user?.email, user?.id);

    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (overlay) {
        event.preventDefault();
        openLemonSqueezyCheckout(href, user?.email, user?.id);
      }
    };

    return (
      <a
        ref={ref}
        href={safeHref}
        target={!overlay ? '_blank' : undefined}
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant, size }), className)}
        onClick={handleClick}
        {...props}
      >
        {children}
      </a>
    );
  }
);

CheckoutButton.displayName = 'CheckoutButton';
