import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import { FitScorePanicTester } from '@/components/growth/FitScorePanicTester';
import { useSession } from '@/contexts/SessionContext';
import { APP_DOMAIN } from '@/lib/plans';
import { Link } from 'react-router-dom';

export default function FitScoreChecker() {
  const { user } = useSession();
  const title = 'Upwork Proposal & Resume Match Checker — Free Fit Score';
  const description = 'Paste a job brief and your proposal. Get an instant Fit Score (0–100%) and see if clients will filter you out before you send.';

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <SEOHead
        title={title}
        description={description}
        canonical={`${APP_DOMAIN}/fit-score`}
        keywords="upwork proposal checker, resume match score, fit score tester, freelance proposal analyzer"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Sovereign Fit Score Checker',
          url: `${APP_DOMAIN}/fit-score`,
          applicationCategory: 'BusinessApplication',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          description,
        }}
      />
      <Header />
      <main className="container mx-auto px-4 pb-20 pt-28">
        <FitScorePanicTester variant="page" signedIn={Boolean(user)} />
        <p className="mt-8 text-center text-sm text-zinc-500">
          Looking for a stack-specific pitch? Browse{' '}
          <Link className="text-amber-400 hover:underline" to="/proposals-for">
            proposal landing pages
          </Link>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}
