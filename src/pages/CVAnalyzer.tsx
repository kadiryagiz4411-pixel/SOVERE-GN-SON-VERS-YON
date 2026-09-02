import { useMemo, useState } from 'react';
import { ShieldAlert, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GatedAppPage } from '@/components/auth/GatedAppPage';
import { FeatureGuard } from '@/components/auth/FeatureGuard';
import { analyzeTextLocally, interpretFluffScore } from '@/services/b2b/fraudDetector';

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

interface Range { label: string; start: number; end: number }

function parseRanges(text: string): Range[] {
  const re = /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\s+(\d{4})\s*[-–—]\s*((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|present|current|now))\s*(\d{4})?/gi;
  const ranges: Range[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const startM = MONTHS[match[1].toLowerCase()] ?? 0;
    const start = new Date(Number(match[2]), startM, 1).getTime();
    const endToken = match[3].toLowerCase();
    const end = ['present', 'current', 'now'].includes(endToken)
      ? Date.now()
      : new Date(Number(match[4] || match[2]), MONTHS[endToken] ?? 0, 1).getTime();
    ranges.push({ label: match[0], start, end });
  }
  return ranges;
}

function findOverlaps(ranges: Range[]): string[] {
  const flags: string[] = [];
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i];
      const b = ranges[j];
      if (a.start < b.end && b.start < a.end) {
        flags.push(`Timeline overlap: "${a.label}" vs "${b.label}"`);
      }
    }
  }
  return flags;
}

const INFLATED = [
  /100% (?:success|increase|growth)/i,
  /increased .* by \d{3,}%/i,
  /world[- ]class/i,
  /best[- ]in[- ]class/i,
  /unparalleled/i,
  /revolutionized/i,
];

export default function CVAnalyzer() {
  const [text, setText] = useState('');
  const [ran, setRan] = useState(false);

  const report = useMemo(() => {
    if (!ran) return null;
    const local = analyzeTextLocally(text);
    const overlaps = findOverlaps(parseRanges(text));
    const inflated = INFLATED.filter((re) => re.test(text)).map((re) => `Inflated claim pattern: ${re.source}`);
    const fluff = interpretFluffScore(Math.min(100, local.signals.filter(s => s.type === 'ai_fluff').length * 18));
    return { local, overlaps, inflated, fluff };
  }, [ran, text]);

  return (
    <GatedAppPage
      required="enterprise"
      featureName="Fraud, Fluff & Contradiction Detector"
      description="Resume authenticity analysis is locked to Enterprise B2B."
    >
      <FeatureGuard feature="fraud_detector">
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Elite</p>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" /> CV Analyzer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste candidate text to scan buzzwords, overlapping dates, and inflated claims.
          </p>
        </div>
        <Textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setRan(false); }}
          placeholder="Paste resume / CV text..."
          className="min-h-[240px]"
        />
        <Button type="button" onClick={() => setRan(true)} disabled={!text.trim()}>
          <ScanSearch className="w-4 h-4 mr-2" /> Run analysis
        </Button>

        {report && (
          <div className="grid gap-4">
            <div className={`rounded-xl border p-4 ${report.fluff.badge_class}`}>
              <p className="font-semibold">{report.fluff.label}</p>
              <p className="text-sm mt-1">{report.fluff.description}</p>
              <p className="text-sm mt-2 opacity-80">{report.local.recommendation}</p>
            </div>
            <div className="rounded-xl border border-border p-4 space-y-2">
              <h2 className="font-semibold">Signals</h2>
              {report.local.signals.length === 0 && report.overlaps.length === 0 && report.inflated.length === 0 ? (
                <p className="text-sm text-muted-foreground">No major red flags detected.</p>
              ) : (
                <ul className="text-sm space-y-1 list-disc pl-5">
                  {report.local.signals.map((s, i) => <li key={`s-${i}`}>{s.message} ({s.severity})</li>)}
                  {report.overlaps.map((s, i) => <li key={`o-${i}`}>{s}</li>)}
                  {report.inflated.map((s, i) => <li key={`i-${i}`}>{s}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
      </FeatureGuard>
    </GatedAppPage>
  );
}
