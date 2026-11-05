import { Link, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import { ProposalsForTemplate } from '@/components/seo/ProposalsForTemplate';
import { APP_DOMAIN } from '@/lib/plans';
import { PROPOSAL_STACKS, slugifyStack, stackFromSlug } from '@/lib/proposalStacks';

export default function ProposalsForPage() {
  const { slug } = useParams<{ slug?: string }>();
  const clean = slugifyStack(slug || '');
  if (clean) {
    const stack = stackFromSlug(clean);
    if (stack) return <ProposalsForTemplate stack={stack} />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <SEOHead
        title="AI proposals for high-intent freelance stacks | Sovereign"
        description="Programmatic landing pages for freelance searches like React developer for Shopify and Python web scraping proposal."
        canonical={`${APP_DOMAIN}/proposals-for`}
        keywords="freelance proposal templates, react shopify proposal, python scraping proposal"
      />
      <Header />
      <main className="container mx-auto px-4 pb-20 pt-28">
        <h1 className="text-4xl font-black text-white">Proposals for every stack clients search</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Each page is generated from a high-intent freelance query. Open one, paste a brief, and score the draft.
        </p>
        <ul className="mt-8 grid gap-3 md:grid-cols-2">
          {PROPOSAL_STACKS.map((stack) => (
            <li key={stack.slug}>
              <Link
                to={`/proposals-for/${stack.slug}`}
                className="block rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 transition hover:border-amber-400/40"
              >
                <h2 className="text-lg font-bold text-amber-300">{stack.query}</h2>
                <p className="mt-1 text-sm text-zinc-400">{stack.headline}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
