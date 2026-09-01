/**
 * BatchProposal.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * B2B / Agency batch proposal generator.
 * Restricted to Elite + Enterprise tiers via GatedFeature.
 *
 * Features:
 *  - Paste up to 20 job descriptions (one per line / delimiter)  OR  upload CSV/JSON
 *  - Agency knowledge-base profile selector
 *  - Live execution queue with real-time per-item status
 *  - BYOK indicator (shows whether credits or custom key is used)
 *  - Export to CSV / Copy All
 */

import { useState, useCallback, useRef } from 'react';
import {
  Upload, Play, Download, Copy, X, CheckCircle2, Loader2,
  AlertCircle, Zap, Key, Building2, FileText, ClipboardList,
  ChevronDown, ChevronUp, BarChart3, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GatedFeature } from '@/components/auth/TierGate';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import {
  runBatchProposals,
  downloadBatchCsv,
  exportBatchToCsv,
  type BatchJob,
  type AgencyProfile,
} from '@/services/batchProposalService';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ITEMS = 20;
const COST_PER_ITEM = 20;

const DEFAULT_AGENCY: AgencyProfile = {
  name: '',
  techStack: '',
  caseStudies: '',
  portfolioUrl: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: BatchJob['status'] }) {
  if (status === 'done')    return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  if (status === 'running') return <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />;
  if (status === 'error')   return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
  return <div className="w-4 h-4 rounded-full border border-muted-foreground/40 shrink-0" />;
}

function StatusBadge({ status }: { status: BatchJob['status'] }) {
  const map: Record<BatchJob['status'], { label: string; cls: string }> = {
    pending: { label: 'Pending',    cls: 'bg-muted/50 text-muted-foreground' },
    running: { label: 'Processing', cls: 'bg-blue-500/20 text-blue-300' },
    done:    { label: 'Done',       cls: 'bg-emerald-500/20 text-emerald-300' },
    error:   { label: 'Error',      cls: 'bg-red-500/20 text-red-300' },
  };
  const { label, cls } = map[status];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', cls)}>
      {label}
    </span>
  );
}

