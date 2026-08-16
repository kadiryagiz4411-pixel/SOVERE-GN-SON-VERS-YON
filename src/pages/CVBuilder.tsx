import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { isPaidPlan, isElitePlan, getCheckoutUrl } from '@/lib/plans';
import { canGenerateCV, incrementCVGenerations, getCVGenerationsRemaining, getCVLimit, CV_EXTRA_PRICE, CV_EXTRA_CHECKOUT_URL } from '@/lib/cvCredits';
import { getDownloadsUsedToday, incrementDownloadsUsed, canDownloadWithoutWatermark, incrementFreePremiumDownloads, getFreePremiumDownloadsRemaining } from '@/lib/downloads';
import { exportCVAsPDF, exportCVAsDOCX } from '@/lib/cvExport';
import { MobileBottomNav, SwipeablePageWrapper } from '@/components/MobileBottomNav';
import { GatedButton } from '@/components/entitlements/FeatureGate';
import {
  Crown, FileText, Upload, PenTool, Loader2, Download, Lock,
  ArrowLeft, Sparkles, CheckCircle, XCircle, Target, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

const OUTPUT_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' },
  { code: 'et', name: 'Eesti', flag: '🇪🇪' },
  { code: 'lv', name: 'Latviešu', flag: '🇱🇻' },
  { code: 'lt', name: 'Lietuvių', flag: '🇱🇹' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
  { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
  { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'km', name: 'ខ្មែរ', flag: '🇰🇭' },
  { code: 'lo', name: 'ລາວ', flag: '🇱🇦' },
];

const CVBuilder = () => {
  const { t, language } = useLanguage();
  const cv = (t as any).cvBuilder || {} as any;
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedCV, setGeneratedCV] = useState('');
  const [acceptanceScore, setAcceptanceScore] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('form');
  const [showCVLimitModal, setShowCVLimitModal] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState('en');

  // Target fields
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Form mode fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [skills, setSkills] = useState('');
  const [certifications, setCertifications] = useState('');

  // Free text mode
  const [freeText, setFreeText] = useState('');

  // Upload mode
  const [uploadedText, setUploadedText] = useState('');

  const isPro = isPaidPlan(plan);
  const isElite = isElitePlan(plan);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }
      setUser(session.user);

      const { data: profile } = await supabase
        .from('profiles').select('subscription_plan, subscription_expires_at, full_name')
        .eq('user_id', session.user.id).maybeSingle();

      let userPlan = profile?.subscription_plan || 'free';
      if ((userPlan === 'pro' || userPlan === 'elite') && profile?.subscription_expires_at) {
        if (new Date() > new Date(profile.subscription_expires_at)) userPlan = 'free';
      }
      setPlan(userPlan);
      if (profile?.full_name) setFullName(profile.full_name);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleGenerate = async () => {
    // Check CV generation limit
    if (!canGenerateCV(plan)) {
      if (isElitePlan(plan)) {
        // Should never happen - elite is unlimited
      } else if (isPaidPlan(plan)) {
        // Pro user - offer $2.99 extra CV
        toast.error(
          language === 'tr' 
            ? `Günlük CV hakkınız doldu! $${CV_EXTRA_PRICE} ile ek CV oluşturabilir veya Elite\'e yükselterek sınırsız CV alabilirsiniz.`
            : `Daily CV limit reached! Get an extra CV for $${CV_EXTRA_PRICE} or upgrade to Elite for unlimited CVs.`,
          { duration: 8000 }
        );
        setShowCVLimitModal(true);
        return;
      } else {
        // Free user - suggest Pro
        toast.error(
          language === 'tr'
            ? 'Ücretsiz CV hakkınız doldu! Pro\'ya yükselterek günde 3 CV oluşturabilirsiniz.'
            : 'Free CV limit reached! Upgrade to Pro for 3 CVs per day.',
          { duration: 8000 }
        );
        setShowCVLimitModal(true);
        return;
      }
    }
    let mode: string;
    let existingCvText = '';
    const formData: Record<string, string> = {};

    if (activeTab === 'form') {
      mode = 'generate';
      if (!fullName.trim() && !experience.trim()) {
        toast.error(cv.errorMinName || 'Please fill in at least your name and experience');
        return;
      }
      formData.fullName = fullName;
      formData.email = email;
      formData.phone = phone;
      formData.location = location;
      formData.summary = summary;
      formData.experience = experience;
      formData.education = education;
      formData.skills = skills;
      formData.certifications = certifications;
    } else if (activeTab === 'freetext') {
      mode = 'generate-from-text';
      if (!freeText.trim() || freeText.trim().length < 30) {
        toast.error(cv.errorMinText || 'Please describe your background (min 30 characters)');
        return;
      }
      existingCvText = freeText;
    } else {
      mode = 'optimize';
      if (!uploadedText.trim() || uploadedText.trim().length < 50) {
        toast.error(cv.errorMinCV || 'Please paste your existing CV text (min 50 characters)');
        return;
      }
      existingCvText = uploadedText;
    }

    setGenerating(true);
    setGeneratedCV('');
    setAcceptanceScore(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error(cv.errorLogin || 'Please log in'); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cv`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode,
            targetRole,
            targetCompany,
            jobDescription: isPro ? jobDescription : '',
            outputLanguage,
            existingCvText,
            formData: activeTab === 'form' ? formData : undefined,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 429) toast.error('Rate limit — please wait and retry.');
        else if (response.status === 402) toast.error('AI credits exhausted.');
        else toast.error(err.error || 'Failed to generate CV');
        return;
      }

      const result = await response.json();
      setGeneratedCV(result.cv);
      if (result.acceptanceScore) setAcceptanceScore(result.acceptanceScore);
      incrementCVGenerations();
      toast.success(cv.successMsg || 'CV generated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(cv.errorGenFailed || 'CV generation failed. Please retry.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!generatedCV) return;
    const noWatermark = canDownloadWithoutWatermark(isPro || isElite);
    if (!isPro && !isElite && noWatermark) {
      incrementFreePremiumDownloads();
      const remaining = getFreePremiumDownloadsRemaining();
      toast.info(
        language === 'tr'
          ? `Filigransız indirme: ${remaining} hak kaldı`
          : `Watermark-free download: ${remaining} remaining`
      );
    }
    incrementDownloadsUsed();
    exportCVAsPDF(generatedCV, fullName || 'cv', {
      fullName,
      email,
      phone,
      location,
      isPaid: noWatermark,
      type: 'cv',
    });
    toast.success(cv.pdfDownloaded || 'PDF downloaded!');
  };

  const handleDownloadDOCX = async () => {
    if (!generatedCV) return;
    const noWatermark = canDownloadWithoutWatermark(isPro || isElite);
    if (!isPro && !isElite && noWatermark) {
      incrementFreePremiumDownloads();
      const remaining = getFreePremiumDownloadsRemaining();
      toast.info(
        language === 'tr'
          ? `Filigransız indirme: ${remaining} hak kaldı`
          : `Watermark-free download: ${remaining} remaining`
      );
    }
    incrementDownloadsUsed();
    await exportCVAsDOCX(generatedCV, fullName || 'cv', {
      fullName,
      email,
      phone,
      location,
      isPaid: noWatermark,
      type: 'cv',
    });
    toast.success(cv.docxDownloaded || 'DOCX downloaded!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(language === 'tr' ? 'Dosya çok büyük (max 5MB)' : 'File too large (max 5MB)');
      return;
    }

    // TXT files
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      setUploadedText(text);
      toast.success(cv.cvTextLoaded || 'CV text loaded!');
      return;
    }

    // PDF files - basic text extraction
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        const text = await file.text();
        const cleaned = text
          .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u024F\u0400-\u04FF\u00C0-\u00FF\n\r\t ğüşıöçĞÜŞİÖÇ]/g, ' ')
          .replace(/\s{3,}/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        if (cleaned.length > 50) {
          setUploadedText(cleaned);
          toast.success(language === 'tr' ? 'PDF yüklendi! Metni kontrol edin.' : 'PDF loaded! Please review the text.');
        } else {
          toast.error(language === 'tr' ? 'PDF\'den metin çıkarılamadı. Lütfen metni yapıştırın.' : 'Could not extract text from PDF. Please paste manually.');
        }
      } catch {
        toast.error(language === 'tr' ? 'PDF okunamadı.' : 'Could not read PDF.');
      }
      return;
    }

    // DOCX files - XML extraction via JSZip
    if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(file);
        const docXml = await zip.file('word/document.xml')?.async('string');
        if (docXml) {
          const text = docXml
            .replace(/<w:p[^>]*>/g, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          if (text.length > 50) {
            setUploadedText(text);
            toast.success(language === 'tr' ? 'DOCX yüklendi!' : 'DOCX loaded!');
          } else {
            toast.error(language === 'tr' ? 'DOCX\'den metin çıkarılamadı.' : 'Could not extract text from DOCX.');
          }
        }
      } catch {
        toast.error(language === 'tr' ? 'DOCX okunamadı.' : 'Could not read DOCX.');
      }
      return;
    }

    toast.error(language === 'tr' ? 'Desteklenmeyen dosya formatı. PDF, DOCX veya TXT kullanın.' : 'Unsupported format. Use PDF, DOCX, or TXT.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SwipeablePageWrapper>
      <div className="min-h-screen bg-background pb-24 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isElite ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-primary to-amber-600'
                }`}>
                  <FileText className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">{cv.title || 'CV Builder'}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                isElite ? 'bg-amber-500/20 text-amber-500'
                : isPro ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground'
              }`}>
                {isElite ? 'Elite' : isPro ? 'Pro' : 'Free'}
              </span>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Tier Info Banner */}
          <div className={`rounded-xl p-4 mb-6 border ${
            isElite ? 'bg-amber-500/5 border-amber-500/20' 
            : isPro ? 'bg-primary/5 border-primary/20'
            : 'bg-muted/50 border-border'
          }`}>
            <div className="flex items-start gap-3">
              <Sparkles className={`w-5 h-5 mt-0.5 ${isElite ? 'text-amber-500' : isPro ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {isElite ? cv.tierElite : isPro ? cv.tierPro : cv.tierFree}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const remaining = getCVGenerationsRemaining(plan);
                    if (remaining === 'unlimited') return language === 'tr' ? '♾️ Sınırsız CV oluşturma' : '♾️ Unlimited CV generation';
                    const limit = getCVLimit(plan);
                    return language === 'tr' 
                      ? `📄 ${remaining}/${limit} CV hakkı kaldı (bugün)`
                      : `📄 ${remaining}/${limit} CV credits remaining (today)`;
                  })()}
                </p>
                {!isPro && (
                  <button
                    type="button"
                    onClick={() => window.location.href = getCheckoutUrl('pro')}
                    className="text-xs text-primary hover:underline mt-1 inline-block text-left"
                  >
                    {cv.upgradeHint}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Target Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{cv.targetRole || 'Target Role'}</label>
              <Input
                placeholder="e.g. Senior Frontend Developer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {cv.targetCompany || 'Target Company'} {!isPro && <Lock className="w-3 h-3 inline text-muted-foreground" />}
              </label>
              <Input
                placeholder={isPro ? "e.g. Google" : (cv.proFeature || 'Pro feature')}
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                disabled={!isPro}
              />
            </div>
          </div>

          {/* Job Description (Pro+) */}
          {isPro && (
            <div className="mb-6">
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {cv.jobDescription || 'Job Description'} <span className="text-muted-foreground">({cv.jobDescHint || 'for tailored optimization'})</span>
              </label>
              <Textarea
                placeholder={t.dashboard.inputPlaceholder}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}

          {/* Language Selector — gated: Pro+ required for non-English */}
          <div className="mb-6">
            <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
              <Globe className="w-4 h-4" /> {cv.outputLanguage || 'Output Language'}
              {!isPro && (
                <span className="text-xs text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">🔒 Pro</span>
              )}
            </label>
            <Select
              value={outputLanguage}
              onValueChange={(val) => {
                if (val !== 'en' && !isPro) {
                  // Block non-English for free/standard users — show via GatedButton trigger
                  toast.error('Multi-language CV generation requires a Pro plan or higher.');
                  return;
                }
                setOutputLanguage(val);
              }}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {OUTPUT_LANGUAGES.map((l) => (
                  <SelectItem
                    key={l.code}
                    value={l.code}
                    disabled={l.code !== 'en' && !isPro}
                    className={l.code !== 'en' && !isPro ? 'opacity-40 cursor-not-allowed' : ''}
                  >
                    <span className="flex items-center gap-2">
                      <span>{l.flag}</span>
                      <span>{l.name}</span>
                      {l.code !== 'en' && !isPro && <span className="text-xs text-slate-600 ml-auto">🔒</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isPro && (
              <p className="text-xs text-slate-500 mt-1.5">
                Non-English CV generation requires{' '}
                <span className="text-violet-400 font-medium">Pro ($29/mo)</span> or higher.{' '}
                <a href="/settings/billing" className="underline hover:text-violet-300">Upgrade →</a>
              </p>
            )}
          </div>

          {/* Input Mode Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="form" className="flex items-center gap-2">
                <PenTool className="w-4 h-4" /> {cv.formTab || 'Form'}
              </TabsTrigger>
              <TabsTrigger value="freetext" className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> {cv.freeTextTab || 'Free Text'}
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {isPro ? (cv.optimizeTab || 'Optimize CV') : (cv.uploadTab || 'Upload')}
                {!isPro && <Lock className="w-3 h-3" />}
              </TabsTrigger>
            </TabsList>

            {/* Form Tab */}
            <TabsContent value="form" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{cv.fullName || 'Full Name'} *</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{cv.email || 'Email'}</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" type="email" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{cv.phone || 'Phone'}</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{cv.location || 'Location'}</label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="New York, NY" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{cv.summary || 'Professional Summary'}</label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief overview of your career..." className="min-h-[80px]" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{cv.experience || 'Experience'} *</label>
                <Textarea value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Company — Role — Dates&#10;• Key achievement 1&#10;• Key achievement 2" className="min-h-[150px]" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{cv.education || 'Education'}</label>
                <Textarea value={education} onChange={(e) => setEducation(e.target.value)} placeholder="University — Degree — Year" className="min-h-[80px]" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{cv.skills || 'Skills'}</label>
                <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="JavaScript, React, TypeScript, Node.js..." />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{cv.certifications || 'Certifications'}</label>
                <Input value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="AWS Certified, PMP, etc." />
              </div>
            </TabsContent>

            {/* Free Text Tab */}
            <TabsContent value="freetext" className="mt-4">
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder={cv.freeTextPlaceholder || 'Describe your background, experience, skills, and career goals...'}
                className="min-h-[300px]"
              />
            </TabsContent>

            {/* Upload/Optimize Tab */}
            <TabsContent value="upload" className="mt-4 space-y-4">
              {!isPro ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-3">{cv.uploadLocked || 'CV optimization is a Pro feature'}</p>
                  <CheckoutButton href={getCheckoutUrl('pro')} variant="gold" size="sm">
                    {t.pricing.pro.cta}
                  </CheckoutButton>
                </div>
              ) : (
                <>
                  <div className="border border-dashed border-border rounded-xl p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">{language === 'tr' ? 'PDF, DOCX veya TXT dosyası yükleyin' : 'Upload a PDF, DOCX, or TXT file'}</p>
                    <input type="file" accept=".txt,.pdf,.docx,.doc" onChange={handleFileUpload} className="hidden" id="cv-upload" />
                    <label htmlFor="cv-upload">
                      <Button variant="outline" size="sm" asChild><span>{cv.chooseFile || 'Choose File'}</span></Button>
                    </label>
                    {uploadedText && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border text-left">
                        <p className="text-xs font-medium text-green-500 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {language === 'tr' ? 'Dosya yüklendi' : 'File loaded'} — {uploadedText.length} {language === 'tr' ? 'karakter' : 'chars'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{uploadedText.slice(0, 150)}...</p>
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={uploadedText}
                    onChange={(e) => setUploadedText(e.target.value)}
                    placeholder={cv.pasteHint || 'Or paste your existing CV text here...'}
                    className="min-h-[250px]"
                  />
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant="gold"
            size="xl"
            className="w-full mb-8"
          >
            {generating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {cv.generating || 'Generating CV...'}</>
            ) : activeTab === 'upload' ? (
              <><Sparkles className="w-5 h-5" /> {cv.optimizeBtn || 'Optimize CV'}</>
            ) : (
              <><Sparkles className="w-5 h-5" /> {cv.generateBtn || 'Generate CV'}</>
            )}
          </Button>

          {/* Generated CV Output */}
          {generatedCV && (
            <div className="space-y-6">
              {/* Acceptance Score (Elite) */}
              {acceptanceScore && isElite && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-foreground">{cv.acceptanceScore || 'Acceptance Score'}</h3>
                    <span className={`text-2xl font-bold ml-auto ${
                      acceptanceScore.score >= 75 ? 'text-green-500' : acceptanceScore.score >= 50 ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {acceptanceScore.score}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {acceptanceScore.strengths?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-green-500 mb-2 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> {cv.strengths || 'Strengths'}
                        </p>
                        <ul className="space-y-1">
                          {acceptanceScore.strengths.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {acceptanceScore.weaknesses?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> {cv.weaknesses || 'Weaknesses'}
                        </p>
                        <ul className="space-y-1">
                          {acceptanceScore.weaknesses.map((w: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">• {w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {acceptanceScore.suggestions?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm font-medium text-primary mb-2">{cv.suggestions || 'Suggestions'}</p>
                      <ul className="space-y-1">
                        {acceptanceScore.suggestions.map((s: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">→ {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* CV Preview */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">{cv.generatedTitle || 'Generated CV'}</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                      <Download className="w-4 h-4 mr-1" /> {cv.downloadPDF || 'PDF'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadDOCX}>
                      <Download className="w-4 h-4 mr-1" /> {cv.downloadDOCX || 'DOCX'}
                    </Button>
                  </div>
                </div>
                <div className="bg-background rounded-lg p-5 border border-border whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed max-h-[600px] overflow-y-auto">
                  {generatedCV}
                </div>
              </div>

              {/* Elite Apply Section */}
              {isElite && targetCompany && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-foreground">{cv.optimizedApply || 'Optimized Apply'}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {cv.optimizedApplyDesc || 'Your CV has been optimized for'} {targetCompany}.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <Button variant="gold" onClick={handleDownloadPDF}>
                      <Download className="w-4 h-4 mr-1" /> {cv.downloadOptimized || 'Download Optimized CV (PDF)'}
                    </Button>
                    <Button variant="gold-outline" onClick={handleDownloadDOCX}>
                      <Download className="w-4 h-4 mr-1" /> DOCX
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <MobileBottomNav />

      {/* CV Limit Modal */}
      {showCVLimitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCVLimitModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {language === 'tr' ? 'CV Hakkınız Doldu' : 'CV Limit Reached'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'tr' 
                  ? 'Bugünkü CV oluşturma hakkınız tükendi.' 
                  : 'You\'ve used all your CV generation credits for today.'}
              </p>
            </div>

            <div className="space-y-3">
              {/* $2.99 extra CV option */}
              <a
                href={CV_EXTRA_CHECKOUT_URL}
                target="_top"
                rel="noreferrer"
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
              >
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {language === 'tr' ? `Ek CV Oluştur — $${CV_EXTRA_PRICE}` : `Get Extra CV — $${CV_EXTRA_PRICE}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'tr' ? 'Tek seferlik ödeme, hemen kullan' : 'One-time payment, use instantly'}
                  </p>
                </div>
                <ArrowLeft className="w-4 h-4 text-primary rotate-180" />
              </a>

              {/* Upgrade option */}
              {!isPro ? (
                <a
                  href={getCheckoutUrl('pro')}
                  target="_top"
                  rel="noreferrer"
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-primary bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-colors text-left"
                >
                  <Sparkles className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {language === 'tr' ? 'Pro\'ya Yükselt — Günde 3 CV' : 'Upgrade to Pro — 3 CVs/day'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'tr' ? 'Sınırsız başvuru + kabul skoru' : 'Unlimited proposals + acceptance score'}
                    </p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-primary rotate-180" />
                </a>
              ) : (
                <a
                  href={getCheckoutUrl('elite')}
                  target="_top"
                  rel="noreferrer"
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 hover:from-amber-500/20 hover:to-amber-500/10 transition-colors text-left"
                >
                  <Crown className="w-5 h-5 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {language === 'tr' ? 'Elite\'e Yükselt — Sınırsız CV' : 'Upgrade to Elite — Unlimited CVs'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'tr' ? 'Sınırsız CV + tam strateji paketi' : 'Unlimited CVs + full strategy package'}
                    </p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-amber-500 rotate-180" />
                </a>
              )}
            </div>

            <button 
              onClick={() => setShowCVLimitModal(false)}
              className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {language === 'tr' ? 'Kapat' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </SwipeablePageWrapper>
  );
};

export default CVBuilder;
