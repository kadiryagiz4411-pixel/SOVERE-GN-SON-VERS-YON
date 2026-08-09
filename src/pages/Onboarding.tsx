import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, ArrowLeft, Crown, Briefcase, TrendingUp, Target, Clock, Users, DollarSign, Globe, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Answer {
  questionId: string;
  value: string;
}

const Onboarding = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
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
  };

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

      await supabase
        .from('profiles')
        .update({
          onboarding_role: answers.role || null,
          onboarding_experience: answers.experience || null,
          onboarding_goal: answers.goal || null,
          onboarding_volume: answers.volume || null,
          onboarding_completed: true,
        })
        .eq('user_id', session.user.id);

      toast.success(language === 'tr' ? 'Profil oluşturuldu! 🎉' : 'Profile created! 🎉');
      navigate('/pricing?from=onboarding');
    } catch (err) {
      console.error(err);
      navigate('/pricing?from=onboarding');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', session.user.id);
    }
    navigate('/pricing?from=onboarding');
  };

  const Icon = currentQuestion.icon;
  const selectedValue = answers[currentQuestion.id];
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Sovereign</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {l.skip}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Step indicator */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <span className="text-xs font-medium text-primary">
                {l.step} {currentStep + 1} {l.of} {totalSteps}
              </span>
            </div>

            {/* Question header */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {currentQuestion.question}
            </h2>
            <p className="text-muted-foreground text-sm">{currentQuestion.subtitle}</p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedValue === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 group ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.2)]'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-card/80'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className={`text-lg mb-1 font-semibold ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{option.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mb-8">
            {l.questions.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'bg-primary w-6'
                    : idx < currentStep
                    ? 'bg-primary/50 w-3'
                    : 'bg-muted w-3'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-none"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {l.back}
              </Button>
            )}

            {isLastStep ? (
              <Button
                variant="gold"
                className="flex-1 h-12 text-base"
                onClick={handleFinish}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {l.finish}
              </Button>
            ) : (
              <Button
                variant="gold"
                className="flex-1 h-12 text-base"
                onClick={handleNext}
                disabled={!selectedValue}
              >
                {l.next}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          {!selectedValue && !isLastStep && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              {language === 'tr' ? 'Devam etmek için bir seçenek seçin' : 'Select an option to continue'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
