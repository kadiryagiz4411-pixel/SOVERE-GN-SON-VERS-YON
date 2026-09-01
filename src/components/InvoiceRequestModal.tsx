import { useState } from "react";
import { FileText, Building2, Hash, MapPin, ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEMON_SQUEEZY_CUSTOMER_PORTAL } from "@/hooks/useSubscription";

interface InvoiceRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPortal: () => Promise<string | void> | string | void;
  busy?: boolean;
}

export function InvoiceRequestModal({
  open, onOpenChange, onOpenPortal, busy,
}: InvoiceRequestModalProps) {
  const [company, setCompany] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");

  const handleContinue = async () => {
    const url = await onOpenPortal();
    if (!url) window.open(LEMON_SQUEEZY_CUSTOMER_PORTAL, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-400" />
            Tax Invoice / Company Details
          </DialogTitle>
          <DialogDescription>
            Official PDF invoices are issued by Lemon Squeezy. Add your company name, VAT / Tax ID,
            and billing address in the customer portal, then download invoices instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5" /> Company Name
            </Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Talent GmbH" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Hash className="w-3.5 h-3.5" /> Tax ID / VAT Number
            </Label>
            <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="DE123456789" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5" /> Business Address
            </Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, Country" />
          </div>
          <p className="text-xs text-muted-foreground">
            These fields are a checklist — Lemon Squeezy stores the legal billing identity used on PDFs.
            Click continue to open the portal (`lemonSqueezy.url`) and save them there.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="gold" onClick={handleContinue} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
            Open Lemon Squeezy Portal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
