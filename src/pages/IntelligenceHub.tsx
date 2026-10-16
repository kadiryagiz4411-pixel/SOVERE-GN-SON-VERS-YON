/**
 * IntelligenceHub — Drop any single file. Smart intent routes to Module A or B.
 * Route: /dashboard/intelligence
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Layers, ClipboardList, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { Button } from '@/components/ui/button';
import { analyzeFileIntent } from '@/lib/router/smartIntent';
import { cn } from '@/lib/utils';

export default function IntelligenceHub() {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState('');

  const routeFile = async (file: File) => {
    const text = await file.text().catch(() => '');
    const result = analyzeFileIntent(text || file.name);
    setHint(`${result.intent === 'CANDIDATE_POOL' ? 'CVs' : 'Job postings'} detected (${Math.round(result.confidence * 100)}% confidence)`);
    toast.success(result.intent === 'CANDIDATE_POOL'
      ? 'This looks like a candidate pool — opening Evaluator'
      : 'This looks like a job feed — opening Proposal Engine');
    sessionStorage.setItem('sovereign_pending_upload_name', file.name);
    navigate(result.intent === 'CANDIDATE_POOL' ? '/dashboard/evaluator' : '/dashboard/proposals');
  };

  return (
    <GatedAppPage required="pro" featureName="Sovereign Intelligence Hub">
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold">Zero-friction routing</p>
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" /> Drop a file. We pick the module.
            </h1>
            <p className="text-sm text-muted-foreground">
              Never choose Evaluator vs Proposals first. Sovereign reads the document and routes you.
            </p>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) void routeFile(file);
            }}
            className={cn(
              'rounded-2xl border-2 border-dashed p-14 text-center',
              dragging ? 'border-primary bg-primary/5' : 'border-border bg-card',
            )}
          >
            <Upload className="w-8 h-8 mx-auto text-primary mb-3" />
            <p className="font-semibold">Drop PDF / HTML / TXT here</p>
            <p className="text-xs text-muted-foreground mt-1">{hint || 'CVs → Evaluator · Job feeds → Proposal Engine'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" className="h-16 gap-2" onClick={() => navigate('/dashboard/evaluator')}>
              <Layers className="w-4 h-4 text-amber-400" /> Multi-CV Evaluator
            </Button>
            <Button variant="outline" className="h-16 gap-2" onClick={() => navigate('/dashboard/proposals')}>
              <ClipboardList className="w-4 h-4 text-indigo-400" /> Multi-Job Proposals
            </Button>
          </div>
        </div>
      </div>
    </GatedAppPage>
  );
}
