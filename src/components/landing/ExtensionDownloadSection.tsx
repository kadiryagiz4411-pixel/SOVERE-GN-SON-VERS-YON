import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExtensionSetupModal } from '@/components/extension/ExtensionSetupModal';
import { downloadSovereignExtensionZip } from '@/lib/extensionPack';
import { Chrome, Download, Loader2, Puzzle } from 'lucide-react';

// Set this to your published Chrome Web Store URL once the extension is listed.
// Until then, the button falls back to the ZIP download.
const CWS_URL = '';

export function ExtensionDownloadSection() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const ok = await downloadSovereignExtensionZip();
      if (!ok) {
        // ZIP builder failed — open setup guide which explains manual install.
        setOpen(true);
      }
    } catch {
      setError('Download failed — check your connection and try again, or use the Setup guide below.');
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="extension" className="relative scroll-mt-32 overflow-visible bg-slate-950 py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl rounded-3xl border border-violet-500/25 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 md:p-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-300">
            <Puzzle className="h-3.5 w-3.5" />
            Chrome Extension
          </div>
          <h2 className="text-3xl font-black leading-tight text-slate-100 md:text-5xl">
            Analyze the open job. Pitch in one click.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-400">
            The Sovereign side panel reads the job you actually opened — not the feed — then writes a human proposal or a tailored CV. Individual plans stay on B2C. Agency plans unlock B2B lead routing. It never auto-submits.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {CWS_URL ? (
              <Button size="lg" asChild className="gap-2">
                <a href={CWS_URL} target="_blank" rel="noopener noreferrer">
                  <Chrome className="h-4 w-4" />
                  Add to Chrome (Web Store)
                </a>
              </Button>
            ) : (
              <Button size="lg" onClick={() => void download()} disabled={busy} className="gap-2">
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Chrome className="h-4 w-4" />
                )}
                {busy ? 'Preparing download…' : 'Download Extension (.zip)'}
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={() => setOpen(true)} className="gap-2">
              <Download className="h-4 w-4" />
              Setup guide
            </Button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}

          <p className="mt-4 text-xs text-slate-500">
            {CWS_URL
              ? 'After installing from the Web Store, sign in here so the extension picks up your B2C or B2B workspace.'
              : 'Unzip → enable Developer mode in Chrome → Load unpacked. Sign in on this site so the extension picks up your B2C or B2B workspace.'}
          </p>
        </div>
      </div>
      <ExtensionSetupModal open={open} onOpenChange={setOpen} />
    </section>
  );
}
