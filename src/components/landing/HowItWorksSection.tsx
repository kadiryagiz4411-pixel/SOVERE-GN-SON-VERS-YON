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
  <section className="relative overflow-hidden border-y border-zinc-800 bg-[#09090b] py-20">
    <div className="container mx-auto px-4">
      <div className="mb-10 flex items-end justify-between gap-6 border-b border-zinc-800 pb-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-amber-400">SYS.FLOW // 03</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 md:text-5xl">How It Works</h2>
        </div>
        <p className="hidden max-w-xs text-right text-sm text-zinc-500 md:block">Three steps. One engine.</p>
      </div>

      <div className="grid grid-cols-1 gap-px border border-zinc-800 bg-zinc-800 md:grid-cols-3">
        {STEPS.map(({ step, icon: Icon, title, description }) => (
          <div key={step} className="bg-[#09090b] p-6 transition-colors duration-150 hover:bg-zinc-900/60">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center border border-amber-500/40 bg-amber-500/10">
                <Icon className="h-4 w-4 text-amber-400" />
              </div>
              <span className="font-mono text-xs tracking-[0.2em] text-amber-400">{step}</span>
            </div>
            <h3 className="text-base font-medium text-zinc-100">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
