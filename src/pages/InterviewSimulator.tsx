import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { FeatureGuard } from '@/components/auth/FeatureGuard';
import { InterviewSimulatorPanel } from '@/components/interview/Simulator';

export default function InterviewSimulator() {
  return (
    <GatedAppPage
      required="elite"
      featureName="AI Interview Simulator"
      description="Interactive voice and text mock interviews are locked to Elite and above."
    >
      <FeatureGuard feature="interview_simulator">
        <InterviewSimulatorPanel />
      </FeatureGuard>
    </GatedAppPage>
  );
}
