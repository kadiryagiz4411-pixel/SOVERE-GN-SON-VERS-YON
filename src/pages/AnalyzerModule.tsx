/**
 * Module B — Multi-CV Analyzer
 * Deep technical audit. No job-fit ranking.
 * Route: /dashboard/analyzer
 */

import { useState } from 'react';
import { ScanSearch } from 'lucide-react';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { FeatureGuard } from '@/components/auth/FeatureGuard';
import UniversalBatchUpload, { type BatchCompleteData } from '@/components/upload/UniversalBatchUpload';
import { AuditCard } from '@/components/dashboard/AuditCard';
import { auditCandidates, type TechnicalAudit } from '@/lib/ai/technicalAudit';
import { logActivity } from '@/lib/memory/activityLogger';
import { useSession } from '@/contexts/SessionContext';

export default function AnalyzerModule() {
  const { user } = useSession();
  const [audits, setAudits] = useState<TechnicalAudit[]>([]);
  const [fileName, setFileName] = useState('');

  const handleComplete = (data: BatchCompleteData) => {
    const next = auditCandidates(data.parsedCandidates?.length ? data.parsedCandidates : data.rankedCandidates);
    setAudits(next);
    setFileName(data.fileName);
    if (user?.id) {
      void logActivity({
        userId: user.id,
        activityType: 'CV_AUDITED',
        entityName: data.fileName,
        entityId: data.batchId,
        summary: `Technical audit of ${next.length} profile(s)`,
      });
    }
  };

  return (
    <GatedAppPage
      required="enterprise"
      featureName="Multi-CV Analyzer"
      description="Technical skill audit and gap diagnostics. Isolated from candidate ranking."
    >
      <FeatureGuard feature="fraud_detector">
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Module B · Technical Audit</p>
              <h1 className="text-2xl font-bold flex items-center gap-2.5 mt-1">
                <ScanSearch className="w-6 h-6 text-indigo-400" />
                Multi-CV Analyzer
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Skill depth, trajectory, verification flags, and missing prerequisites.
                This module does <strong>not</strong> rank candidates or score job fit — use Evaluator for that.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <UniversalBatchUpload
                mode="parse"
                hideJobContext
                ctaLabel="Run technical audit"
                onBatchComplete={handleComplete}
              />
            </div>

            {audits.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold">{audits.length} audits · {fileName}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {audits.map((a, i) => (
                    <AuditCard key={`${a.candidate.fullName}-${i}`} audit={a} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </FeatureGuard>
    </GatedAppPage>
  );
}
