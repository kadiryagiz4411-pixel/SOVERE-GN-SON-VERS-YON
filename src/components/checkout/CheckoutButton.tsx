import * as React from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Lemon Squeezy global type ────────────────────────────────────────────────

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Setup?: (opts?: unknown) => void;
      Url: {
        Open: (url: string) => void;
        Close: () => void;
      };
    };
  }
}

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
 */
export function buildLemonSqueezyUrl(baseUrl: string, userEmail?: string | null): string {
  if (!baseUrl || baseUrl === '#') return baseUrl;
  try {
    const url = new URL(baseUrl);
    const redirectBase = typeof window !== 'undefined' ? window.location.origin : 'https://sovereignapp.pro';
    url.searchParams.set('checkout[redirect_url]', `${redirectBase}/dashboard?payment=success`);
    if (userEmail) url.searchParams.set('checkout[email]', userEmail);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

/**
 * Opens a Lemon Squeezy hosted checkout from the *current* URL/variant.
 * Always call this on click — do not rely on a stale `.lemonsqueezy-button` bind.
 */
export function openLemonSqueezyCheckout(checkoutUrl: string, userEmail?: string | null): void {
  if (!checkoutUrl || checkoutUrl === '#') {
    console.error(
      '[LemonSqueezy] Missing checkout URL / variant ID. ' +
      'Set VITE_*_MONTHLY_VARIANT_ID / VITE_*_YEARLY_VARIANT_ID or VITE_LEMONSQUEEZY_*_URL.',
    );
    toast.error('Checkout is not configured for this plan. Please try again or contact support.');
    return;
  }

  // Append redirect + email params before opening
  const enrichedUrl = buildLemonSqueezyUrl(checkoutUrl, userEmail);

  try {
    const ready = ensureLemonSqueezyReady();
    if (ready && window.LemonSqueezy?.Url?.Open) {
      window.LemonSqueezy.Url.Open(enrichedUrl);
      return;
    }
    console.warn('[LemonSqueezy] Overlay not ready, opening checkout in a new tab', { enrichedUrl });
    window.open(enrichedUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.error('[LemonSqueezy] Checkout open failed', err, { enrichedUrl });
    try {
      window.open(enrichedUrl, '_blank', 'noopener,noreferrer');
    } catch (fallbackErr) {
      console.error('[LemonSqueezy] Fallback window.open also failed', fallbackErr);
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
    const [noticeOpen, setNoticeOpen] = React.useState(false);
    const isValidUrl = Boolean(href && href !== '#');

    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (!isValidUrl) {
        event.preventDefault();
        setNoticeOpen(true);
        console.error(
          '[LemonSqueezy] Missing checkout URL / variant ID. ' +
          'Set VITE_*_MONTHLY_VARIANT_ID / VITE_*_YEARLY_VARIANT_ID or VITE_LEMONSQUEEZY_*_URL.',
        );
        return;
      }
      if (overlay) {
        event.preventDefault();
        openLemonSqueezyCheckout(href); // redirect URL injected inside openLemonSqueezyCheckout
      }
    };

    return (
      <>
        <a
          ref={ref}
          href={isValidUrl ? href : '#'}
          target={isValidUrl && !overlay ? '_blank' : undefined}
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant, size }), className)}
          onClick={handleClick}
          {...props}
        >
          {children}
        </a>
        <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Checkout unavailable in this environment</DialogTitle>
              <DialogDescription>
                Lemon Squeezy checkout URLs or variant IDs are not configured for this plan.
                In local development this is expected if Stripe/Lemon Squeezy keys are missing.
                Set the VITE_LEMONSQUEEZY_* URL or variant ID env vars, then retry.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

CheckoutButton.displayName = 'CheckoutButton';
