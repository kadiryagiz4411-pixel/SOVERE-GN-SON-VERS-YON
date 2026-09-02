import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { TalentPoolPanel } from '@/components/b2b/TalentPool';

export default function TalentPoolHub() {
  return (
    <GatedAppPage
      required="enterprise"
      featureName="Talent Pool Vector Search"
      description="Sub-3s candidate pool search is locked to Enterprise."
    >
      <TalentPoolPanel />
    </GatedAppPage>
  );
}
