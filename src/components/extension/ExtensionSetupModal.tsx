import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { downloadSovereignExtensionZip } from '@/lib/extensionPack';
import { Download, Loader2 } from 'lucide-react';

interface ExtensionSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExtensionSetupModal({ open, onOpenChange }: ExtensionSetupModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const ok = await downloadSovereignExtensionZip();
      if (!ok) setError('Could not pack the extension. Refresh and try again.');
    } catch {
      setError('Could not pack the extension. Refresh and try again.');
    } finally {
      setBusy(false);
    }
  };

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
            <span>Turn on Developer mode, click Load unpacked, and select the unzipped folder.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">4</span>
            <span>Pin Sovereign, open a job post, and click the icon. Sign in on sovereignapp.pro so your B2C or B2B plan applies.</span>
          </li>
        </ol>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button onClick={() => void download()} disabled={busy} className="w-full">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Download ZIP for Chrome / Edge
        </Button>
      </DialogContent>
    </Dialog>
  );
}
