import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Share2, Copy, Check, Zap, Star, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/i18n/LanguageContext';

interface BonusCreditsBannerProps {
  userId: string;
  bonusCredits: number;
  dailyUsed: number;
  onCreditsUpdate: () => void;
}

const translations = {
  en: {
    bonusCredits: 'Bonus Credits',
    bonusLeft: 'bonus left',
    milestoneRule: 'Every 10 proposals → 5 free bonus',
    moreToNext: 'more to next reward',
    proposals: 'proposals',
    bonusAt: '+5 bonus at',
    shareEarn: 'Share & Earn',
    referrals: 'referral',
    referralsPlural: 'referrals',
    proEarned: 'Pro proposals earned',
    shareDesc: 'Share your link → friend signs up →',
    shareReward: 'you get 10 free Pro proposals',
    copySuccess: '🔗 Referral link copied!',
    copyDesc: 'Share it to earn 10 free Pro proposals per signup.',
    shareMsg: '🚀 I\'m using Sovereign AI to write winning job applications with AI. Try it free →',
    shareThx: '🎉 Thanks for sharing!',
    shareThxDesc: 'You\'ll earn 10 Pro proposals when someone signs up with your link.',
    perReferral: '10 Pro proposals per referral',
    instant: 'Instant activation',
    share: 'Share',
    inviteChallenge: 'Invite Challenge',
    inviteChallengeDesc: 'Invite 5 friends who subscribe → get 1 month Pro free!',
    subscribedReferrals: 'subscribed referrals',
    ofTarget: 'of 5 needed',
  },
  tr: {
    bonusCredits: 'Bonus Krediler',
    bonusLeft: 'bonus kaldı',
    milestoneRule: 'Her 10 teklif → 5 ücretsiz bonus',
    moreToNext: 'sonraki ödüle kalan',
    proposals: 'teklif',
    bonusAt: '+5 bonus',
    shareEarn: 'Paylaş ve Kazan',
    referrals: 'davet',
    referralsPlural: 'davet',
    proEarned: 'Pro teklif kazanıldı',
    shareDesc: 'Linkinizi paylaşın → arkadaşınız kayıt olsun →',
    shareReward: '10 ücretsiz Pro teklif kazanın',
    copySuccess: '🔗 Davet linki kopyalandı!',
    copyDesc: 'Her kayıt için 10 ücretsiz Pro teklif kazanmak için paylaşın.',
    shareMsg: '🚀 Sovereign AI ile kazandıran iş başvuruları yazıyorum. Ücretsiz dene →',
    shareThx: '🎉 Paylaştığınız için teşekkürler!',
    shareThxDesc: 'Birisi linkinizle kayıt olduğunda 10 Pro teklif kazanacaksınız.',
    perReferral: 'Davet başına 10 Pro teklif',
    instant: 'Anında aktivasyon',
    share: 'Paylaş',
    inviteChallenge: 'Davet Yarışması',
    inviteChallengeDesc: 'Abone olan 5 arkadaş davet edin → 1 ay ücretsiz Pro kazanın!',
    subscribedReferrals: 'abone olan davet',
    ofTarget: '/ 5 gerekli',
  },
  de: {
    bonusCredits: 'Bonus-Credits',
    bonusLeft: 'Bonus übrig',
    milestoneRule: 'Alle 10 Angebote → 5 Bonus gratis',
    moreToNext: 'bis zur nächsten Belohnung',
    proposals: 'Angebote',
    bonusAt: '+5 Bonus bei',
    shareEarn: 'Teilen & Verdienen',
    referrals: 'Empfehlung',
    referralsPlural: 'Empfehlungen',
    proEarned: 'Pro-Angebote verdient',
    shareDesc: 'Link teilen → Freund meldet sich an →',
    shareReward: 'Sie erhalten 10 kostenlose Pro-Angebote',
    copySuccess: '🔗 Empfehlungslink kopiert!',
    copyDesc: 'Teilen Sie ihn, um 10 kostenlose Pro-Angebote pro Anmeldung zu verdienen.',
    shareMsg: '🚀 Ich nutze Sovereign AI für überzeugende Bewerbungen. Probier es kostenlos →',
    shareThx: '🎉 Danke fürs Teilen!',
    shareThxDesc: 'Sie verdienen 10 Pro-Angebote, wenn sich jemand mit Ihrem Link anmeldet.',
    perReferral: '10 Pro-Angebote pro Empfehlung',
    instant: 'Sofortige Aktivierung',
    share: 'Teilen',
    inviteChallenge: 'Einladungs-Challenge',
    inviteChallengeDesc: '5 Freunde einladen, die abonnieren → 1 Monat Pro gratis!',
    subscribedReferrals: 'abonnierte Empfehlungen',
    ofTarget: 'von 5 benötigt',
  },
  fr: {
    bonusCredits: 'Crédits Bonus',
    bonusLeft: 'bonus restants',
    milestoneRule: 'Toutes les 10 propositions → 5 bonus gratuits',
    moreToNext: 'avant la prochaine récompense',
    proposals: 'propositions',
    bonusAt: '+5 bonus à',
    shareEarn: 'Partagez et Gagnez',
    referrals: 'parrainage',
    referralsPlural: 'parrainages',
    proEarned: 'propositions Pro gagnées',
    shareDesc: 'Partagez votre lien → un ami s\'inscrit →',
    shareReward: 'vous gagnez 10 propositions Pro gratuites',
    copySuccess: '🔗 Lien de parrainage copié !',
    copyDesc: 'Partagez-le pour gagner 10 propositions Pro gratuites par inscription.',
    shareMsg: '🚀 J\'utilise Sovereign AI pour écrire des candidatures gagnantes. Essayez gratuitement →',
    shareThx: '🎉 Merci d\'avoir partagé !',
    shareThxDesc: 'Vous gagnerez 10 propositions Pro quand quelqu\'un s\'inscrit avec votre lien.',
    perReferral: '10 propositions Pro par parrainage',
    instant: 'Activation instantanée',
    share: 'Partager',
    inviteChallenge: 'Défi d\'invitation',
    inviteChallengeDesc: 'Invitez 5 amis qui s\'abonnent → 1 mois Pro gratuit !',
    subscribedReferrals: 'parrainages abonnés',
    ofTarget: 'sur 5 requis',
  },
};

