import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ArrowRight, Crown, BarChart3 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// ============ EXIT INTENT MODAL (Email Capture) ============
export const ExitIntentModal = () => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const location = useLocation();

  const isPublicPage = ['/', '/pricing', '/features'].includes(location.pathname) ||
    location.pathname.startsWith('/get-hired') ||
    location.pathname.startsWith('/resume-for') ||
    location.pathname.startsWith('/ats-resume') ||
    location.pathname.startsWith('/best-resume') ||
    location.pathname.startsWith('/how-to-get');

  useEffect(() => {
    if (!isPublicPage || dismissed) return;
    const alreadyShown = sessionStorage.getItem('exit_intent_shown');
    const alreadyCaptured = localStorage.getItem('lead_captured');
    if (alreadyShown || alreadyCaptured) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5) {
        setShow(true);
        sessionStorage.setItem('exit_intent_shown', '1');
        trackEvent('exit_intent_shown');
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isPublicPage, dismissed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { toast({ title: 'Please accept the privacy terms', variant: 'destructive' }); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { toast({ title: 'Please enter a valid email', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      await supabase.from('leads').upsert(
        { email: email.toLowerCase().trim(), source: 'exit_intent_popup', tag: 'lead_popup', gdpr_consent: true },
        { onConflict: 'email' }
      );
      supabase.functions.invoke('email-webhook', {
        body: { event: 'lead_created', email: email.toLowerCase().trim(), tag: 'lead_popup', source: 'exit_intent_popup' },
      }).catch(() => {});
      trackEvent('popup_submit', { label: 'exit_intent', source: location.pathname });
      localStorage.setItem('lead_captured', '1');
      setSubmitted(true);
    } catch {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { setShow(false); setDismissed(true); }}
      />
      <div className="relative bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <button
          onClick={() => { setShow(false); setDismissed(true); }}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-7 h-7 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          Get Your Free Acceptance Optimization Checklist Before Applying
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Know exactly why applications fail and how to fix it — in seconds.
        </p>

        {submitted ? (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <p className="text-primary font-semibold">🎉 Check your inbox!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="flex items-start gap-2 cursor-pointer text-left">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
              <span className="text-xs text-muted-foreground">
                I agree to receive emails and can unsubscribe anytime.
              </span>
            </label>
            <Button variant="gold" className="w-full" size="lg" type="submit" disabled={loading}>
              {loading ? '...' : 'Send It To Me'}
              {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </form>
        )}
        <button
          onClick={() => { setShow(false); setDismissed(true); }}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground block w-full"
        >
          No thanks, I'll guess my chances
        </button>
      </div>
    </div>
  );
};
// ============ STICKY CTA BUTTON ============
export const StickyCTA = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isPublicPage = ['/', '/pricing', '/features'].includes(location.pathname) ||
    location.pathname.includes('get-hired') ||
    location.pathname.includes('resume-for') ||
    location.pathname.includes('ats-resume') ||
    location.pathname.includes('best-resume') ||
    location.pathname.includes('how-to-get');

  useEffect(() => {
    if (!isPublicPage) return;
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPublicPage]);

  if (!isPublicPage || !visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
      <Button
        variant="gold"
        size="lg"
        className="shadow-2xl shadow-primary/30 whitespace-nowrap pulse-glow"
        onClick={() => {
          trackEvent('cta_click', { label: 'sticky_mobile_cta', source: location.pathname });
          navigate('/auth?mode=signup');
        }}
      >
        <Crown className="w-4 h-4 mr-2" />
        Check My Acceptance Score
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );
};

// ============ DESKTOP STICKY CTA ============
export const DesktopStickyCTA = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isPublicPage = ['/', '/pricing', '/features'].includes(location.pathname) ||
    location.pathname.includes('get-hired') ||
    location.pathname.includes('resume-for') ||
    location.pathname.includes('ats-resume') ||
    location.pathname.includes('best-resume') ||
    location.pathname.includes('how-to-get');

  useEffect(() => {
    if (!isPublicPage) return;
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPublicPage]);

  if (!isPublicPage || !visible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 hidden md:block">
      <Button
        variant="gold"
        size="lg"
        className="shadow-2xl shadow-primary/30 whitespace-nowrap"
        onClick={() => {
          trackEvent('cta_click', { label: 'sticky_cta', source: location.pathname });
          navigate('/auth?mode=signup');
        }}
      >
        <Crown className="w-4 h-4 mr-2" />
        Get My Free Score
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );
};

// ============ SOCIAL PROOF COUNTER ============
export const SocialProofCounter = () => {
  const [count, setCount] = useState(12847);

  useEffect(() => {
    // Simulate real-time counter increment
    const interval = setInterval(() => {
      setCount((c) => c + Math.floor(Math.random() * 3));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 text-sm">
      <span className="flex -space-x-1">
      {['bg-primary', 'bg-secondary', 'bg-accent', 'bg-muted-foreground'].map((c, i) => (
          <div key={i} className={`w-5 h-5 rounded-full ${c} border-2 border-card`} />
        ))}
      </span>
      <span className="font-medium text-foreground">{count.toLocaleString()}</span>
      <span className="text-muted-foreground">applications analyzed</span>
    </div>
  );
};

// ============ ATS REJECTION STATS BLOCK ============
export const ATSRejectionBlock = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {[
      { stat: '75%', label: 'of resumes are rejected by ATS before a human reads them', color: 'text-red-500' },
      { stat: '6 sec', label: 'average time a recruiter spends on a resume that passes ATS', color: 'text-amber-500' },
      { stat: '89%', label: 'of Sovereign users report a higher callback rate within 30 days', color: 'text-green-500' },
    ].map((item) => (
      <div key={item.stat} className="bg-card border border-border rounded-xl p-5 text-center">
        <div className={`text-3xl font-black ${item.color} mb-2`}>{item.stat}</div>
        <p className="text-sm text-muted-foreground">{item.label}</p>
      </div>
    ))}
  </div>
);
