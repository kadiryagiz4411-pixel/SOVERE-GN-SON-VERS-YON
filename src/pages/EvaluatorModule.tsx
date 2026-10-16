/**
 * Module A — Multi-CV Candidate Evaluator
 * Route: /dashboard/evaluator
 */

import { useState, useEffect } from 'react';
import { Layers, Link2, Calendar, Copy, Check, MailX } from 'lucide-react';
import { toast } from 'sonner';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { FeatureGuard } from '@/components/auth/FeatureGuard';
import UniversalBatchUpload, { type BatchCompleteData } from '@/components/upload/UniversalBatchUpload';
import { CandidateGrid } from '@/components/dashboard/CandidateGrid';
import { StreamingGrid } from '@/components/ui/StreamingGrid';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import { generateOutreachEmail } from '@/lib/actions/ghostActions';
import { createShareLink, shareUrl } from '@/lib/sharing/shareLinks';
import { loadMemory } from '@/lib/memory/contextEngine';
import { draftBulkRejections, draftInterviewInvites, subscribeWorkflowEvents } from '@/lib/actions/workflowEngine';
import type { RankedCandidate } from '@/lib/schemas/candidate';
import { Input } from '@/components/ui/input';

export default function EvaluatorModule() {
  const { user } = useSession();
  const [streamed, setStreamed] = useState<RankedCandidate[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [batch, setBatch] = useState<BatchCompleteData | null>(null);
  const [shareHref, setShareHref] = useState('');
  const [copied, setCopied] = useState(false);
  const [calendlyUrl, setCalendlyUrl] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    void loadMemory(user.id).then(m => { if (m.calendlyUrl) setCalendlyUrl(m.calendlyUrl); });
    return subscribeWorkflowEvents(user.id, (eventType, payload) => {
      if (eventType === 'CLIENT_APPROVED') {
        toast.success(`Client approved ${String(payload.name || 'a candidate')} — outreach draft is ready.`);
      }
    });
  }, [user?.id]);

  const handleItem = (c: RankedCandidate) => {
    setStreaming(true);
    setStreamed(prev => {
      const next = prev.some(x => x.fullName === c.fullName && x.overallScore === c.overallScore)
        ? prev
        : [...prev, c];
      return next;
    });
  };

  const handleComplete = (data: BatchCompleteData) => {
    setStreaming(false);
    setBatch(data);
    setStreamed(data.rankedCandidates);
  };

  const handleInterview = async (candidate: RankedCandidate) => {
    try {
      const memory = user?.id ? await loadMemory(user.id) : null;
      const drafts = await draftInterviewInvites([candidate], { userId: user?.id, calendlyUrl });
      const email = drafts[0] ?? await generateOutreachEmail(candidate, memory);
      await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
      if (email.mailtoHref) window.open(email.mailtoHref, '_blank');
      toast.success(`Interview invite copied for ${candidate.fullName}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleBulkReject = async () => {
    const pool = batch?.rankedCandidates ?? streamed;
    try {
      const drafts = await draftBulkRejections(pool, { userId: user?.id, threshold: 50 });
      if (drafts.length === 0) {
        toast.message('No candidates scored below 50.');
        return;
      }
      const digest = drafts.map(d => `${d.candidateName}\n${d.body}`).join('\n\n---\n\n');
      await navigator.clipboard.writeText(digest);
      toast.success(`${drafts.length} polite rejection notes copied.`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleShare = async () => {
    if (!batch || !user?.id) {
      toast.error('Finish a batch while signed in to generate a live client link.');
      return;
    }
    try {
      const link = await createShareLink({
        userId: user.id,
        batchId: batch.batchId,
        title: `Shortlist — ${batch.fileName}`,
      });
      const href = shareUrl(link.shareCode);
      setShareHref(href);
      await navigator.clipboard.writeText(href);
      toast.success('Live client portal link copied');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const copyShare = async () => {
    if (!shareHref) return;
    await navigator.clipboard.writeText(shareHref);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const ranked = batch?.rankedCandidates ?? [];

  return (
    <GatedAppPage
      required="enterprise"
      featureName="Multi-CV Candidate Evaluator"
      description="Upload one file of 1–200+ CVs. Sovereign extracts, scores, and ranks every candidate."
    >
      <FeatureGuard feature="batch_cv_upload">
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Module A · Recruiter</p>
              <h1 className="text-2xl font-bold flex items-center gap-2.5 mt-1">
                <Layers className="w-6 h-6 text-amber-400" />
                Multi-CV Candidate Evaluator
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                One file in. Ranked shortlist out. No copy-paste. Schedule interviews and send a live client portal in one click.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <UniversalBatchUpload
                onBatchComplete={handleComplete}
                onItem={handleItem}
              />
            </div>

            {(streaming || streamed.length > 0) && !batch && (
              <StreamingGrid
                mode="candidates"
                items={streamed}
                isStreaming={streaming}
                onScheduleInterview={(c) => void handleInterview(c)}
              />
            )}

            {batch && ranked.length > 0 && (
              <div id="batch-results" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{ranked.length} candidates ranked</h2>
                    <p className="text-sm text-muted-foreground">#{1}: {ranked[0].fullName} · {ranked[0].overallScore}%</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void handleShare()}>
                      <Link2 className="w-3.5 h-3.5" /> Live Client Portal
                    </Button>
                    {shareHref && (
                      <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => void copyShare()}>
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {shareHref.replace(/^https?:\/\//, '').slice(0, 42)}
                      </Button>
                    )}
                    <Input
                      value={calendlyUrl}
                      onChange={e => setCalendlyUrl(e.target.value)}
                      placeholder="Calendly URL"
                      className="h-8 w-44 text-xs"
                    />
                    <Button size="sm" variant="gold" className="gap-1.5" onClick={() => ranked[0] && void handleInterview(ranked[0])}>
                      <Calendar className="w-3.5 h-3.5" /> Invite #1
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void handleBulkReject()}>
                      <MailX className="w-3.5 h-3.5" /> Reject below 50
                    </Button>
                  </div>
                </div>
                <CandidateGrid
                  rankedCandidates={ranked}
                  batchName={batch.fileName}
                  onScheduleInterview={(c) => void handleInterview(c)}
                />
              </div>
            )}
          </div>
        </div>
      </FeatureGuard>
    </GatedAppPage>
  );
}
