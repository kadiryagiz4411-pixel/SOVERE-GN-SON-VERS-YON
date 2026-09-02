import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { TeamManager } from '@/components/b2b/TeamManager';

export default function TeamWorkspace() {
  return (
    <GatedAppPage
      required="enterprise"
      featureName="Organization Team Workspace"
      description="Seat management (1 Owner + 5 HR seats) is locked to Enterprise."
    >
      <div className="p-6 max-w-3xl mx-auto">
        <TeamManager />
      </div>
    </GatedAppPage>
  );
}
