/**
 * CandidateGrid.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsive grid of CandidateCard components ordered #1 → #N.
 * Includes sort/filter controls, CSV export, and drawer integration.
 */

import { useState, useMemo } from 'react';
import { Trophy, Download, Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CandidateCard } from './CandidateCard';
import { CandidateDrawer } from './CandidateDrawer';
import type { RankedCandidate, Recommendation } from '@/lib/schemas/candidate';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandidateGridProps {
  rankedCandidates: RankedCandidate[];
  batchName?:       string;
  className?:       string;
  onScheduleInterview?: (candidate: RankedCandidate) => void;
}

type SortKey = 'rank' | 'score' | 'experience' | 'name';
type FilterKey = Recommendation | 'all';

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportToCSV(candidates: RankedCandidate[], batchName: string) {
  const header = ['Rank', 'Name', 'Title', 'Score', 'Recommendation', 'Location', 'Experience (yrs)', 'Email', 'Skills', 'Why This Candidate'].join(',');
  const rows = candidates.map(c => [
    c.rankPosition,
    `"${c.fullName}"`,
    `"${c.title ?? ''}"`,
    c.overallScore,
    `"${c.recommendation}"`,
    `"${c.location ?? ''}"`,
    c.experienceYears,
    `"${c.email ?? ''}"`,
    `"${(c.skills ?? []).join('; ')}"`,
    `"${c.whyThisCandidate.replace(/"/g, '""')}"`,
  ].join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `candidate-rankings-${batchName.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CandidateGrid({ rankedCandidates, batchName = 'batch', className, onScheduleInterview }: CandidateGridProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<RankedCandidate | null>(null);
  const [drawerOpen,        setDrawerOpen]         = useState(false);
  const [searchQuery,       setSearchQuery]         = useState('');
  const [sortKey,           setSortKey]             = useState<SortKey>('rank');
  const [filterRec,         setFilterRec]           = useState<FilterKey>('all');

  const openDrawer = (c: RankedCandidate) => {
    setSelectedCandidate(c);
    setDrawerOpen(true);
  };

  const filteredSorted = useMemo(() => {
    let result = [...rankedCandidates];

    // Filter by recommendation
    if (filterRec !== 'all') {
      result = result.filter(c => c.recommendation === filterRec);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.fullName.toLowerCase().includes(q) ||
        (c.title ?? '').toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q) ||
        (c.skills ?? []).some(s => s.toLowerCase().includes(q)),
      );
    }

    // Sort
    switch (sortKey) {
      case 'rank':       result.sort((a, b) => a.rankPosition - b.rankPosition); break;
      case 'score':      result.sort((a, b) => b.overallScore - a.overallScore); break;
      case 'experience': result.sort((a, b) => b.experienceYears - a.experienceYears); break;
      case 'name':       result.sort((a, b) => a.fullName.localeCompare(b.fullName)); break;
    }

    return result;
  }, [rankedCandidates, searchQuery, sortKey, filterRec]);

  if (rankedCandidates.length === 0) return null;

  const topPick   = rankedCandidates.find(c => c.rankPosition === 1);
  const strongFit = rankedCandidates.filter(c => c.recommendation === 'Strong Fit').length;

  return (
    <div className={cn('space-y-5', className)}>
      {/* Summary bar */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{rankedCandidates.length} Candidates Ranked</p>
            {topPick && (
              <p className="text-xs text-muted-foreground">
                #1: <span className="text-primary font-medium">{topPick.fullName}</span> · {topPick.overallScore}% match · {strongFit} strong fits
              </p>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportToCSV(rankedCandidates, batchName)}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search name, title, skill, location…"
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="mr-1">Sort:</span>
          {(['rank', 'score', 'experience', 'name'] as SortKey[]).map(k => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={cn(
                'px-2.5 py-1 rounded-lg capitalize transition-colors',
                sortKey === k ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-accent',
              )}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="mr-1">Filter:</span>
          {(['all', 'Top Pick', 'Strong Fit', 'Moderate Fit', 'Not Recommended'] as FilterKey[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterRec(f)}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap',
                filterRec === f ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-accent',
              )}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredSorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No candidates match your current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredSorted.map(candidate => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onViewFull={openDrawer}
              onScheduleInterview={onScheduleInterview}
            />
          ))}
        </div>
      )}

      {/* Drawer */}
      <CandidateDrawer
        candidate={selectedCandidate}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

export default CandidateGrid;
