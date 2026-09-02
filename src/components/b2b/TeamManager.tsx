import { useEffect, useState } from 'react';
import { Building2, Crown, Mail, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import { FeatureGuard } from '@/components/auth/FeatureGuard';

const HR_SEATS = 5;

export interface TeamSeat {
  id?: string;
  email: string;
  role: 'owner' | 'hr_seat';
  status: 'active' | 'pending';
}

export function TeamManager() {
  const { user } = useSession();
  const [orgName, setOrgName] = useState('Your organization');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [seats, setSeats] = useState<TeamSeat[]>([
    { email: user?.email || 'owner@company.com', role: 'owner', status: 'active' },
  ]);

  useEffect(() => {
    void loadTeam();
  }, [user?.id]);

  const loadTeam = async () => {
    if (!user?.id) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, full_name')
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();
    const id = (profile as { org_id?: string | null } | null)?.org_id ?? null;
    setOrgId(id);
    if (!id) return;

    const { data: org } = await supabase.from('organizations' as never).select('name').eq('id', id).maybeSingle();
    if ((org as { name?: string } | null)?.name) setOrgName((org as { name: string }).name);

    const { data: members } = await supabase
      .from('organization_members')
      .select('id, user_id, role, invited_email')
      .eq('organization_id', id);

    const next: TeamSeat[] = [{ email: user.email || 'owner@company.com', role: 'owner', status: 'active' }];
    ((members ?? []) as Array<{ id: string; role?: string; invited_email?: string | null }>).forEach((m) => {
      if (m.role === 'owner') return;
      next.push({
        id: m.id,
        email: m.invited_email || 'hr@seat',
        role: 'hr_seat',
        status: m.invited_email ? 'pending' : 'active',
      });
    });
    setSeats(next.slice(0, 1 + HR_SEATS));
  };

  const invite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    const hrCount = seats.filter((s) => s.role === 'hr_seat').length;
    if (hrCount >= HR_SEATS) {
      toast.error('All 5 HR seats are used');
      return;
    }
    setSeats((prev) => [...prev, { email, role: 'hr_seat', status: 'pending' }]);
    setInviteEmail('');
    toast.success(`Invitation sent to ${email}`);
    if (!orgId || !user?.id) return;
    await supabase.from('organization_members').insert({
      organization_id: orgId,
      user_id: user.id,
      role: 'hr_seat',
      invited_email: email,
      invited_by: user.id,
    } as never);
  };

  const hrUsed = seats.filter((s) => s.role === 'hr_seat').length;

  return (
    <FeatureGuard feature="team_workspace">
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-yellow-400 font-semibold">Enterprise</p>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-yellow-400" /> Team Workspace
          </h2>
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
    </FeatureGuard>
  );
}
