import * as React from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonProps } from '@/components/ui/button';

interface CheckoutButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

/**
 * Simple native <a> tag for external checkout links.
 * No onClick, no React Router, no JavaScript navigation — just a direct hyperlink.
 */
export const CheckoutButton = React.forwardRef<HTMLAnchorElement, CheckoutButtonProps>(
  ({ href, variant = 'default', size = 'default', className, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        target="_self"
        rel="noopener"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </a>
    );
  }
);

CheckoutButton.displayName = 'CheckoutButton';
