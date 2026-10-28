/**
 * LandingOnboardingMemory
 *
 * Pre-login 10-step progressive questionnaire. Answers are persisted to
 * localStorage under the key 'sovereign_pre_onboarding' so they survive
 * page refreshes and are synced to Supabase immediately after the user
 * registers or logs in via syncPreOnboardingMemory().
 *
 * Design: dark-theme card matching the rest of the landing page. Each step
 * shows one question at a time with animated progress bar and back/next navigation.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Globe,
  TrendingUp,
  Code2,
  DollarSign,
  Clock,
  MessageSquare,
  AlertCircle,
  Users,
  Target,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ── Storage key ─────────────────────────────────────────────────────────── */
export const PRE_ONBOARDING_STORAGE_KEY = 'sovereign_pre_onboarding';

/* ── Step definitions ───────────────────────────────────────────────────── */
interface Step {
  id: string;
  icon: React.ElementType;
  label: string;
  question: string;
  subtitle?: string;
  options: { value: string; label: string; emoji?: string }[];
}

const STEPS: Step[] = [
  {
    id: 'profession',
    icon: Briefcase,
    label: 'Profession',
    question: 'What is your primary profession or role?',
    subtitle: 'This helps us tailor your AI proposal engine.',
    options: [
      { value: 'software_developer', label: 'Software Developer', emoji: '💻' },
      { value: 'designer',           label: 'UI/UX Designer',     emoji: '🎨' },
      { value: 'writer',             label: 'Writer / Copywriter', emoji: '✍️' },
      { value: 'marketer',           label: 'Digital Marketer',   emoji: '📣' },
      { value: 'video_editor',       label: 'Video Editor',       emoji: '🎬' },
      { value: 'data_analyst',       label: 'Data Analyst / AI',  emoji: '📊' },
      { value: 'consultant',         label: 'Consultant / Coach',  emoji: '🧠' },
      { value: 'other',              label: 'Other',               emoji: '⚡' },
    ],
  },
  {
    id: 'platform_preference',
    icon: Globe,
    label: 'Platform',
    question: 'Which freelance platform do you use most?',
    subtitle: 'We optimize your proposals per platform algorithm.',
    options: [
      { value: 'upwork',      label: 'Upwork',      emoji: '🟢' },
      { value: 'fiverr',      label: 'Fiverr',      emoji: '🟡' },
      { value: 'toptal',      label: 'Toptal',      emoji: '🔵' },
      { value: 'freelancer',  label: 'Freelancer',  emoji: '🟠' },
      { value: 'linkedin',    label: 'LinkedIn',    emoji: '💼' },
      { value: 'direct',      label: 'Direct / Referrals', emoji: '🤝' },
      { value: 'multiple',    label: 'Multiple Platforms',  emoji: '🌐' },
      { value: 'other',       label: 'Other',               emoji: '⚡' },
    ],
  },
  {
    id: 'experience_level',
    icon: TrendingUp,
    label: 'Experience',
    question: 'What is your experience level?',
    subtitle: 'We adjust the tone and positioning of your proposals accordingly.',
    options: [
      { value: 'junior',    label: 'Junior  (0–2 yrs)',  emoji: '🌱' },
      { value: 'mid',       label: 'Mid     (2–5 yrs)',  emoji: '🚀' },
      { value: 'senior',    label: 'Senior  (5–10 yrs)', emoji: '⭐' },
      { value: 'expert',    label: 'Expert  (10+ yrs)',  emoji: '🏆' },
      { value: 'studio',    label: 'Small Studio',       emoji: '🏠' },
      { value: 'agency',    label: 'Agency',             emoji: '🏢' },
    ],
  },
  {
    id: 'tech_stack',
    icon: Code2,
    label: 'Tech Stack',
    question: 'What is your core tech stack or toolset?',
    subtitle: 'Used to match you with the right job listings and emphasize relevant skills.',
    options: [
      { value: 'react_node',   label: 'React / Node.js',   emoji: '⚛️' },
      { value: 'python_ai',    label: 'Python / AI / ML',  emoji: '🐍' },
      { value: 'figma_design', label: 'Figma / Design',    emoji: '🎨' },
      { value: 'wordpress',    label: 'WordPress / PHP',   emoji: '🔵' },
      { value: 'mobile',       label: 'iOS / Android',     emoji: '📱' },
      { value: 'data_bi',      label: 'Data / BI / SQL',   emoji: '📈' },
      { value: 'devops',       label: 'DevOps / Cloud',    emoji: '☁️' },
      { value: 'other',        label: 'Other / Multiple',  emoji: '⚡' },
    ],
  },
  {
    id: 'hourly_rate_target',
    icon: DollarSign,
    label: 'Rate',
    question: 'What is your target hourly rate?',
    subtitle: 'We filter and target jobs within your ideal range.',
    options: [
      { value: 'under_25',   label: 'Under $25/hr',    emoji: '💵' },
      { value: '25_50',      label: '$25 – $50/hr',    emoji: '💵' },
      { value: '50_100',     label: '$50 – $100/hr',   emoji: '💰' },
      { value: '100_150',    label: '$100 – $150/hr',  emoji: '💰' },
      { value: '150_plus',   label: '$150+/hr',        emoji: '🤑' },
      { value: 'project',    label: 'Fixed Project',   emoji: '📦' },
    ],
  },
  {
    id: 'availability',
    icon: Clock,
    label: 'Availability',
    question: 'How many hours per week are you available to work?',
    subtitle: 'We tag your proposals with the right availability signals.',
    options: [
      { value: 'part_time',  label: 'Part-time  (< 20 hrs)', emoji: '🕐' },
      { value: 'half_time',  label: 'Half-time   (20 hrs)',   emoji: '🕑' },
      { value: 'full_time',  label: 'Full-time   (40 hrs)',   emoji: '🕒' },
      { value: 'flexible',   label: 'Flexible / Project',     emoji: '🔄' },
    ],
  },
  {
    id: 'proposal_tone',
    icon: MessageSquare,
    label: 'Tone',
    question: 'Which proposal tone works best for you?',
    subtitle: 'Your AI engine will default to this writing style.',
    options: [
      { value: 'professional', label: 'Professional & Formal',  emoji: '🎩' },
      { value: 'friendly',     label: 'Friendly & Conversational', emoji: '😊' },
      { value: 'confident',    label: 'Bold & Confident',       emoji: '💪' },
      { value: 'consultative', label: 'Consultative & Strategic', emoji: '🧠' },
      { value: 'concise',      label: 'Short & Punchy',         emoji: '⚡' },
    ],
  },
  {
    id: 'main_pain_point',
    icon: AlertCircle,
    label: 'Pain Point',
    question: 'What is your biggest freelance bottleneck right now?',
    subtitle: 'We will prioritize solving this for you first.',
    options: [
      { value: 'no_responses',     label: 'Not getting responses',      emoji: '📭' },
      { value: 'low_rates',        label: 'Clients offering low rates',  emoji: '💸' },
      { value: 'proposal_writing', label: 'Struggling to write proposals', emoji: '✏️' },
      { value: 'competition',      label: 'Too much competition',        emoji: '⚔️' },
      { value: 'finding_jobs',     label: 'Finding the right jobs',      emoji: '🔍' },
      { value: 'client_quality',   label: 'Poor client quality',         emoji: '🚩' },
    ],
  },
  {
    id: 'work_mode',
    icon: Users,
    label: 'Work Mode',
    question: 'How do you typically operate?',
    subtitle: 'This shapes how your profile and proposals are positioned.',
    options: [
      { value: 'solo',          label: 'Solo Freelancer',    emoji: '🧑‍💻' },
      { value: 'studio',        label: 'Small Studio (2–5)', emoji: '🏠' },
      { value: 'agency',        label: 'Agency (5+)',         emoji: '🏢' },
      { value: 'subcontracting', label: 'Subcontracting',    emoji: '🤝' },
    ],
  },
  {
    id: 'primary_goal',
    icon: Target,
    label: 'Goal',
    question: 'What is your primary goal with Sovereign?',
    subtitle: 'This sets your AI strategy from day one.',
    options: [
      { value: 'more_responses',  label: 'Get more client responses',  emoji: '📬' },
      { value: 'higher_rates',    label: 'Land higher-paying clients',  emoji: '💎' },
      { value: 'save_time',       label: 'Save time on proposals',      emoji: '⏱️' },
      { value: 'win_rate',        label: 'Improve my win rate',         emoji: '🏆' },
      { value: 'scale_agency',    label: 'Scale my studio/agency',      emoji: '📈' },
      { value: 'automate',        label: 'Automate outreach fully',     emoji: '🤖' },
    ],
  },
];