export const BonusCreditsBanner = ({
  userId,
  bonusCredits,
  dailyUsed,
  onCreditsUpdate,
}: BonusCreditsBannerProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralCount, setReferralCount] = useState(0);
  const [subscribedReferralCount, setSubscribedReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferralData = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      }

      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', userId);

      setReferralCount(count || 0);

      // Count subscribed referrals
      const { count: subCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', userId)
        .eq('referred_subscribed', true);

      setSubscribedReferralCount(subCount || 0);
      setLoading(false);
    };

    fetchReferralData();
  }, [userId]);

  const referralLink = `${window.location.origin}/auth?mode=signup&ref=${referralCode}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: t.copySuccess,
      description: t.copyDesc,
    });
  };

  const handleShareToSocial = async () => {
    const shareText = `${t.shareMsg} ${referralLink}`;
    if (navigator.share) {
      await navigator.share({ text: shareText, url: referralLink });
    } else {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
        '_blank'
      );
    }
    toast({
      title: t.shareThx,
      description: t.shareThxDesc,
    });
  };

  if (loading) return null;

  const milestoneNext = Math.ceil((dailyUsed + 1) / 10) * 10;
  const progressToMilestone = ((dailyUsed % 10) / 10) * 100;
  const nextBonusAt = 10 - (dailyUsed % 10);
  const inviteProgress = Math.min(subscribedReferralCount, 5);

  return (
    <div className="space-y-3">
      {/* Milestone Progress Card */}
      <div className="bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">{t.bonusCredits}</span>
          {bonusCredits > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <Zap className="w-3 h-3" />
              {bonusCredits} {t.bonusLeft}
            </span>
          )}
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{t.milestoneRule}</span>
            <span className="text-primary font-medium">{nextBonusAt} {t.moreToNext}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressToMilestone}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{dailyUsed % 10}/10 {t.proposals}</span>
            <span className="text-amber-500 font-medium">🎁 {t.bonusAt} {milestoneNext}</span>
          </div>
        </div>
      </div>

      {/* Invite Challenge Card */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-primary/10 border border-emerald-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-foreground">{t.inviteChallenge}</span>
          {inviteProgress >= 5 && (
            <span className="ml-auto text-xs text-emerald-500 font-bold">✅ Completed!</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t.inviteChallengeDesc}</p>
        <div className="mb-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{inviteProgress} {t.subscribedReferrals}</span>
            <span className="text-emerald-500 font-medium">{inviteProgress} {t.ofTarget}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-primary rounded-full transition-all duration-500"
              style={{ width: `${(inviteProgress / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Referral Card */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{t.shareEarn}</span>
          {referralCount > 0 && (
            <span className="ml-auto text-xs text-green-500 font-medium">
              {referralCount} {referralCount > 1 ? t.referralsPlural : t.referrals} · +{referralCount * 10} {t.proEarned}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {t.shareDesc} <strong className="text-foreground">{t.shareReward}</strong>
        </p>

        {referralCode && (
          <div className="flex gap-2">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground truncate border border-border">
              {referralLink}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopyLink} className="shrink-0">
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </Button>
            <Button size="sm" variant="gold" onClick={handleShareToSocial} className="shrink-0">
              <Share2 className="w-3 h-3 mr-1" />
              {t.share}
            </Button>
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500" />
            {t.perReferral}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-primary" />
            {t.instant}
          </span>
        </div>
      </div>
    </div>
  );
};
