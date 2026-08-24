import { useMemo, useState } from 'react';
import { Database, Search, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { supabase } from '@/integrations/supabase/client';
import { searchTalentPool } from '@/services/b2b/talentSearch';
import { logComplianceEvent, downloadComplianceExport, fetchComplianceLogs } from '@/lib/complianceAudit';
import { toast } from 'sonner';

interface PoolRow {
  id: string;
  name: string;
  skills: string;
  score: number;
  verdict: string;
}

export default function TalentPoolHub() {
  const [query, setQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [rows, setRows] = useState<PoolRow[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const skill = skillFilter.trim().toLowerCase();
    if (!skill) return rows;
    return rows.filter((r) => r.skills.toLowerCase().includes(skill) || r.name.toLowerCase().includes(skill));
  }, [rows, skillFilter]);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    const t0 = performance.now();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from('profiles').select('org_id').or(`user_id.eq.${user.id},id.eq.${user.id}`).maybeSingle()
        : { data: null };

      const orgId = (profile as { org_id?: string | null } | null)?.org_id;
      if (orgId) {
        const { results, elapsedMs } = await searchTalentPool({ query: q, orgId, filters: { matchCount: 25 } });
        setRows(results.map((r) => ({
          id: r.id,
          name: r.candidate_name,
          skills: (r.ai_analysis?.key_strengths ?? []).join(', '),
          score: r.match_score_percentage ?? Math.round((r.similarity || 0) * 100),
          verdict: r.ai_analysis?.hiring_verdict ?? '—',
        })));
        setElapsed(elapsedMs);
      } else {
        const { data } = await supabase
          .from('candidate_evaluations')
          .select('id, candidate_name, match_score_percentage, ai_analysis')
          .limit(40);
        const needle = q.toLowerCase();
        const mapped = ((data as Array<{
          id: string;
          candidate_name: string;
          match_score_percentage: number | null;
          ai_analysis: { key_strengths?: string[]; hiring_verdict?: string } | null;
        }> | null) ?? [])
          .map((c) => ({
            id: c.id,
            name: c.candidate_name,
            skills: (c.ai_analysis?.key_strengths ?? []).join(', '),
            score: c.match_score_percentage ?? 0,
            verdict: c.ai_analysis?.hiring_verdict ?? '—',
          }))
          .filter((c) => `${c.name} ${c.skills}`.toLowerCase().includes(needle));
        setRows(mapped);
        setElapsed(Math.round(performance.now() - t0));
      }
      void logComplianceEvent({ action: 'talent_pool_search', resource_type: 'talent_pool', metadata: { query: q } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed');
      setElapsed(Math.round(performance.now() - t0));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GatedAppPage
      required="enterprise"
      featureName="Talent Pool Vector Search"
      description="Sub-3s candidate pool search is locked to Enterprise."
    >
      <div className="p-6 max-w-6xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-yellow-400 font-semibold">Enterprise</p>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6 text-yellow-400" /> Talent Pool
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Semantic + skills filter across your candidate database.
              {elapsed != null && <span className="ml-2 text-emerald-400">{elapsed} ms</span>}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              const logs = await fetchComplianceLogs();
              downloadComplianceExport(logs);
            }}
          >
            <Shield className="w-4 h-4 mr-2" /> GDPR / KVKK export
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Vector search: senior react, B2B SaaS PM..." onKeyDown={(e) => e.key === 'Enter' && void search()} />
          <Input value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} placeholder="Skills filter" className="sm:max-w-xs" />
          <Button type="button" onClick={() => void search()} disabled={busy}>
            <Search className="w-4 h-4 mr-2" /> Search
          </Button>
        </div>

        <div className="rounded-2xl border border-border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="p-3">Candidate</th>
                <th className="p-3">Skills / strengths</th>
                <th className="p-3">Score</th>
                <th className="p-3">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-muted-foreground">
                    Run a search to populate the talent grid.
                  </td>
                </tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-muted-foreground">{r.skills || '—'}</td>
                  <td className="p-3">{r.score}</td>
                  <td className="p-3">{r.verdict.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </GatedAppPage>
  );
}
