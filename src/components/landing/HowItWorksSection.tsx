import { Target, Cpu, Award } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: Target,
    title: 'Enter Role + Target',
    description: 'Paste the job listing or select your freelance platform and profession.',
  },
  {
    step: '02',
    icon: Cpu,
    title: 'AI Analyzes & Optimizes',
    description: 'Our engine matches your profile against the role, platform, and competition level.',
  },
  {
    step: '03',
    icon: Award,
    title: 'Get Score & Apply Smarter',
    description: 'See your acceptance probability, improvement suggestions, and apply with confidence.',
  },
];

export const HowItWorksSection = () => (
  <section className="py-20 bg-card relative overflow-hidden">
    {/* top gradient rule */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">How It Works</h2>
        <p className="text-lg text-muted-foreground">Three steps to a smarter application.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {STEPS.map(({ step, icon: Icon, title, description }) => (
          <div key={step} className="text-center group">
            {/* icon bubble */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5 group-hover:bg-amber-500/20 group-hover:border-amber-500/40 transition-all duration-300">
              <Icon className="w-6 h-6 text-amber-400" />
            </div>
            <div className="text-xs font-bold text-amber-400 mb-2 tracking-widest">{step}</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