function JobCard({ job, index, onRetry }: { job: BatchJob; index: number; onRetry?: (job: BatchJob) => void }) {
  const [expanded, setExpanded] = useState(false);
  const preview = job.jobDescription.slice(0, 100) + (job.jobDescription.length > 100 ? '…' : '');

  return (
    <div
      className={cn(
        'rounded-xl border bg-card/60 p-4 transition-colors',
        job.status === 'running' && 'border-blue-500/40 bg-blue-500/5',
        job.status === 'done'    && 'border-emerald-500/30',
        job.status === 'error'   && 'border-red-500/30 bg-red-500/5',
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <StatusIcon status={job.status} />
          <p className="text-sm text-foreground truncate">{preview}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={job.status} />
          {job.matchScore !== undefined && (
            <span className={cn(
              'inline-flex items-center gap-1 text-xs font-bold',
              job.matchScore >= 70 ? 'text-emerald-400'
              : job.matchScore >= 40 ? 'text-amber-400'
              : 'text-red-400',
            )}>
              <BarChart3 className="w-3 h-3" />
              {job.matchScore}%
            </span>
          )}
          {job.status === 'error' && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(job)}
              className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              title="Retry this item"
            >
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          )}
          {(job.proposal || job.errorMessage) && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-3 text-sm">
          {job.clientProblem && (
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Client Problem</p>
              <p className="text-foreground">{job.clientProblem}</p>
            </div>
          )}
          {job.proposal && (
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Proposal</p>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(job.proposal!); toast.success('Copied!'); }}
                  className="text-[10px] text-primary hover:underline"
                >
                  Copy
                </button>
              </div>
              <p className="text-foreground whitespace-pre-line leading-relaxed">{job.proposal}</p>
            </div>
          )}
          {job.errorMessage && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wide mb-1">Error</p>
              <p className="text-red-300 text-xs">{job.errorMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BatchProposal() {
  const { user, remainingCredits } = useSession();

  // Input state
  const [rawInput, setRawInput]   = useState('');
  const [agency, setAgency]       = useState<AgencyProfile>(DEFAULT_AGENCY);

  // Execution state
  const [jobs, setJobs]           = useState<BatchJob[]>([]);
  const [running, setRunning]     = useState(false);
  const [usedByok, setUsedByok]   = useState(false);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [error, setError]         = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Parse input into individual JDs ────────────────────────────────────────

  const parseJds = useCallback((raw: string): string[] => {
    // Try JSON array first
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown[];
        return parsed
          .filter((v): v is string => typeof v === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, MAX_ITEMS);
      } catch { /* fall through */ }
    }

    // Delimiter: blank line between entries OR "---" separator
    const blocks = trimmed
      .split(/\n\s*---\s*\n|\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);

    return blocks.slice(0, MAX_ITEMS);
  }, []);

  const jdCount = parseJds(rawInput).length;
  const estimatedCost = jdCount * COST_PER_ITEM;
  const canAfford = remainingCredits >= estimatedCost;

  // ── File upload handler ─────────────────────────────────────────────────────

  const handleFileUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    const text = await file.text();

    if (file.name.endsWith('.json')) {
      setRawInput(text.trim());
    } else {
      // CSV: one JD per cell in the first column (skip header)
      const lines = text.split('\n').slice(1);
      const jds = lines
        .map((l) => l.split(',')[0]?.replace(/^"|"$/g, '').trim())
        .filter(Boolean);
      setRawInput(jds.join('\n\n'));
    }
  };

  // ── Run batch ───────────────────────────────────────────────────────────────

  const handleRun = async () => {
    if (!user) { toast.error('You must be logged in.'); return; }
    const jds = parseJds(rawInput);
    if (!jds.length) { toast.error('Please enter at least one job description.'); return; }

    setError(null);
    setRunning(true);
    setJobs([]);
    setCreditsUsed(0);

    try {
      const result = await runBatchProposals({
        userId: user.id,
        jobDescriptions: jds,
        agencyProfile: agency,
        onProgress: (updated) => setJobs([...updated]),
      });
      setUsedByok(result.usedByok);
      setCreditsUsed(result.creditsUsed);

      const doneCount  = result.jobs.filter((j) => j.status === 'done').length;
      const errorCount = result.jobs.filter((j) => j.status === 'error').length;

      if (doneCount > 0) {
        toast.success(
          `${doneCount} proposal${doneCount > 1 ? 's' : ''} generated` +
          (errorCount ? ` (${errorCount} failed)` : '') +
          (result.usedByok ? ' • BYOK (no credits deducted)' : ` • ${result.creditsUsed} credits used`),
        );
      } else {
        toast.error('All items failed. Check the error details below.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  // ── Retry a single failed job ───────────────────────────────────────────────

  const handleRetryJob = useCallback(async (failedJob: BatchJob) => {
    if (!user) { toast.error('You must be logged in.'); return; }
    setRunning(true);
    setError(null);

    // Mark the specific job as running again
    setJobs((prev) => prev.map((j) => j.id === failedJob.id ? { ...j, status: 'running', errorMessage: undefined } : j));

    try {
      const result = await runBatchProposals({
        userId: user.id,
        jobDescriptions: [failedJob.jobDescription],
        agencyProfile: agency,
        onProgress: (updated) => {
          setJobs((prev) => prev.map((j) =>
            j.id === failedJob.id ? { ...j, ...updated[0], id: failedJob.id, index: failedJob.index } : j,
          ));
        },
      });
      const retried = result.jobs[0];
      setJobs((prev) => prev.map((j) =>
        j.id === failedJob.id ? { ...retried, id: failedJob.id, index: failedJob.index } : j,
      ));
      if (result.usedByok) setUsedByok(true);
      if (result.creditsUsed) setCreditsUsed((c) => c + result.creditsUsed);
      if (retried.status === 'done') toast.success(`Job ${failedJob.index + 1} generated successfully.`);
      else toast.error(`Job ${failedJob.index + 1} failed again: ${retried.errorMessage ?? 'Unknown error'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setJobs((prev) => prev.map((j) => j.id === failedJob.id ? { ...j, status: 'error', errorMessage: msg } : j));
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  }, [user, agency]);

  // ── Retry all failed jobs ───────────────────────────────────────────────────

  const handleRetryAllFailed = useCallback(async () => {
    if (!user) { toast.error('You must be logged in.'); return; }
    const failedJobs = jobs.filter((j) => j.status === 'error');
    if (!failedJobs.length) return;
    setRunning(true);
    setError(null);

    setJobs((prev) => prev.map((j) => j.status === 'error' ? { ...j, status: 'running', errorMessage: undefined } : j));

    try {
      const result = await runBatchProposals({
        userId: user.id,
        jobDescriptions: failedJobs.map((j) => j.jobDescription),
        agencyProfile: agency,
        onProgress: (updated) => {
          setJobs((prev) => {
            const next = [...prev];
            updated.forEach((u, ui) => {
              const origIndex = failedJobs[ui]?.id;
              const idx = next.findIndex((j) => j.id === origIndex);
              if (idx >= 0) next[idx] = { ...u, id: origIndex!, index: next[idx].index };
            });
            return next;
          });
        },
      });

      setJobs((prev) => {
        const next = [...prev];
        result.jobs.forEach((r, ri) => {
          const origJob = failedJobs[ri];
          if (!origJob) return;
          const idx = next.findIndex((j) => j.id === origJob.id);
          if (idx >= 0) next[idx] = { ...r, id: origJob.id, index: origJob.index };
        });
        return next;
      });

      if (result.usedByok) setUsedByok(true);
      if (result.creditsUsed) setCreditsUsed((c) => c + result.creditsUsed);
      const newDone = result.jobs.filter((j) => j.status === 'done').length;
      toast.success(`Retried ${failedJobs.length} job${failedJobs.length > 1 ? 's' : ''} — ${newDone} succeeded.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  }, [user, jobs, agency]);

  // ── Export helpers ──────────────────────────────────────────────────────────

  const handleCopyAll = () => {
    const text = jobs
      .filter((j) => j.status === 'done')
      .map((j) => `--- Job ${j.index + 1} (${j.matchScore}% match) ---\n${j.proposal}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('All proposals copied to clipboard!');
  };

  const doneJobs  = jobs.filter((j) => j.status === 'done');
  const doneCount = doneJobs.length;
  const totalCount = jobs.length;
  const runningCount = jobs.filter((j) => j.status === 'running').length;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <GatedAppPage
      required="pro"
      featureName="Batch Proposal Generator"
      description="Generate proposals in parallel. Requires AppSumo Tier 2 or Pro."
    >
      <GatedFeature
        required="pro"
        featureName="Batch Proposal Generator"
        description="Generate up to 20 high-converting proposals simultaneously. Requires Tier 2 or higher."
      >
        <div className="min-h-screen bg-background">
          {/* Header */}
          <div className="border-b border-border bg-card/50 px-6 py-5">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Batch Proposal Generator</h1>
                  <p className="text-sm text-muted-foreground">
                    Generate up to {MAX_ITEMS} proposals in parallel · {COST_PER_ITEM} credits each
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {usedByok && jobs.length > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1">
                    <Key className="w-3 h-3" /> BYOK Active
                  </Badge>
                )}
                {creditsUsed > 0 && (
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 gap-1">
                    <Zap className="w-3 h-3" /> {creditsUsed} credits used
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

            {/* ── Agency Knowledge Base ─────────────────────────────────────── */}
            <section className="rounded-2xl border border-border bg-card/60 p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Agency Profile / Knowledge Base</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Agency / Company Name
                  </label>
                  <input
                    type="text"
                    value={agency.name}
                    onChange={(e) => setAgency((a) => ({ ...a, name: e.target.value }))}
                    placeholder="e.g. Acme Software Agency"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Portfolio / Website URL
                  </label>
                  <input
                    type="url"
                    value={agency.portfolioUrl}
                    onChange={(e) => setAgency((a) => ({ ...a, portfolioUrl: e.target.value }))}
                    placeholder="https://yoursite.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tech Stack / Service Offerings
                  </label>
                  <input
                    type="text"
                    value={agency.techStack}
                    onChange={(e) => setAgency((a) => ({ ...a, techStack: e.target.value }))}
                    placeholder="React, Node.js, AI/ML, DevOps, Mobile"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Case Studies / Portfolio Highlights
                  </label>
                  <input
                    type="text"
                    value={agency.caseStudies}
                    onChange={(e) => setAgency((a) => ({ ...a, caseStudies: e.target.value }))}
                    placeholder="Scaled SaaS to $2M ARR, 50+ enterprise clients"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
            </section>

            {/* ── Job Descriptions Input ────────────────────────────────────── */}
            <section className="rounded-2xl border border-border bg-card/60 p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Job Descriptions</h2>
                  <span className="text-xs text-muted-foreground">
                    (separate with blank line or <code className="bg-muted px-1 rounded">---</code>)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs font-medium',
                    jdCount > MAX_ITEMS ? 'text-red-400' : 'text-muted-foreground',
                  )}>
                    {jdCount} / {MAX_ITEMS} items
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload CSV / JSON
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.txt"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </div>
              </div>

              <Textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={`Paste job descriptions here. Separate multiple JDs with a blank line or ---\n\nExample:\nWe need a React developer to build our dashboard...\n\n---\n\nLooking for a DevOps engineer to manage our AWS infrastructure...`}
                className="min-h-[200px] resize-y text-sm font-mono bg-background/60"
                disabled={running}
              />

              {/* Credit / BYOK hint */}
              {jdCount > 0 && (
                <div className={cn(
                  'rounded-xl border px-4 py-3 flex items-start gap-3 text-sm',
                  canAfford
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-amber-500/30 bg-amber-500/5',
                )}>
                  <Zap className={cn('w-4 h-4 mt-0.5 shrink-0', canAfford ? 'text-emerald-400' : 'text-amber-400')} />
                  <div>
                    <p className={cn('font-medium', canAfford ? 'text-emerald-300' : 'text-amber-300')}>
                      {jdCount} proposal{jdCount > 1 ? 's' : ''} × {COST_PER_ITEM} credits = {estimatedCost} credits total
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {canAfford
                        ? `You have ${remainingCredits} credits — enough for this batch.`
                        : `You have ${remainingCredits} credits. Add your own OpenAI key in Profile → Settings to bypass credit limits (BYOK).`}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 flex items-start gap-3 text-sm">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              {/* Run button */}
              <div className="flex items-center justify-end gap-3">
                {rawInput && !running && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => { setRawInput(''); setJobs([]); setError(null); }}
                  >
                    <X className="w-4 h-4 mr-1.5" /> Clear
                  </Button>
                )}
                <Button
                  onClick={handleRun}
                  disabled={running || jdCount === 0}
                  className="gap-2 bg-primary hover:bg-primary/90 min-w-[160px]"
                >
                  {running ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {runningCount > 0
                        ? `Processing ${runningCount} job${runningCount > 1 ? 's' : ''}…`
                        : 'Starting…'}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Generate {jdCount > 0 ? `${jdCount} Proposal${jdCount > 1 ? 's' : ''}` : 'Proposals'}
                    </>
                  )}
                </Button>
              </div>
            </section>

            {/* ── Execution Queue ───────────────────────────────────────────── */}
            {jobs.length > 0 && (
              <section className="space-y-4">
                {/* Queue header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-foreground">Execution Queue</h2>
                    {running && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing {doneCount} / {totalCount}
                      </span>
                    )}
                    {!running && doneCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {doneCount} / {totalCount} complete
                      </span>
                    )}
                  </div>

                  {!running && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {jobs.filter((j) => j.status === 'error').length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          onClick={handleRetryAllFailed}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Retry Failed ({jobs.filter((j) => j.status === 'error').length})
                        </Button>
                      )}
                      {doneCount > 0 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={handleCopyAll}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copy All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => downloadBatchCsv(doneJobs)}
                          >
                            <Download className="w-3.5 h-3.5" />
                            Export CSV
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Job cards */}
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} index={job.index} onRetry={!running ? handleRetryJob : undefined} />
                  ))}
                </div>

                {/* Summary row */}
                {!running && jobs.length > 0 && (
                  <div className="rounded-xl border border-border bg-card/40 px-5 py-4 flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-muted-foreground">Done:</span>
                      <span className="font-semibold text-emerald-400">{doneCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-muted-foreground">Failed:</span>
                      <span className="font-semibold text-red-400">
                        {jobs.filter((j) => j.status === 'error').length}
                      </span>
                    </div>
                    {doneCount > 0 && (
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-violet-400" />
                        <span className="text-muted-foreground">Avg Match Score:</span>
                        <span className="font-semibold text-violet-400">
                          {Math.round(
                            doneJobs.reduce((s, j) => s + (j.matchScore ?? 0), 0) / doneCount,
                          )}%
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      {usedByok ? (
                        <Badge className="gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                          <Key className="w-3 h-3" /> BYOK — 0 credits deducted
                        </Badge>
                      ) : (
                        <Badge className="gap-1 bg-violet-500/20 text-violet-300 border-violet-500/30">
                          <Zap className="w-3 h-3" /> {creditsUsed} credits deducted
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </GatedFeature>
    </GatedAppPage>
  );
}
