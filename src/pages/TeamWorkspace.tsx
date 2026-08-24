import { useEffect, useState } from 'react';
import { Building2, Mail, Crown, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';

const HR_SEATS = 5;

interface Seat {
  email: string;
  role: 'owner' | 'hr';
  status: 'active' | 'pending';
}

export default function TeamWorkspace() {
  const { user } = useSession();
  const [orgName, setOrgName] = useState('Your organization');
  const [inviteEmail, setInviteEmail] = useState('');
  const [seats, setSeats] = useState<Seat[]>([
    { email: user?.email || 'owner@company.com', role: 'owner', status: 'active' },
  ]);

  useEffect(() => {
    void loadTeam();
  }, [user?.id]);

  const loadTeam = async () => {
    if (!user?.id) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, full_name')
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();

      const orgId = (profile as { org_id?: string | null } | null)?.org_id;
      if (!orgId) return;

      const { data: org } = await supabase.from('organizations' as never).select('name').eq('id', orgId).maybeSingle();
      if ((org as { name?: string } | null)?.name) setOrgName((org as { name: string }).name);

      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', orgId);

      const { data: invites } = await supabase
        .from('organization_invites' as never)
        .select('email, role, status')
        .eq('organization_id', orgId);

      const next: Seat[] = [
        { email: user.email || 'owner@company.com', role: 'owner', status: 'active' },
      ];
      (members ?? []).forEach((m: { role?: string }) => {
        if (m.role === 'owner') return;
        next.push({ email: `${m.role || 'hr'}@seat`, role: 'hr', status: 'active' });
      });
      ((invites as Array<{ email: string; status: string }> | null) ?? []).forEach((inv) => {
        next.push({
          email: inv.email,
          role: 'hr',
          status: inv.status === 'accepted' ? 'active' : 'pending',
        });
      });
      setSeats(next.slice(0, 1 + HR_SEATS));
    } catch {
      // Keep local seat UI if remote tables are empty.
    }
  };

  const invite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    const hrCount = seats.filter((s) => s.role === 'hr').length;
    if (hrCount >= HR_SEATS) {
      toast.error('All 5 HR seats are used');
      return;
    }
    setSeats((prev) => [...prev, { email, role: 'hr', status: 'pending' }]);
    setInviteEmail('');
    toast.success(`Invitation queued for ${email}`);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .or(`user_id.eq.${user?.id},id.eq.${user?.id}`)
        .maybeSingle();
      const orgId = (profile as { org_id?: string | null } | null)?.org_id;
      if (!orgId || !user?.id) return;
      await supabase.from('organization_invites' as never).insert({
        organization_id: orgId,
        email,
        role: 'recruiter',
        invited_by: user.id,
        status: 'pending',
      } as never);
    } catch {
      // Local seat list already updated.
    }
  };

  const hrUsed = seats.filter((s) => s.role === 'hr').length;

  return (
    <GatedAppPage
      required="enterprise"
      featureName="Organization Team Workspace"
      description="Seat management (1 Owner + 5 HR seats) is locked to Enterprise."
    >
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-yellow-400 font-semibold">Enterprise</p>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-yellow-400" /> Team Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{orgName} · 1 Owner + {hrUsed}/{HR_SEATS} HR seats</p>
        </div>

        <div className="rounded-2xl border border-border divide-y divide-border">
          {seats.map((seat, i) => (
            <div key={seat.email + i} className="flex items-center gap-3 p-4">
              {seat.role === 'owner' ? <Crown className="w-4 h-4 text-amber-400" /> : <Mail className="w-4 h-4 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{seat.email}</p>
                <p className="text-xs text-muted-foreground uppercase">{seat.role} · {seat.status}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Invite HR email"
            disabled={hrUsed >= HR_SEATS}
          />
          <Button type="button" onClick={() => void invite()} disabled={hrUsed >= HR_SEATS}>
            <UserPlus className="w-4 h-4 mr-2" /> Invite
          </Button>
        </div>
      </div>
    </GatedAppPage>
  );
}
