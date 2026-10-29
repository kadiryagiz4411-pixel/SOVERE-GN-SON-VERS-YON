import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSession } from '@/contexts/SessionContext';
import { isOwnerEmail } from '@/lib/superadmin';
import { opportunityToQueueRow } from '@/lib/opportunityFallback';
import { fetchLiveOpportunities, normalizeOpportunityUrl, type OpportunityPlatform } from '@/lib/opportunities';
import { skillsForMatching } from '@/lib/matchScore';
import { OpportunitiesScanner, OpportunityJobLink } from '@/components/apply/OpportunitiesScanner';
import { useApplyQueue } from '@/hooks/useApplyQueue';
import {
  Loader2, Crown, Copy,
  ChevronDown, Target, TrendingUp,
  Shield, Users, Sparkles,
} from 'lucide-react';

const PLATFORM_COLORS: Record<string, string> = {
  Upwork: 'bg-green-500/15 text-green-500 border-green-500/30',
  Fiverr: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  Freelancer: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  LinkedIn: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
};

const ApplyQueue = () => {
  // Use the global SessionContext user — it is always resolved before the
  // page renders (SessionProvider waits for getSession). This prevents the
  // false "Please sign in" toast that fires when useAuth()'s own loading
  // state initialises with user=null before getSession() completes.
  const { user } = useSession();
  const { profile } = useProfile(user);
  const { language } = useLanguage();
  const credits = profile?.credits_balance || 0;
  const { isByokUnlimited, hasApplyQueueAccess, displayTier } = useSession();

  const { items, loading, refresh, invalidate } = useApplyQueue(user?.id);
  const [scanning, setScanning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProposal, setEditingProposal] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'pending'>('all');
  const [platformFilter, setPlatformFilter] = useState<'All' | OpportunityPlatform>('All');

  const txt = {
    title: language === 'tr' ? 'Akıllı Başvuru Kuyruğu' : language === 'de' ? 'Intelligente Bewerbungswarteschlange' : language === 'fr' ? 'File de candidature intelligente' : 'Preloaded Apply Queue',
    subtitle: language === 'tr' ? 'Sovereign siz yokken en iyi fırsatları buldu' : language === 'de' ? 'Sovereign hat die besten Chancen gefunden' : language === 'fr' ? 'Sovereign a trouvé les meilleures opportunités' : 'Sovereign found your best opportunities while you were away',
    scan: language === 'tr' ? 'Tara ve Yenile' : language === 'de' ? 'Scannen & Aktualisieren' : language === 'fr' ? 'Analyser & Actualiser' : 'Scan & Refresh',
    scanning: language === 'tr' ? 'Taranıyor...' : language === 'de' ? 'Wird gescannt...' : language === 'fr' ? 'Analyse en cours...' : 'Scanning…',
    copyProposal: language === 'tr' ? 'Teklifi kopyala' : language === 'de' ? 'Vorschlag kopieren' : language === 'fr' ? 'Copier la proposition' : 'Copy Proposal',
    viewOriginal: language === 'tr' ? 'Platformda gör / başvur ↗' : language === 'de' ? 'Auf der Plattform öffnen ↗' : language === 'fr' ? 'Voir / postuler ↗' : 'View / Apply on Platform ↗',
    noItems: language === 'tr' ? 'Henüz fırsat yok. Tarama yaparak başlayın.' : language === 'de' ? 'Noch keine Chancen. Starten Sie einen Scan.' : language === 'fr' ? 'Pas encore d\'opportunités. Lancez une recherche.' : 'No opportunities yet. Start a scan to find matches.',
    acceptance: language === 'tr' ? 'Kabul Olasılığı' : language === 'de' ? 'Annahmequote' : language === 'fr' ? 'Probabilité d\'acceptation' : 'Acceptance Probability',
    whyThis: language === 'tr' ? 'Neden bu iş?' : language === 'de' ? 'Warum dieser Job?' : language === 'fr' ? 'Pourquoi ce poste ?' : 'Why this job?',
    doNotApply: language === 'tr' ? 'Bu işe başvurmamalısınız' : language === 'de' ? 'Sie sollten sich NICHT bewerben' : language === 'fr' ? 'Vous ne devriez PAS postuler' : 'You should NOT apply to this job',
    editProposal: language === 'tr' ? 'Teklifi Düzenle' : language === 'de' ? 'Vorschlag bearbeiten' : language === 'fr' ? 'Modifier la proposition' : 'Edit Proposal',
    credits30: language === 'tr' ? '30 kredi' : language === 'de' ? '30 Credits' : language === 'fr' ? '30 crédits' : '30 credits',
    all: language === 'tr' ? 'Tümü' : language === 'de' ? 'Alle' : language === 'fr' ? 'Tout' : 'All',
    pending: language === 'tr' ? 'Bekleyen' : language === 'de' ? 'Ausstehend' : language === 'fr' ? 'En attente' : 'Pending',
    upgradeNeeded: language === 'tr' ? 'Bu özellik Pro veya Elite plan gerektirir' : language === 'de' ? 'Pro- oder Elite-Plan erforderlich' : language === 'fr' ? 'Plan Pro ou Elite requis' : 'Upgrade to Pro or Elite to use Apply Queue',
  };

  const handleScan = async () => {
    if (!isUnlimitedUser && credits < 30) {
      toast.error(language === 'tr' ? 'Yetersiz kredi (30 kredi gerekli)' : 'Insufficient credits (30 credits required)');
      return;
    }
    if (!user?.id) {
      toast.error(language === 'tr' ? 'Oturum gerekli' : 'Please sign in');
      return;
    }
    const profileSkills = skillsForMatching({
      skills: [
        ...(Array.isArray(profile?.skills) ? profile.skills : []),
        String(profile?.onboarding_role || ''),
        String(profile?.onboarding_industry || ''),
      ],
      profession: String(profile?.profession_cluster || ''),
    });
    setScanning(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);

    try {
      const query = profileSkills.join(',');
      const live = await fetchLiveOpportunities({
        query,
        platform: platformFilter,
        signal: controller.signal,
      });

      const existing = new Set(items.map((item) => normalizeOpportunityUrl(item.job_url)));
      const fresh = live.items.filter((item) => item.url && !existing.has(normalizeOpportunityUrl(item.url)));
      const batchId = crypto.randomUUID();
      const matchProfile = {
        skills: profileSkills,
        experience: String(profile?.experience || ''),
        profession: String(profile?.profession_cluster || profile?.onboarding_role || ''),
        hourlyRate: typeof profile?.hourly_rate === 'number' ? profile.hourly_rate : null,
      };
      const rows = fresh.map((item) => opportunityToQueueRow(item, user.id, batchId, matchProfile));

      if (rows.length) {
        const { error } = await supabase.from('apply_queue').insert(rows);
        if (error) throw error;
      }

      if (!isUnlimitedUser && live.items.length) {
        try {
          await supabase.rpc('apply_credit_change', {
            _user_id: user.id,
            _amount: -30,
            _transaction_type: 'usage',
            _reference_type: 'scan_jobs',
            _reference_id: batchId,
            _description: `Live opportunity scan: ${fresh.length} new listings`,
          });
        } catch {
          // Credits are best-effort; never freeze the scan UI on RPC failure.
        }
      }

      if (!live.items.length) {
        toast.error(language === 'tr'
          ? 'Canlı ilan bulunamadı. Fiverr/LinkedIn için uzantıdan Analyze kullanın.'
          : 'No live listings returned. Use the extension Analyze button on Fiverr or LinkedIn briefs.');
      } else {
        toast.success(`${fresh.length} ${language === 'tr' ? 'yeni canlı fırsat eklendi' : 'new live opportunities added'} (${live.items.length} scanned)`);
      }
      // Auto-refresh queue from Supabase after scan — no separate Refresh button needed.
      await invalidate();
      await refresh().catch(() => undefined);
    } catch (err) {
      console.error('[ApplyQueue scan]', err);
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      toast.error(aborted
        ? (language === 'tr' ? 'Tarama zaman aşımına uğradı. Tekrar deneyin.' : 'Scan timed out. Try again.')
        : (language === 'tr'
          ? 'Canlı tarama tamamlanamadı. Ağ bağlantınızı kontrol edip tekrar deneyin.'
          : 'Live scan could not complete. Check your connection and try again.'));
    } finally {
      window.clearTimeout(timeout);
      setScanning(false);
    }
  };

  const filtered = items.filter((i) => {
    const statusOk = filter === 'all' || i.status === filter;
    const platformOk = platformFilter === 'All' || i.platform === platformFilter;
    return statusOk && platformOk;
  });
  const platformCounts = {
    All: items.length,
    Fiverr: items.filter((i) => i.platform === 'Fiverr').length,
    Upwork: items.filter((i) => i.platform === 'Upwork').length,
    Freelancer: items.filter((i) => i.platform === 'Freelancer').length,
    LinkedIn: items.filter((i) => i.platform === 'LinkedIn').length,
  };

  const getScoreColor = (s: number) => s >= 70 ? 'text-green-400' : s >= 45 ? 'text-amber-400' : 'text-red-400';
  const getScoreBg = (s: number) => s >= 70 ? 'from-green-500/20 to-green-500/5' : s >= 45 ? 'from-amber-500/20 to-amber-500/5' : 'from-red-500/20 to-red-500/5';

  const isUnlimitedUser =
    isOwnerEmail(user?.email) ||
    hasApplyQueueAccess ||
    isByokUnlimited ||
    Boolean((profile as any)?.is_superadmin);

  const isPaid = isUnlimitedUser;

  return (
    <AppShell user={user} plan={displayTier.id} creditsBalance={credits}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-primary flex items-center justify-center">
              <Target className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{txt.title}</h1>
              <p className="text-sm text-muted-foreground">{txt.subtitle}</p>
            </div>
          </div>
        </div>

        {!isPaid ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
            <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">{txt.upgradeNeeded}</h2>
            <Button asChild className="mt-4">
              <Link to="/pricing">{language === 'tr' ? 'Planları Gör' : 'View Plans'}</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="mb-6">
              <OpportunitiesScanner
                platform={platformFilter}
                onPlatformChange={setPlatformFilter}
                scanning={scanning}
                onScan={handleScan}
                scanLabel={txt.scan}
                scanningLabel={txt.scanning}
                creditLabel={txt.credits30}
                counts={platformCounts}
              />
              <div className="flex gap-1 ml-auto">
                {(['all', 'pending'] as const).map(f => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="text-xs"
                  >
                    {txt[f]}
                    {f !== 'all' && <span className="ml-1 opacity-60">({items.filter(i => i.status === f).length})</span>}
                  </Button>
                ))}
              </div>
            </div>

            {/* Queue List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 rounded-xl border border-border bg-card">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">{txt.noItems}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border backdrop-blur-md bg-slate-900/60 transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10 ${
                        item.status === 'applied'
                          ? 'border-blue-500/20 bg-blue-500/5'
                          : 'border-border bg-card'
                      }`}
                    >
                      {/* Card Header */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${PLATFORM_COLORS[item.platform] || 'bg-muted text-muted-foreground'}`}>
                                {item.platform}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                item.urgency === 'high' ? 'bg-red-500/15 text-red-400' : item.urgency === 'medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground'
                              }`}>
                                {item.urgency === 'high' ? '🔥' : item.urgency === 'medium' ? '⚡' : '📋'} {item.urgency}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                item.competition_level === 'low' ? 'bg-green-500/15 text-green-400' : item.competition_level === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                              }`}>
                                <Users className="w-3 h-3 inline mr-0.5" /> {item.competition_level}
                              </span>
                              {item.status === 'applied' && (
                                <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">Applied</Badge>
                              )}
                            </div>
                            <h3 className="text-sm font-semibold text-foreground truncate">{item.job_title}</h3>
                            <p className="text-xs text-muted-foreground">{item.company} • {item.budget}</p>
                            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                              <OpportunityJobLink
                                url={item.job_url}
                                platform={item.platform}
                                title={item.job_title}
                                label={txt.viewOriginal}
                              />
                            </div>
                          </div>

                          {/* Scores */}
                          <div className="flex gap-2">
                            <div className={`flex flex-col items-center min-w-[55px] rounded-lg p-2 bg-gradient-to-b ${getScoreBg(item.match_score)}`}>
                              <span className={`text-lg font-bold ${getScoreColor(item.match_score)}`}>{item.match_score}%</span>
                              <span className="text-[8px] text-muted-foreground uppercase">Match</span>
                            </div>
                            <div className={`flex flex-col items-center min-w-[55px] rounded-lg p-2 bg-gradient-to-b ${getScoreBg(item.acceptance_probability)}`}>
                              <span className={`text-lg font-bold ${getScoreColor(item.acceptance_probability)}`}>{item.acceptance_probability}%</span>
                              <span className="text-[8px] text-muted-foreground uppercase">{language === 'tr' ? 'Kabul' : 'Accept'}</span>
                            </div>
                          </div>

                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Skills */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {item.skills_matched?.slice(0, 5).map((s) => (
                            <span key={`${item.id}-${s}`} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                          ))}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-border px-4 py-4 space-y-4">
                          {/* Job Description */}
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                              {language === 'tr' ? 'İş Açıklaması' : 'Job Description'}
                            </h4>
                            <p className="text-sm text-foreground/80 whitespace-pre-line">{item.job_description}</p>
                          </div>

                          {/* Why this job */}
                          <div>
                            <h4 className="text-xs font-semibold text-amber-500 uppercase mb-2 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> {txt.whyThis}
                            </h4>
                            <ul className="space-y-1">
                              {(item.match_reasoning as string[])?.map((r, i) => (
                                <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                                  <span className="text-amber-500 mt-0.5">◆</span> {r}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Acceptance Probability Breakdown */}
                          <div className="bg-muted/30 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-foreground uppercase mb-2 flex items-center gap-1">
                              <Shield className="w-3 h-3 text-primary" /> {txt.acceptance}: {item.acceptance_probability}%
                            </h4>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.acceptance_probability >= 70 ? 'bg-green-500' : item.acceptance_probability >= 45 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${item.acceptance_probability}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {language === 'tr' ? 'Rekabet' : 'Competition'}: {item.competition_level}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {language === 'tr' ? 'Müşteri Kalitesi' : 'Client Quality'}: {item.client_quality_score}%
                              </span>
                            </div>
                          </div>

                          {/* Generated Proposal (editable) */}
                          <div>
                            <h4 className="text-xs font-semibold text-foreground uppercase mb-2 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-primary" /> {txt.editProposal}
                            </h4>
                            <Textarea
                              value={editingProposal[item.id] ?? item.generated_proposal}
                              onChange={(e) => setEditingProposal(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="min-h-[200px] text-sm"
                              disabled={item.status === 'applied'}
                            />
                          </div>

                          {/* Actions */}
                          {item.status !== 'applied' && (
                            <div className="flex items-center gap-3 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const text = editingProposal[item.id] ?? item.generated_proposal;
                                  if (!text) return;
                                  try {
                                    await navigator.clipboard.writeText(text);
                                    toast.success(language === 'tr'
                                      ? 'Teklif kopyalandı. Orijinal ilanda elle yapıştırın.'
                                      : 'Proposal copied. Paste it yourself on the original job post.');
                                  } catch {
                                    toast.error(language === 'tr' ? 'Kopyalanamadı' : 'Could not copy');
                                  }
                                }}
                              >
                                <Copy className="w-4 h-4 mr-1" /> {txt.copyProposal}
                              </Button>
                              <OpportunityJobLink
                                url={item.job_url}
                                platform={item.platform}
                                title={item.job_title}
                                label={txt.viewOriginal}
                                className="ml-auto"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default ApplyQueue;
