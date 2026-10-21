import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { isSuperAdminUser, resolveAuthEmail } from '@/lib/superadmin';

function adminEmails(): string[] {
  const fromEnv = String(
    import.meta.env.NEXT_PUBLIC_ADMIN_EMAIL || import.meta.env.VITE_ADMIN_EMAIL || '',
  )
    .trim()
    .toLowerCase();
  return Array.from(new Set(['kadiryagiz4411@gmail.com', fromEnv].filter(Boolean)));
}

export const useAdmin = (user: User | null) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const emailMatch = adminEmails().includes(resolveAuthEmail(user));
    if (isSuperAdminUser(user) || emailMatch) {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    const checkAdminRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error('[Sovereign Load Error]:', 'Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (err) {
        console.error('[Sovereign Load Error]:', 'admin role check threw', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user]);

  return { isAdmin, loading };
};
