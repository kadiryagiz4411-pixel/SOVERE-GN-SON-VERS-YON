import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Plus, Briefcase, MapPin, ChevronRight, Users, ToggleRight,
  Loader2, X, Tag, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { JobPosting, createJobPosting } from "@/services/b2bEvaluationEngine";
import { toast } from "sonner";

interface Props {
  orgId: string;
  jobs: JobPosting[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  onJobCreated: (job: JobPosting) => void;
}

interface FormData {
  title: string;
  description: string;
  seniorityLevel: JobPosting["seniority_level"];
  employmentType: JobPosting["employment_type"];
  location: string;
}

const SENIORITY_OPTIONS: { value: JobPosting["seniority_level"]; label: string }[] = [
  { value: "junior", label: "Junior (0–2 yrs)" },
  { value: "mid", label: "Mid-level (2–5 yrs)" },
  { value: "senior", label: "Senior (5–8 yrs)" },
  { value: "lead", label: "Lead / Staff (8+ yrs)" },
  { value: "executive", label: "Executive / VP" },
];

const EMPLOYMENT_OPTIONS: { value: JobPosting["employment_type"]; label: string }[] = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
];

export default function JobPostingManager({ orgId, jobs, selectedJobId, onSelectJob, onJobCreated }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [niceInput, setNiceInput] = useState("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      seniorityLevel: "mid",
      employmentType: "full_time",
    },
  });

  const addSkill = (type: "required" | "nice") => {
    const input = type === "required" ? skillInput : niceInput;
    if (!input.trim()) return;

    const skill = input.trim();
    if (type === "required") {
      if (!requiredSkills.includes(skill)) {
        setRequiredSkills(prev => [...prev, skill]);
      }
      setSkillInput("");
    } else {
      if (!niceToHaveSkills.includes(skill)) {
        setNiceToHaveSkills(prev => [...prev, skill]);
      }
      setNiceInput("");
    }
  };

  const onSubmit = async (data: FormData) => {
    if (requiredSkills.length === 0) {
      toast.error("Add at least one required skill");
      return;
    }
    setIsSubmitting(true);
    try {
      const job = await createJobPosting({
        organizationId: orgId,
        title: data.title,
        description: data.description,
        requiredSkills,
        niceToHaveSkills,
        seniorityLevel: data.seniorityLevel,
        employmentType: data.employmentType,
        location: data.location || undefined,
      });
      toast.success("Job posting created!");
      onJobCreated(job);
      setShowForm(false);
      reset();
      setRequiredSkills([]);
      setNiceToHaveSkills([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create posting");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-violet-400" />
          Job Postings
        </h3>
        <Button
          size="sm"
          variant={showForm ? "ghost" : "outline"}
          onClick={() => setShowForm(!showForm)}
          className="h-7 px-2 border-slate-700 text-slate-400 hover:text-slate-200"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="mb-4 space-y-3 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-slate-200">New Job Posting</h4>

          <div>
            <Label className="text-xs text-slate-400 mb-1">Job Title *</Label>
            <Input
              {...register("title", { required: true })}
              placeholder="e.g. Senior Frontend Engineer"
              className="bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-400 mb-1">Job Description *</Label>
            <Textarea
              {...register("description", { required: true })}
              placeholder="Paste the full job description here..."
              className="bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600 text-sm min-h-24 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-400 mb-1">Seniority</Label>
              <Select defaultValue="mid" onValueChange={v => setValue("seniorityLevel", v as JobPosting["seniority_level"])}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-300 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {SENIORITY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-slate-300 text-sm">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400 mb-1">Type</Label>
              <Select defaultValue="full_time" onValueChange={v => setValue("employmentType", v as JobPosting["employment_type"])}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-300 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {EMPLOYMENT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-slate-300 text-sm">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-400 mb-1">Location (optional)</Label>
            <Input
              {...register("location")}
              placeholder="e.g. Remote, New York, NY"
              className="bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-sm"
            />
          </div>

          {/* Required Skills */}
          <div>
            <Label className="text-xs text-slate-400 mb-1">Required Skills *</Label>
            <div className="flex gap-1.5">
              <Input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill("required"))}
                placeholder="Type skill + Enter"
                className="bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={() => addSkill("required")} className="h-8 border-slate-700">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {requiredSkills.map(s => (
                  <Badge key={s} className="bg-violet-600/20 text-violet-300 border-violet-500/30 text-xs gap-1">
                    {s}
                    <button type="button" onClick={() => setRequiredSkills(p => p.filter(x => x !== s))}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Nice to have */}
          <div>
            <Label className="text-xs text-slate-400 mb-1">Nice-to-Have Skills</Label>
            <div className="flex gap-1.5">
              <Input
                value={niceInput}
                onChange={e => setNiceInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill("nice"))}
                placeholder="Type skill + Enter"
                className="bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={() => addSkill("nice")} className="h-8 border-slate-700">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {niceToHaveSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {niceToHaveSkills.map(s => (
                  <Badge key={s} className="bg-slate-700/50 text-slate-400 text-xs gap-1">
                    {s}
                    <button type="button" onClick={() => setNiceToHaveSkills(p => p.filter(x => x !== s))}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white h-8 text-sm"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
              Create Posting
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="h-8 text-slate-400"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Job list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {jobs.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No job postings yet</p>
            <p className="text-xs text-slate-600">Create your first job posting above</p>
          </div>
        ) : (
          jobs.map(job => (
            <button
              key={job.id}
              onClick={() => onSelectJob(job.id)}
              className={cn(
                "w-full text-left p-3 rounded-xl border transition-all group",
                selectedJobId === job.id
                  ? "border-violet-500/50 bg-violet-500/10"
                  : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", selectedJobId === job.id ? "text-violet-300" : "text-slate-200")}>
                    {job.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-slate-500 capitalize">{job.seniority_level}</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs text-slate-500 capitalize">{job.employment_type.replace("_", " ")}</span>
                    {job.location && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span className="text-xs text-slate-500 flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />{job.location}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {(job.required_skills as string[]).slice(0, 3).map(s => (
                      <span key={s} className="text-xs text-violet-400/70 flex items-center gap-0.5">
                        <Tag className="w-2.5 h-2.5" />{s}
                      </span>
                    ))}
                    {(job.required_skills as string[]).length > 3 && (
                      <span className="text-xs text-slate-600">+{(job.required_skills as string[]).length - 3}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Users className="w-3 h-3" />
                    {job.candidate_count}
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-colors", selectedJobId === job.id ? "text-violet-400" : "text-slate-700 group-hover:text-slate-500")} />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
