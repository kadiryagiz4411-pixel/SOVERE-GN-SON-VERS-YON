import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Sparkles, Clock, Users, ArrowRight, Zap, Timer, Flame } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Session } from '@supabase/supabase-js';

// Countdown timer hook
const useCountdown = (targetDate: Date) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

// Animated countdown digit component
const CountdownDigit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="relative">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 rounded-xl flex items-center justify-center overflow-hidden">
        <span 
          key={value}
          className="text-2xl md:text-3xl font-bold text-amber-500 animate-fade-in"
        >
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      {/* Glow effect */}
      <div className="absolute inset-0 bg-amber-500/10 rounded-xl blur-xl -z-10" />
    </div>
    <span className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{label}</span>
  </div>
);

export const TrialOfferSection = () => {
  const { language } = useLanguage();
  const [claimsCount, setClaimsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Set offer end date to 7 days from now (or a fixed date for campaign)
  const [offerEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 3); // Offer ends in 3 days for urgency
    date.setHours(23, 59, 59, 999);
    return date;
  });

  const countdown = useCountdown(offerEndDate);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [claimsResult, sessionResult] = await Promise.all([
          supabase.rpc('get_trial_claims_count'),
          supabase.auth.getSession(),
        ]);
        setClaimsCount(claimsResult.data || 0);
        setIsLoggedIn(!!sessionResult.data?.session);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const spotsLeft = 100 - (claimsCount || 0);
  const progressPercent = ((claimsCount || 0) / 100) * 100;

  // Don't show if all spots are taken
  if (!loading && spotsLeft <= 0) return null;

  const content = {
    en: {
      badge: 'Limited Time Offer',
      title: '7 Days of Elite — Completely Free',
      subtitle: 'Be one of the first 100 users to experience the full power of Sovereign Elite.',
      countdownTitle: 'Offer Ends In',
      time: { days: 'Days', hours: 'Hours', minutes: 'Mins', seconds: 'Secs' },
      urgency: 'spots filling fast',
      spotsLeft: 'left',
      usersClaimed: 'users claimed',
      features: [
        'Decision-maker identification',
        'Platform-ready outreach messages',
        'Full application strategy',
        'Visual acceptance charts',
      ],
      cta: 'Claim Your Free Elite Trial',
      noCard: 'No credit card required',
    },
    tr: {
      badge: 'Sınırlı Süre Teklifi',
      title: '7 Gün Elite — Tamamen Ücretsiz',
      subtitle: 'Sovereign Elite\'in tüm gücünü deneyimleyen ilk 100 kullanıcıdan biri olun.',
      countdownTitle: 'Teklife Kalan Süre',
      time: { days: 'Gün', hours: 'Saat', minutes: 'Dk', seconds: 'Sn' },
      urgency: 'yerler hızla doluyor',
      spotsLeft: 'yer kaldı',
      usersClaimed: 'kullanıcı aldı',
      features: [
        'Karar verici tanımlama',
        'Platform-hazır iletişim mesajları',
        'Tam başvuru stratejisi',
        'Görsel kabul grafikleri',
      ],
      cta: 'Ücretsiz Elite Denemenizi Alın',
      noCard: 'Kredi kartı gerekli değil',
    },
    de: {
      badge: 'Zeitlich begrenztes Angebot',
      title: '7 Tage Elite — Völlig kostenlos',
      subtitle: 'Gehören Sie zu den ersten 100 Nutzern, die die volle Leistung von Sovereign Elite erleben.',
      countdownTitle: 'Angebot endet in',
      time: { days: 'Tage', hours: 'Std', minutes: 'Min', seconds: 'Sek' },
      urgency: 'Plätze füllen sich schnell',
      spotsLeft: 'verbleibend',
      usersClaimed: 'Nutzer beansprucht',
      features: [
        'Entscheidungsträger-Identifikation',
        'Plattform-fertige Outreach-Nachrichten',
        'Vollständige Bewerbungsstrategie',
        'Visuelle Akzeptanzdiagramme',
      ],
      cta: 'Kostenlose Elite-Testversion',
      noCard: 'Keine Kreditkarte erforderlich',
    },
    fr: {
      badge: 'Offre limitée',
      title: '7 Jours de Elite — Entièrement Gratuit',
      subtitle: 'Faites partie des 100 premiers utilisateurs à découvrir toute la puissance de Sovereign Elite.',
      countdownTitle: "L'offre se termine dans",
      time: { days: 'Jours', hours: 'Heures', minutes: 'Min', seconds: 'Sec' },
      urgency: 'les places se remplissent vite',
      spotsLeft: 'restantes',
      usersClaimed: 'utilisateurs inscrits',
      features: [
        'Identification des décideurs',
        'Messages de prospection prêts',
        'Stratégie de candidature complète',
        'Graphiques de probabilité visuels',
      ],
      cta: 'Réclamez votre essai Elite gratuit',
      noCard: 'Aucune carte de crédit requise',
    },
  };

  const t = content[language] || content.en;

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-primary/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto max-w-5xl relative">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-500 text-sm font-semibold animate-pulse">
            <Gift className="w-4 h-4" />
            {t.badge}
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 text-xs flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {spotsLeft} {t.spotsLeft ?? 'left'}
            </span>
          </span>
        </div>

        {/* Main content */}
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Animated Countdown Timer */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Timer className="w-5 h-5 text-amber-500 animate-pulse" />
            <span className="text-sm font-medium text-amber-500 uppercase tracking-wider">
              {t.countdownTitle}
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-3 md:gap-6">
            <CountdownDigit value={countdown.days} label={t.time.days} />
            <span className="text-2xl font-bold text-amber-500/50 mt-[-20px]">:</span>
            <CountdownDigit value={countdown.hours} label={t.time.hours} />
            <span className="text-2xl font-bold text-amber-500/50 mt-[-20px]">:</span>
            <CountdownDigit value={countdown.minutes} label={t.time.minutes} />
            <span className="text-2xl font-bold text-amber-500/50 mt-[-20px]">:</span>
            <CountdownDigit value={countdown.seconds} label={t.time.seconds} />
          </div>
        </div>

        {/* Progress bar with urgency */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {claimsCount || 0} {t.usersClaimed}
            </span>
            <span className="flex items-center gap-1 text-red-500 font-medium animate-pulse">
              <Flame className="w-4 h-4" />
              {t.urgency}
            </span>
          </div>
          <div className="w-full h-4 bg-muted rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full transition-all duration-1000 relative"
              style={{ width: `${Math.max(progressPercent, 5)}%` }}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] -skew-x-12" />
            </div>
            {/* Pulse indicator at the end */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-500 rounded-full animate-ping"
              style={{ left: `calc(${Math.max(progressPercent, 5)}% - 6px)` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>0</span>
            <span className="text-amber-500 font-bold">{spotsLeft} {t.spotsLeft}</span>
            <span>100</span>
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {t.features.map((feature, i) => (
            <span 
              key={i} 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm text-foreground hover:border-amber-500/50 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              {feature}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to={isLoggedIn ? "/dashboard" : "/auth?mode=signup"}>
            <Button 
              variant="gold" 
              size="lg" 
              className="text-lg px-8 py-6 h-auto shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all group"
            >
              <Gift className="w-5 h-5 mr-2 group-hover:animate-bounce" />
              {t.cta}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-green-500" />
            {t.noCard}
          </p>
        </div>
      </div>
    </section>
  );
};
