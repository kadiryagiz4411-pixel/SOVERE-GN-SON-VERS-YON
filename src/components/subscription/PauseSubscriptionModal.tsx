import { useState } from "react";
import { PauseCircle, Briefcase, Building2, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { B2B_PAUSE_MONTHS, B2C_PAUSE_MONTHS, type PauseAudience } from "@/hooks/useSubscription";

interface PauseSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: PauseAudience;
  busy?: boolean;
  onConfirm: (reason: string) => Promise<unknown> | unknown;
}

const OPTIONS: Record<PauseAudience, { id: string; label: string; detail: string }> = {
  b2c: {
    id: "found_job",
    label: `I found a job — Pause subscription (Up to ${B2C_PAUSE_MONTHS} months)`,
    detail: "Billing is frozen. Your remaining credits stay in the account until you resume.",
  },
  b2b: {
    id: "low_workload",
    label: `Low agency workload — Pause subscription (Up to ${B2B_PAUSE_MONTHS} months)`,
    detail: "Recurring invoices pause. Seat credits are retained, not reset.",
  },
};

export function PauseSubscriptionModal({
  open, onOpenChange, audience, busy, onConfirm,
}: PauseSubscriptionModalProps) {
  const option = OPTIONS[audience];
  const [selected, setSelected] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-amber-400" />
            Pause Subscription
          </DialogTitle>
          <DialogDescription>
            Freeze recurring billing without losing unused credits. You can unpause anytime.
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() => setSelected(true)}
          className={`w-full text-left rounded-xl border p-4 transition-colors ${
            selected
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-border bg-muted/30"
          }`}
        >
          <div className="flex items-start gap-3">
            {audience === "b2b"
              ? <Building2 className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              : <Briefcase className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />}
            <div>
              <p className="text-sm font-semibold text-foreground">{option.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{option.detail}</p>
            </div>
          </div>
        </button>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Keep plan active
          </Button>
          <Button
            variant="gold"
            disabled={!selected || busy}
            onClick={async () => {
              await onConfirm(option.label);
              onOpenChange(false);
            }}
          >
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Pause subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
