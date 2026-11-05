import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { APP_DOMAIN } from '@/lib/plans';
import { FitScorePanicTester } from '@/components/growth/FitScorePanicTester';
import { PROPOSAL_STACKS, type ProposalStack } from '@/lib/proposalStacks';

interface ProposalsForTemplateProps {
  stack: ProposalStack;
}

export function ProposalsForTemplate({ stack }: ProposalsForTemplateProps) {
  const title = `${stack.query} — AI proposal template | Sovereign`;
  const description = `Win ${stack.intent} with a tailored ${stack.query} proposal. Instant Fit Score, skill-gap map, and AI rewrite.`;
  const canonical = `${APP_DOMAIN}/proposals-for/${stack.slug}`;
  const related = PROPOSAL_STACKS.filter((item) => item.slug !== stack.slug).slice(0, 6);

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: title,
        description,
        url: canonical,
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `How do I write a ${stack.query} proposal?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Lead with a first-week result, name the ${stack.stack.join(', ')} overlap, and close the gaps (${stack.gaps.join(', ') || 'proof and delivery'}) in one concrete example.`,
            },
          },
          {
            '@type': 'Question',
            name: `Why do ${stack.query} proposals get rejected?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Clients filter generic openers. Sovereign scores the brief against your draft and rewrites the hook so it matches the job language.',
            },
          },
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: APP_DOMAIN },
          { '@type': 'ListItem', position: 2, name: 'Proposals', item: `${APP_DOMAIN}/proposals-for` },
          { '@type': 'ListItem', position: 3, name: stack.query, item: canonical },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <SEOHead
        title={title}
        description={description}
        canonical={canonical}
        keywords={`${stack.query}, ${stack.stack.join(', ')} proposal, freelance ${stack.query} cover letter`}
        schema={schema}
      />
      <Header />
      <main className="container mx-auto px-4 pb-20 pt-28">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Programmatic SEO · {stack.stack.join(' / ')}</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white md:text-5xl">
          Proposals for {stack.query}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          High-intent freelance search: {stack.headline.toLowerCase()}. Score your draft, then unlock a tailored rewrite.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-amber-500/20 bg-zinc-950/70 p-5">
            <h2 className="text-lg font-bold text-amber-300">Hooks that get opened</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {stack.hooks.map((hook) => (
                <li key={hook} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  {hook}
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
            <h2 className="text-lg font-bold text-white">Gaps clients filter for</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {(stack.gaps.length ? stack.gaps : ['proof', 'delivery date']).map((gap) => (
                <li key={gap} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                  {gap}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="mt-10">
          <FitScorePanicTester variant="landing" />
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="bg-amber-400 text-black hover:bg-amber-300">
            <Link to="/auth?mode=signup&intent=rewrite">
              Generate this proposal <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-amber-500/30 text-amber-200">
            <Link to="/fit-score">Open the full Fit Score tester</Link>
          </Button>
        </div>

        <nav className="mt-14" aria-label="Related proposal pages">
          <h2 className="text-xl font-bold text-white">More high-intent stacks</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link className="text-amber-400 hover:underline" to={`/proposals-for/${item.slug}`}>
                  {item.query}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
