import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, TrendingUp, Key, Target, ChevronDown, ChevronUp } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type TokenKind = 'same' | 'added' | 'removed';
interface Token { text: string; kind: TokenKind }

export interface CVDiffViewerProps {
  originalCV: string;
  optimizedCV: string;
  originalScore: number;
  optimizedScore: number;
  injectedKeywords: string[];
  quantifiedBullets: number;
  isPaid: boolean;
  onUnlock: () => void;
}

// ── Word-level diff ───────────────────────────────────────────────────────────
/** Tokenize a CV string preserving whitespace */
function tokenize(s: string): string[] {
  return s.match(/(\S+|\s+)/g) ?? [];
}

/**
 * Word-frequency-based diff: words that appear in optimized but not in original
 * are marked "added"; words in original not in optimized are "removed".
 * Fast O(n) approximation — sufficient for CV-length texts.
 */
function computeDiff(original: string, optimized: string): { left: Token[]; right: Token[] } {
  const origTokens = tokenize(original);
  const newTokens = tokenize(optimized);

  const origFreq = new Map<string, number>();
  for (const t of origTokens) origFreq.set(t, (origFreq.get(t) ?? 0) + 1);

  const newFreq = new Map<string, number>();
  for (const t of newTokens) newFreq.set(t, (newFreq.get(t) ?? 0) + 1);

  const left: Token[] = origTokens.map(t => ({
    text: t,
    kind: (/\s/.test(t) ? 'same' : (newFreq.get(t) ?? 0) > 0 ? 'same' : 'removed') as TokenKind,
  }));

  const right: Token[] = newTokens.map(t => ({
    text: t,
    kind: (/\s/.test(t) ? 'same' : (origFreq.get(t) ?? 0) > 0 ? 'same' : 'added') as TokenKind,
  }));

  return { left, right };
}

/** Render an array of tokens as styled spans */
const TokenPane = ({ tokens }: { tokens: Token[] }) => (
  <>
    {tokens.map((tok, i) => {
      if (tok.kind === 'added') {
        return (
          <mark key={i} className="bg-green-500/25 text-green-300 rounded-sm px-0.5">
            {tok.text}
          </mark>
        );
      }
      if (tok.kind === 'removed') {
        return (
          <del key={i} className="text-red-400/60 decoration-red-400/50">
            {tok.text}
          </del>
        );
      }
      return <span key={i}>{tok.text}</span>;
    })}
  </>
);

/** Split a CV string into logical sections by double-newlines */
function splitSections(text: string): string[] {
  return text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
}

