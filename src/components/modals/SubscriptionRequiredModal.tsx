import { Building2 } from 'lucide-react';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';
import { enterpriseCheckoutUrl } from '@/lib/b2bTrial';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SubscriptionRequiredModalProps {
  open: boolean;
}

export function SubscriptionRequiredModal({ open }: SubscriptionRequiredModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => { /* non-dismissible while on B2B routes */ }}>
      <DialogContent
        className="max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-5 h-5 text-amber-400" />
            Your 14-Day B2B Trial Has Ended
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-2">
            Your team workspace and candidate portfolios are safely saved. Subscribe to Enterprise
            to retain access.
          </DialogDescription>
        </DialogHeader>
        <CheckoutButton
          href={enterpriseCheckoutUrl()}
          overlay
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold border-0"
        >
          Subscribe to Enterprise — $239/mo
        </CheckoutButton>
      </DialogContent>
    </Dialog>
  );
}