/* ── Types ───────────────────────────────────────────────────────────────── */
export type PreOnboardingAnswers = Partial<Record<string, string>>;

/* ── Helper: persist to localStorage ────────────────────────────────────── */
function saveAnswers(answers: PreOnboardingAnswers) {
  try {
    localStorage.setItem(PRE_ONBOARDING_STORAGE_KEY, JSON.stringify(answers));
  } catch {
    // Ignore quota / privacy errors
  }
}

function loadAnswers(): PreOnboardingAnswers {
  try {
    const raw = localStorage.getItem(PRE_ONBOARDING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PreOnboardingAnswers) : {};
  } catch {
    return {};
  }
}

/* ── Component ───────────────────────────────────────────────────────────── */
interface Props {
  onComplete?: (answers: PreOnboardingAnswers) => void;
}

export const LandingOnboardingMemory: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<PreOnboardingAnswers>(() => loadAnswers());
  const [done, setDone]       = useState(false);

  const currentStep = STEPS[step];
  const total       = STEPS.length;
  const progress    = Math.round(((step + (answers[currentStep?.id] ? 1 : 0)) / total) * 100);
  const Icon        = currentStep?.icon;

  // Restore step from saved answers on mount
  useEffect(() => {
    const saved = loadAnswers();
    if (Object.keys(saved).length > 0) {
      setAnswers(saved);
      // Resume from last unanswered step
      const lastAnswered = STEPS.findIndex((s) => !saved[s.id]);
      setStep(lastAnswered === -1 ? STEPS.length - 1 : lastAnswered);
    }
  }, []);

  const selectOption = (value: string) => {
    const next = { ...answers, [currentStep.id]: value };
    setAnswers(next);
    saveAnswers(next);

    // Auto-advance to next step after brief pause
    setTimeout(() => {
      if (step < total - 1) {
        setStep((s) => s + 1);
      } else {
        setDone(true);
        onComplete?.(next);
      }
    }, 340);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  if (done) {
    return (
      <section className="py-20 bg-gradient-to-b from-background to-card relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto text-center"
          >
            <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-9 h-9 text-amber-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Your profile is ready
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              We've saved your preferences. Create a free account to unlock your personalized AI strategy.
            </p>
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8 gap-2"
              onClick={() => window.location.assign('/auth?mode=signup')}
            >
              <Sparkles className="w-4 h-4" />
              Create Free Account
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-background to-card relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 tracking-wide uppercase">
              Personalize Your AI
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Build Your Sovereign Profile
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Answer 10 quick questions so your AI engine knows exactly how to win clients for you.
          </p>
        </div>

        {/* Card */}
        <div className="max-w-2xl mx-auto">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Step {step + 1} of {total}
              </span>
              <span className="text-xs font-medium text-amber-400">{progress}% complete</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Step card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="rounded-2xl border border-border bg-card p-7 shadow-xl shadow-black/20"
            >
              {/* Step header */}
              <div className="flex items-start gap-4 mb-7">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  {Icon && <Icon className="w-5 h-5 text-amber-400" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-1">
                    {String(step + 1).padStart(2, '0')} — {currentStep.label}
                  </p>
                  <h3 className="text-lg font-semibold text-foreground leading-snug">
                    {currentStep.question}
                  </h3>
                  {currentStep.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1">{currentStep.subtitle}</p>
                  )}
                </div>
              </div>

              {/* Option grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {currentStep.options.map((opt) => {
                  const selected = answers[currentStep.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => selectOption(opt.value)}
                      className={cn(
                        'flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-200 border',
                        selected
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10'
                          : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground hover:border-muted-foreground/30',
                      )}
                    >
                      {opt.emoji && (
                        <span className="text-base leading-none shrink-0">{opt.emoji}</span>
                      )}
                      <span className="leading-tight">{opt.label}</span>
                      {selected && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400 ml-auto shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-5">
            <button
              onClick={goBack}
              disabled={step === 0}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            {/* Step dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    'rounded-full transition-all duration-200',
                    i === step
                      ? 'w-5 h-2 bg-amber-400'
                      : answers[STEPS[i].id]
                        ? 'w-2 h-2 bg-amber-500/50'
                        : 'w-2 h-2 bg-muted-foreground/30',
                  )}
                />
              ))}
            </div>

            <button
              onClick={() => answers[currentStep.id] && setStep((s) => Math.min(s + 1, total - 1))}
              disabled={!answers[currentStep.id] || step === total - 1}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Skip */}
          <p className="text-center text-xs text-muted-foreground/60 mt-6">
            Answers are saved locally and synced to your account after sign-up.
            <button
              onClick={() => {
                setDone(true);
                onComplete?.(answers);
              }}
              className="ml-1.5 underline underline-offset-2 hover:text-muted-foreground transition-colors"
            >
              Skip for now
            </button>
          </p>
        </div>
      </div>
    </section>
  );
};
