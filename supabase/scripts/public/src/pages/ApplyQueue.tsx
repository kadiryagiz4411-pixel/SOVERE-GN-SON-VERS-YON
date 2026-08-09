import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useLanguage } from '@/i18n/LanguageContext';
import { CREDIT_COSTS } from '@/lib/plans';
import {
  Loader2, RefreshCw, Zap, Crown, ExternalLink, Check, X,
  ChevronDown, ChevronUp, Target, TrendingUp, AlertTriangle,
  Shield, Clock, Users, Sparkles, Send, Eye, Ban,
} from 'lucide-react';

interface QueueItem {
  id: string;
  job_title: string;
  company: string;
  platform: string;
  budget: string;
  job_url: string;
  job_description: string;
  match_score: number;
  acceptance_probability: number;
  match_reasoning: string[];
  rejection_reason: string | null;
  generated_proposal: string;
  status: string;
  user_notes: string;
  skills_matched: string[];
  competition_level: string;
  client_quality_score: number;
  urgency: string;
  batch_id: string;
  scanned_at: string;
  created_at: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  Upwork: 'bg-green-500/15 text-green-500 border-green-500/30',
  Fiverr: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  LinkedIn: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  Toptal: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
};

const ApplyQueue = () => {
  const { user } = useAuth();
  const { profile } = useProfile(user);
  const { language } = useLanguage();
  const plan = profile?.subscription_plan || 'basic';
  const credits = profile?.credits_balance || 0;

  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProposal, setEditingProposal] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const txt = {
    title: language === 'tr' ? 'Akıllı Başvuru Kuyruğu' : language === 'de' ? 'Intelligente Bewerbungswarteschlange' : language === 'fr' ? 'File de candidature intelligente' : 'Preloaded Apply Queue',
    subtitle: language === 'tr' ? 'Sovereign siz yokken en iyi fırsatları buldu' : language === 'de' ? 'Sovereign hat die besten Chancen gefunden' : language === 'fr' ? 'Sovereign a trouvé les meilleures opportunités' : 'Sovereign found your best opportunities while you were away',
    scan: language === 'tr' ? 'Yeni Fırsatları Tara' : language === 'de' ? 'Neue Chancen scannen' : language === 'fr' ? 'Rechercher des opportunités' : 'Scan New Opportunities',
    scanning: language === 'tr' ? 'Taranıyor...' : language === 'de' ? 'Wird gescannt...' : language === 'fr' ? 'Analyse en cours...' : 'Scanning...',
    approve: language === 'tr' ? 'Onayla' : language === 'de' ? 'Genehmigen' : language === 'fr' ? 'Approuver' : 'Approve',
    reject: language === 'tr' ? 'Reddet' : language === 'de' ? 'Ablehnen' : language === 'fr' ? 'Rejeter' : 'Reject',
    applyAll: language === 'tr' ? 'Seçilenleri Uygula' : language === 'de' ? 'Ausgewählte bewerben' : language === 'fr' ? 'Postuler aux sélectionnés' : 'Batch Apply Selected',
    noItems: language === 'tr' ? 'Henüz fırsat yok. Tarama yaparak başlayın.' : language === 'de' ? 'Noch keine Chancen. Starten Sie einen Scan.' : language === 'fr' ? 'Pas encore d\'opportunités. Lancez une recherche.' : 'No opportunities yet. Start a scan to find matches.',
    acceptance: language === 'tr' ? 'Kabul Olasılığı' : language === 'de' ? 'Annahmequote' : language === 'fr' ? 'Probabilité d\'acceptation' : 'Acceptance Probability',
    whyThis: language === 'tr' ? 'Neden bu iş?' : language === 'de' ? 'Warum dieser Job?' : language === 'fr' ? 'Pourquoi ce poste ?' : 'Why this job?',
    doNotApply: language === 'tr' ? 'Bu işe başvurmamalısınız' : language === 'de' ? 'Sie sollten sich NICHT bewerben' : language === 'fr' ? 'Vous ne devriez PAS postuler' : 'You should NOT apply to this job',
    editProposal: language === 'tr' ? 'Teklifi Düzenle' : language === 'de' ? 'Vorschlag bearbeiten' : language === 'fr' ? 'Modifier la proposition' : 'Edit Proposal',
    credits30: language === 'tr' ? '30 kredi' : language === 'de' ? '30 Credits' : language === 'fr' ? '30 crédits' : '30 credits',
    all: language === 'tr' ? 'Tümü' : language === 'de' ? 'Alle' : language === 'fr' ? 'Tout' : 'All',
    pending: language === 'tr' ? 'Bekleyen' : language === 'de' ? 'Ausstehend' : language === 'fr' ? 'En attente' : 'Pending',
    approved: language === 'tr' ? 'Onaylanan' : language === 'de' ? 'Genehmigt' : language === 'fr' ? 'Approuvé' : 'Approved',
    rejected: language === 'tr' ? 'Reddedilen' : language === 'de' ? 'Abgelehnt' : language === 'fr' ? 'Rejeté' : 'Rejected',
    upgradeNeeded: language === 'tr' ? 'Bu özellik Pro veya Elite plan gerektirir' : language === 'de' ? 'Pro- oder Elite-Plan erforderlich' : language === 'fr' ? 'Plan Pro ou Elite requis' : 'Upgrade to Pro or Elite to use Apply Queue',
  };

  const fetchQueue = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('apply_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setItems(data as unknown as QueueItem[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchQueue(); }, [user]);

  const handleScan = async () => {
    if (credits < 30) {
      toast.error(language === 'tr' ? 'Yetersiz kredi (30 kredi gerekli)' : 'Insufficient credits (30 credits required)');
      return;
    }
    setScanning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Not logged in'); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-jobs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Scan failed');
        return;
      }

      const data = await res.json();
      toast.success(`${data.count} ${language === 'tr' ? 'fırsat bulundu!' : 'opportunities found!'}`);
      await fetchQueue();
    } catch (err) {
      toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const proposal = editingProposal[id];
    const updates: any = { status };
    if (proposal !== undefined) {
      updates.generated_proposal = proposal;
    }
    
    await supabase.from('apply_queue').update(updates).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    toast.success(status === 'approved' ? (language === 'tr' ? 'Onaylandı' : 'Approved') : (language === 'tr' ? 'Reddedildi' : 'Rejected'));
  };

  const handleBatchApply = async () => {
    const approvedItems = items.filter(i => selectedIds.has(i.id) && i.status === 'approved');
    if (approvedItems.length === 0) {
      toast.error(language === 'tr' ? 'Önce fırsatları onaylayın' : 'Approve opportunities first');
      return;
    }

    // Mark as applied and create application entries
    for (const item of approvedItems) {
      await supabase.from('apply_queue').update({ status: 'applied' }).eq('id', item.id);
      await supabase.from('applications').insert({
        user_id: user!.id,
        job_title: item.job_title,
        company: item.company,
        job_url: item.job_url,
        job_description: item.job_description,
        generated_proposal: editingProposal[item.id] || item.generated_proposal,
        status: 'applied',
        acceptance_score: item.acceptance_probability,
      });
      // Create outcome tracking entry
      await supabase.from('outcome_tracking').insert({
        user_id: user!.id,
        queue_item_id: item.id,
        job_platform: item.platform,
        match_score_at_apply: item.match_score,
      });
    }

    setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, status: 'applied' } : i));
    setSelectedIds(new Set());
    toast.success(`${approvedItems.length} ${language === 'tr' ? 'başvuru oluşturuldu' : 'applications created'}`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = items.filter(i => filter === 'all' || i.status === filter);

  const getScoreColor = (s: number) => s >= 70 ? 'text-green-400' : s >= 45 ? 'text-amber-400' : 'text-red-400';
  const getScoreBg = (s: number) => s >= 70 ? 'from-green-500/20 to-green-500/5' : s >= 45 ? 'from-amber-500/20 to-amber-500/5' : 'from-red-500/20 to-red-500/5';

  const isPaid = plan === 'pro' || plan === 'elite';

  return (
    <AppShell user={user} plan={plan} creditsBalance={credits}>
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
            <Button onClick={() => window.location.href = '/pricing'} className="mt-4">
              {language === 'tr' ? 'Planları Gör' : 'View Plans'}
            </Button>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Button
                onClick={handleScan}
                disabled={scanning}
                className="bg-gradient-to-r from-amber-500 to-primary text-primary-foreground"
              >
                {scanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {scanning ? txt.scanning : txt.scan}
                <Badge variant="outline" className="ml-2 text-[10px]">{txt.credits30}</Badge>
              </Button>

              {selectedIds.size > 0 && (
                <Button onClick={handleBatchApply} variant="outline" className="border-green-500/30 text-green-500">
                  <Send className="w-4 h-4 mr-2" />
                  {txt.applyAll} ({selectedIds.size})
                </Button>
              )}

              <div className="flex gap-1 ml-auto">
                {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
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
                  const isRejected = !!item.rejection_reason;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border transition-all ${
                        isRejected
                          ? 'border-red-500/20 bg-red-500/5'
                          : item.status === 'approved'
                          ? 'border-green-500/20 bg-green-500/5'
                          : item.status === 'applied'
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
                          {/* Select checkbox */}
                          {item.status !== 'applied' && !isRejected && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                              className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                selectedIds.has(item.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                              }`}
                            >
                              {selectedIds.has(item.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                            </button>
                          )}

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
                              {item.status === 'approved' && (
                                <Badge className="bg-green-500/20 text-green-400 text-[10px]">Approved</Badge>
                              )}
                            </div>
                            <h3 className="text-sm font-semibold text-foreground truncate">{item.job_title}</h3>
                            <p className="text-xs text-muted-foreground">{item.company} • {item.budget}</p>
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

                        {/* Rejection warning */}
                        {isRejected && (
                          <div className="mt-3 flex items-start gap-2 bg-red-500/10 rounded-lg p-3">
                            <Ban className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="text-xs font-semibold text-red-400 uppercase">{txt.doNotApply}</span>
                              <p className="text-xs text-red-300/80 mt-0.5">{item.rejection_reason}</p>
                            </div>
                          </div>
                        )}

                        {/* Skills */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {item.skills_matched?.slice(0, 5).map((s, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
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
                                onClick={() => updateStatus(item.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Check className="w-4 h-4 mr-1" /> {txt.approve}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus(item.id, 'rejected')}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              >
                                <X className="w-4 h-4 mr-1" /> {txt.reject}
                              </Button>
                              {item.job_url && (
                                <a
                                  href={item.job_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all ml-auto"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {language === 'tr' ? 'İlanı Gör' : 'View Job'}
                                </a>
                              )}
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
