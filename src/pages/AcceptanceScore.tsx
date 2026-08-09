import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ShieldCheck, Clock, Target, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { useEffect } from 'react';

const AcceptanceScorePage = () => {
  useEffect(() => {
    trackEvent('acceptance_score_page_view' as any);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-20 pb-16 md:pt-28 md:pb-20 max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs font-medium text-primary mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          Free · No login required
        </div>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
          Before You Apply Anywhere,{' '}
          <span className="text-primary">Check Your Acceptance Score</span>
        </h1>
        <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-xl">
          Most applications get rejected because of hidden structural and tonal mistakes. Fix them before you submit.
        </p>
        <LeadForm source="acceptance_score_hero" tag="lead_only" />
      </section>

      {/* Why This Matters */}
      <section className="bg-card border-t border-b border-border py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-10">Why This Matters</h2>
          <div className="space-y-6">
            {[
              { icon: AlertTriangle, color: 'text-red-400', text: '90% of applicants get rejected for fixable mistakes' },
              { icon: Clock, color: 'text-amber-400', text: 'Recruiters scan your application in seconds — first impression is everything' },
              { icon: Target, color: 'text-green-400', text: 'Small tone shifts dramatically impact acceptance rates' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="mt-0.5 shrink-0">
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <p className="text-muted-foreground text-sm md:text-base">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Soft CTA Repeat */}
      <section className="py-16 px-4 max-w-lg mx-auto text-center">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Ready to see your score?</h2>
        <p className="text-muted-foreground text-sm mb-8">Enter your email and get instant access.</p>
        <LeadForm source="acceptance_score_bottom" tag="lead_only" />
      </section>

      {/* Minimal footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Sovereign · <a href="/privacy" className="underline hover:text-foreground">Privacy</a> · <a href="/terms" className="underline hover:text-foreground">Terms</a>
      </footer>
    </div>
  );
};

// Reusable lead capture form
export const LeadForm = ({ source, tag }: { source: string; tag: string }) => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast({ title: 'Please accept the privacy terms', variant: 'destructive' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: 'Please enter a valid email', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('leads').upsert(
        { email: email.toLowerCase().trim(), source, tag, gdpr_consent: true },
        { onConflict: 'email' }
      );
      if (error) throw error;

      // Fire webhook (non-blocking)
      supabase.functions.invoke('email-webhook', {
        body: { event: 'lead_created', email: email.toLowerCase().trim(), tag, source },
      }).catch(() => {});

      trackEvent('lead_form_submit' as any, { label: source, value: tag });
      setSubmitted(true);
      toast({ title: '✅ Check your inbox!', description: 'Your acceptance score is on the way.' });
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center w-full max-w-md">
        <p className="text-primary font-semibold text-lg">🎉 You're in!</p>
        <p className="text-muted-foreground text-sm mt-1">We'll send your Acceptance Score shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" variant="gold" disabled={loading}>
          {loading ? '...' : 'Get Free Score'}
          {!loading && <ArrowRight className="ml-1 w-4 h-4" />}
        </Button>
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
        <span className="text-xs text-muted-foreground leading-tight">
          I agree to receive emails and understand I can unsubscribe anytime.
        </span>
      </label>
      <p className="text-[10px] text-muted-foreground/60 text-center">No spam. Unsubscribe anytime.</p>
    </form>
  );
};

export default AcceptanceScorePage;
