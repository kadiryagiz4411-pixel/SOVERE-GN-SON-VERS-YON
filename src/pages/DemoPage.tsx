import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  extractRequiredSkills,
  matchBand,
  scoreOpportunity,
  type MatchResult,
} from '@/lib/matchScore';
import { ArrowRight, PanelRight, Radar, ScanLine, Sparkles, Ticket } from 'lucide-react';

const SAMPLE_JOB = `Senior React engineer — fintech dashboard

We need a freelancer to rebuild our client dashboard.
Stack: React, TypeScript, Tailwind, Node, and Supabase.
The first milestone is a readable portfolio view with live balances.
Please show similar dashboard work and a plan for the first week.`;

const SAMPLE_PROFILE = `Independent product engineer, 6 years.
Daily stack: React, TypeScript, Tailwind, and Node.
Shipped SaaS dashboards for two fintech teams.
Comfortable leading a first-week slice and writing the client update.`;

const MOCK_SCAN_JOB = 'React TypeScript dashboard. Tailwind, Node, and a clear first-week milestone.';
const MOCK_SCAN_PROFILE = 'React, TypeScript, Tailwind, Node. SaaS dashboards.';

const SAMPLE_LEADS = [
  { company: 'Northwind Analytics', note: 'Series B · hiring a product engineer for the reporting suite' },
  { company: 'Harbor Freight Ops', note: 'Logistics team · dashboard rewrite, React and TypeScript' },
  { company: 'Lumen Clinic', note: 'Patient portal · wants a first-week prototype, not a six-month plan' },
];

function firstLine(text: string, fallback: string) {
  const line = text.split('\n').map((part) => part.trim()).find(Boolean) || fallback;
  return line.replace(/^#+\s*/, '').slice(0, 88);
}

function scoreTexts(jobText: string, profileText: string) {
  const skills = extractRequiredSkills(profileText);
  return scoreOpportunity(
    { skills, experience: profileText },
    firstLine(jobText, 'this brief'),
    jobText,
  );
}

function buildSandboxProposal(jobText: string, profileText: string, result: MatchResult) {
  const title = firstLine(jobText, 'this project');
  const matched = result.matchedSkills.slice(0, 4);
  const missing = result.missingSkills[0];
  const proof = matched.length
    ? `The overlap I would lead with is ${matched.join(', ')}.`
    : 'I would open with one concrete first-week result instead of a biography.';
  const gap = missing
    ? `The brief also asks for ${missing}. I would cover that with a small proof in week one, not a vague promise.`
    : 'The keyword overlap is already tight, so the opening should stay short and specific.';
  const profileHint = profileText.trim()
    ? 'The profile you pasted is the only source for the proof below.'
    : 'Paste a short profile and the next run will use those skills in the opening.';

  return [
    `Hello — I read the brief for ${title}.`,
    '',
    profileHint,
    proof,
    '',
    gap,
    '',
    'How I would start:',
    '1. Restate the outcome in one sentence and confirm the constraint that matters.',
    '2. Ship a narrow first slice you can review within a few days.',
    '3. Leave a short note on the next decision, so the follow-up is easy.',
    '',
    'If that matches how you like to work, I can start from the most urgent part of the brief.',
    '',
    'Sandbox preview. Nothing is saved, and this run does not use account credits.',
  ].join('\n');
}

function recommendationsFor(result: MatchResult | null) {
  if (!result) return ['Paste a job description, then score it. One skill is enough.'];
  const lines = result.missingSkills.slice(0, 4).map(
    (skill) => `Mention ${skill} with one result you have already shipped.`,
  );
  if (!lines.length) {
    lines.push('Lead with the overlap you already have. Keep the first paragraph under five lines.');
  }
  lines.push(result.narrative || `${result.matchScore}% fit from keyword overlap.`);
  return lines;
}

function ScoreRing({ score }: { score: number | null }) {
  const value = score ?? 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div
      className="relative h-40 w-40 shrink-0"
      role="img"
      aria-label={score == null ? 'Match score not calculated yet' : `${score} percent match`}
    >
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} stroke="rgb(39 39 42)" strokeWidth="10" fill="none" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="#f59e0b"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={score == null ? circumference : offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums text-zinc-50">
          {score == null ? '—' : `${score}%`}
        </span>
        <span className="text-sm text-zinc-400">Match</span>
      </div>
    </div>
  );
}

