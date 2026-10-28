import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight, ArrowLeft, Crown, Briefcase, TrendingUp, Target, Clock, Users, DollarSign, Globe,
  Loader2, CheckCircle, Brain, Zap, LineChart,
} from 'lucide-react';
import { toast } from 'sonner';

interface Answer {
  questionId: string;
  value: string;
}

const RATIONALE_ICONS: Record<string, typeof Target> = {
  role: Briefcase,
  experience: Brain,
  goal: Zap,
  volume: LineChart,
  platform: Globe,
  rate: Target,
  industry: Users,
};

/** Strip pictographs so option cards stay typographic. */
function stripEmoji(label: string): string {
  return label
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

const Onboarding = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { markOnboardingComplete } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const txt = {
    en: {
      title: 'Let\'s Personalize Your Experience',
      subtitle: 'Answer a few quick questions so our AI can craft the perfect proposals for you.',
      step: 'Step',
      of: 'of',
      next: 'Next',
      back: 'Back',
      finish: 'Complete Setup',
      skip: 'Skip for now',
      questions: [
        {
          id: 'role',
          icon: Briefcase,
          question: 'What type of work are you looking for?',
          subtitle: 'This helps us tailor your proposal style',
          options: [
            { value: 'freelance', label: '🧑‍💻 Freelance / Contract', desc: 'Project-based remote work' },
            { value: 'fulltime', label: '💼 Full-time Employment', desc: 'Permanent positions' },
            { value: 'parttime', label: '⏰ Part-time / Remote', desc: 'Flexible arrangements' },
            { value: 'consulting', label: '📊 Consulting', desc: 'Expert advisory roles' },
          ],
        },
        {
          id: 'experience',
          icon: TrendingUp,
          question: 'How much professional experience do you have?',
          subtitle: 'We adjust the confidence level of your proposals based on this',
          options: [
            { value: '0-2', label: '🌱 0–2 years', desc: 'Just starting out' },
            { value: '3-5', label: '🚀 3–5 years', desc: 'Building momentum' },
            { value: '5-10', label: '⭐ 5–10 years', desc: 'Seasoned professional' },
            { value: '10+', label: '👑 10+ years', desc: 'Industry expert' },
          ],
        },
        {
          id: 'goal',
          icon: Target,
          question: 'What is your biggest challenge right now?',
          subtitle: 'We\'ll optimize your proposals to overcome this specific hurdle',
          options: [
            { value: 'responses', label: '📬 Getting responses', desc: 'Low reply rates' },
            { value: 'standout', label: '🏆 Standing out', desc: 'Too much competition' },
            { value: 'writing', label: '✍️ Writing proposals', desc: 'Takes too long' },
            { value: 'opportunities', label: '🎯 Finding right jobs', desc: 'Can\'t find good fits' },
          ],
        },
        {
          id: 'volume',
          icon: Clock,
          question: 'How many applications do you send per week?',
          subtitle: 'This helps us understand your workflow',
          options: [
            { value: '1-5', label: '🎯 1–5 per week', desc: 'Quality over quantity' },
            { value: '5-15', label: '⚡ 5–15 per week', desc: 'Active job seeker' },
            { value: '15-30', label: '🔥 15–30 per week', desc: 'High volume' },
            { value: '30+', label: '💪 30+ per week', desc: 'Full-time hustle' },
          ],
        },
        {
          id: 'platform',
          icon: Globe,
          question: 'Which platform do you use most?',
          subtitle: 'We optimize proposal format for each platform',
          options: [
            { value: 'upwork', label: '🟢 Upwork', desc: 'Largest freelance marketplace' },
            { value: 'linkedin', label: '🔵 LinkedIn', desc: 'Professional networking' },
            { value: 'fiverr', label: '💚 Fiverr', desc: 'Gig-based work' },
            { value: 'other', label: '🌐 Other / Multiple', desc: 'Various platforms' },
          ],
        },
        {
          id: 'rate',
          icon: DollarSign,
          question: 'What is your target hourly rate?',
          subtitle: 'We\'ll position your proposals at the right price point',
          options: [
            { value: 'under25', label: '💵 Under $25/hr', desc: 'Entry level competitive' },
            { value: '25-50', label: '💰 $25–$50/hr', desc: 'Mid-market rate' },
            { value: '50-100', label: '🥇 $50–$100/hr', desc: 'Premium positioning' },
            { value: '100+', label: '💎 $100+/hr', desc: 'Expert tier' },
          ],
        },
        {
          id: 'industry',
          icon: Users,
          question: 'What industry do you primarily work in?',
          subtitle: 'Industry-specific language makes proposals more compelling',
          options: [
            { value: 'tech', label: '💻 Tech / Software', desc: 'Development, AI, SaaS' },
            { value: 'design', label: '🎨 Design / Creative', desc: 'UI/UX, branding, art' },
            { value: 'marketing', label: '📣 Marketing / Content', desc: 'SEO, social, copy' },
            { value: 'other', label: '🏢 Business / Other', desc: 'Consulting, finance, etc.' },
          ],
        },
      ],
    },
    tr: {
      title: 'Deneyiminizi Kişiselleştirelim',
      subtitle: 'Yapay zekanın size mükemmel teklifler oluşturabilmesi için birkaç hızlı soruyu yanıtlayın.',
      step: 'Adım',
      of: '/',
      next: 'Devam',
      back: 'Geri',
      finish: 'Kurulumu Tamamla',
      skip: 'Şimdilik geç',
      questions: [
        {
          id: 'role',
          icon: Briefcase,
          question: 'Ne tür bir iş arıyorsunuz?',
          subtitle: 'Bu, teklif stilinizi özelleştirmemize yardımcı olur',
          options: [
            { value: 'freelance', label: '🧑‍💻 Serbest / Sözleşmeli', desc: 'Proje bazlı uzaktan çalışma' },
            { value: 'fulltime', label: '💼 Tam Zamanlı', desc: 'Kalıcı pozisyonlar' },
            { value: 'parttime', label: '⏰ Yarı Zamanlı / Uzaktan', desc: 'Esnek düzenlemeler' },
            { value: 'consulting', label: '📊 Danışmanlık', desc: 'Uzman danışmanlık rolleri' },
          ],
        },
        {
          id: 'experience',
          icon: TrendingUp,
          question: 'Ne kadar profesyonel deneyiminiz var?',
          subtitle: 'Buna göre tekliflerinizin güven seviyesini ayarlıyoruz',
          options: [
            { value: '0-2', label: '🌱 0–2 yıl', desc: 'Yeni başlıyorum' },
            { value: '3-5', label: '🚀 3–5 yıl', desc: 'Ivme kazanıyorum' },
            { value: '5-10', label: '⭐ 5–10 yıl', desc: 'Deneyimli profesyonel' },
            { value: '10+', label: '👑 10+ yıl', desc: 'Sektör uzmanı' },
          ],
        },
        {
          id: 'goal',
          icon: Target,
          question: 'Şu anda en büyük zorluğunuz nedir?',
          subtitle: 'Bu engeli aşmak için tekliflerinizi optimize edeceğiz',
          options: [
            { value: 'responses', label: '📬 Yanıt almak', desc: 'Düşük yanıt oranları' },
            { value: 'standout', label: '🏆 Sıyrılmak', desc: 'Çok fazla rekabet' },
            { value: 'writing', label: '✍️ Teklif yazmak', desc: 'Çok uzun sürüyor' },
            { value: 'opportunities', label: '🎯 Doğru işleri bulmak', desc: 'Uygun iş bulamıyorum' },
          ],
        },
        {
          id: 'volume',
          icon: Clock,
          question: 'Haftada kaç başvuru gönderiyorsunuz?',
          subtitle: 'Bu, iş akışınızı anlamamıza yardımcı olur',
          options: [
            { value: '1-5', label: '🎯 Haftada 1–5', desc: 'Kalite odaklı' },
            { value: '5-15', label: '⚡ Haftada 5–15', desc: 'Aktif iş arayan' },
            { value: '15-30', label: '🔥 Haftada 15–30', desc: 'Yüksek hacim' },
            { value: '30+', label: '💪 Haftada 30+', desc: 'Tam zamanlı çaba' },
          ],
        },
        {
          id: 'platform',
          icon: Globe,
          question: 'En çok hangi platformu kullanıyorsunuz?',
          subtitle: 'Her platform için teklif formatını optimize ediyoruz',
          options: [
            { value: 'upwork', label: '🟢 Upwork', desc: 'En büyük freelance pazarı' },
            { value: 'linkedin', label: '🔵 LinkedIn', desc: 'Profesyonel ağ' },
            { value: 'fiverr', label: '💚 Fiverr', desc: 'Gig bazlı iş' },
            { value: 'other', label: '🌐 Diğer / Birden Fazla', desc: 'Çeşitli platformlar' },
          ],
        },
        {
          id: 'rate',
          icon: DollarSign,
          question: 'Hedef saatlik ücretiniz nedir?',
          subtitle: 'Tekliflerinizi doğru fiyat noktasında konumlandıracağız',
          options: [
            { value: 'under25', label: '💵 $25\'in altında/saat', desc: 'Giriş seviyesi rekabetçi' },
            { value: '25-50', label: '💰 $25–$50/saat', desc: 'Orta piyasa ücreti' },
            { value: '50-100', label: '🥇 $50–$100/saat', desc: 'Premium konumlama' },
            { value: '100+', label: '💎 $100+/saat', desc: 'Uzman seviyesi' },
          ],
        },
        {
          id: 'industry',
          icon: Users,
          question: 'Öncelikli olarak hangi sektörde çalışıyorsunuz?',
          subtitle: 'Sektöre özgü dil teklifleri daha ikna edici yapar',
          options: [
            { value: 'tech', label: '💻 Teknoloji / Yazılım', desc: 'Geliştirme, AI, SaaS' },
            { value: 'design', label: '🎨 Tasarım / Yaratıcı', desc: 'UI/UX, marka, sanat' },
            { value: 'marketing', label: '📣 Pazarlama / İçerik', desc: 'SEO, sosyal, kopya' },
            { value: 'other', label: '🏢 İş / Diğer', desc: 'Danışmanlık, finans vb.' },
          ],
        },
      ],
    },
    de: {
      title: 'Personalisieren wir Ihre Erfahrung',
      subtitle: 'Beantworten Sie ein paar Fragen, damit die KI passende Angebote schreiben kann.',
      step: 'Schritt',
      of: 'von',
      next: 'Weiter',
      back: 'Zurück',
      finish: 'Einrichtung abschließen',
      skip: 'Vorerst überspringen',
      questions: [] as Array<{ id: string; icon: typeof Briefcase; question: string; subtitle: string; options: Array<{ value: string; label: string; desc: string }> }>,
    },
    fr: {
      title: 'Personnalisons votre expérience',
      subtitle: 'Répondez à quelques questions pour que l\'IA rédige des propositions adaptées.',
      step: 'Étape',
      of: 'sur',
      next: 'Suivant',
      back: 'Retour',
      finish: 'Terminer la configuration',
      skip: 'Passer pour l\'instant',
      questions: [] as Array<{ id: string; icon: typeof Briefcase; question: string; subtitle: string; options: Array<{ value: string; label: string; desc: string }> }>,
    },
  };
  txt.de.questions = txt.en.questions;
  txt.fr.questions = txt.en.questions;

  const l = txt[language as keyof typeof txt] || txt.en;
  const totalSteps = l.questions.length;
  const currentQuestion = l.questions[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleSelect = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Save ALL collected answers + mark onboarding complete.
      // The update uses user_id FK (not PK) to match fetchProfileByAuthId convention.
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_role: answers.role || null,
          onboarding_experience: answers.experience || null,
          onboarding_goal: answers.goal || null,
          onboarding_volume: answers.volume || null,
          onboarding_platform: answers.platform || null,
          onboarding_rate: answers.rate || null,
          onboarding_industry: answers.industry || null,
          onboarding_completed: true,
        })
        .eq('user_id', session.user.id);

      if (error) {
        // Try PK fallback in case the row is keyed by id not user_id
        await supabase
          .from('profiles')
          .update({
            onboarding_role: answers.role || null,
            onboarding_experience: answers.experience || null,
            onboarding_goal: answers.goal || null,
            onboarding_volume: answers.volume || null,
            onboarding_platform: answers.platform || null,
            onboarding_rate: answers.rate || null,
            onboarding_industry: answers.industry || null,
            onboarding_completed: true,
          })
          .eq('id', session.user.id);
      }

      // 1) Persist to localStorage so ProtectedRoute never re-gates this session.
      try { localStorage.setItem('sovereign_onboarding_done', 'true'); } catch { /**/ }

      // 2) Optimistically flip the SessionContext flag (synchronous, instant).
      markOnboardingComplete();

      // 3) Trigger async DB re-fetch so the context stays in sync long-term.
      window.dispatchEvent(new Event('sovereign:profile-updated'));

      toast.success(language === 'tr' ? 'Profil oluşturuldu! 🎉' : 'Profile created! 🎉');

      // 4) Hard navigation — bypasses React Router's pending state and any
      //    lingering ProtectedRoute render that could loop back to /onboarding.
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('[Onboarding] save error', err);
      // Even if save fails, never trap the user — unlock and hard-redirect.
      try { localStorage.setItem('sovereign_onboarding_done', 'true'); } catch { /**/ }
      markOnboardingComplete();
      window.location.href = '/dashboard';
    } finally {
      setIsSaving(false);
    }
  };

  const Icon = currentQuestion.icon;
  const selectedValue = answers[currentQuestion.id];
  const isLastStep = currentStep === totalSteps - 1;

  const stepCode = pad2(currentStep + 1);
  const totalCode = pad2(totalSteps);
  const RIcon = RATIONALE_ICONS[currentQuestion.id] || Icon;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center border border-amber-500/40 bg-amber-500/10">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Sovereign</span>
          </div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-amber-400">
            SYS.ONBOARD // STEP {stepCode} OF {totalCode}
          </p>
        </div>
        <div className="h-px bg-zinc-800">
          <div
            className="h-px bg-amber-400 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-3xl">
          <div className="mb-8 flex items-start gap-4 border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-amber-500/40 bg-amber-500/10">
              <RIcon className="h-4 w-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.22em] text-zinc-500">
                [{stepCode}/{totalCode}]
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50 md:text-[1.7rem]">
                {currentQuestion.question}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{currentQuestion.subtitle}</p>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-px border border-zinc-800 bg-zinc-800 sm:grid-cols-2">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedValue === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex items-start gap-4 bg-[#09090b] p-4 text-left transition-colors duration-150 ${
                    isSelected ? 'bg-amber-500/10' : 'hover:bg-zinc-900/70'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 h-4 w-4 shrink-0 border transition-colors duration-150 ${
                      isSelected ? 'border-amber-400 bg-amber-400' : 'border-zinc-600 bg-transparent'
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] tracking-[0.2em] text-amber-400/80">
                      OPT.{pad2(idx + 1)}
                    </span>
                    <span className="mt-1 block text-sm font-medium text-zinc-100">
                      {stripEmoji(option.label)}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{option.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-6 flex gap-1">
            {l.questions.map((_, idx) => (
              <div
                key={idx}
                className={`h-px flex-1 transition-colors duration-200 ${
                  idx <= currentStep ? 'bg-amber-400' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="h-11 rounded-lg border-zinc-700 bg-transparent text-zinc-200 hover:border-amber-500/50 hover:bg-zinc-900"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {l.back}
              </Button>
            )}

            {isLastStep ? (
              <Button
                variant="gold"
                className="h-11 flex-1 rounded-lg text-sm"
                onClick={handleFinish}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {l.finish}
              </Button>
            ) : (
              <Button
                variant="gold"
                className="h-11 flex-1 rounded-lg text-sm"
                onClick={handleNext}
                disabled={!selectedValue}
              >
                {l.next}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {!selectedValue && !isLastStep && (
            <p className="mt-3 text-center font-mono text-[11px] tracking-wide text-zinc-500">
              {language === 'tr' ? 'DEVAM ICIN BIR SECENEK SECIN' : language === 'de' ? 'OPTION WAEHLEN, UM FORTZUFAHREN' : language === 'fr' ? 'SELECTIONNEZ UNE OPTION' : 'SELECT AN OPTION TO CONTINUE'}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
