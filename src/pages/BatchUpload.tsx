import { useMemo, useState } from 'react';
import { Upload, Trophy, FileSpreadsheet, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { FeatureGuard } from '@/components/auth/FeatureGuard';
import { useTierAccess } from '@/hooks/useTierAccess';
import { TierGate } from '@/components/auth/TierGate';
import { downloadXlsx } from '@/lib/xlsxExport';
import { logComplianceEvent, downloadComplianceExport, fetchComplianceLogs } from '@/lib/complianceAudit';
import { analyzeTextLocally } from '@/services/b2b/fraudDetector';
import { toast } from 'sonner';

interface RankedCv {
  name: string;
  score: number;
  fluffHits: number;
  excerpt: string;
}

function keywords(text: string): string[] {
  return Array.from(new Set(
    text.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3),
  ));
}

function scoreAgainstJd(cv: string, jd: string): number {
  const jdKeys = keywords(jd);
  if (jdKeys.length === 0) return 0;
  const cvText = cv.toLowerCase();
  const hits = jdKeys.filter((k) => cvText.includes(k)).length;
  return Math.round((hits / jdKeys.length) * 100);
}

async function readFileText(file: File): Promise<string> {
  try {
    return await file.text();
  } catch {
    return file.name;
  }
}

export default function BatchUpload() {
  const eliteExport = useTierAccess('elite');
  const enterpriseAudit = useTierAccess('enterprise');
  const [jd, setJd] = useState('');
  const [rows, setRows] = useState<RankedCv[]>([]);
  const [busy, setBusy] = useState(false);
  const [exportLock, setExportLock] = useState(false);

  const ranked = useMemo(() => [...rows].sort((a, b) => b.score - a.score), [rows]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const next: RankedCv[] = [];
    for (const file of Array.from(files)) {
      const text = await readFileText(file);
      const fluff = analyzeTextLocally(text);
      next.push({
        name: file.name.replace(/\.[^.]+$/, ''),
        score: scoreAgainstJd(text, jd),
        fluffHits: fluff.signals.length,
        excerpt: text.slice(0, 180).replace(/\s+/g, ' '),
      });
    }
    setRows(next);
    setBusy(false);
    toast.success(`Ranked ${next.length} CVs`);
  };

  const exportCsv = () => {
    if (!eliteExport.requireAccess('elite')) {
      setExportLock(true);
      return;
    }
    const header = 'Rank,Candidate,ATS Score,Flags,Excerpt';
    const body = ranked.map((r, i) => [i + 1, r.name, r.score, r.fluffHits, r.excerpt].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaderboard-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    void logComplianceEvent({ action: 'export_leaderboard_csv', resource_type: 'candidate_leaderboard' });
  };

  const exportXlsx = async () => {
    if (!eliteExport.requireAccess('elite')) {
      setExportLock(true);
      return;
    }
    await downloadXlsx(
      `leaderboard-${Date.now()}.xlsx`,
      ['Rank', 'Candidate', 'ATS Score', 'Flags', 'Excerpt'],
      ranked.map((r, i) => [i + 1, r.name, r.score, r.fluffHits, r.excerpt]),
    );
    void logComplianceEvent({ action: 'export_leaderboard_xlsx', resource_type: 'candidate_leaderboard' });
  };

  const exportAudit = async () => {
    if (!enterpriseAudit.requireAccess('enterprise')) return;
    const logs = await fetchComplianceLogs();
    downloadComplianceExport(logs);
  };

  return (
    <GatedAppPage
      required="enterprise"
      featureName="Batch Upload & Rank"
      description="Multi-CV ATS ranking is locked to Enterprise."
    >
      <FeatureGuard feature="batch_cv_upload">
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-yellow-400 font-semibold">Enterprise</p>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="w-6 h-6 text-yellow-400" /> Batch Upload & Rank
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload PDF, Word, or text CVs, score them against a job description, and export the leaderboard.
          </p>
        </div>

        <Textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job description for ATS matching..." className="min-h-[140px]" />

        <label className="block rounded-2xl border border-dashed border-yellow-600/40 bg-card p-8 text-center cursor-pointer">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Upload className="w-8 h-8 mx-auto text-yellow-400" />
          <p className="mt-2 font-medium">{busy ? 'Scoring CVs…' : 'Drop or click to upload multiple CVs'}</p>
        </label>

        {ranked.length > 0 && (
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-sm">Leaderboard</span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={exportCsv}>
                  <FileText className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => void exportXlsx()}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => void exportAudit()}>
                  <Shield className="w-4 h-4 mr-1" /> GDPR / KVKK
                </Button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="p-3">#</th>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">ATS</th>
                  <th className="p-3">Flags</th>
                  <th className="p-3">Excerpt</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.name + i} className="border-t border-border/60">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3">{r.score}%</td>
                    <td className="p-3">{r.fluffHits}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[280px]">{r.excerpt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </FeatureGuard>
      <TierGate
        open={exportLock && !eliteExport.hasAccess}
        onClose={() => setExportLock(false)}
        featureName="Leaderboard CSV / Excel Export"
        requiredTier="elite"
      />
    </GatedAppPage>
  );
}
