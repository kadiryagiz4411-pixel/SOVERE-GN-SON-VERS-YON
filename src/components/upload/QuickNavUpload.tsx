/**
 * Persistent 1-click file ingest in AppShell. Routes by smart intent.
 */

import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { analyzeFileIntent } from '@/lib/router/smartIntent';

export function QuickNavUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text().catch(() => '');
    const intent = analyzeFileIntent(text || file.name);
    sessionStorage.setItem('sovereign_quick_file_name', file.name);
    toast.success(intent.intent === 'JOB_POSTINGS' ? 'Job feed detected' : 'CV file detected');
    navigate(intent.intent === 'JOB_POSTINGS' ? '/dashboard/proposals' : '/dashboard/evaluator');
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.html,.htm,.txt"
        className="hidden"
        onChange={e => void onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 w-full"
        title="Drop a file from anywhere"
      >
        <Upload className="w-4 h-4" />
        Quick upload
      </button>
    </>
  );
}
