/**
 * UniversalBatchUpload.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Drag-and-drop uploader for a SINGLE file (PDF, HTML, TXT) containing 1–200+
 * CVs. Shows real-time 3-step progress and calls onBatchComplete when done.
 */

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { parseSingleFileToCandidates } from '@/lib/parsers/multiCvParser';
import { evaluateCandidatesBatch, persistBatchResults } from '@/lib/ai/evaluator';
import type { CandidateProfile, RankedCandidate } from '@/lib/schemas/candidate';
import { useSession } from '@/contexts/SessionContext';
import { analyzeFileIntent } from '@/lib/router/smartIntent';
import { logActivity } from '@/lib/memory/activityLogger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BatchCompleteData {
  batchId:         string;
  rankedCandidates: RankedCandidate[];
  parsedCandidates: CandidateProfile[];
  totalCandidates: number;
  fileName:        string;
  jobContext:      string;
  mode: 'evaluate' | 'parse';
}

interface Props {
  onBatchComplete: (data: BatchCompleteData) => void;
  onItem?:         (candidate: RankedCandidate) => void;
  className?:      string;
  /** evaluate = rank #1–#N. parse = extract only (Analyzer, Builder, Pool). */
  mode?:           'evaluate' | 'parse';
  hideJobContext?: boolean;
  ctaLabel?:       string;
}

// ─── Step types ───────────────────────────────────────────────────────────────

type StepStatus = 'idle' | 'active' | 'done' | 'error';

interface Step {
  label:   string;
  status:  StepStatus;
  detail?: string;
}

const INITIAL_STEPS: Step[] = [
  { label: 'Parsing Single Document…',          status: 'idle' },
  { label: 'Detecting Candidates in File…',      status: 'idle' },
  { label: 'AI Evaluating & Ranking Candidates…', status: 'idle' },
];

const ACCEPTED = '.pdf,.html,.htm,.txt,text/plain,application/pdf,text/html';

// ─── Component ────────────────────────────────────────────────────────────────

