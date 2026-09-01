import { PauseCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionPausedBannerProps {
  pauseUntil?: string | null;
  remainingCredits?: number;
  busy?: boolean;
  onUnpause: () => void;
}

export function SubscriptionPausedBanner({
  pauseUntil, remainingCredits, busy, onUnpause,
}: SubscriptionPausedBannerProps) {
  const until = pauseUntil
    ? new Date(pauseUntil).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <PauseCircle className="w-5 h-5 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-200">Subscription Paused</p>
        <p className="text-xs text-amber-200/80">
          Recurring billing is frozen
          {until ? ` until ${until}` : ""}. Remaining credits ({remainingCredits ?? 0}) are retained.
        </p>
      </div>
      <Button
        size="sm"
        variant="gold"
        className="shrink-0 gap-1.5"
        disabled={busy}
        onClick={onUnpause}
      >
        <Play className="w-3.5 h-3.5" />
        Unpause & Resume
      </Button>
    </div>
  );
}