// ── Reusable section card ─────────────────────────────────────────────────────
const SectionPane = ({
  sections,
  tokens,
  isLeft,
  score,
  locked,
  visibleCount,
}: {
  sections: string[];
  tokens: Token[];
  isLeft: boolean;
  score: number;
  locked: boolean;
  visibleCount: number;
}) => {
  // Build per-section token slices by matching raw text positions
  const fullText = sections.join('\n\n');
  const sectionTokenSlices: Token[][] = useMemo(() => {
    const allText = tokens.map(t => t.text).join('');
    const slices: Token[][] = [];
    let cursor = 0;
    for (const section of sections) {
      const sectionTokens: Token[] = [];
      let chars = 0;
      while (cursor < tokens.length && chars < section.length + 2) {
        sectionTokens.push(tokens[cursor]);
        chars += tokens[cursor].text.length;
        cursor++;
      }
      slices.push(sectionTokens);
      cursor++; // skip separator
    }
    return slices;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText]);

  const borderClass = isLeft
    ? 'border-border'
    : 'border-green-500/30';
  const headerClass = isLeft
    ? 'bg-muted/30 border-border'
    : 'bg-green-500/5 border-green-500/20';
  const dotClass = isLeft ? 'bg-red-400' : 'bg-green-400';
  const label = isLeft ? 'Original CV' : 'Optimized CV';
  const scoreClass = isLeft ? 'text-red-400' : 'text-green-400';

  return (
    <div className={`relative rounded-xl border ${borderClass} overflow-hidden flex flex-col`}>
      <div className={`px-3 py-2 border-b ${headerClass} flex items-center gap-2 shrink-0`}>
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`ml-auto text-xs font-semibold ${scoreClass}`}>{score}% ATS</span>
      </div>

      <div className="p-3 text-xs font-mono leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap flex-1">
        {sections.map((section, idx) => {
          if (idx >= visibleCount) return null;
          const slice = sectionTokenSlices[idx] ?? section.split(/(\S+|\s+)/).filter(Boolean).map(t => ({ text: t, kind: 'same' as TokenKind }));
          return (
            <div key={idx} className="mb-3 pb-3 border-b border-border/30 last:border-0">
              <TokenPane tokens={slice} />
            </div>
          );
        })}

        {locked && sections.length > visibleCount && (
          <div className="blur-sm select-none pointer-events-none text-foreground/40 mt-1">
            {sections.slice(visibleCount, visibleCount + 3).join('\n\n')}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const FREE_VISIBLE = 2;

export const CVDiffViewer = ({
  originalCV,
  optimizedCV,
  originalScore,
  optimizedScore,
  injectedKeywords,
  quantifiedBullets,
  isPaid,
  onUnlock,
}: CVDiffViewerProps) => {
  const [view, setView] = useState<'split' | 'inline'>('split');
  const [showAllKw, setShowAllKw] = useState(false);

  const { left, right } = useMemo(() => computeDiff(originalCV, optimizedCV), [originalCV, optimizedCV]);
  const origSections = useMemo(() => splitSections(originalCV), [originalCV]);
  const newSections = useMemo(() => splitSections(optimizedCV), [optimizedCV]);

  const maxSections = Math.max(origSections.length, newSections.length);
  const isLocked = !isPaid && maxSections > FREE_VISIBLE;
  const visibleCount = isPaid ? maxSections : FREE_VISIBLE;
  const scoreDelta = optimizedScore - originalScore;

  const visibleKw = showAllKw ? injectedKeywords : injectedKeywords.slice(0, 6);

  // Inline combined token stream
  const inlineTokens = useMemo(() => {
    const combined: (Token & { side: 'left' | 'right' })[] = [];
    // For inline, show "right" with added highlights; but also show removed from left
    // Simple approach: show right tokens annotated, skip "same" from left
    for (const t of right) combined.push({ ...t, side: 'right' });
    return combined;
  }, [right]);

  const inlineSections = useMemo(() => splitSections(optimizedCV), [optimizedCV]);

  return (
    <div className="space-y-4">
      {/* ── Metrics bar ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">ATS Score</p>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-base font-bold text-red-400">{originalScore}%</span>
            <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="text-base font-bold text-green-400">{optimizedScore}%</span>
          </div>
          <p className="text-[10px] text-green-500 mt-1 font-medium">+{scoreDelta} pts</p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Keywords</p>
          <div className="flex items-center justify-center gap-1">
            <Key className="w-3.5 h-3.5 text-primary" />
            <span className="text-xl font-bold text-foreground">{injectedKeywords.length}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">injected</p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">STAR Bullets</p>
          <div className="flex items-center justify-center gap-1">
            <Target className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xl font-bold text-foreground">{quantifiedBullets}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">quantified</p>
        </div>
      </div>

      {/* ── Injected keywords chips ───────────────────────────────────────── */}
      {injectedKeywords.length > 0 && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
          <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-2">
            Injected ATS Keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {visibleKw.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[11px] bg-green-500/15 text-green-300 border border-green-500/20">
                {kw}
              </span>
            ))}
            {isLocked && injectedKeywords.length > 6 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-muted text-muted-foreground border border-border flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />+{injectedKeywords.length - 6} locked
              </span>
            )}
          </div>
          {isPaid && injectedKeywords.length > 6 && (
            <button className="mt-2 text-[11px] text-primary hover:underline flex items-center gap-1" onClick={() => setShowAllKw(v => !v)}>
              {showAllKw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showAllKw ? 'Show less' : `Show all ${injectedKeywords.length}`}
            </button>
          )}
        </div>
      )}

      {/* ── View toggle ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Before / After</p>
        <div className="flex rounded-lg overflow-hidden border border-border text-[11px]">
          {(['split', 'inline'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 capitalize transition-colors ${view === v ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Split view ───────────────────────────────────────────────────── */}
      {view === 'split' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SectionPane
            sections={origSections}
            tokens={left}
            isLeft
            score={originalScore}
            locked={isLocked}
            visibleCount={visibleCount}
          />
          <div className="relative">
            <SectionPane
              sections={newSections}
              tokens={right}
              isLeft={false}
              score={optimizedScore}
              locked={isLocked}
              visibleCount={visibleCount}
            />
            {isLocked && (
              <div className="absolute bottom-0 left-0 right-0 h-28 flex flex-col items-center justify-end pb-3 rounded-b-xl bg-gradient-to-t from-card via-card/80 to-transparent">
                <p className="text-xs font-medium text-foreground mb-2 text-center px-3">
                  {maxSections - FREE_VISIBLE} more sections & all keywords hidden
                </p>
                <Button variant="gold" size="sm" onClick={onUnlock}>
                  Unlock Full Diff View
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Inline view ──────────────────────────────────────────────────── */}
      {view === 'inline' && (
        <div className="relative rounded-xl border border-border overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500/25 mr-1 align-middle" />Added</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400/20 mr-1 align-middle line-through" />Removed</span>
          </div>
          <div className="p-4 text-xs font-mono leading-relaxed text-foreground max-h-80 overflow-y-auto whitespace-pre-wrap">
            {inlineSections.map((section, idx) => {
              if (idx >= visibleCount) return null;
              const secWords = section.split(/(\S+|\s+)/).filter(Boolean);
              const secTokens = secWords.map(w => ({
                text: w,
                kind: inlineTokens.find(t => t.text === w)?.kind ?? 'same' as TokenKind,
              }));
              return (
                <div key={idx} className="mb-4 pb-4 border-b border-border/30 last:border-0">
                  <TokenPane tokens={secTokens} />
                </div>
              );
            })}
            {isLocked && (
              <>
                <div className="blur-sm select-none pointer-events-none text-foreground/30 mt-1">
                  {inlineSections.slice(FREE_VISIBLE, FREE_VISIBLE + 3).join('\n\n')}
                </div>
                <div className="sticky bottom-0 left-0 right-0 flex flex-col items-center pb-2 pt-4 bg-gradient-to-t from-card via-card/80 to-transparent">
                  <p className="text-xs font-medium text-foreground mb-2">
                    {maxSections - FREE_VISIBLE} more sections locked
                  </p>
                  <Button variant="gold" size="sm" onClick={onUnlock}>Unlock Full Diff</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        <span className="text-green-400">■ Green</span> = added &nbsp;·&nbsp;
        <span className="text-red-400">■ Red strikethrough</span> = removed
      </p>
    </div>
  );
};
