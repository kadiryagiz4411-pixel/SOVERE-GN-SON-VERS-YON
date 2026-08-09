import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getCheckoutUrl } from '@/lib/plans';
import { Crown, Clock, Sparkles, Gift, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';

interface TrialBannerProps {
  userId: string;
  currentPlan: string;
  onTrialActivated: () => void;
}

export const TrialBanner = ({ userId, currentPlan, onTrialActivated }: TrialBannerProps) => {
  const [claimsCount, setClaimsCount] = useState<number | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trialInfo, setTrialInfo] = useState<{ expiresAt: Date | null; daysLeft: number } | null>(null);

  useEffect(() => {
    checkTrialStatus();
  }, [userId]);

  const checkTrialStatus = async () => {
    try {
      // Check existing trial
      const { data: trialData } = await supabase
        .from('trial_claims')
        .select('expires_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (trialData) {
        const expiresAt = new Date(trialData.expires_at);
        const now = new Date();
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft > 0) {
          setTrialInfo({ expiresAt, daysLeft });
        }
        setCanClaim(false);
      } else {
        // Check if can claim
        const { data: canClaimData } = await supabase.rpc('can_claim_trial', { _user_id: userId });
        setCanClaim(canClaimData || false);
      }

      // Get total claims count
      const { data: countData } = await supabase.rpc('get_trial_claims_count');
      setClaimsCount(countData || 0);
    } catch (err) {
      console.error('Error checking trial status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimTrial = async () => {
    setIsClaiming(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Insert trial claim
      const { error: claimError } = await supabase
        .from('trial_claims')
        .insert({
          user_id: userId,
          expires_at: expiresAt.toISOString(),
        });

      if (claimError) throw claimError;

      // Update profile to elite temporarily
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_plan: 'elite',
          trial_started_at: new Date().toISOString(),
          trial_claimed: true,
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast.success('🎉 7-day Elite trial activated!', {
        description: 'Enjoy all Elite features including outreach strategy for free.'
      });

      setTrialInfo({ expiresAt, daysLeft: 7 });
      setCanClaim(false);
      onTrialActivated();
    } catch (err) {
      console.error('Error claiming trial:', err);
      toast.error('Failed to activate trial. Please try again.');
    } finally {
      setIsClaiming(false);
    }
  };

  if (loading) return null;

  // If user already has a paid plan (not on trial), don't show banner
  if (currentPlan === 'elite' && !trialInfo) return null;
  if (currentPlan === 'pro' && !trialInfo) return null;

  // Active trial banner
  if (trialInfo && trialInfo.daysLeft > 0) {
    return (
      <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Elite Trial Active</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-medium">
                  {trialInfo.daysLeft} days left
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Full access to decision-maker targeting & outreach strategy. Upgrade to keep Elite forever.
              </p>
            </div>
          </div>
          <CheckoutButton href={getCheckoutUrl('elite')} variant="gold" size="sm">
            <Crown className="w-4 h-4 mr-2" />
            Go Elite — $39/mo
          </CheckoutButton>
        </div>
      </div>
    );
  }

  // Claim trial banner (only for first 100 users)
  if (canClaim && (currentPlan === 'free' || currentPlan === 'pro')) {
    const spotsLeft = 100 - (claimsCount || 0);
    
    return (
      <div className="bg-gradient-to-r from-amber-500/20 via-primary/20 to-amber-500/20 border border-amber-500/30 rounded-xl p-4 mb-6 animate-pulse-slow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">🎁 Early Adopter Bonus</span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 text-xs font-medium animate-pulse">
                  Only {spotsLeft} spots left!
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Get <span className="text-amber-500 font-medium">7 days of Elite free</span> — decision-maker targeting, outreach strategy & more
              </p>
            </div>
          </div>
          <Button 
            variant="gold" 
            size="sm" 
            onClick={handleClaimTrial}
            disabled={isClaiming}
          >
            {isClaiming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Crown className="w-4 h-4 mr-2" />
                Claim Free 7-Day Elite Trial
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
