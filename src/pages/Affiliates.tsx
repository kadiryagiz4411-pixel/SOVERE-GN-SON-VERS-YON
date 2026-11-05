import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { APP_DOMAIN } from '@/lib/plans';
import { LEMON_SQUEEZY_AFFILIATE_URL } from '@/lib/lemonsqueezy';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface AffiliatePayload {
  partner: {
    code: string;
    commission_pct: number;
    total_clicks: number;
    total_signups: number;
    total_paid_referrals: number;
    lifetime_commission_usd: number;
  } | null;
  referralUrl: string | null;
  commissionPct: number;
  commissions: Array<{
    id: string;
    commission_usd: number;
    invoice_usd: number;
    source_event: string;
    created_at: string;
    status: string;
  }>;
}

export default function Affiliates() {
  const { user } = useSession();
  const [data, setData] = useState<AffiliatePayload | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (create = false) => {
    if (!user) return;
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch('/api/affiliate/me', {
        method: create ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json().catch(() => null);
      if (res.ok) setData(json as AffiliatePayload);
    } catch (err) {
      console.error('[affiliates]', err);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load(false);
  }, [user?.id]);

  const copy = async () => {
    if (!data?.referralUrl) return;
    await navigator.clipboard.writeText(data.referralUrl);
    toast.success('Referral link copied');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <SEOHead
        title="Sovereign Affiliates — Earn 30% monthly recurring"
        description="Share Sovereign with freelancers and agencies. Earn 30% on every paid month for as long as they stay subscribed."
        canonical={`${APP_DOMAIN}/affiliates`}
      />
      <Header />
      <main className="container mx-auto px-4 pb-20 pt-28">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Creator program</p>
        <h1 className="mt-3 text-4xl font-black text-white md:text-5xl">Earn 30% on every recurring month</h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          Partners and creators get a tracked referral link. When a referred workspace pays, you accrue 30% of that invoice — and again on each renewal.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['1. Share your link', 'Use /ref?code= or Lemon Squeezy aff= tracking.'],
            ['2. They subscribe', 'First paid invoice creates a commission row.'],
            ['3. Renewals pay again', 'subscription_payment_success keeps the 30% ledger growing.'],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
              <h2 className="font-bold text-amber-300">{title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{body}</p>
            </article>
          ))}
        </div>

        {user ? (
          <section className="mt-10 rounded-3xl border border-amber-500/20 bg-zinc-950/80 p-6">
            <h2 className="text-2xl font-bold text-white">Your recurring ledger</h2>
            {!data?.partner ? (
              <Button className="mt-4 bg-amber-400 text-black hover:bg-amber-300" disabled={busy} onClick={() => void load(true)}>
                Generate my referral link
              </Button>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <code className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-amber-300">{data.referralUrl}</code>
                  <Button variant="outline" onClick={() => void copy()} className="border-amber-500/30">
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-4 text-sm">
                  <p>Clicks <strong className="block text-white">{data.partner.total_clicks}</strong></p>
                  <p>Paid referrals <strong className="block text-white">{data.partner.total_paid_referrals}</strong></p>
                  <p>Rate <strong className="block text-white">{data.commissionPct}%</strong></p>
                  <p>Accrued <strong className="block text-white">${Number(data.partner.lifetime_commission_usd || 0).toFixed(2)}</strong></p>
                </div>
                <ul className="space-y-2 text-sm text-zinc-400">
                  {(data.commissions || []).slice(0, 8).map((row) => (
                    <li key={row.id} className="flex justify-between border-b border-zinc-800 pb-2">
                      <span>{row.source_event} · {new Date(row.created_at).toLocaleDateString()}</span>
                      <span className="text-amber-300">${Number(row.commission_usd).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ) : (
          <Button asChild className="mt-8 bg-amber-400 text-black hover:bg-amber-300">
            <a href="/auth?mode=signup&intent=affiliate">Create a partner account</a>
          </Button>
        )}

        <a
          href={LEMON_SQUEEZY_AFFILIATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 text-sm text-amber-400 hover:underline"
        >
          Also join the Lemon Squeezy affiliate portal <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </main>
      <Footer />
    </div>
  );
}
