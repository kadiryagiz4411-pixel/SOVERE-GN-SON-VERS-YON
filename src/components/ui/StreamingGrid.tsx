/**
 * StreamingGrid.tsx — Cards appear as soon as a chunk is scored.
 * No waiting screen for 100+ item batches.
 */

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { CandidateCard } from '@/components/dashboard/CandidateCard';
import { ProposalCard } from '@/components/dashboard/ProposalCard';
import type { RankedCandidate } from '@/lib/schemas/candidate';
import type { RankedJob } from '@/lib/schemas/job';

interface CandidateStreamProps {
  mode: 'candidates';
  items: RankedCandidate[];
  isStreaming?: boolean;
  totalExpected?: number;
  onViewFull?: (c: RankedCandidate) => void;
  onScheduleInterview?: (c: RankedCandidate) => void;
}

interface JobStreamProps {
  mode: 'jobs';
  items: RankedJob[];
  isStreaming?: boolean;
  totalExpected?: number;
  onInjectProposal: (j: RankedJob) => void;
  injectingId?: string | null;
}

type StreamingGridProps = CandidateStreamProps | JobStreamProps;

export function StreamingGrid(props: StreamingGridProps) {
  if (props.mode === 'jobs') return <JobStream {...props} />;
  return <CandidateStream {...props} />;
}

function CandidateStream(props: CandidateStreamProps) {
  const sorted = useMemo(
    () => [...props.items]
      .sort((a, b) => b.overallScore - a.overallScore)
      .map((c, i) => ({ ...c, rankPosition: c.rankPosition || i + 1 })),
    [props.items],
  );

  return (
    <div className="space-y-4">
      <StreamStatus
        done={props.items.length}
        total={props.totalExpected}
        isStreaming={props.isStreaming}
        noun="candidates"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {sorted.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            onViewFull={props.onViewFull}
            onScheduleInterview={props.onScheduleInterview}
          />
        ))}
      </div>
    </div>
  );
}

function JobStream(props: JobStreamProps) {
  const sorted = useMemo(
    () => [...props.items]
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .map((j, i) => ({ ...j, rankPosition: j.rankPosition || i + 1 })),
    [props.items],
  );

  return (
    <div className="space-y-4">
      <StreamStatus
        done={props.items.length}
        total={props.totalExpected}
        isStreaming={props.isStreaming}
        noun="jobs"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {sorted.map((job) => (
          <ProposalCard
            key={job.id}
            job={job}
            injecting={props.injectingId === job.id}
            onInjectProposal={props.onInjectProposal}
          />
        ))}
      </div>
    </div>
  );
}

function StreamStatus({
  done, total, isStreaming, noun,
}: { done: number; total?: number; isStreaming?: boolean; noun: string }) {
  if (!isStreaming && done === 0) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {isStreaming && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      <span>
        {isStreaming
          ? `Live ranking — ${done}${total ? ` / ${total}` : ''} ${noun} scored`
          : `${done} ${noun} ranked`}
      </span>
    </div>
  );
}

export default StreamingGrid;
