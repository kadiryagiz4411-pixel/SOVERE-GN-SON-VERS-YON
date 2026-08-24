import { Link } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { COST_PER_ACTION } from '@/lib/credits';

interface InsufficientCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance?: number;
  actionLabel?: string;
}

export function InsufficientCreditsModal({
  open,
  onOpenChange,
  balance = 0,
  actionLabel = 'this AI action',
}: InsufficientCreditsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Not enough credits
          </DialogTitle>
          <DialogDescription>
            {actionLabel} costs exactly {COST_PER_ACTION} credits. You currently have {balance.toLocaleString()}.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Upgrade your plan or buy more credits to continue generating CVs, optimizations, and proposals.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button asChild className="flex-1">
            <Link to="/pricing" onClick={() => onOpenChange(false)}>
              Upgrade / Buy credits
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
