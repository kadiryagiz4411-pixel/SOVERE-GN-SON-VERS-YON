/**
 * Live Client Sharing Portal — unlisted, no login required.
 * Route: /share/:shareCode
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CandidateCard } from '@/components/dashboard/CandidateCard';
import { BrandLogo } from '@/components/common/BrandLogo';
import {
  loadShareByCode,
  upsertDecision,
  subscribeDecisions,
  type SharedCandidate,
  type DecisionStatus,
} from '@/lib/sharing/shareLinks';
import { toast } from 'sonner';
import { SharedPortalFooter } from '@/components/share/SharedPortalFooter';
import { notifyClientDecision } from '@/lib/actions/workflowEngine';

export default function SharePortal() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('Candidate Shortlist');
  const [shareId, setShareId] = useState('');
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [candidates, setCandidates] = useState<SharedCandidate[]>([]);

  useEffect(() => {
    if (!shareCode) return;
    let off: (() => void) | undefined;
    (async () => {
      setLoading(true);
      try {
        const data = await loadShareByCode(shareCode);
        if (!data) {
          setError('This shortlist is unavailable or has been closed.');
          return;
        }
        setShareId(data.link.id);
        setOwnerUserId(data.link.userId ?? null);
        setTitle(data.link.title || 'Candidate Shortlist');
        setPasscode(data.link.passcode);
        setUnlocked(!data.link.passcode);
        setCandidates(data.candidates);
        off = subscribeDecisions(data.link.id, (candidateId, status) => {
          setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, decision: status } : c));
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => off?.();
  }, [shareCode]);

  const decide = async (candidate: SharedCandidate, status: DecisionStatus) => {
    const previous = candidate.decision;
    setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, decision: status } : c));
    try {
      await upsertDecision({ shareId, candidateId: candidate.id, status });
      if (status === 'APPROVED' || status === 'REJECTED') {
        void notifyClientDecision({
          shareId,
          candidateId: candidate.id,
          candidateName: candidate.fullName,
          status,
          ownerUserId: ownerUserId ?? undefined,
        });
      }
      toast.success(status === 'APPROVED' ? `Approved ${candidate.fullName}` : `Rejected ${candidate.fullName}`);
    } catch (err) {
      setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, decision: previous } : c));
      toast.error((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4 text-center">
          <Lock className="w-8 h-8 mx-auto text-primary" />
          <h1 className="font-semibold">Protected shortlist</h1>
          <Input
            type="password"
            placeholder="Enter passcode"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <Button
            variant="gold"
            className="w-full"
            onClick={() => {
              if (input === passcode) setUnlocked(true);
              else toast.error('Wrong passcode');
            }}
          >
            Unlock
          </Button>
        </div>
      </div>
    );
  }

  const approved = candidates.filter(c => c.decision === 'APPROVED').length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <BrandLogo size="sm" />
          <div className="text-right">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{candidates.length} ranked · {approved} approved</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="w-4 h-4" />
          Click Approve or Reject on any card. Decisions sync live for the recruiter.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {candidates.map(c => (
            <CandidateCard
              key={c.id}
              candidate={c}
              clientMode
              decision={c.decision}
              onApprove={(cand) => void decide(cand as SharedCandidate, 'APPROVED')}
              onReject={(cand) => void decide(cand as SharedCandidate, 'REJECTED')}
            />
          ))}
        </div>
      </main>

      <SharedPortalFooter />
    </div>
  );
}
