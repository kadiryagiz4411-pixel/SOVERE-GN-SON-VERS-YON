/**
 * UniversalJobUpload.tsx — Single-file multi-job feed for Module B.
 */

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { parseSingleFileToJobs } from '@/lib/parsers/multiJobParser';
import { evaluateJobsBatch, persistJobBatch, type SkillProfile } from '@/lib/ai/proposalEngine';
import type { RankedJob } from '@/lib/schemas/job';
import { analyzeFileIntent } from '@/lib/router/smartIntent';
import { useSession } from '@/contexts/SessionContext';
import { loadMemory } from '@/lib/memory/contextEngine';

export interface JobBatchCompleteData {
  batchId: string;
  rankedJobs: RankedJob[];
  fileName: string;
}

interface Props {
  profile: SkillProfile;
  onBatchComplete: (data: JobBatchCompleteData) => void;
  onItem?: (job: RankedJob) => void;
  className?: string;
}

export default function UniversalJobUpload({ profile, onBatchComplete, onItem, className }: Props) {
  const { user } = useSession();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pasteFeed, setPasteFeed] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setSelectedFile(file);
    setError('');
    setProgress(0);
  }, []);

  const runPipeline = async () => {
    setIsRunning(true);
    setError('');
    try {
      let file = selectedFile;
      if (!file && pasteFeed.trim().length > 40) {
        file = new File([pasteFeed], 'job-feed.txt', { type: 'text/plain' });
      }
      if (!file) {
        toast.error('Drop a file or paste a job feed first.');
        setIsRunning(false);
        return;
      }

      setDetail('Parsing job feed…');
      const parsed = await parseSingleFileToJobs(file);
      const intent = analyzeFileIntent(parsed.rawText);
      if (intent.intent === 'CANDIDATE_POOL' && intent.resumeHits > intent.jobHits) {
        toast.message('This file looks like CVs. Open Multi-CV Evaluator instead.');
      }
      if (parsed.jobs.length === 0) {
        setError('No job postings detected.');
        setIsRunning(false);
        return;
      }
      setDetail(`Detected ${parsed.jobs.length} jobs — ranking…`);

      const memory = user?.id ? await loadMemory(user.id).catch(() => null) : null;
      const { rankedJobs } = await evaluateJobsBatch({
        jobs: parsed.jobs,
        profile,
        memory,
        userId: user?.id,
        onItem,
        onProgress: (p, done, total) => {
          setProgress(Math.round(p * 100));
          setDetail(`Ranked ${done}/${total} jobs…`);
        },
      });

      let batchId = crypto.randomUUID();
      if (user?.id) {
        try {
          batchId = await persistJobBatch({
            userId: user.id,
            fileName: file.name,
            rankedJobs,
          });
        } catch (err) {
          console.warn('[JobUpload] persist failed', err);
        }
      }

      toast.success(`${rankedJobs.length} jobs ranked.`);
      onBatchComplete({ batchId, rankedJobs, fileName: file.name });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={cn('space-y-5', className)}>
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => !isRunning && inputRef.current?.click()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40',
          isRunning && 'pointer-events-none opacity-70',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.html,.htm,.txt,text/plain,application/pdf,text/html"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-10 h-10 text-primary" />
            <p className="font-semibold">{selectedFile.name}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-7 h-7 text-primary" />
            <p className="font-semibold">Drop a multi-job file (1–50+ postings)</p>
            <p className="text-sm text-muted-foreground">PDF, HTML, TXT — or paste the feed below</p>
          </div>
        )}
      </div>

      <Textarea
        value={pasteFeed}
        onChange={e => setPasteFeed(e.target.value)}
        disabled={isRunning}
        placeholder="Or paste 1–50 job postings here, separated by --- or Job #1 / Job #2…"
        className="min-h-[110px] text-sm"
      />

      <Button variant="gold" className="w-full h-12" disabled={isRunning} onClick={() => void runPipeline()}>
        {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" /> Ranking jobs…</> : <><Sparkles className="w-4 h-4" /> Rank Jobs & Score Win Probability</>}
      </Button>

      {isRunning && (
        <div className="space-y-2">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</p>
      )}
      {!isRunning && progress === 100 && (
        <p className="text-sm text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Ranking complete</p>
      )}
    </div>
  );
}
