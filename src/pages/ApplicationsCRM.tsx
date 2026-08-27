/**
 * ApplicationsCRM.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Churn-Reduction Kanban CRM for tracking proposals through their lifecycle.
 *
 * Columns:  Sent → Interviewing → Won/Accepted → Rejected
 *
 * Features:
 *  - Drag-friendly column cards (click to move between stages)
 *  - "Follow-up Reminder" on Won items (90-day re-engagement timer)
 *  - Weekly Job Match alerts panel with 1-click "Generate Proposal"
 *  - Persisted to localStorage (Supabase sync is a future phase)
 */

import { useState, useCallback, useMemo } from 'react';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Send, Users, Trophy, XCircle, Plus, Trash2, Bell,
  ChevronRight, ChevronLeft, Clock, Briefcase, Zap,
  AlertCircle, ExternalLink, Edit3, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

type KanbanColumn = 'sent' | 'interviewing' | 'won' | 'rejected';

interface Proposal {
  id: string;
  title: string;
  client: string;
  platform: string;
  sentAt: string;          // ISO date
  budget?: string;
  column: KanbanColumn;
  followUpDate?: string;   // ISO date — set automatically on win
  notes?: string;
}

interface JobAlert {
  id: string;
  title: string;
  platform: string;
  budget: string;
  match: number;           // 0–100
  postedAt: string;
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: Array<{ id: KanbanColumn; label: string; icon: React.ElementType; color: string; accent: string }> = [
  { id: 'sent',         label: 'Sent',          icon: Send,    color: 'border-blue-500/30 bg-blue-500/5',     accent: 'text-blue-400' },
  { id: 'interviewing', label: 'Interviewing',  icon: Users,   color: 'border-violet-500/30 bg-violet-500/5', accent: 'text-violet-400' },
  { id: 'won',          label: 'Won / Accepted', icon: Trophy,  color: 'border-emerald-500/30 bg-emerald-500/5', accent: 'text-emerald-400' },
  { id: 'rejected',     label: 'Rejected',      icon: XCircle, color: 'border-red-500/30 bg-red-500/5',       accent: 'text-red-400' },
];

// ─── Demo seed data ───────────────────────────────────────────────────────────

const SEED_PROPOSALS: Proposal[] = [
  { id: 'p1', title: 'React Dashboard Development', client: 'TechCorp GmbH', platform: 'Upwork', sentAt: new Date(Date.now() - 3 * 864e5).toISOString(), budget: '$2,500', column: 'sent' },
  { id: 'p2', title: 'AI Chatbot Integration', client: 'RetailMax Ltd', platform: 'Fiverr', sentAt: new Date(Date.now() - 7 * 864e5).toISOString(), budget: '$1,800', column: 'interviewing' },
  { id: 'p3', title: 'E-Commerce Backend API', client: 'StartupXYZ', platform: 'Upwork', sentAt: new Date(Date.now() - 14 * 864e5).toISOString(), budget: '$4,000', column: 'won', followUpDate: new Date(Date.now() + 90 * 864e5).toISOString() },
  { id: 'p4', title: 'Mobile App Redesign', client: 'AppVenture Inc', platform: 'LinkedIn', sentAt: new Date(Date.now() - 10 * 864e5).toISOString(), budget: '$3,200', column: 'rejected' },
];

const SEED_JOB_ALERTS: JobAlert[] = [
  { id: 'j1', title: 'Senior React Developer for SaaS Dashboard', platform: 'Upwork', budget: '$50–80/hr', match: 94, postedAt: new Date(Date.now() - 2 * 3600e3).toISOString() },
  { id: 'j2', title: 'Full-Stack Node.js + Next.js App', platform: 'Freelancer', budget: '$3,000 fixed', match: 87, postedAt: new Date(Date.now() - 5 * 3600e3).toISOString() },
  { id: 'j3', title: 'AI Integration Engineer — OpenAI/LLMs', platform: 'Upwork', budget: '$60–100/hr', match: 81, postedAt: new Date(Date.now() - 12 * 3600e3).toISOString() },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysFromNow(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5);
}

function followUpLabel(iso: string): { label: string; urgent: boolean } {
  const days = daysFromNow(iso);
  if (days < 0)  return { label: `Overdue by ${Math.abs(days)} days`, urgent: true };
  if (days === 0) return { label: 'Follow up today!', urgent: true };
  if (days <= 14) return { label: `Follow up in ${days} days`, urgent: true };
  return { label: `Follow up ${formatDate(iso)}`, urgent: false };
}

// ─── Proposal card ────────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  columns,
  onMove,
  onDelete,
}: {
  proposal: Proposal;
  columns: typeof COLUMNS;
  onMove: (id: string, to: KanbanColumn) => void;
  onDelete: (id: string) => void;
}) {
  const colIdx   = columns.findIndex((c) => c.id === proposal.column);
  const canLeft  = colIdx > 0;
  const canRight = colIdx < columns.length - 1;
  const followUp = proposal.followUpDate ? followUpLabel(proposal.followUpDate) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2 hover:border-primary/30 transition-colors group">
      {/* Title + actions */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground leading-tight">{proposal.title}</p>
        <button
          type="button"
          onClick={() => onDelete(proposal.id)}
          className="text-muted-foreground/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
          aria-label="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{proposal.client}</span>
        <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium">{proposal.platform}</span>
        {proposal.budget && <span className="text-foreground font-medium">{proposal.budget}</span>}
      </div>

      <p className="text-[10px] text-muted-foreground/60">Sent {formatDate(proposal.sentAt)}</p>

      {/* Follow-up reminder */}
      {proposal.column === 'won' && followUp && (
        <div className={cn(
          'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs',
          followUp.urgent
            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            : 'bg-muted/40 text-muted-foreground',
        )}>
          <Bell className="w-3 h-3 shrink-0" />
          {followUp.label}
        </div>
      )}

      {/* Move controls */}
      <div className="flex items-center gap-1 pt-1">
        {canLeft && (
          <button
            type="button"
            onClick={() => onMove(proposal.id, columns[colIdx - 1].id)}
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            {columns[colIdx - 1].label}
          </button>
        )}
        <div className="flex-1" />
        {canRight && (
          <button
            type="button"
            onClick={() => onMove(proposal.id, columns[colIdx + 1].id)}
            className="flex items-center gap-0.5 text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
          >
            {columns[colIdx + 1].label}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add proposal form ────────────────────────────────────────────────────────

function AddProposalForm({ column, onAdd, onCancel }: {
  column: KanbanColumn;
  onAdd: (p: Omit<Proposal, 'id'>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle]     = useState('');
  const [client, setClient]   = useState('');
  const [platform, setPlatform] = useState('Upwork');
  const [budget, setBudget]   = useState('');

  const handleAdd = () => {
    if (!title.trim() || !client.trim()) { toast.error('Title and client are required.'); return; }
    onAdd({
      title: title.trim(),
      client: client.trim(),
      platform,
      budget: budget.trim(),
      sentAt: new Date().toISOString(),
      column,
      followUpDate: column === 'won' ? new Date(Date.now() + 90 * 864e5).toISOString() : undefined,
    });
    onCancel();
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-3 space-y-2">
      <input
        autoFocus
        placeholder="Project title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        placeholder="Client name"
        value={client}
        onChange={(e) => setClient(e.target.value)}
        className="w-full text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none"
        >
          {['Upwork', 'Fiverr', 'Freelancer', 'LinkedIn', 'Direct', 'Other'].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <input
          placeholder="Budget"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-24 text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAdd} className="flex-1 text-xs gap-1"><Check className="w-3 h-3" />Add</Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs">Cancel</Button>
      </div>
    </div>
  );
}

// ─── Job alert card ───────────────────────────────────────────────────────────

function JobAlertCard({ job, onGenerate }: { job: JobAlert; onGenerate: (job: JobAlert) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 flex items-start gap-4">
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
        job.match >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        : job.match >= 80 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        : 'bg-muted text-muted-foreground border border-border',
      )}>
        {job.match}%
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{job.title}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium">{job.platform}</span>
          <span className="text-foreground font-medium">{job.budget}</span>
          <span>{Math.round((Date.now() - new Date(job.postedAt).getTime()) / 3600e3)}h ago</span>
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => onGenerate(job)}
        className="shrink-0 gap-1.5 text-xs bg-primary hover:bg-primary/90"
      >
        <Zap className="w-3 h-3" />
        Generate
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const LS_KEY = 'sovereign_crm_proposals';

function loadProposals(): Proposal[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Proposal[]) : SEED_PROPOSALS;
  } catch {
    return SEED_PROPOSALS;
  }
}

function saveProposals(proposals: Proposal[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(proposals)); } catch { /* ignore */ }
}

export default function ApplicationsCRM() {
  const navigate   = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>(loadProposals);
  const [adding, setAdding]       = useState<KanbanColumn | null>(null);
  const [jobAlerts]               = useState<JobAlert[]>(SEED_JOB_ALERTS);

  const updateProposals = useCallback((next: Proposal[]) => {
    setProposals(next);
    saveProposals(next);
  }, []);

  const moveProposal = useCallback((id: string, to: KanbanColumn) => {
    updateProposals(
      proposals.map((p) =>
        p.id === id
          ? {
              ...p,
              column: to,
              followUpDate: to === 'won'
                ? new Date(Date.now() + 90 * 864e5).toISOString()
                : p.followUpDate,
            }
          : p,
      ),
    );
  }, [proposals, updateProposals]);

  const deleteProposal = useCallback((id: string) => {
    updateProposals(proposals.filter((p) => p.id !== id));
    toast.success('Proposal removed.');
  }, [proposals, updateProposals]);

  const addProposal = useCallback((data: Omit<Proposal, 'id'>) => {
    const next: Proposal[] = [
      ...proposals,
      { ...data, id: `p-${Date.now()}` },
    ];
    updateProposals(next);
    toast.success('Proposal added.');
  }, [proposals, updateProposals]);

  const handleGenerate = useCallback((job: JobAlert) => {
    navigate(`/batch-proposal?title=${encodeURIComponent(job.title)}&platform=${job.platform}`);
  }, [navigate]);

  const stats = useMemo(() => ({
    sent:         proposals.filter((p) => p.column === 'sent').length,
    interviewing: proposals.filter((p) => p.column === 'interviewing').length,
    won:          proposals.filter((p) => p.column === 'won').length,
    winRate:      proposals.length
      ? Math.round((proposals.filter((p) => p.column === 'won').length / proposals.length) * 100)
      : 0,
    upcomingFollowUps: proposals.filter(
      (p) => p.column === 'won' && p.followUpDate && daysFromNow(p.followUpDate) <= 14
    ).length,
  }), [proposals]);

  return (
    <GatedAppPage>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card/50 px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Proposals CRM
              </h1>
              <p className="text-sm text-muted-foreground">Track, win, and re-engage clients</p>
            </div>
            {/* Quick stats */}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-muted-foreground">Active:</span>
                <span className="font-semibold">{stats.sent + stats.interviewing}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-muted-foreground">Won:</span>
                <span className="font-semibold text-emerald-400">{stats.won}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-muted-foreground">Win rate:</span>
                <span className="font-semibold text-amber-400">{stats.winRate}%</span>
              </div>
              {stats.upcomingFollowUps > 0 && (
                <Badge className="gap-1 bg-amber-500/20 text-amber-300 border-amber-500/30">
                  <Bell className="w-3 h-3" />
                  {stats.upcomingFollowUps} follow-up{stats.upcomingFollowUps > 1 ? 's' : ''} due
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
          {/* ── Kanban board ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map((col) => {
              const colProposals = proposals.filter((p) => p.column === col.id);
              const Icon = col.icon;

              return (
                <div key={col.id} className="flex flex-col gap-3">
                  {/* Column header */}
                  <div className={cn('rounded-xl border px-4 py-2.5 flex items-center justify-between', col.color)}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn('w-4 h-4', col.accent)} />
                      <span className={cn('text-sm font-semibold', col.accent)}>{col.label}</span>
                    </div>
                    <span className={cn(
                      'text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center',
                      colProposals.length > 0 ? col.accent : 'text-muted-foreground',
                      colProposals.length > 0 ? col.color : '',
                    )}>
                      {colProposals.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 flex-1 min-h-[120px]">
                    {colProposals.map((p) => (
                      <ProposalCard
                        key={p.id}
                        proposal={p}
                        columns={COLUMNS}
                        onMove={moveProposal}
                        onDelete={deleteProposal}
                      />
                    ))}

                    {adding === col.id ? (
                      <AddProposalForm
                        column={col.id}
                        onAdd={addProposal}
                        onCancel={() => setAdding(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAdding(col.id)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/40 border border-dashed border-border/50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add proposal
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Weekly Job Match Alerts ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Weekly Job Match Alerts</h2>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  {jobAlerts.length} new matches
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" />
                View all on Upwork
              </Button>
            </div>

            <div className="space-y-3">
              {jobAlerts.map((job) => (
                <JobAlertCard key={job.id} job={job} onGenerate={handleGenerate} />
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Job matches refresh weekly based on your profile skills. Update your skills in{' '}
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="text-primary hover:underline"
              >
                Profile Settings
              </button>.
            </p>
          </section>

          {/* ── Follow-up Reminders ─────────────────────────────────────────── */}
          {proposals.filter((p) => p.column === 'won' && p.followUpDate).length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-semibold text-foreground">Re-engagement Reminders</h2>
              </div>

              <div className="space-y-2">
                {proposals
                  .filter((p) => p.column === 'won' && p.followUpDate)
                  .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
                  .map((p) => {
                    const fu = followUpLabel(p.followUpDate!);
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          'rounded-xl border px-4 py-3 flex items-center gap-4',
                          fu.urgent
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-border bg-card/40',
                        )}
                      >
                        <Trophy className={cn('w-4 h-4 shrink-0', fu.urgent ? 'text-amber-400' : 'text-emerald-400')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.client}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn('text-xs font-medium', fu.urgent ? 'text-amber-400' : 'text-muted-foreground')}>
                            {fu.label}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1"
                            onClick={() => handleGenerate({ id: p.id, title: `Re-engagement: ${p.title}`, platform: p.platform, budget: p.budget ?? '', match: 100, postedAt: new Date().toISOString() })}
                          >
                            <Edit3 className="w-3 h-3" />
                            Draft Proposal
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}
        </div>
      </div>
    </GatedAppPage>
  );
}
