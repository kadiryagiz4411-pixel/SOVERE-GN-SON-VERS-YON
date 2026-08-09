import { useLanguage } from '@/i18n/LanguageContext';
import { MessageSquareX, Building2, Sliders, XCircle, Target, CheckCircle2 } from 'lucide-react';

export const WhyNotChatGPTSection = () => {
  const { t } = useLanguage();

  const painPoints = [
    {
      icon: Building2,
      text: t.whyNotChatGPT?.points?.[0] || 'Which companies you should apply to',
    },
    {
      icon: Sliders,
      text: t.whyNotChatGPT?.points?.[1] || 'How to adjust your tone per company',
    },
    {
      icon: XCircle,
      text: t.whyNotChatGPT?.points?.[2] || 'Why your applications are getting rejected',
    },
  ];

  return (
    <section className="py-24 bg-card relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-6">
              <MessageSquareX className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {t.whyNotChatGPT?.badge || 'The Real Question'}
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              {t.whyNotChatGPT?.title || "Can't I just use ChatGPT?"}
            </h2>
          </div>

          {/* Answer */}
          <div className="space-y-8">
            {/* You can */}
            <p className="text-2xl md:text-3xl text-center text-foreground font-medium">
              {t.whyNotChatGPT?.youCan || 'You can.'}
            </p>

            {/* But ChatGPT doesn't know */}
            <div className="bg-background/50 border border-border rounded-2xl p-8">
              <p className="text-lg text-muted-foreground mb-6">
                {t.whyNotChatGPT?.but || "But ChatGPT doesn't know:"}
              </p>
              
              <ul className="space-y-4">
                {painPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                      <point.icon className="w-5 h-5 text-destructive" />
                    </div>
                    <span className="text-lg text-foreground pt-1.5">• {point.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conclusion */}
            <div className="text-center space-y-6">
              <p className="text-lg md:text-xl text-muted-foreground">
                {t.whyNotChatGPT?.conclusion || 'Sovereign is trained for one thing: getting you accepted.'}
              </p>
              <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-2xl md:text-3xl font-bold text-gradient-gold">
                    {t.whyNotChatGPT?.sovereignDoes || 'Sovereign does.'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t.whyNotChatGPT?.tagline || 'Trained to get you accepted.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
