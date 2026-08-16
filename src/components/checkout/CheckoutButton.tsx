import * as React from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonProps } from '@/components/ui/button';

// ─── Lemon Squeezy global type ────────────────────────────────────────────────

declare global {
  interface Window {
    LemonSqueezy?: {
      Url: {
        Open: (url: string) => void;
        Close: () => void;
      };
    };
  }
}

// ─── Programmatic checkout helper ─────────────────────────────────────────────

/**
 * Opens a Lemon Squeezy hosted checkout.
 *
 * - Uses the LS overlay (`window.LemonSqueezy.Url.Open`) when the overlay
 *   script has loaded (preferred — keeps the user on the page).
 * - Falls back to `window.open` in a new tab when the script is absent
 *   (e.g. ad-blockers, SSR, or the script hasn't loaded yet).
 * - Silently no-ops when `checkoutUrl` is empty or `'#'`, logging a
 *   console warning so missing env vars are easy to spot during dev.
 */
export function openLemonSqueezyCheckout(checkoutUrl: string): void {
  if (!checkoutUrl || checkoutUrl === '#') {
    console.warn(
      '[Sovereign] Checkout URL not configured. ' +
      'Set the matching VITE_LEMONSQUEEZY_* environment variable.'
    );
    return;
  }
  if (window.LemonSqueezy) {
    window.LemonSqueezy.Url.Open(checkoutUrl);
  } else {
    window.open(checkoutUrl, '_blank');
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
 * Adding class "lemonsqueezy-button" causes the LS overlay script (loaded in index.html)
 * to intercept the click and open the hosted checkout as an in-page modal.
 * Falls back gracefully to a regular link if the script is not loaded.
 */
export const CheckoutButton = React.forwardRef<HTMLAnchorElement, CheckoutButtonProps>(
  ({ href, variant = 'default', size = 'default', className, children, overlay = true, ...props }, ref) => {
    const isValidUrl = href && href !== '#';
    return (
      <a
        ref={ref}
        href={isValidUrl ? href : '#'}
        target={isValidUrl && !overlay ? '_blank' : '_self'}
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant, size }),
          overlay && isValidUrl ? 'lemonsqueezy-button' : '',
          className,
        )}
        onClick={!isValidUrl ? (e) => e.preventDefault() : undefined}
        {...props}
      >
        {children}
      </a>
    );
  }
);

CheckoutButton.displayName = 'CheckoutButton';
