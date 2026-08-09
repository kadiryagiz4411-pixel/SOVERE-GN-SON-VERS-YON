import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { GuaranteeBadge } from '@/components/GuaranteeBadge';
import {
  Building2, Users, TrendingUp, Trophy, Download, Upload,
  RefreshCw, Loader2, UserMinus, Mail, BarChart3, Copy, Check,
  Shield, Crown, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrgMember {
  user_id: string;
  full_name: string | null;
  email: string;
  org_role: string;
  credits_balance: number;
  subscription_plan: string;
  optimizations: number;
  interviews: number;
  latest_score: number;
  joined_at: string;
}

interface OrgInfo {
  id: string;
  name: string;
  license_key: string;
  max_seats: number;
  used_seats: number;
  expires_at: string | null;
  logo_url: string | null;
  default_cv_template: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ────────────────────────────────────────────────────────────
const Organization = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [bulkEmails, setBulkEmails] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sortField, setSortField] = useState<keyof OrgMember>('joined_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [brandingUrl, setBrandingUrl] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);

  // ── Auth + org load ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { navigate('/auth'); return; }
      setUser(session.user);
      loadOrgData(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) navigate('/auth');
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadOrgData = async (userId: string) => {
    try {
      // Get profile with org info
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, org_role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile?.org_id || profile.org_role !== 'org_admin') {
        toast.error('Access denied. Organization admin role required.');
        navigate('/dashboard');
        return;
      }

      // Get org details
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.org_id)
        .maybeSingle();

      if (orgData) {
        setOrg(orgData as OrgInfo);
        setBrandingUrl(orgData.logo_url ?? '');
      }

      await loadMembers(userId);
    } catch {
      toast.error('Failed to load organization data.');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (userId: string) => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase.rpc('get_org_members', { _admin_user_id: userId });
      if (error) throw error;
      setMembers((data as OrgMember[]) ?? []);
    } catch {
      toast.error('Failed to load member data.');
    } finally {
      setLoadingMembers(false);
    }
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const avgScore = members.length
    ? Math.round(members.reduce((s, m) => s + (m.latest_score ?? 0), 0) / members.length)
    : 0;
  const totalInterviews = members.reduce((s, m) => s + (m.interviews ?? 0), 0);
  const totalOptimizations = members.reduce((s, m) => s + (m.optimizations ?? 0), 0);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleCopyKey = () => {
    if (!org) return;
    navigator.clipboard.writeText(org.license_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success('License key copied!');
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user) return;
    setRemovingId(memberId);
    try {
      const { data, error } = await supabase.rpc('remove_org_member', {
        _admin_user_id: user.id,
        _member_user_id: memberId,
      });
      if (error || !data) throw error ?? new Error('Failed');
      setMembers(prev => prev.filter(m => m.user_id !== memberId));
      toast.success('Member removed from organization.');
    } catch {
      toast.error('Failed to remove member.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleExportCSV = () => {
    if (!org) return;
    const rows: string[][] = [
      ['Name', 'Email', 'Role', 'Optimizations', 'Latest ATS Score', 'Interviews', 'Joined'],
      ...members.map(m => [
        m.full_name ?? 'Unknown',
        m.email,
        m.org_role,
        String(m.optimizations),
        String(m.latest_score),
        String(m.interviews),
        new Date(m.joined_at).toLocaleDateString(),
      ]),
    ];
    downloadCSV(`${org.name}-career-impact-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success('Career Impact Report exported!');
  };

  const handleBulkInvite = async () => {
    const emails = bulkEmails.split(/[\n,;]+/).map(e => e.trim()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (emails.length === 0) { toast.error('Enter at least one valid email address.'); return; }
    if (!org) return;
    setSendingInvites(true);
    try {
      // For each email, call the email-webhook edge function to send invite
      await Promise.allSettled(emails.map(email =>
        supabase.functions.invoke('email-webhook', {
          body: {
            event: 'org_invite',
            email,
            org_name: org.name,
            license_key: org.license_key,
          },
        })
      ));
      toast.success(`Invites sent to ${emails.length} email${emails.length > 1 ? 's' : ''}!`);
      setBulkEmails('');
    } catch {
      toast.error('Some invites may have failed. Check your edge function logs.');
    } finally {
      setSendingInvites(false);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const emails = text.split(/[\r\n]+/).flatMap(line => line.split(',')).map(e => e.replace(/"/g, '').trim()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    setBulkEmails(emails.join('\n'));
    toast.success(`Loaded ${emails.length} emails from CSV`);
    e.target.value = '';
  };

  const handleSaveBranding = async () => {
    if (!org) return;
    setSavingBranding(true);
    try {
      const { error } = await supabase.from('organizations').update({ logo_url: brandingUrl || null }).eq('id', org.id);
      if (error) throw error;
      setOrg(prev => prev ? { ...prev, logo_url: brandingUrl || null } : prev);
      toast.success('Branding settings saved!');
    } catch {
      toast.error('Failed to save branding.');
    } finally {
      setSavingBranding(false);
    }
  };

  const toggleSort = (field: keyof OrgMember) => {
    if (sortField === field) setSortAsc(v => !v);
    else { setSortField(field); setSortAsc(false); }
  };

  const sortedMembers = [...members].sort((a, b) => {
    const av = a[sortField] ?? '';
    const bv = b[sortField] ?? '';
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell user={user} plan={user ? 'elite' : 'free'}>
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {org?.logo_url
                ? <img src={org.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-contain" />
                : <Building2 className="w-6 h-6 text-primary" />
              }
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{org?.name ?? 'Organization'}</h1>
              <p className="text-sm text-muted-foreground">Organization Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => user && loadMembers(user.id)} disabled={loadingMembers}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingMembers ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── License key card ─────────────────────────────────────────── */}
        {org && (
          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">License Key</p>
              <code className="text-sm font-mono font-bold text-foreground tracking-wider">{org.license_key}</code>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Seats</p>
                <p className="text-sm font-bold text-foreground">{org.used_seats} / {org.max_seats}</p>
              </div>
              {org.expires_at && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="text-sm font-bold text-foreground">{new Date(org.expires_at).toLocaleDateString()}</p>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleCopyKey}>
                {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-2">{copiedKey ? 'Copied' : 'Copy Key'}</span>
              </Button>
            </div>
          </div>
        )}

        {/* ── Stat cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Enrolled Students',
              value: `${org?.used_seats ?? 0} / ${org?.max_seats ?? 0}`,
              sub: 'seats used',
              icon: Users,
              color: 'text-primary',
            },
            {
              label: 'Avg ATS Score',
              value: `${avgScore}%`,
              sub: 'across all students',
              icon: BarChart3,
              color: 'text-green-500',
            },
            {
              label: 'Optimizations',
              value: totalOptimizations,
              sub: 'CVs processed',
              icon: TrendingUp,
              color: 'text-amber-500',
            },
            {
              label: 'Interviews Landed',
              value: totalInterviews,
              sub: 'from your cohort',
              icon: Trophy,
              color: 'text-primary',
            },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
              </div>
            );
          })}
        </div>

        {/* ── Seat usage bar ───────────────────────────────────────────── */}
        {org && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Seat Utilization</span>
              <span className="text-sm text-muted-foreground">{org.used_seats}/{org.max_seats}</span>
            </div>
            <Progress value={(org.used_seats / org.max_seats) * 100} className="h-2" />
            {org.used_seats >= org.max_seats * 0.9 && (
              <p className="text-xs text-amber-500 mt-2">Seats nearly full. Contact support to expand your license.</p>
            )}
          </div>
        )}

        {/* ── Student roster ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Student Roster
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{members.length}</span>
            </h2>
          </div>

          {loadingMembers ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No members yet. Share your license key to enroll students.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {[
                      { label: 'Name', field: 'full_name' },
                      { label: 'Email', field: 'email' },
                      { label: 'Role', field: 'org_role' },
                      { label: 'Optimizations', field: 'optimizations' },
                      { label: 'Latest ATS', field: 'latest_score' },
                      { label: 'Interviews', field: 'interviews' },
                      { label: 'Joined', field: 'joined_at' },
                      { label: '', field: null },
                    ].map(col => (
                      <th
                        key={col.label}
                        className={`px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${col.field ? 'cursor-pointer hover:text-foreground' : ''}`}
                        onClick={() => col.field && toggleSort(col.field as keyof OrgMember)}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {col.field && sortField === col.field && (
                            sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedMembers.map(member => (
                    <tr key={member.user_id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{member.full_name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{member.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={member.org_role === 'org_admin' ? 'default' : 'secondary'} className="text-[10px]">
                          {member.org_role === 'org_admin' ? (
                            <><Crown className="w-2.5 h-2.5 mr-1" />Admin</>
                          ) : 'Student'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-foreground">{member.optimizations}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${member.latest_score >= 80 ? 'text-green-500' : member.latest_score >= 60 ? 'text-amber-500' : 'text-red-400'}`}>
                          {member.latest_score > 0 ? `${member.latest_score}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {member.interviews > 0 ? (
                          <span className="flex items-center justify-center gap-1 text-amber-500 text-xs font-medium">
                            <Trophy className="w-3 h-3" />{member.interviews}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {member.org_role !== 'org_admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-500 hover:bg-red-500/10 h-7 px-2"
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={removingId === member.user_id}
                          >
                            {removingId === member.user_id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <UserMinus className="w-3.5 h-3.5" />
                            }
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Bulk invite ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Bulk Student Invite
            </h2>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleCSVUpload} className="hidden" />
          </div>
          <textarea
            className="w-full min-h-[100px] rounded-xl border border-border bg-muted/30 text-sm text-foreground p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Enter student emails, one per line or comma-separated&#10;e.g. student1@example.com, student2@example.com"
            value={bulkEmails}
            onChange={e => setBulkEmails(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {bulkEmails.split(/[\n,;]+/).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())).length} valid emails detected
            </p>
            <Button variant="gold" size="sm" onClick={handleBulkInvite} disabled={sendingInvites || !bulkEmails.trim()}>
              {sendingInvites ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Mail className="w-4 h-4 mr-2" />Send Invites</>}
            </Button>
          </div>
        </div>

        {/* ── Branding settings ────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Institutional Branding
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Logo URL (optional)</label>
              <Input
                placeholder="https://yourschool.edu/logo.png"
                value={brandingUrl}
                onChange={e => setBrandingUrl(e.target.value)}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Logo appears on student CV exports and the org dashboard.</p>
            </div>
            <div className="flex items-end">
              <Button variant="default" onClick={handleSaveBranding} disabled={savingBranding} className="w-full">
                {savingBranding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Branding'}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Guarantee badge ──────────────────────────────────────────── */}
        <GuaranteeBadge />

        <div className="h-6" />
      </div>
    </AppShell>
  );
};

export default Organization;