const DemoPage = () => {
  const [jobText, setJobText] = useState(SAMPLE_JOB);
  const [profileText, setProfileText] = useState(SAMPLE_PROFILE);
  const [proposal, setProposal] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [scanMatch, setScanMatch] = useState<MatchResult | null>(null);
  const [b2bOpen, setB2bOpen] = useState(false);
  const [leadPhase, setLeadPhase] = useState<'idle' | 'extracting' | 'done'>('idle');
  const streamSeq = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    document.title = 'Live Demo · Sovereign';
    const pending = timers.current;
    return () => {
      streamSeq.current += 1;
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const generateProposal = async () => {
    const seq = ++streamSeq.current;
    const result = scoreTexts(jobText, profileText);
    const full = buildSandboxProposal(jobText, profileText, result);
    setMatch(result);
    setStreaming(true);
    setProposal('');
    for (let index = 0; index < full.length; index += 6) {
      if (streamSeq.current !== seq) return;
      setProposal(full.slice(0, index + 6));
      await new Promise((resolve) => window.setTimeout(resolve, 12));
    }
    if (streamSeq.current === seq) setStreaming(false);
  };

  const scoreNow = () => {
    setMatch(scoreTexts(jobText, profileText));
  };

  const scanScreen = () => {
    if (scanPhase === 'scanning') return;
    setScanPhase('scanning');
    setScanMatch(null);
    later(() => {
      setScanMatch(scoreTexts(MOCK_SCAN_JOB, MOCK_SCAN_PROFILE));
      setScanPhase('done');
    }, 2200);
  };

  const extractLeads = () => {
    if (leadPhase === 'extracting') return;
    setB2bOpen(true);
    setLeadPhase('extracting');
    later(() => setLeadPhase('done'), 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <section className="mb-12">
            <p className="text-sm font-medium tracking-[0.18em] uppercase text-amber-300/90 mb-3">
              Live sandbox
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-50 leading-tight">
              Try the proposal, the match score, and the extension.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-300">
              This page runs in your browser. No login, no saved drafts, and no credits are spent.
              Paste a job and a profile, then walk the extension preview the same way the side panel works.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-md p-6 md:p-8 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
            <div className="flex items-start gap-3 mb-6">
              <Sparkles className="w-5 h-5 text-amber-300 mt-1 shrink-0" />
              <div>
                <h2 className="text-2xl font-semibold text-zinc-50">Instant proposal</h2>
                <p className="mt-1 text-base leading-relaxed text-zinc-300">
                  Paste a job description and a short profile. Generate writes a preview in place.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-base text-zinc-200">
                Job description
                <textarea
                  value={jobText}
                  onChange={(event) => setJobText(event.target.value)}
                  rows={10}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                />
              </label>
              <label className="block text-base text-zinc-200">
                Candidate profile
                <textarea
                  value={profileText}
                  onChange={(event) => setProfileText(event.target.value)}
                  rows={10}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="gold"
                className="text-base px-5"
                disabled={streaming}
                onClick={() => { void generateProposal(); }}
              >
                {streaming ? 'Generating…' : 'Generate Proposal'}
              </Button>
              <span className="text-sm text-zinc-400">Local preview. The stream stops as soon as the draft is on screen.</span>
            </div>
            <div
              className="mt-5 min-h-40 rounded-xl border border-white/10 bg-zinc-950/70 px-5 py-4 text-base leading-relaxed text-zinc-100 whitespace-pre-wrap"
              aria-live="polite"
            >
              {proposal || 'Your proposal will appear here.'}
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-md p-6 md:p-8">
            <div className="flex items-start gap-3 mb-6">
              <Radar className="w-5 h-5 text-amber-300 mt-1 shrink-0" />
              <div>
                <h2 className="text-2xl font-semibold text-zinc-50">ATS match score</h2>
                <p className="mt-1 text-base leading-relaxed text-zinc-300">
                  Scores the same text from keyword overlap. One listed skill is enough — there is no minimum to unlock the meter.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" className="text-base border-amber-400/40 text-amber-100" onClick={scoreNow}>
              Score this brief
            </Button>
            <div className="mt-6 flex flex-col md:flex-row gap-8 items-start">
              <ScoreRing score={match?.matchScore ?? null} />
              <div className="flex-1 min-w-0">
                <p className="text-xl font-medium text-zinc-50">
                  {match ? `${match.matchScore}% · ${matchBand(match.matchScore)}` : 'Waiting for a score'}
                </p>
                <p className="mt-2 text-base leading-relaxed text-zinc-300">
                  {match
                    ? `Acceptance context ${match.acceptanceScore}%. Matched: ${match.matchedSkills.slice(0, 6).join(', ') || 'none yet'}.`
                    : 'Use the job and profile above. The meter fills from the overlap between them.'}
                </p>
                <ul className="mt-4 space-y-2">
                  {recommendationsFor(match).map((line) => (
                    <li key={line} className="text-base leading-relaxed text-zinc-200">
                      {line}
                    </li>
                  ))}
                </ul>
                {match && match.missingSkills.length > 0 && (
                  <p className="mt-4 text-base text-amber-200">
                    Missing keywords: {match.missingSkills.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-md p-6 md:p-8">
            <div className="flex items-start gap-3 mb-6">
              <PanelRight className="w-5 h-5 text-amber-300 mt-1 shrink-0" />
              <div>
                <h2 className="text-2xl font-semibold text-zinc-50">Extension and B2B preview</h2>
                <p className="mt-1 text-base leading-relaxed text-zinc-300">
                  A visual mock of the side panel. Scan Active Screen and Lead Extraction run only when you click them.
                </p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 min-h-[520px]">
              <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="ml-3 text-sm text-zinc-500">upwork.com/jobs/fintech-dashboard</span>
              </div>
              <div className="grid lg:grid-cols-[1fr_260px] min-h-[460px]">
                <div className="p-6 border-b lg:border-b-0 lg:border-r border-zinc-800">
                  <p className="text-sm uppercase tracking-widest text-zinc-500">Job on screen</p>
                  <h3 className="mt-2 text-xl font-semibold text-zinc-50">Fintech dashboard rebuild</h3>
                  <p className="mt-3 text-base leading-relaxed text-zinc-300">{MOCK_SCAN_JOB}</p>
                </div>
                <aside className="p-4 bg-zinc-900/80" aria-label="Extension side panel">
                  <p className="text-sm font-semibold tracking-wide text-amber-200">Sovereign</p>
                  <p className="mt-1 text-sm text-zinc-400">Scan the job on screen</p>
                  <div className="mt-4 flex flex-col gap-3 w-full">
                    <button
                      type="button"
                      onClick={scanScreen}
                      className="w-full rounded-[10px] px-3.5 py-2.5 text-sm font-semibold text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-600"
                    >
                      {scanPhase === 'scanning' ? 'Scanning…' : 'Scan Active Screen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setB2bOpen((open) => !open)}
                      className="w-full rounded-[10px] px-3.5 py-2.5 text-sm font-semibold text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-600"
                    >
                      B2B
                    </button>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-zinc-300" aria-live="polite">
                    {scanPhase === 'idle' && 'Click Scan Active Screen'}
                    {scanPhase === 'scanning' && 'Scanning…'}
                    {scanPhase === 'done' && scanMatch && `${scanMatch.matchScore}% match · ${matchBand(scanMatch.matchScore)}`}
                  </p>
                </aside>
              </div>
              <div
                className={`absolute inset-y-0 right-0 w-full max-w-sm border-l border-amber-400/30 bg-zinc-950/95 backdrop-blur-md p-5 transition-transform duration-300 ${b2bOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
                aria-hidden={!b2bOpen}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-zinc-50">B2B panel</h3>
                  <button type="button" className="text-sm text-zinc-400" onClick={() => setB2bOpen(false)}>
                    Close
                  </button>
                </div>
                <p className="mt-2 text-base leading-relaxed text-zinc-300">
                  Lead extraction stays idle until you ask for it.
                </p>
                <button
                  type="button"
                  onClick={extractLeads}
                  className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-950"
                >
                  <ScanLine className="w-4 h-4" />
                  {leadPhase === 'extracting' ? 'Extracting…' : 'Lead Extraction'}
                </button>
                <ul className="mt-5 space-y-3">
                  {leadPhase === 'done' && SAMPLE_LEADS.map((lead) => (
                    <li key={lead.company} className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3">
                      <p className="text-base font-medium text-zinc-50">{lead.company}</p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-300">{lead.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-12 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 md:p-10 text-center shadow-[0_0_48px_rgba(245,158,11,0.12)]">
            <h2 className="text-3xl font-semibold text-zinc-50">Keep the next proposal and CV on your account.</h2>
            <p className="mt-3 mx-auto max-w-2xl text-base leading-relaxed text-zinc-300">
              Create a free account to claim your proposal and CV credits, or redeem an AppSumo code if you already have one.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth?mode=signup">
                <Button variant="gold" className="text-base px-6 h-11">
                  Claim free credits
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/redeem">
                <Button variant="outline" className="text-base px-6 h-11 border-amber-400/40 text-amber-100">
                  <Ticket className="w-4 h-4 mr-2" />
                  Redeem AppSumo code
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DemoPage;
