import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Upload, BarChart3, Users, Briefcase,
  Zap, Crown, AlertCircle, Loader2, Database, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  JobPosting,
  CandidateEvaluation,
  fetchJobPostings,
  fetchCandidateEvaluations,
} from "@/services/b2bEvaluationEngine";
import BulkCVUploader from "@/components/b2b/BulkCVUploader";
import CandidateLeaderboard from "@/components/b2b/CandidateLeaderboard";
import JobPostingManager from "@/components/b2b/JobPostingManager";
import CreditMeter from "@/components/b2b/CreditMeter";
import { FeatureGate } from "@/components/entitlements/FeatureGate";
import { toast } from "sonner";

interface OrgInfo {
  id: string;
  name: string;
  subscription_tier: string;
  max_seats: number;
  used_seats: number;
  cv_evaluations_used: number;
  cv_evaluations_limit: number;
}

type Tab = "leaderboard" | "upload" | "analytics";

export default function B2BDashboard() {
  const navigate = useNavigate();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<CandidateEvaluation[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [userRole, setUserRole] = useState<string>("recruiter");

  // Load org and user info
  useEffect(() => {
    loadOrgData();
  }, []);

  // Load candidates when job selection changes
  useEffect(() => {
    if (selectedJobId) {
      loadCandidates(selectedJobId);
    } else {
      setCandidates([]);
    }
  }, [selectedJobId]);

  const loadOrgData = async () => {
    setIsLoadingOrg(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      // Get profile with org info
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("org_id, org_role, plan_type")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile?.org_id) {
        toast.error("You are not part of an enterprise organization.");
        navigate("/dashboard");
        return;
      }

      if (profile.plan_type !== "B2B_ENTERPRISE") {
        toast.error("This dashboard requires an Enterprise B2B subscription.");
        navigate("/dashboard");
        return;
      }

      setUserRole(profile.org_role ?? "recruiter");

      // Get org details
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, plan_type, max_seats, used_seats, cv_evaluations_used, cv_evaluations_limit, subscription_tier")
        .eq("id", profile.org_id)
        .single();

      if (orgError || !orgData) throw orgError ?? new Error("Org not found");

      setOrg({
        id: orgData.id,
        name: orgData.name,
        subscription_tier: (orgData as any).subscription_tier ?? "enterprise_b2b",
        max_seats: orgData.max_seats,
        used_seats: orgData.used_seats,
        cv_evaluations_used: (orgData as any).cv_evaluations_used ?? 0,
        cv_evaluations_limit: (orgData as any).cv_evaluations_limit ?? 500,
      });

      // Load jobs
      const jobList = await fetchJobPostings(profile.org_id);
      setJobs(jobList);
      if (jobList.length > 0) setSelectedJobId(jobList[0].id);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load organization data");
    } finally {
      setIsLoadingOrg(false);
    }
  };

  const loadCandidates = useCallback(async (jobId: string) => {
    setIsLoadingCandidates(true);
    try {
      const data = await fetchCandidateEvaluations(jobId);
      setCandidates(data);
    } catch (err) {
      toast.error("Failed to load candidates");
    } finally {
      setIsLoadingCandidates(false);
    }
  }, []);

  const handleJobCreated = (job: JobPosting) => {
    setJobs(prev => [job, ...prev]);
    setSelectedJobId(job.id);
    setActiveTab("upload");
  };

  const handleUploadComplete = () => {
    if (selectedJobId) loadCandidates(selectedJobId);
    setActiveTab("leaderboard");
    toast.success("Batch evaluation complete! Check the leaderboard.");
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  if (isLoadingOrg) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-400 mx-auto" />
          <p className="text-slate-400 mt-3">Loading B2B Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!org) return null;

  const evalUsagePct = Math.min(100, (org.cv_evaluations_used / org.cv_evaluations_limit) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Nav */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-slate-200">{org.name}</h1>
                <Badge className="bg-violet-600/20 text-violet-300 border-violet-500/30 text-xs px-2 py-0">
                  <Crown className="w-2.5 h-2.5 mr-1" />
                  Enterprise B2B
                </Badge>
              </div>
              <p className="text-xs text-slate-500">HR & Candidate Matching Engine</p>
            </div>
          </div>

          {/* Usage indicators + credits */}
          <div className="hidden md:flex items-center gap-4">
            <UsageMeter
              label="Seats"
              used={org.used_seats}
              limit={org.max_seats}
              pct={Math.min(100, (org.used_seats / org.max_seats) * 100)}
            />
            <CreditMeter orgId={org.id} compact />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/b2b/talent-pool")}
              className="text-slate-400 hover:text-violet-400 gap-1.5 hidden sm:flex"
            >
              <Database className="w-4 h-4" />
              Talent Pool
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/organization")}
              className="text-slate-400 hover:text-slate-200 gap-1.5"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-slate-400 hover:text-slate-200"
            >
              ← Back
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-screen-2xl mx-auto px-4 py-6 flex gap-5 h-[calc(100vh-65px)]">
        {/* Left sidebar — Job Postings */}
        <div className="w-72 flex-shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col overflow-hidden">
          <JobPostingManager
            orgId={org.id}
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelectJob={id => { setSelectedJobId(id); setActiveTab("leaderboard"); }}
            onJobCreated={handleJobCreated}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
          {/* Selected job header */}
          {selectedJob ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Briefcase className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <h2 className="text-base font-semibold text-slate-100 truncate">{selectedJob.title}</h2>
                    <Badge className="text-xs bg-slate-800 text-slate-400 border-slate-700 capitalize">
                      {selectedJob.seniority_level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-slate-500">
                      {selectedJob.required_skills.length} required skills
                    </span>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs text-slate-500">
                      {candidates.filter(c => c.processing_status === "completed").length} evaluated
                    </span>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs text-slate-500">
                      {candidates.filter(c => c.processing_status === "processing").length} processing
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveTab("upload")}
                  className="bg-violet-600 hover:bg-violet-500 text-white gap-2 flex-shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  Upload CVs
                </Button>
              </div>

              {/* Skill tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedJob.required_skills.slice(0, 8).map(skill => (
                  <span key={skill} className="text-xs px-2 py-0.5 rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20">
                    {skill}
                  </span>
                ))}
                {selectedJob.required_skills.length > 8 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                    +{selectedJob.required_skills.length - 8} more
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-slate-300 font-medium">No job posting selected</p>
                <p className="text-slate-500 text-sm">Create or select a job posting to start evaluating candidates</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as Tab)} className="flex flex-col h-full">
              <div className="border-b border-slate-800 px-4 pt-1">
                <TabsList className="bg-transparent h-10 gap-0 p-0">
                  <TabsTrigger
                    value="leaderboard"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-transparent rounded-none h-10 text-slate-400 text-sm px-4"
                  >
                    <Users className="w-3.5 h-3.5 mr-1.5" />
                    Leaderboard
                    {candidates.filter(c => c.processing_status === "completed").length > 0 && (
                      <Badge className="ml-2 bg-violet-600/20 text-violet-400 text-xs px-1.5 py-0">
                        {candidates.filter(c => c.processing_status === "completed").length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="upload"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-transparent rounded-none h-10 text-slate-400 text-sm px-4"
                    disabled={!selectedJob}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Bulk Upload
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-transparent rounded-none h-10 text-slate-400 text-sm px-4"
                    disabled={candidates.length === 0}
                  >
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                    Analytics
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="leaderboard" className="flex-1 p-4 m-0 overflow-hidden">
                {!selectedJob ? (
                  <EmptyState
                    icon={<Users className="w-10 h-10 text-slate-700" />}
                    title="Select a job posting"
                    description="Choose a job from the left panel to view and compare candidates."
                  />
                ) : (
                  <CandidateLeaderboard
                    candidates={candidates}
                    isLoading={isLoadingCandidates}
                    onRefresh={() => loadCandidates(selectedJobId!)}
                    jobTitle={selectedJob?.title}
                  />
                )}
              </TabsContent>

              <TabsContent value="upload" className="flex-1 p-5 m-0 overflow-y-auto">
                <FeatureGate featureKey="BULK_CV_PARSER">
                {selectedJob && (
                  <div className="max-w-2xl">
                    <div className="mb-5">
                      <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-violet-400" />
                        Bulk CV Upload
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Upload up to 50 CVs at once. The AI engine will evaluate each candidate against
                        <span className="text-violet-400 font-medium"> {selectedJob.title}</span> concurrently.
                      </p>
                    </div>

                    {evalUsagePct >= 90 && (
                      <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-300">
                          You've used {evalUsagePct.toFixed(0)}% of your monthly CV evaluations quota.
                        </p>
                      </div>
                    )}

                    <BulkCVUploader
                      jobPosting={selectedJob}
                      orgId={org.id}
                      onComplete={handleUploadComplete}
                    />
                  </div>
                )}
                </FeatureGate>
              </TabsContent>

              <TabsContent value="analytics" className="flex-1 p-5 m-0 overflow-y-auto">
                <AnalyticsPanel candidates={candidates} jobTitle={selectedJob?.title} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Panel ─────────────────────────────────────────────────────────

function AnalyticsPanel({ candidates, jobTitle }: { candidates: CandidateEvaluation[]; jobTitle?: string }) {
  const completed = candidates.filter(c => c.processing_status === "completed");
  if (completed.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-10 h-10 text-slate-700" />}
        title="No data yet"
        description="Complete some evaluations to see analytics."
      />
    );
  }

  const scores = completed.map(c => c.match_score_percentage ?? 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const max = Math.max(...scores);
  const min = Math.min(...scores);

  const verdictCounts = {
    STRONG_HIRE: completed.filter(c => c.ai_analysis?.hiring_verdict === "STRONG_HIRE").length,
    HIRE: completed.filter(c => c.ai_analysis?.hiring_verdict === "HIRE").length,
    MAYBE: completed.filter(c => c.ai_analysis?.hiring_verdict === "MAYBE").length,
    NO_HIRE: completed.filter(c => c.ai_analysis?.hiring_verdict === "NO_HIRE").length,
  };

  const riskCounts = {
    LOW: completed.filter(c => c.ai_analysis?.risk_assessment?.risk_level === "LOW").length,
    MEDIUM: completed.filter(c => c.ai_analysis?.risk_assessment?.risk_level === "MEDIUM").length,
    HIGH: completed.filter(c => c.ai_analysis?.risk_assessment?.risk_level === "HIGH").length,
  };

  // Score distribution buckets
  const buckets = [
    { label: "90–100", count: scores.filter(s => s >= 90).length, color: "bg-emerald-500" },
    { label: "80–89", count: scores.filter(s => s >= 80 && s < 90).length, color: "bg-green-500" },
    { label: "70–79", count: scores.filter(s => s >= 70 && s < 80).length, color: "bg-lime-500" },
    { label: "60–69", count: scores.filter(s => s >= 60 && s < 70).length, color: "bg-amber-500" },
    { label: "50–59", count: scores.filter(s => s >= 50 && s < 60).length, color: "bg-orange-500" },
    { label: "<50", count: scores.filter(s => s < 50).length, color: "bg-red-500" },
  ];
  const maxBucket = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-base font-semibold text-slate-200">Batch Analytics</h3>
        {jobTitle && <p className="text-sm text-slate-500">{jobTitle} · {completed.length} candidates evaluated</p>}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Average Score", value: avg.toFixed(1), suffix: "/100", color: "text-violet-400" },
          { label: "Highest Score", value: max.toFixed(0), suffix: "/100", color: "text-emerald-400" },
          { label: "Lowest Score", value: min.toFixed(0), suffix: "/100", color: "text-red-400" },
          { label: "Pass Rate (≥70)", value: ((scores.filter(s => s >= 70).length / scores.length) * 100).toFixed(0), suffix: "%", color: "text-amber-400" },
        ].map(k => (
          <div key={k.label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">{k.label}</p>
            <p className={cn("text-2xl font-black", k.color)}>
              {k.value}<span className="text-sm font-normal text-slate-500">{k.suffix}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score distribution */}
        <div className="md:col-span-2 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-4">Score Distribution</h4>
          <div className="space-y-2.5">
            {buckets.map(b => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500 w-14 text-right flex-shrink-0">{b.label}</span>
                <div className="flex-1 bg-slate-900 rounded-full h-4 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", b.color)}
                    style={{ width: `${(b.count / maxBucket) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 font-mono w-8 flex-shrink-0">{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Verdict breakdown */}
        <div className="space-y-3">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Hiring Verdict</h4>
            <div className="space-y-2">
              {Object.entries(verdictCounts).map(([verdict, count]) => (
                <div key={verdict} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{verdict.replace("_", " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", verdict === "STRONG_HIRE" ? "bg-emerald-500" : verdict === "HIRE" ? "bg-green-500" : verdict === "MAYBE" ? "bg-amber-500" : "bg-red-500")}
                        style={{ width: `${(count / completed.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-400 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Risk Profile</h4>
            <div className="space-y-2">
              {Object.entries(riskCounts).map(([risk, count]) => (
                <div key={risk} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{risk}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", risk === "LOW" ? "bg-emerald-500" : risk === "MEDIUM" ? "bg-amber-500" : "bg-red-500")}
                        style={{ width: `${completed.length ? (count / completed.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-400 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Usage Meter ─────────────────────────────────────────────────────────────

function UsageMeter({ label, used, limit, pct }: { label: string; used: number; limit: number; pct: number }) {
  return (
    <div className="text-right">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-violet-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {used}/{limit}
        </span>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16">
      <div className="w-20 h-20 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-300">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">{description}</p>
    </div>
  );
}
