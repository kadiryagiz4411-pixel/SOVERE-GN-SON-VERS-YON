import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Crown, Shield, Users, Loader2, Search, X, ChevronLeft, ChevronRight, Download, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, RefreshCw, Activity, Key, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { OWNER_EMAIL, OWNER_PRIVILEGES } from '@/lib/superadmin';

// ─── System Health Types ──────────────────────────────────────────────────────
type HealthStatus = 'checking' | 'ok' | 'warn' | 'error';
interface HealthItem {
  label: string;
  status: HealthStatus;
  detail?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  subscription_plan: string;
  daily_proposals_used: number;
  created_at: string;
}

type SortField = 'full_name' | 'subscription_plan' | 'daily_proposals_used' | 'created_at';
type SortDirection = 'asc' | 'desc';

const USERS_PER_PAGE = 10;

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin(user);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // ── System Health ────────────────────────────────────────────────────────────
  const [health, setHealth] = useState<HealthItem[]>([
    { label: 'Supabase DB', status: 'checking' },
    { label: 'OpenAI API Key', status: 'checking' },
    { label: 'Edge Function', status: 'checking' },
  ]);
  const [healthChecking, setHealthChecking] = useState(false);

  const runHealthChecks = useCallback(async () => {
    setHealthChecking(true);
    const results: HealthItem[] = [];

    // 1. Supabase DB
    try {
      const { error } = await supabase.from('profiles').select('user_id').limit(1);
      results.push({
        label: 'Supabase DB',
        status: error ? 'error' : 'ok',
        detail: error ? error.message : 'Connected',
      });
    } catch (e: any) {
      results.push({ label: 'Supabase DB', status: 'error', detail: e?.message ?? 'Unreachable' });
    }

    // 2. OpenAI API Key
    const apiKey = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ?? '';
    results.push({
      label: 'OpenAI API Key',
      status: apiKey ? 'ok' : 'warn',
      detail: apiKey ? `Configured (…${apiKey.slice(-4)})` : 'Not set — edge functions use server-side key',
    });

    // 3. Edge Function ping (generate-proposal OPTIONS)
    try {
      const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';
      const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
      const res = await fetch(`${base}/functions/v1/generate-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ _healthCheck: true }),
      });
      // 400 / 422 means the function is alive (just rejecting bad payload)
      const alive = res.status < 500 || res.status === 405;
      results.push({
        label: 'Edge Function',
        status: alive ? 'ok' : 'error',
        detail: alive ? `HTTP ${res.status} — function reachable` : `HTTP ${res.status} — function may be down`,
      });
    } catch (e: any) {
      results.push({ label: 'Edge Function', status: 'error', detail: e?.message ?? 'Network error' });
    }

    setHealth(results);
    setHealthChecking(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
    }
  }, [isAdmin, adminLoading, user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      runHealthChecks();
    }
  }, [isAdmin, runHealthChecks]);

  // Reset to page 1 when filters or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, planFilter, sortField, sortDirection]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } else {
      setUsers(data || []);
    }
    setLoadingUsers(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        user.user_id.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Plan filter
      const normalizedPlan = user.subscription_plan === 'basic' ? 'free' : user.subscription_plan;
      const matchesPlan = planFilter === 'all' || normalizedPlan === planFilter;
      
      return matchesSearch && matchesPlan;
    });
  }, [users, searchQuery, planFilter]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'full_name':
          aValue = (a.full_name || '').toLowerCase();
          bValue = (b.full_name || '').toLowerCase();
          break;
        case 'subscription_plan':
          aValue = a.subscription_plan === 'basic' ? 'free' : a.subscription_plan;
          bValue = b.subscription_plan === 'basic' ? 'free' : b.subscription_plan;
          break;
        case 'daily_proposals_used':
          aValue = a.daily_proposals_used;
          bValue = b.daily_proposals_used;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedUsers.length / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const updateUserPlan = async (userId: string, newPlan: string) => {
    setUpdatingUser(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_plan: newPlan })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user plan:', error);
      toast.error('Failed to update user plan');
    } else {
      toast.success(`User plan updated to ${newPlan}`);
      setUsers(users.map(u => 
        u.user_id === userId ? { ...u, subscription_plan: newPlan } : u
      ));
    }
    setUpdatingUser(null);
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'elite':
        return 'default';
      case 'pro':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'elite':
        return <Crown className="h-3 w-3" />;
      case 'pro':
        return <Shield className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setPlanFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || planFilter !== 'all';

  const exportToCSV = () => {
    const headers = ['Name', 'User ID', 'Plan', 'Daily Usage', 'Joined'];
    const csvData = sortedUsers.map(user => [
      user.full_name || 'Unnamed User',
      user.user_id,
      user.subscription_plan === 'basic' ? 'free' : user.subscription_plan,
      user.daily_proposals_used.toString(),
      new Date(user.created_at).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(`Exported ${sortedUsers.length} users to CSV`);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Manage users and their subscription plans</p>
            </div>
          </div>
        </div>

        {/* ── SuperAdmin Identity Banner ─────────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">SuperAdmin: {OWNER_EMAIL}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unlimited credits · Enterprise B2B · All paywalls bypassed · {OWNER_PRIVILEGES.monthly_credit_limit.toLocaleString()} credits/mo
              </p>
            </div>
          </div>
          <Badge className="self-start sm:self-center bg-primary/20 text-primary border-primary/30">
            Tier {OWNER_PRIVILEGES.appsumo_tier} · B2B_ENTERPRISE
          </Badge>
        </div>

        {/* ── System Health Panel ───────────────────────────────────────── */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">System Health</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={runHealthChecks}
                disabled={healthChecking}
                className="h-8 gap-2 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${healthChecking ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {health.map((item) => {
                const icon =
                  item.status === 'checking' ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> :
                  item.status === 'ok'       ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                  item.status === 'warn'     ? <AlertCircle className="h-4 w-4 text-amber-500" /> :
                                              <AlertCircle className="h-4 w-4 text-destructive" />;
                const bg =
                  item.status === 'ok'   ? 'border-emerald-500/20 bg-emerald-500/5' :
                  item.status === 'warn' ? 'border-amber-500/20 bg-amber-500/5' :
                  item.status === 'error'? 'border-destructive/20 bg-destructive/5' :
                                          'border-border bg-muted/30';
                return (
                  <div key={item.label} className={`rounded-lg border p-4 ${bg}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {icon}
                      <span className="text-sm font-semibold">{item.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.detail ?? 'Checking…'}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                {users.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Free Users</CardDescription>
              <CardTitle className="text-2xl">
                {users.filter(u => u.subscription_plan === 'free' || u.subscription_plan === 'basic').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pro Users</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                {users.filter(u => u.subscription_plan === 'pro').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Elite Users</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                {users.filter(u => u.subscription_plan === 'elite').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  View and manage user subscription plans
                </CardDescription>
              </div>
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Filter by plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="elite">Elite</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" onClick={exportToCSV} disabled={sortedUsers.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sortedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {hasActiveFilters ? 'No users match your filters' : 'No users found'}
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedUsers.length)} of {sortedUsers.length} users
                  {hasActiveFilters && ` (filtered from ${users.length} total)`}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="h-auto p-0 font-medium hover:bg-transparent flex items-center"
                          onClick={() => handleSort('full_name')}
                        >
                          User
                          {getSortIcon('full_name')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="h-auto p-0 font-medium hover:bg-transparent flex items-center"
                          onClick={() => handleSort('subscription_plan')}
                        >
                          Current Plan
                          {getSortIcon('subscription_plan')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="h-auto p-0 font-medium hover:bg-transparent flex items-center"
                          onClick={() => handleSort('daily_proposals_used')}
                        >
                          Daily Usage
                          {getSortIcon('daily_proposals_used')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="h-auto p-0 font-medium hover:bg-transparent flex items-center"
                          onClick={() => handleSort('created_at')}
                        >
                          Joined
                          {getSortIcon('created_at')}
                        </Button>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {profile.full_name || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {profile.user_id.slice(0, 8)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getPlanBadgeVariant(profile.subscription_plan)}
                            className="flex items-center gap-1 w-fit"
                          >
                            {getPlanIcon(profile.subscription_plan)}
                            {profile.subscription_plan === 'basic' ? 'free' : profile.subscription_plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {profile.daily_proposals_used} proposals today
                        </TableCell>
                        <TableCell>
                          {new Date(profile.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={profile.subscription_plan === 'basic' ? 'free' : profile.subscription_plan}
                            onValueChange={(value) => updateUserPlan(profile.user_id, value)}
                            disabled={updatingUser === profile.user_id}
                          >
                            <SelectTrigger className="w-32">
                              {updatingUser === profile.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="elite">Elite</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, index) => (
                        page === 'ellipsis' ? (
                          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        )
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
