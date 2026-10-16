/**
 * Module B — Multi-Job Proposal Engine
 * Route: /dashboard/proposals
 */

import { useMemo, useState } from 'react';
import { ClipboardList, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { FeatureGuard } from '@/components/auth/FeatureGuard';
import UniversalJobUpload, { type JobBatchCompleteData } from '@/components/upload/UniversalJobUpload';
import { StreamingGrid } from '@/components/ui/StreamingGrid';
import { useSession } from '@/contexts/SessionContext';
import { useProfile } from '@/hooks/useProfile';
import { generateAutoFillPayload } from '@/lib/actions/ghostActions';
import { loadMemory } from '@/lib/memory/contextEngine';
import type { RankedJob } from '@/lib/schemas/job';
import type { SkillProfile } from '@/lib/ai/proposalEngine';

export default function ProposalEngineModule() {
  const { user } = useSession();
  const { profile } = useProfile(user);
  const [streamed, setStreamed] = useState<RankedJob[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [batch, setBatch] = useState<JobBatchCompleteData | null>(null);
  const [injectingId, setInjectingId] = useState<string | null>(null);

  const skillProfile: SkillProfile = useMemo(() => ({
    name: profile?.full_name ?? user?.email ?? 'Freelancer',
    skills: profile?.skills ?? [],
    experience: profile?.experience ?? undefined,
    bio: profile?.bio ?? undefined,
  }), [profile, user]);

  const handleItem = (job: RankedJob) => {
    setStreaming(true);
    setStreamed(prev => prev.some(j => j.title === job.title && j.compatibilityScore === job.compatibilityScore)
      ? prev
      : [...prev, job]);
  };

  const handleComplete = (data: JobBatchCompleteData) => {
    setStreaming(false);
    setBatch(data);
    setStreamed(data.rankedJobs);
  };

  const handleInject = async (job: RankedJob) => {
    setInjectingId(job.id);
    try {
      const memory = user?.id ? await loadMemory(user.id) : null;
      const { proposal, payload } = await generateAutoFillPayload(job, skillProfile, memory);
      job.generatedProposal = proposal;
      job.autoFillPayload = payload;
      await navigator.clipboard.writeText(payload);
      setStreamed(prev => prev.map(j => j.id === job.id ? { ...j, generatedProposal: proposal, autoFillPayload: payload } : j));
      toast.success('3-sentence proposal copied — paste into the application.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setInjectingId(null);
    }
  };

  const jobs = batch?.rankedJobs ?? streamed;

  return (
    <GatedAppPage
      required="pro"
      featureName="Multi-Job Proposal Engine"
      description="Drop a feed of job postings. Sovereign ranks win probability and writes paste-ready proposals."
    >
      <FeatureGuard feature="freelance_pitch">
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Module B · Freelancer / Agency</p>
              <h1 className="text-2xl font-bold flex items-center gap-2.5 mt-1">
                <ClipboardList className="w-6 h-6 text-indigo-400" />
                Multi-Job Proposal Engine
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                One job feed in. Ranked opportunities out. Inject a direct 3-sentence solution — no generic cover letters.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold mb-1">Upload Job Postings / RFPs</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Scoring against {skillProfile.name} · {(skillProfile.skills.length || 0)} saved skills
                {!skillProfile.skills.length && ' — add skills in Profile for sharper ranking'}
              </p>
              <UniversalJobUpload
                profile={skillProfile}
                onBatchComplete={handleComplete}
                onItem={handleItem}
              />
            </div>

            {jobs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{jobs.length} jobs ranked</h2>
                  {jobs[0]?.autoFillPayload && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Last payload copied
                    </span>
                  )}
                </div>
                <StreamingGrid
                  mode="jobs"
                  items={jobs}
                  isStreaming={streaming}
                  onInjectProposal={(j) => void handleInject(j)}
                  injectingId={injectingId}
                />
              </div>
            )}
          </div>
        </div>
      </FeatureGuard>
    </GatedAppPage>
  );
}