export default function UniversalBatchUpload({
  onBatchComplete,
  onItem,
  className,
  mode = 'evaluate',
  hideJobContext = false,
  ctaLabel,
}: Props) {
  const { user } = useSession();
  const [isDragging,   setIsDragging]   = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobContext,   setJobContext]    = useState('');
  const [isRunning,    setIsRunning]     = useState(false);
  const [steps,        setSteps]         = useState<Step[]>(INITIAL_STEPS);
  const [evalProgress, setEvalProgress]  = useState(0);
  const [evalCount,    setEvalCount]     = useState({ done: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const updateStep = useCallback((index: number, update: Partial<Step>) => {
    setSteps(prev => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
  }, []);

  const handleFile = useCallback((file: File) => {
    const allowed = ['pdf', 'html', 'htm', 'txt'];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!allowed.includes(ext) && !file.type.match(/pdf|html|text/)) {
      toast.error('Unsupported file type. Please upload a PDF, HTML, or TXT file.');
      return;
    }
    setSelectedFile(file);
    setSteps(INITIAL_STEPS);
    setEvalProgress(0);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const runPipeline = async () => {
    if (!selectedFile) return;
    setIsRunning(true);
    setSteps(INITIAL_STEPS);

    try {
      // ── Step 1: Parse ──────────────────────────────────────────────────────
      updateStep(0, { status: 'active', detail: `Reading ${selectedFile.name}…` });
      const parseResult = await parseSingleFileToCandidates(selectedFile);
      const intent = analyzeFileIntent(parseResult.rawText || parseResult.candidates.map(c => c.rawContent).join('\n'));
      if (intent.intent === 'JOB_POSTINGS' && intent.jobHits > intent.resumeHits) {
        toast.message('This file looks like job postings. Routing hint: open Multi-Job Proposal Engine.');
      }
      updateStep(0, { status: 'done', detail: `Parsed via ${parseResult.method}` });

      // ── Step 2: Detect candidates ──────────────────────────────────────────
      updateStep(1, { status: 'active', detail: 'Analysing document structure…' });
      const candidates = parseResult.candidates;
      if (candidates.length === 0) {
        updateStep(1, { status: 'error', detail: 'No candidates detected in this file.' });
        toast.error('Could not detect any candidates in this file. Try a different format or paste job context.');
        setIsRunning(false);
        return;
      }
      updateStep(1, {
        status: 'done',
        detail: `Detected ${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}`,
      });

      let rankedCandidates: RankedCandidate[] = [];
      if (mode === 'evaluate') {
        updateStep(2, { status: 'active', detail: `Evaluating ${candidates.length} candidates…` });
        setEvalCount({ done: 0, total: candidates.length });
        const result = await evaluateCandidatesBatch({
          candidates,
          jobContext,
          userId: user?.id,
          onProgress: (progress, done, total) => {
            setEvalProgress(Math.round(progress * 100));
            setEvalCount({ done, total });
            updateStep(2, {
              status: 'active',
              detail: `Evaluated ${done}/${total} candidates…`,
            });
          },
          onItem,
        });
        rankedCandidates = result.rankedCandidates;
        updateStep(2, { status: 'done', detail: `Ranked ${rankedCandidates.length} candidates #1–#${rankedCandidates.length}` });
      } else {
        updateStep(2, { status: 'done', detail: 'Parse complete — no ranking (Analyzer / intake mode)' });
        rankedCandidates = candidates.map((c, i) => ({
          ...c,
          id: crypto.randomUUID(),
          batchId: '',
          rankPosition: i + 1,
          overallScore: 0,
          whyThisCandidate: '',
          keyStrengths: c.skills.slice(0, 3),
          missingSkills: [],
          recommendation: 'Moderate Fit' as const,
        }));
      }

      let batchId = crypto.randomUUID();
      if (user?.id) {
        try {
          const persisted = await persistBatchResults({
            userId:           user.id,
            fileName:         selectedFile.name,
            fileType:         selectedFile.type || 'unknown',
            jobContext,
            rankedCandidates,
          });
          batchId = persisted.batchId;
        } catch (err) {
          console.warn('[BatchUpload] Persist failed (non-fatal):', err);
        }
        void logActivity({
          userId: user.id,
          activityType: mode === 'evaluate' ? 'CANDIDATE_EVALUATED' : 'CV_PARSED',
          entityName: selectedFile.name,
          entityId: batchId,
          summary: `${candidates.length} profiles from ${selectedFile.name}`,
          metadata: { mode, count: candidates.length },
        });
      }

      toast.success(
        mode === 'evaluate'
          ? `Batch complete! ${rankedCandidates.length} candidates ranked.`
          : `Parsed ${candidates.length} profile${candidates.length === 1 ? '' : 's'}.`,
      );
      onBatchComplete({
        batchId,
        rankedCandidates,
        parsedCandidates: candidates,
        totalCandidates: candidates.length,
        fileName: selectedFile.name,
        jobContext,
        mode,
      });

    } catch (err) {
      console.error('[UniversalBatchUpload] pipeline error:', err);
      toast.error(`Batch processing failed: ${(err as Error).message}`);
      // mark current active step as error
      setSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={cn('space-y-5', className)}>
      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !isRunning && inputRef.current?.click()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer select-none',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : selectedFile
            ? 'border-primary/50 bg-primary/5'
            : 'border-border bg-card hover:border-primary/40 hover:bg-accent/30',
          isRunning && 'pointer-events-none opacity-70',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={onInputChange}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-10 h-10 text-primary" />
            <p className="font-semibold text-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'unknown type'}
            </p>
            {!isRunning && (
              <p className="text-xs text-primary mt-1">Click or drop another file to replace</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Drop your multi-CV file here</p>
              <p className="text-sm text-muted-foreground mt-1">
                One file containing 1–200+ CVs · PDF, HTML, TXT supported
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              The AI will detect candidate boundaries and split automatically
            </p>
          </div>
        )}
      </div>

      {mode === 'evaluate' && !hideJobContext && (
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            Job Description <span className="text-muted-foreground font-normal">(optional — improves evaluation accuracy)</span>
          </label>
          <Textarea
            value={jobContext}
            onChange={e => setJobContext(e.target.value)}
            placeholder="Paste the job description or role requirements here. The AI will evaluate each candidate against these criteria…"
            className="min-h-[100px] resize-none text-sm"
            disabled={isRunning}
          />
        </div>
      )}

      {/* Run Button */}
      <Button
        variant="gold"
        className="w-full h-12 text-base font-semibold gap-2"
        disabled={!selectedFile || isRunning}
        onClick={() => void runPipeline()}
      >
        {isRunning ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> {ctaLabel || (mode === 'parse' ? 'Parse CVs (no ranking)' : 'Parse, Evaluate & Rank Candidates')}</>
        )}
      </Button>

      {/* Step Progress */}
      {isRunning && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Pipeline Progress</p>
          {steps.map((step, i) => (
            <StepRow
              key={i}
              index={i}
              step={step}
              evalProgress={i === 2 ? evalProgress : undefined}
              evalCount={i === 2 ? evalCount : undefined}
            />
          ))}
        </div>
      )}

      {/* Done summary */}
      {!isRunning && steps.every(s => s.status === 'done') && (
        <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4" />
          All steps complete — results displayed below
        </div>
      )}
    </div>
  );
}

// ─── Step row sub-component ───────────────────────────────────────────────────

function StepRow({
  index, step, evalProgress, evalCount,
}: {
  index: number;
  step: Step;
  evalProgress?: number;
  evalCount?: { done: number; total: number };
}) {
  const icon = {
    idle:   <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-xs text-muted-foreground">{index + 1}</span>,
    active: <Loader2 className="w-5 h-5 text-primary animate-spin" />,
    done:   <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error:  <AlertCircle className="w-5 h-5 text-destructive" />,
  }[step.status];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', step.status === 'idle' && 'text-muted-foreground', step.status === 'active' && 'text-foreground', step.status === 'done' && 'text-emerald-400', step.status === 'error' && 'text-destructive')}>
            [{index + 1}/3] {step.label}
          </p>
          {step.detail && (
            <p className="text-xs text-muted-foreground">{step.detail}</p>
          )}
        </div>
        {step.status === 'active' && <ChevronRight className="w-3 h-3 text-muted-foreground animate-pulse" />}
      </div>
      {step.status === 'active' && evalProgress !== undefined && evalCount && (
        <div className="ml-8 space-y-1">
          <Progress value={evalProgress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{evalCount.done} / {evalCount.total} evaluated</p>
        </div>
      )}
    </div>
  );
}
