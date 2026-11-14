import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, PartyPopper } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { pollBillingActivation } from '@/lib/billing/pollActivation';

const UpgradeSuccess = () => {
  const [searchParams] = useSearchParams();
  const { session, refreshCredits } = useSession();
  const plan = searchParams.get('plan') || searchParams.get('kind') || 'single_pass';
  const checkoutId = searchParams.get('checkout_id') || searchParams.get('checkoutId') || '';
  const [message, setMessage] = useState('Activating your pass...');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void pollBillingActivation({
      accessToken: session?.access_token,
      checkoutId,
      onTick: (status) => {
        if (!cancelled) setMessage(status.message || 'Activating your pass...');
      },
    }).then((status) => {
      if (cancelled) return;
      setReady(Boolean(status.ready));
      setMessage(status.ready ? 'Your pass is active.' : (status.message || 'Payment received. Your pass will appear shortly.'));
      if (status.ready) void refreshCredits();
    });
    return () => { cancelled = true; };
  }, [checkoutId, session?.access_token, refreshCredits]);

  const planName = plan === 'elite' ? 'Elite'
    : plan === 'pro' ? 'Pro'
    : plan === 'standard' ? 'Standard'
    : plan === 'enterprise' ? 'Enterprise'
    : 'Single Pass';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-card border border-border rounded-2xl p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold">
              {ready ? <CheckCircle className="w-10 h-10 text-primary-foreground" /> : (
                <div className="h-10 w-10 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <PartyPopper className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                {ready ? `Welcome to Sovereign ${planName}` : 'Activating your pass...'}
              </h1>
            </div>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Link to="/dashboard">
              <Button variant="gold" className="w-full h-12">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeSuccess;
