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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { exportCVAsPDF } from '@/lib/cvExport';
import {
  Upload, FileText, PenTool, Loader2, Download, Sparkles,
  CheckCircle, Target, Copy, Check, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface CVOptimizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CVOptimizerModal = ({ open, onOpenChange }: CVOptimizerModalProps) => {
  const { language } = useLanguage();
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('paste');
  const [cvText, setCvText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [optimizedCV, setOptimizedCV] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const txt = {
    title: language === 'tr' ? 'CV Optimize Et' : language === 'de' ? 'CV Optimieren' : language === 'fr' ? 'Optimiser le CV' : 'Optimize Your CV',
    subtitle: language === 'tr' ? 'CV\'nizi yapıştırın veya yükleyin, AI optimize etsin' : language === 'de' ? 'CV einfügen oder hochladen, KI optimiert' : language === 'fr' ? 'Collez ou téléchargez votre CV, l\'IA l\'optimise' : 'Paste or upload your CV, AI optimizes it',
    paste: language === 'tr' ? 'Yapıştır' : language === 'de' ? 'Einfügen' : language === 'fr' ? 'Coller' : 'Paste',
    upload: language === 'tr' ? 'Dosya Yükle' : language === 'de' ? 'Datei hochladen' : language === 'fr' ? 'Télécharger' : 'Upload File',
    placeholder: language === 'tr' ? 'CV / Özgeçmiş metninizi buraya yapıştırın...' : language === 'de' ? 'CV-Text hier einfügen...' : language === 'fr' ? 'Collez votre CV ici...' : 'Paste your CV / Resume text here...',
    targetRole: language === 'tr' ? 'Hedef pozisyon (opsiyonel)' : language === 'de' ? 'Zielposition (optional)' : language === 'fr' ? 'Poste ciblé (optionnel)' : 'Target role (optional)',
    optimize: language === 'tr' ? 'AI ile Optimize Et' : language === 'de' ? 'Mit KI optimieren' : language === 'fr' ? 'Optimiser avec l\'IA' : 'Optimize with AI',
    optimizing: language === 'tr' ? 'Optimize ediliyor...' : language === 'de' ? 'Wird optimiert...' : language === 'fr' ? 'Optimisation...' : 'Optimizing...',
    result: language === 'tr' ? 'Optimize Edilmiş CV' : language === 'de' ? 'Optimierter CV' : language === 'fr' ? 'CV Optimisé' : 'Optimized CV',
    downloadPDF: language === 'tr' ? 'PDF İndir' : language === 'de' ? 'PDF herunterladen' : language === 'fr' ? 'Télécharger PDF' : 'Download PDF',
    downloadTxt: language === 'tr' ? 'TXT İndir' : language === 'de' ? 'TXT herunterladen' : language === 'fr' ? 'Télécharger TXT' : 'Download TXT',
    score: language === 'tr' ? 'CV Skoru' : language === 'de' ? 'CV-Score' : language === 'fr' ? 'Score CV' : 'CV Score',
    uploadHint: language === 'tr' ? 'PDF veya DOCX dosyası seçin' : language === 'de' ? 'PDF- oder DOCX-Datei wählen' : language === 'fr' ? 'Choisir un fichier PDF ou DOCX' : 'Choose a PDF or DOCX file',
    copied: language === 'tr' ? 'Kopyalandı!' : language === 'de' ? 'Kopiert!' : language === 'fr' ? 'Copié !' : 'Copied!',
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(language === 'tr' ? 'Dosya çok büyük (max 5MB)' : 'File too large (max 5MB)');
      return;
    }

    // For text files, read directly
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      setCvText(text);
      toast.success(language === 'tr' ? 'Dosya yüklendi!' : 'File loaded!');
      return;
    }

    // For PDF/DOCX - read as text (basic extraction)
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        const text = await file.text();
        // Basic PDF text extraction - extract readable portions
        const cleaned = text
          .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u024F\u0400-\u04FF\u00C0-\u00FF\n\r\t ğüşıöçĞÜŞİÖÇ]/g, ' ')
          .replace(/\s{3,}/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        
        if (cleaned.length > 50) {
          setCvText(cleaned);
          toast.success(language === 'tr' ? 'PDF yüklendi! Metni kontrol edin.' : 'PDF loaded! Please review the text.');
        } else {
          toast.error(language === 'tr' ? 'PDF\'den metin çıkarılamadı. Lütfen metni manuel yapıştırın.' : 'Could not extract text from PDF. Please paste manually.');
        }
      } catch {
        toast.error(language === 'tr' ? 'PDF okunamadı. Lütfen metni yapıştırın.' : 'Could not read PDF. Please paste the text.');
      }
      return;
    }

    // For DOCX - basic XML extraction
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
            setCvText(text);
            toast.success(language === 'tr' ? 'DOCX yüklendi!' : 'DOCX loaded!');
          } else {
            toast.error(language === 'tr' ? 'DOCX\'den metin çıkarılamadı.' : 'Could not extract text from DOCX.');
          }
        }
      } catch {
        toast.error(language === 'tr' ? 'DOCX okunamadı. Lütfen metni yapıştırın.' : 'Could not read DOCX. Please paste the text.');
      }
      return;
    }

    toast.error(language === 'tr' ? 'Desteklenmeyen dosya formatı' : 'Unsupported file format');
  };

  const handleOptimize = async () => {
    if (!cvText.trim() || cvText.trim().length < 50) {
      toast.error(language === 'tr' ? 'En az 50 karakter girin' : 'Enter at least 50 characters');
      return;
    }

    setIsOptimizing(true);
    setOptimizedCV('');
    setScore(null);
    setImprovements([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(language === 'tr' ? 'Lütfen giriş yapın' : 'Please log in');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-cv`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            cvText: cvText.trim(),
            outputLanguage: language === 'tr' ? 'Turkish' : language === 'de' ? 'German' : language === 'fr' ? 'French' : 'English',
            targetRole: targetRole.trim() || undefined,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || (language === 'tr' ? 'Optimizasyon başarısız' : 'Optimization failed'));
        return;
      }

      setOptimizedCV(result.optimizedCV);
      setScore(result.score);
      setImprovements(result.improvements || []);
      toast.success(language === 'tr' ? 'CV optimize edildi!' : 'CV optimized!');
    } catch (err) {
      console.error('CV optimization error:', err);
      toast.error(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred');
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
    a.href = url;
    a.download = `optimized-cv-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(language === 'tr' ? 'İndirildi!' : 'Downloaded!');
  };

  const handleDownloadPDF = () => {
    try {
      exportCVAsPDF(optimizedCV, `optimized-cv-${new Date().toISOString().slice(0, 10)}`, {
        isPaid: true,
        type: 'cv',
      });
      toast.success(language === 'tr' ? 'PDF indirildi!' : 'PDF downloaded!');
    } catch {
      handleDownloadTxt();
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBarColor = (s: number) => {
    if (s >= 80) return 'bg-green-500';
    if (s >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

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

        {!optimizedCV ? (
          <div className="space-y-4 mt-2">
            {/* Input Method Tabs */}
            <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as 'paste' | 'upload')}>
              <TabsList className="w-full">
                <TabsTrigger value="paste" className="flex-1 gap-2">
                  <PenTool className="w-4 h-4" />
                  {txt.paste}
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex-1 gap-2">
                  <Upload className="w-4 h-4" />
                  {txt.upload}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="mt-3">
                <Textarea
                  placeholder={txt.placeholder}
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  className="min-h-[200px] resize-none text-sm"
                />
              </TabsContent>

              <TabsContent value="upload" className="mt-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground mb-1">{txt.uploadHint}</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, TXT — max 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.doc"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                {cvText && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium text-foreground">
                        {language === 'tr' ? 'Dosya yüklendi' : 'File loaded'} — {cvText.length} {language === 'tr' ? 'karakter' : 'chars'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{cvText.slice(0, 200)}...</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Target Role */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                <Target className="w-3 h-3 inline mr-1" />
                {txt.targetRole}
              </label>
              <Input
                placeholder={language === 'tr' ? 'örn: Frontend Developer, Marketing Manager' : 'e.g. Frontend Developer, Marketing Manager'}
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Optimize Button */}
            <Button
              variant="gold"
              className="w-full"
              size="lg"
              onClick={handleOptimize}
              disabled={isOptimizing || !cvText.trim() || cvText.trim().length < 50}
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {txt.optimizing}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {txt.optimize}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Score */}
            {score !== null && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    {txt.score}
                  </span>
                  <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${getScoreBarColor(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {improvements.map((imp, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {imp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Optimized CV Text */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground">{txt.result}</h3>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed max-h-[300px] overflow-y-auto">
                {optimizedCV}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="gold" className="flex-1" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-2" />
                {txt.downloadPDF}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleDownloadTxt}>
                <FileText className="w-4 h-4 mr-2" />
                {txt.downloadTxt}
              </Button>
            </div>

            {/* Back button */}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setOptimizedCV('');
                setScore(null);
                setImprovements([]);
              }}
            >
              {language === 'tr' ? '← Yeni CV Optimize Et' : language === 'de' ? '← Neuen CV optimieren' : language === 'fr' ? '← Optimiser un nouveau CV' : '← Optimize Another CV'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
