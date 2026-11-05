import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export function AffiliateRecurringCard() {
  const [url, setUrl] = useState('');
  const [accrued, setAccrued] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/affiliate/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (cancelled || !res.ok) return;
      setUrl(String(json?.referralUrl || ''));
      setAccrued(Number(json?.partner?.lifetime_commission_usd || 0));
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-zinc-950/70 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">Affiliate · 30% recurring</p>
      <h3 className="mt-2 text-lg font-bold text-white">Share Sovereign, earn every renewal</h3>
      <p className="mt-1 text-sm text-zinc-400">
        {url ? `Accrued $${accrued.toFixed(2)} on your tracked link.` : 'Generate a partner link and keep 30% of each paid month.'}
      </p>
      <Button asChild className="mt-4 bg-amber-400 text-black hover:bg-amber-300">
        <Link to="/affiliates">{url ? 'Open affiliate ledger' : 'Become a partner'}</Link>
      </Button>
    </section>
  );
}
