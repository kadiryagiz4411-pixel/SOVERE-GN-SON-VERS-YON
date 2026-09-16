import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useB2BTrial } from '@/hooks/useB2BTrial';
import { cn } from '@/lib/utils';

interface StartB2BTrialButtonProps {
  size?: 'sm' | 'default';
  className?: string;
  label?: string;
}

export function StartB2BTrialButton({
  size = 'default',
  className,
  label = 'Start 14-Day Cardless B2B Trial',
}: StartB2BTrialButtonProps) {
  const { startTrial, starting, hasUsedTrial, hasEnterpriseAccess, isSuperAdmin } = useB2BTrial();

  if (isSuperAdmin || hasEnterpriseAccess) return null;

  return (
    <Button
      type="button"
      size={size}
      disabled={starting || hasUsedTrial}
      onClick={() => void startTrial()}
      className={cn(
        'bg-emerald-600 hover:bg-emerald-500 text-white border-0 font-semibold',
        className,
      )}
    >
      {starting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
      {hasUsedTrial ? 'Trial already used' : label}
    </Button>
  );
}
