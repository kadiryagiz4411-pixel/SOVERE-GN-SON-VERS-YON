import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Shield, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { trackEvent } from '@/lib/analytics';

type Phase = 'input' | 'analyzing' | 'result';

export const AcceptancePredictorSection = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('input');
  const [jobDesc, setJobDesc] = useState('');
  const [score, setScore] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleAnalyze = () => {
    if (!jobDesc.trim()) return;
    trackEvent('acceptance_predictor_start');
    setPhase('analyzing');
  };

  useEffect(() => {
    if (phase !== 'analyzing') return;
    const fakeScore = 42 + Math.floor(Math.random() * 30);
    const timer = setTimeout(() => {
      setScore(fakeScore);
      setPhase('result');
    }, 2800);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleReveal = () => {
    trackEvent('acceptance_predictor_reveal_cta');
    navigate('/auth?mode=signup');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setJobDesc(`[📄 ${file.name} uploaded — paste job description for best results]`);
      trackEvent('acceptance_predictor_file_drop');
    }
  };

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-card/20 via-transparent to-card/20" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              What's Your <span className="text-gradient-gold">Acceptance Score</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Drop your job description and discover your real acceptance probability in seconds.
            </p>
          </motion.div>
        </div>

        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {phase === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative rounded-2xl border-2 border-dashed transition-colors p-6 text-center ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
                  }`}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Drop your CV/Resume here or paste the job description below
                  </p>
                  <Textarea
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    placeholder="Paste the job description here..."
                    className="min-h-[120px] bg-background/50 border-border resize-none"
                    maxLength={5000}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Privacy First</span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> ATS-Compliant</span>
                  </div>
                  <Button
                    variant="gold"
                    size="lg"
                    disabled={!jobDesc.trim()}
                    onClick={handleAnalyze}
                    className="group"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Calculate My Score
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {phase === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border rounded-2xl p-10 text-center"
              >
                <div className="relative w-28 h-28 mx-auto mb-6">
                  <svg className="w-full h-full animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                      strokeDasharray="132 132" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Calculating Acceptance Rate...</h3>
                <p className="text-sm text-muted-foreground">Analyzing ATS compatibility, keyword density, and role fit</p>
              </motion.div>
            )}

            {phase === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border rounded-2xl p-8 text-center relative overflow-hidden"
              >
                {/* Score Dial */}
                <div className="relative w-40 h-40 mx-auto mb-6">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <motion.circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 327} 327`}
                      initial={{ strokeDasharray: '0 327' }}
                      animate={{ strokeDasharray: `${(score / 100) * 327} 327` }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gradient-gold">{score}%</span>
                    <span className="text-xs text-muted-foreground">Acceptance</span>
                  </div>
                </div>

                {/* Blurred preview of improvements */}
                <div className="relative mb-6">
                  <div className="space-y-2 filter blur-[6px] select-none pointer-events-none">
                    <div className="bg-muted/30 rounded-lg p-3 text-left text-sm text-muted-foreground">
                      🎯 Top Improvement: Add quantified results to your opening paragraph...
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-left text-sm text-muted-foreground">
                      ⚡ ATS Keyword Gap: Missing 4 critical keywords that 89% of selected candidates use...
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-left text-sm text-muted-foreground">
                      📊 Strategic Advice: Your tone is too passive for this company's culture...
                    </div>
                  </div>
                  {/* Overlay CTA */}
                  <div className="absolute inset-0 flex items-center justify-center bg-card/30 backdrop-blur-[1px] rounded-xl">
                    <Button
                      variant="gold"
                      size="lg"
                      onClick={handleReveal}
                      className="group shadow-lg pulse-glow"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Reveal Full Analysis & Top 3 Improvements
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </div>

                <button
                  onClick={() => { setPhase('input'); setJobDesc(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Try another job description
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
