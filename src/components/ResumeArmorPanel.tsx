import { useEffect, useState } from 'react';
import { armorResume, extractResumeFile, type ArmorResult } from '@/services/resumeArmor';

export function ResumeArmorPanel({
  jobText,
  seedResume,
}: {
  jobText: string;
  seedResume?: string;
}) {
  const [tab, setTab] = useState<'original' | 'armored'>('armored');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<ArmorResult | null>(
    seedResume ? armorResume(seedResume, jobText) : null,
  );

  const originalText = result?.original && result.original !== 'No resume text yet.' ? result.original : '';
  useEffect(() => {
    if (!originalText) return;
    const next = armorResume(originalText, jobText);
    setResult((prev) => (prev && prev.armored === next.armored ? prev : next));
  }, [jobText, originalText]);

  const runFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    setNote('Armoring resume…');
    try {
      const text = await extractResumeFile(file);
      if (text.length < 20) {
        setNote('Could not read that file. Try PDF, DOCX, or TXT.');
        return;
      }
      setResult(armorResume(text, jobText));
      setTab('armored');
      setNote('Armored resume ready.');
    } catch {
      setNote('Could not read that file. Try PDF, DOCX, or TXT.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full rounded-lg border border-amber-500/40 bg-zinc-950 p-3 space-y-3">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-500">Resume Armor</p>
        <p className="mt-1 text-xs text-zinc-400">Drop a PDF, DOCX, or TXT. Keywords lock to the open brief.</p>
      </div>
      <label
        className="flex min-h-[88px] cursor-pointer items-center justify-center rounded-md border border-amber-500/40 bg-zinc-950 px-3 text-center text-xs font-semibold uppercase tracking-wide text-amber-200"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void runFile(event.dataTransfer.files?.[0]);
        }}
      >
        {busy ? 'Reading file…' : 'Drop resume or click to upload'}
        <input
          type="file"
          accept=".pdf,.docx,.txt,.html,.htm,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            void runFile(file);
          }}
        />
      </label>
      {note ? <p className="text-[11px] text-zinc-400">{note}</p> : null}
      {result ? (
        <>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-amber-500/40 p-1">
            <button
              type="button"
              className={`rounded px-2 py-2 text-[10px] font-extrabold uppercase tracking-wide ${tab === 'original' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400'}`}
              onClick={() => setTab('original')}
            >
              Original Resume (Vulnerable to ATS)
            </button>
            <button
              type="button"
              className={`rounded px-2 py-2 text-[10px] font-extrabold uppercase tracking-wide ${tab === 'armored' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400'}`}
              onClick={() => setTab('armored')}
            >
              Sovereign Armored Resume (100% ATS Bypass Guaranteed)
            </button>
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-amber-500/20 bg-black p-3 text-xs text-zinc-200">
            {tab === 'original' ? result.original : result.armored}
          </pre>
        </>
      ) : null}
    </div>
  );
}
