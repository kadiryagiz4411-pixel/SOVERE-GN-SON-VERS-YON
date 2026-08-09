import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProposalView = () => {
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<{ generated_proposal: string; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }

    const fetchProposal = async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('generated_proposal, created_at')
        .eq('share_token', token)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProposal(data);
      }
      setLoading(false);
    };

    fetchProposal();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Proposal Not Found</h1>
          <p className="text-muted-foreground mb-6">This link may have expired or been removed.</p>
          <Link to="/auth?mode=signup">
            <Button variant="gold">
              Create Your Own Proposal <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Sovereign</span>
          </div>
          <Link to="/auth?mode=signup">
            <Button variant="gold" size="sm">
              Get Started Free <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Proposal Content */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6">
          <p className="text-xs text-muted-foreground">
            Shared on {new Date(proposal!.created_at).toLocaleDateString()}
          </p>
          <h1 className="text-2xl font-bold mt-1">Optimized Proposal</h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {proposal!.generated_proposal}
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
          <h2 className="text-lg font-bold mb-2">Want proposals like this?</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Sovereign AI generates optimized, high-converting proposals in seconds.
          </p>
          <Link to="/auth?mode=signup">
            <Button variant="gold" size="lg">
              Create Your Free Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Sovereign · <a href="/privacy" className="underline hover:text-foreground">Privacy</a>
      </footer>
    </div>
  );
};

export default ProposalView;
