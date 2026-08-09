import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { exportCVAsPDF } from '@/lib/cvExport';
import { CVDiffViewer } from '@/components/dashboard/CVDiffViewer';
import { GuaranteeBadge } from '@/components/GuaranteeBadge';
import {
  Upload, FileText, PenTool, Loader2, Download, Sparkles,
  CheckCircle, Target, Copy, Check, TrendingUp, Lock, Unlock, AlertTriangle,
  GitCompare,
} from 'lucide-react';
import { toast } from 'sonner';

type Step = 'input' | 'teaser' | 'full' | 'diff';

interface TeaserResult {
  ats_score: number;
  visible_flaws: string[];
  hidden_flaws_count: number;
  total_flaws: number;
  top_strength: string;
}

interface CVOptimizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPlan?: string;
  creditsBalance?: number;
  onCreditsConsumed?: () => void;
}

export const CVOptimizerModal = ({
  open,
  onOpenChange,
  userPlan = 'free',
  creditsBalance = 0,
  onCreditsConsumed,
}: CVOptimizerModalProps) => {
  const { language } = useLanguage();
  const [step, setStep] = useState<Step>('input');
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('paste');
  const [cvText, setCvText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [teaserResult, setTeaserResult] = useState<TeaserResult | null>(null);
  const [optimizedCV, setOptimizedCV] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [injectedKeywords, setInjectedKeywords] = useState<string[]>([]);
  const [quantifiedBullets, setQuantifiedBullets] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPaid = userPlan !== 'free';
  const hasCredits = creditsBalance > 0;
  const canUnlock = isPaid || hasCredits;

  const txt = {
    title: language === 'tr' ? 'ATS CV Analiz & Optimize' : language === 'de' ? 'ATS CV Analyse & Optimierung' : 'ATS CV Analysis & Optimization',
    subtitle: language === 'tr' ? 'Ücretsiz ATS skorunuzu görün, tüm raporu açmak için 1 kredi' : language === 'de' ? 'Kostenloser ATS-Score, 1 Credit für vollständige Optimierung' : 'Free ATS score preview — 1 credit to unlock full rewrite',
    paste: language === 'tr' ? 'Yapıştır' : 'Paste',
    upload: language === 'tr' ? 'Dosya Yükle' : 'Upload',
    cvPlaceholder: language === 'tr' ? 'CV / Özgeçmiş metninizi yapıştırın...' : 'Paste your CV / Resume text here...',
    jdPlaceholder: language === 'tr' ? 'Hedef iş ilanını yapıştırın (opsiyonel ama önerilir)' : 'Paste the target job description here (optional but recommended)',
    targetRole: language === 'tr' ? 'Hedef pozisyon (opsiyonel)' : 'Target role (optional)',
    analyze: language === 'tr' ? 'Ücretsiz ATS Analizi Yap' : 'Run Free ATS Analysis',
    analyzing: language === 'tr' ? 'Analiz ediliyor...' : 'Analyzing...',
    unlockFull: language === 'tr' ? 'Tam Optimizasyonu Aç (1 kredi)' : 'Unlock Full Optimization (1 credit)',
    optimizing: language === 'tr' ? 'Optimize ediliyor...' : 'Optimizing...',
    downloadPDF: language === 'tr' ? 'PDF İndir' : 'Download PDF',
    downloadTxt: language === 'tr' ? 'TXT İndir' : 'Download TXT',
    result: language === 'tr' ? 'Optimize Edilmiş CV' : 'Optimized CV',
    copied: language === 'tr' ? 'Kopyalandı!' : 'Copied!',
    uploadHint: language === 'tr' ? 'PDF veya DOCX dosyası seçin' : 'Choose a PDF or DOCX file',
    noCredits: language === 'tr' ? 'Yetersiz kredi. Kredi satın alın veya plan yükseltin.' : 'Insufficient credits. Purchase credits or upgrade your plan.',
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      setCvText(await file.text());
      toast.success('File loaded!');
      return;
    }
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        const cleaned = (await file.text())
          .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u024F\u0400-\u04FF\u00C0-\u00FF\n\r\t ğüşıöçĞÜŞİÖÇ]/g, ' ')
          .replace(/\s{3,}/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        if (cleaned.length > 50) { setCvText(cleaned); toast.success('PDF loaded! Review the text.'); }
        else toast.error('Could not extract text from PDF. Please paste manually.');
      } catch { toast.error('Could not read PDF. Please paste the text.'); }
      return;
    }
    if (file.name.endsWith('.docx') || file.type.includes('wordprocessingml')) {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(file);
        const docXml = await zip.file('word/document.xml')?.async('string');
        if (docXml) {
          const text = docXml.replace(/<w:p[^>]*>/g, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
          if (text.length > 50) { setCvText(text); toast.success('DOCX loaded!'); }
          else toast.error('Could not extract text from DOCX.');
        }
      } catch { toast.error('Could not read DOCX. Please paste the text.'); }
      return;
    }
    toast.error('Unsupported file format');
  };

  const handleAnalyze = async () => {
    if (!cvText.trim() || cvText.trim().length < 50) {
      toast.error('Enter at least 50 characters');
      return;
    }
    setIsAnalyzing(true);
    setTeaserResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Please log in'); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ats-teaser`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            cvText: cvText.trim(),
            jobDescription: jobDescription.trim() || undefined,
            outputLanguage: language === 'tr' ? 'Turkish' : language === 'de' ? 'German' : language === 'fr' ? 'French' : 'English',
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) { toast.error(result.error || 'Analysis failed'); return; }
      setTeaserResult(result);
      setStep('teaser');
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUnlockFull = async () => {
    if (!canUnlock) { toast.error(txt.noCredits); return; }
    if (!cvText.trim()) return;
    setIsOptimizing(true);
    setOptimizedCV('');
    setScore(null);
    setImprovements([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Please log in'); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-cv`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            cvText: cvText.trim(),
            outputLanguage: language === 'tr' ? 'Turkish' : language === 'de' ? 'German' : language === 'fr' ? 'French' : 'English',
            targetRole: targetRole.trim() || undefined,
            jobDescription: jobDescription.trim() || undefined,
            consumeCredit: !isPaid,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) { toast.error(result.error || 'Optimization failed'); return; }
      setOptimizedCV(result.optimizedCV);
      setScore(result.score);
      setImprovements(result.improvements || []);
      setInjectedKeywords(result.injectedKeywords || []);
      setQuantifiedBullets(result.quantifiedBullets || 0);
      setStep('diff');
      if (!isPaid && onCreditsConsumed) onCreditsConsumed();
      toast.success('CV optimized!');
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(optimizedCV);
    setCopied(true);
    toast.success(txt.copied);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([optimizedCV], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `optimized-cv-${new Date().toISOString().slice(0, 10)}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    try {
      exportCVAsPDF(optimizedCV, `optimized-cv-${new Date().toISOString().slice(0, 10)}`, { isPaid: true, type: 'cv' });
    } catch { handleDownloadTxt(); }
  };

  const getScoreColor = (s: number) => s >= 80 ? 'text-green-500' : s >= 60 ? 'text-amber-500' : 'text-red-500';
  const getScoreBarColor = (s: number) => s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-amber-500' : 'bg-red-500';

  const handleReset = () => { setStep('input'); setTeaserResult(null); setOptimizedCV(''); setScore(null); setImprovements([]); setInjectedKeywords([]); setQuantifiedBullets(0); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            {txt.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{txt.subtitle}</p>
        </DialogHeader>

        {/* ── STEP 1: Input ── */}
        {step === 'input' && (
          <div className="space-y-4 mt-2">
            <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as 'paste' | 'upload')}>
              <TabsList className="w-full">
                <TabsTrigger value="paste" className="flex-1 gap-2"><PenTool className="w-4 h-4" />{txt.paste}</TabsTrigger>
                <TabsTrigger value="upload" className="flex-1 gap-2"><Upload className="w-4 h-4" />{txt.upload}</TabsTrigger>
              </TabsList>
              <TabsContent value="paste" className="mt-3">
                <Textarea placeholder={txt.cvPlaceholder} value={cvText} onChange={(e) => setCvText(e.target.value)} className="min-h-[180px] resize-none text-sm" />
              </TabsContent>
              <TabsContent value="upload" className="mt-3">
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground mb-1">{txt.uploadHint}</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, TXT — max 5MB</p>
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.doc" onChange={handleFileUpload} className="hidden" />
                </div>
                {cvText && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium text-foreground">File loaded — {cvText.length} chars</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{cvText.slice(0, 150)}...</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Job Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                <Target className="w-3 h-3 inline mr-1" />
                Job Description (optional — improves accuracy)
              </label>
              <Textarea placeholder={txt.jdPlaceholder} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="min-h-[100px] resize-none text-sm" />
            </div>

            {/* Target Role */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                <Target className="w-3 h-3 inline mr-1" />
                {txt.targetRole}
              </label>
              <Input placeholder="e.g. Frontend Developer, Marketing Manager" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="text-sm" />
            </div>

            <Button variant="gold" className="w-full" size="lg" onClick={handleAnalyze} disabled={isAnalyzing || !cvText.trim() || cvText.trim().length < 50}>
              {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{txt.analyzing}</> : <><Sparkles className="w-4 h-4 mr-2" />{txt.analyze}</>}
            </Button>

            <p className="text-center text-xs text-muted-foreground">Free preview • No credits used</p>
          </div>
        )}

        {/* ── STEP 2: Teaser Result ── */}
        {step === 'teaser' && teaserResult && (
          <div className="space-y-5 mt-2">
            {/* ATS Score */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  ATS Match Score
                </span>
                <span className={`text-3xl font-black ${getScoreColor(teaserResult.ats_score)}`}>
                  {teaserResult.ats_score}%
                </span>
              </div>
              <Progress value={teaserResult.ats_score} className={`h-2 ${getScoreBarColor(teaserResult.ats_score)}`} />
              {teaserResult.top_strength && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="text-green-500 font-medium">Strength:</span> {teaserResult.top_strength}
                </p>
              )}
            </div>

            {/* Visible Flaws */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                ATS Issues Found ({teaserResult.total_flaws} total)
              </h4>
              {teaserResult.visible_flaws.map((flaw, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-foreground">{flaw}</p>
                </div>
              ))}

              {/* Locked flaws */}
              {teaserResult.hidden_flaws_count > 0 && (
                <div className="relative">
                  {Array.from({ length: Math.min(teaserResult.hidden_flaws_count, 3) }).map((_, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border mb-2 select-none">
                      <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 3}</span>
                      <p className="text-sm text-transparent bg-muted-foreground/20 rounded select-none blur-[3px]">Hidden critical ATS issue placeholder text goes here</p>
                      <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]">
                    <div className="text-center px-4">
                      <Lock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs font-medium text-foreground">
                        {teaserResult.hidden_flaws_count} more critical issue{teaserResult.hidden_flaws_count > 1 ? 's' : ''} hidden
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Unlock CTA */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Unlock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Unlock Full CV Optimization</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get the fully rewritten, ATS-optimized CV + Cover Letter — fixes all {teaserResult.total_flaws} issues.
                  </p>
                </div>
              </div>

              {canUnlock ? (
                <Button variant="gold" className="w-full" size="lg" onClick={handleUnlockFull} disabled={isOptimizing}>
                  {isOptimizing
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{txt.optimizing}</>
                    : <><Sparkles className="w-4 h-4 mr-2" />{isPaid ? 'Rewrite Full CV' : txt.unlockFull}</>
                  }
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button variant="gold" className="w-full" size="lg" onClick={() => { onOpenChange(false); window.location.href = '/pricing'; }}>
                    <Lock className="w-4 h-4 mr-2" />
                    Unlock Full Optimization — $9 credit / $19 monthly
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">1 credit = 1 full CV rewrite • Monthly plan = unlimited rewrites</p>
                </div>
              )}
            </div>

            <Button variant="ghost" className="w-full" onClick={handleReset}>← Analyze a Different CV</Button>
          </div>
        )}

        {/* ── STEP 3: Diff View ── */}
        {step === 'diff' && (
          <div className="space-y-4 mt-2">
            {/* Score summary + improvements */}
            {score !== null && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Optimized CV Score
                  </span>
                  <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-3">
                  <div className={`h-2 rounded-full transition-all duration-700 ${getScoreBarColor(score)}`} style={{ width: `${score}%` }} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {improvements.map((imp, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />{imp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Diff Viewer */}
            <CVDiffViewer
              originalCV={cvText}
              optimizedCV={optimizedCV}
              originalScore={teaserResult?.ats_score ?? 0}
              optimizedScore={score ?? 0}
              injectedKeywords={injectedKeywords}
              quantifiedBullets={quantifiedBullets}
              isPaid={canUnlock}
              onUnlock={() => { window.location.href = '/pricing'; }}
            />

            {/* Guarantee badge */}
            <GuaranteeBadge />

            {/* Toggle to plain text */}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep('full')}>
              <FileText className="w-4 h-4 mr-2" />View Plain Optimized Text
            </Button>
          </div>
        )}

        {/* ── STEP 4: Full Optimized Plain Text ── */}
        {step === 'full' && (
          <div className="space-y-4 mt-2">
            {score !== null && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Optimized CV Score
                  </span>
                  <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-3">
                  <div className={`h-2 rounded-full transition-all duration-700 ${getScoreBarColor(score)}`} style={{ width: `${score}%` }} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {improvements.map((imp, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />{imp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground">{txt.result}</h3>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed max-h-[300px] overflow-y-auto">{optimizedCV}</div>
            </div>

            <div className="flex gap-2">
              <Button variant="gold" className="flex-1" onClick={handleDownloadPDF}><Download className="w-4 h-4 mr-2" />{txt.downloadPDF}</Button>
              <Button variant="outline" className="flex-1" onClick={handleDownloadTxt}><FileText className="w-4 h-4 mr-2" />{txt.downloadTxt}</Button>
            </div>

            <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep('diff')}>
              <GitCompare className="w-4 h-4 mr-2" />View Before/After Diff
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleReset}>← Optimize Another CV</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
