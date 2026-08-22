import * as React from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonProps } from '@/components/ui/button';

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
 * Opens a Lemon Squeezy hosted checkout from the *current* URL/variant.
 * Always call this on click — do not rely on a stale `.lemonsqueezy-button` bind.
 */
export function openLemonSqueezyCheckout(checkoutUrl: string): void {
  if (!checkoutUrl || checkoutUrl === '#') {
    console.error(
      '[LemonSqueezy] Missing checkout URL / variant ID. ' +
      'Set VITE_*_MONTHLY_VARIANT_ID / VITE_*_YEARLY_VARIANT_ID or VITE_LEMONSQUEEZY_*_URL.',
    );
    toast.error('Checkout is not configured for this plan. Please try again or contact support.');
    return;
  }

  try {
    const ready = ensureLemonSqueezyReady();
    if (ready && window.LemonSqueezy?.Url?.Open) {
      window.LemonSqueezy.Url.Open(checkoutUrl);
      return;
    }
    console.warn('[LemonSqueezy] Overlay not ready, opening checkout in a new tab', { checkoutUrl });
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.error('[LemonSqueezy] Checkout open failed', err, { checkoutUrl });
    try {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
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
    const isValidUrl = Boolean(href && href !== '#');

    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (!isValidUrl) {
        event.preventDefault();
        openLemonSqueezyCheckout(href);
        return;
      }
      if (overlay) {
        event.preventDefault();
        openLemonSqueezyCheckout(href);
      }
    };

    return (
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
    );
  }
);

CheckoutButton.displayName = 'CheckoutButton';
