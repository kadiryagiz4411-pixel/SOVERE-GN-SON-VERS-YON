import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap, Target, FileText, BarChart3, CheckCircle, Crown } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { APP_DOMAIN } from '@/lib/plans';
import { type Profession, getClusterForProfession, getAllProfessions } from '@/lib/freelanceClusters';

interface FreelanceSEOTemplateProps {
  platform: 'upwork' | 'fiverr' | 'generic';
  profession: Profession;
}

const platformLabels: Record<string, string> = {
  upwork: 'Upwork',
  fiverr: 'Fiverr',
  generic: 'Freelance',
};

export const FreelanceSEOTemplate = ({ platform, profession }: FreelanceSEOTemplateProps) => {
  const navigate = useNavigate();
  const cluster = getClusterForProfession(profession.id);
  const platformName = platformLabels[platform] || 'Freelance';

  const title = platform === 'generic'
    ? `Best Proposal for ${profession.label} — AI Proposal Generator`
    : `Best ${platformName} Proposal for ${profession.label} — AI Generator`;

  const metaDescription = platform === 'generic'
    ? `Create winning freelance proposals for ${profession.label} projects. AI-powered, template-driven, optimized for acceptance.`
    : `Generate a winning ${platformName} proposal for ${profession.label} jobs. AI-powered with ${cluster?.label || 'professional'} cluster optimization.`;

  const keywords = `${platformName} proposal ${profession.label}, ${profession.label} proposal template, best ${profession.label} proposal, freelance ${profession.label} proposal, ${platformName} cover letter ${profession.label}`;

  // Get related professions from same cluster
  const relatedProfessions = cluster
    ? cluster.professions.filter(p => p.id !== profession.id).slice(0, 4)
    : getAllProfessions().filter(p => p.id !== profession.id).slice(0, 4);

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: title,
        description: metaDescription,
        publisher: { '@type': 'Organization', name: 'Sovereign AI', url: APP_DOMAIN },
        datePublished: '2025-01-01',
        dateModified: new Date().toISOString().slice(0, 10),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `How do I write a winning ${platformName} proposal as a ${profession.label}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `A winning ${platformName} proposal for ${profession.label} follows a structured approach: ${cluster?.hookStructure || 'Start with a strong hook'}, then ${cluster?.bodyFlowTemplate || 'present your value'}. Sovereign AI generates this automatically using cluster-specific templates.`,
            },
          },
          {
            '@type': 'Question',
            name: `What makes a ${profession.label} proposal stand out on ${platformName}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${cluster?.proofStrategy || 'Include concrete proof of your work'} and ${cluster?.ctaLogic || 'end with a clear call-to-action'}. The ideal length is ${cluster?.optimalLength || '250-400 words'}.`,
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={title}
        description={metaDescription}
        canonical={`${APP_DOMAIN}${window.location.pathname}`}
        schema={schema}
        keywords={keywords}
      />
      <Header />

      <main>
        {/* Hero */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-background to-primary/5" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {cluster?.icon} {cluster?.label} Cluster · {platformName}
              </Badge>

              <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
                Stop Sending Generic {platformName} Proposals as a {profession.label}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {platform === 'upwork' && `Upwork's top ${profession.label}s use structured, cluster-optimized proposals — not copy-paste templates. Sovereign generates proposals tailored to your exact profession and platform.`}
                {platform === 'fiverr' && `Fiverr buyer requests require short, punchy responses. Sovereign generates ${profession.label}-specific proposals optimized for Fiverr's format.`}
                {platform === 'generic' && `Whether you're pitching clients directly or through platforms, Sovereign creates ${profession.label} proposals using proven ${cluster?.label} cluster templates.`}
              </p>

              {/* Score Preview Mock */}
              <div className="bg-card border border-border rounded-2xl p-6 mb-8 max-w-lg mx-auto text-left shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Proposal Acceptance Score</span>
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Live Preview</Badge>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-5xl font-bold text-emerald-500">74%</div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Top 20%</div>
                    <div className="text-xs text-muted-foreground">Before optimization</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Hook Strength', value: 68 },
                    { label: 'Client Pain Alignment', value: 72 },
                    { label: 'Skill Relevance', value: 81 },
                  ].map((bar) => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{bar.label}</span>
                        <span className="text-foreground font-medium">{bar.value}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-primary rounded-full" style={{ width: `${bar.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    ⚡ <strong>3 optimizations</strong> could push you to <strong>Top 5%</strong>
                  </p>
                </div>
              </div>

              <Button size="lg" variant="gold" className="text-base px-8 py-6" onClick={() => navigate('/auth?mode=signup')}>
                Generate My {profession.label} Proposal
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Free to start · No credit card required</p>
            </div>
          </div>
        </section>

        {/* Cluster Template Info */}
        {cluster && (
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground text-center mb-8">
                {cluster.icon} {profession.label} Proposal Template Structure
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: Zap, title: 'Hook Strategy', text: cluster.hookStructure },
                  { icon: FileText, title: 'Body Flow', text: cluster.bodyFlowTemplate },
                  { icon: Target, title: 'CTA Logic', text: cluster.ctaLogic },
                  { icon: BarChart3, title: 'Proof Strategy', text: cluster.proofStrategy },
                ].map((item) => (
                  <div key={item.title} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* What Sovereign Does */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Why Sovereign for {profession.label} Proposals?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Target, title: 'Cluster-Optimized', desc: `Templates designed specifically for ${cluster?.label} professionals. Not generic AI.`, tier: 'Free' },
                { icon: BarChart3, title: 'Acceptance Score', desc: 'Real probability score based on hook strength, skill relevance, and platform competition.', tier: 'Free' },
                { icon: Crown, title: 'Multi-Variant', desc: 'Technical, Persuasive, Standout, and Strategic proposal variants.', tier: 'Pro' },
              ].map((item) => (
                <div key={item.title} className="bg-card border border-border rounded-xl p-5 text-center">
                  <item.icon className="w-6 h-6 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold text-foreground mb-1 text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{item.desc}</p>
                  <Badge variant="outline" className="text-[10px]">{item.tier}</Badge>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related Professions — Internal Linking */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-xl font-bold text-foreground mb-6">
              Related {cluster?.label} Proposals
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {relatedProfessions.map((p) => (
                <a
                  key={p.id}
                  href={platform === 'generic' ? `/best-proposal/${p.id}` : `/${platform}-proposal/${p.id}`}
                  className="bg-card border border-border rounded-lg p-4 text-center hover:border-primary/30 transition-colors"
                >
                  <div className="text-sm font-medium text-foreground">{p.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{platformName} Proposal →</div>
                </a>
              ))}
            </div>
            {/* Cross-link to other platforms */}
            {platform !== 'generic' && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {platform !== 'upwork' && (
                  <a href={`/upwork-proposal/${profession.id}`} className="text-xs text-primary hover:underline">
                    Upwork Proposal for {profession.label} →
                  </a>
                )}
                {platform !== 'fiverr' && (
                  <a href={`/fiverr-proposal/${profession.id}`} className="text-xs text-primary hover:underline">
                    Fiverr Proposal for {profession.label} →
                  </a>
                )}
                <a href={`/best-proposal/${profession.id}`} className="text-xs text-primary hover:underline">
                  Best Proposal for {profession.label} →
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to Win More {platformName} Projects?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Generate your first AI-optimized {profession.label} proposal in seconds.
            </p>
            <Button size="lg" variant="gold" onClick={() => navigate('/auth?mode=signup')}>
              Start Free — No Credit Card
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
