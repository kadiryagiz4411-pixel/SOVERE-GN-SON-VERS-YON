import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { FeatureGuard } from '@/components/auth/FeatureGuard';
import { PortfolioBuilderPanel } from '@/components/portfolio/Builder';

export default function PortfolioBuilder() {
  return (
    <GatedAppPage
      required="elite"
      featureName="Portfolio Website Builder"
      description="Live HTML/CSS portfolio export is locked to Elite and above."
    >
      <FeatureGuard feature="portfolio_builder">
        <PortfolioBuilderPanel />
      </FeatureGuard>
    </GatedAppPage>
  );
}
