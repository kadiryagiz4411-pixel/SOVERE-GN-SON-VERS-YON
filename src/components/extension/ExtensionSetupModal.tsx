import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

/** Pre-built zip served as a static asset from public/. */
const ZIP_URL = '/sovereign-extension.zip';

interface ExtensionSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExtensionSetupModal({ open, onOpenChange }: ExtensionSetupModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Install the Sovereign extension</DialogTitle>
          <DialogDescription>
            Chrome and Edge use the same Chromium package. Load it unpacked — Sovereign never auto-submits forms.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">1</span>
            <span>Download the ZIP and unzip it to a folder you will keep.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">2</span>
            <span>Open <code className="text-foreground">chrome://extensions</code> or <code className="text-foreground">edge://extensions</code>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">3</span>
            <span>Turn on Developer mode, click <strong className="text-foreground">Load unpacked</strong>, and select the unzipped <code className="text-foreground">sovereign-extension</code> folder.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">4</span>
            <span>Pin Sovereign, open a job post, and click the icon. Sign in on sovereignapp.pro so your plan applies.</span>
          </li>
        </ol>

        {/* Plain HTML anchor — no JS, no async, no silent failure modes. */}
        <Button asChild className="w-full">
          <a href={ZIP_URL} download="sovereign-extension.zip">
            <Download className="mr-2 h-4 w-4" />
            Download ZIP for Chrome / Edge
          </a>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
