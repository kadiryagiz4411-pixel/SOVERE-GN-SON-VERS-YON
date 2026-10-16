/**
 * Candidate pool intake — parse-only bulk dropzone.
 * Route: /dashboard/candidates
 */

import { useState } from 'react';
import { Users } from 'lucide-react';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import UniversalBatchUpload, { type BatchCompleteData } from '@/components/upload/UniversalBatchUpload';
import { CandidateAvatar } from '@/components/dashboard/CandidateCard';
import type { CandidateProfile } from '@/lib/schemas/candidate';

export default function CandidatePoolPage() {
  const [profiles, setProfiles] = useState<CandidateProfile[]>([]);
  const [fileName, setFileName] = useState('');

  const handleComplete = (data: BatchCompleteData) => {
    setProfiles(data.parsedCandidates ?? []);
    setFileName(data.fileName);
  };

  return (
    <GatedAppPage
      required="enterprise"
      featureName="Candidate Pool Intake"
      description="Drop one file of CVs. Profiles land in the pool without ranking."
    >
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Intake</p>
            <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
              <Users className="w-6 h-6 text-emerald-400" /> Candidate Pool
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Parse now. Evaluate or audit later from Command Center.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <UniversalBatchUpload
              mode="parse"
              hideJobContext
              ctaLabel="Intake into pool"
              onBatchComplete={handleComplete}
            />
          </div>

          {profiles.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold">{profiles.length} profiles · {fileName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {profiles.map((p, i) => (
                  <div key={`${p.fullName}-${i}`} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                    <CandidateAvatar name={p.fullName} photoUrl={p.photoUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </GatedAppPage>
  );
}
