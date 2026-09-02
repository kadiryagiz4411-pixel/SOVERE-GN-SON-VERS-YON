/**
 * Leaderboard CSV / Excel export helpers.
 */
import { exportCandidatesToCSV } from '@/utils/b2bExport';
import { downloadXlsx } from '@/lib/xlsxExport';
import type { CandidateEvaluation } from '@/services/b2bEvaluationEngine';
import type { TrustIntegrityReport } from '@/lib/ai/fraud-detector';

export interface LeaderboardExportRow {
  rank: number;
  name: string;
  email?: string;
  atsScore: number;
  trustScore?: number;
  authenticity?: string;
  fraudFlags?: string;
  verdict?: string;
}

function downloadBlob(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportLeaderboardCsv(rows: LeaderboardExportRow[], filename = 'candidate-leaderboard.csv') {
  const headers = ['Rank', 'Name', 'Email', 'ATS Score', 'Trust Score', 'Authenticity', 'Fraud Flags', 'Verdict'];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.rank,
        csv(r.name),
        csv(r.email ?? ''),
        r.atsScore,
        r.trustScore ?? '',
        csv(r.authenticity ?? ''),
        csv(r.fraudFlags ?? ''),
        csv(r.verdict ?? ''),
      ].join(','),
    ),
  ];
  downloadBlob(filename, `\uFEFF${lines.join('\n')}`, 'text/csv;charset=utf-8');
}

function csv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function exportLeaderboardExcel(rows: LeaderboardExportRow[], filename = 'candidate-leaderboard.xlsx') {
  await downloadXlsx(
    filename,
    ['Rank', 'Name', 'Email', 'ATS Score', 'Trust Score', 'Authenticity', 'Fraud Flags', 'Verdict'],
    rows.map((r) => [
      r.rank,
      r.name,
      r.email ?? '',
      r.atsScore,
      r.trustScore ?? '',
      r.authenticity ?? '',
      r.fraudFlags ?? '',
      r.verdict ?? '',
    ]),
  );
}

export function exportEvaluations(candidates: CandidateEvaluation[], jobTitle: string, orgName: string) {
  exportCandidatesToCSV(candidates, jobTitle, orgName);
}

export function rowsFromTrust(
  items: Array<{ name: string; email?: string; atsScore: number; verdict?: string; report?: TrustIntegrityReport }>,
): LeaderboardExportRow[] {
  return items.map((item, i) => ({
    rank: i + 1,
    name: item.name,
    email: item.email,
    atsScore: item.atsScore,
    trustScore: item.report?.trustScore,
    authenticity: item.report?.authenticity,
    fraudFlags: item.report?.warnings.join('; '),
    verdict: item.verdict,
  }));
}
