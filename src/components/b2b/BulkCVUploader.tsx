import { useState, useCallback, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, Zap, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  JobPosting,
  UploadQueueItem,
  processBulkCVs,
  getScoreColor,
} from "@/services/b2bEvaluationEngine";

interface Props {
  jobPosting: JobPosting;
  orgId: string;
  onComplete?: () => void;
}

const MAX_FILES = 50;
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export default function BulkCVUploader({ jobPosting, orgId, onComplete }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateItem = useCallback((index: number, update: Partial<UploadQueueItem>) => {
    setQueue(prev => prev.map((item, i) => i === index ? { ...item, ...update } : item));
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles
      .filter(f => ACCEPTED_TYPES.includes(f.type))
      .slice(0, MAX_FILES - queue.length);

    if (valid.length === 0) return;

    setQueue(prev => [
      ...prev,
      ...valid.map(f => ({
        file: f,
        status: "queued" as const,
        progress: 0,
      })),
    ]);
  }, [queue.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  }, [addFiles]);

  const removeQueued = useCallback((index: number) => {
    if (isProcessing) return;
    setQueue(prev => prev.filter((_, i) => i !== index));
  }, [isProcessing]);

  const startProcessing = useCallback(async () => {
    const pending = queue.filter(q => q.status === "queued");
    if (!pending.length) return;

    setIsProcessing(true);
    const startIndex = queue.findIndex(q => q.status === "queued");

    try {
      await processBulkCVs({
        files: pending.map(q => q.file),
        jobPosting,
        orgId,
        concurrency: 4,
        onItemUpdate: (relativeIndex, update) => {
          updateItem(startIndex + relativeIndex, update);
        },
      });
    } finally {
      setIsProcessing(false);
      onComplete?.();
    }
  }, [queue, jobPosting, orgId, updateItem, onComplete]);

  const stats = {
    total: queue.length,
    queued: queue.filter(q => q.status === "queued").length,
    processing: queue.filter(q => q.status === "uploading" || q.status === "evaluating").length,
    done: queue.filter(q => q.status === "done").length,
    error: queue.filter(q => q.status === "error").length,
  };

  const overallProgress = queue.length > 0
    ? Math.round((stats.done / queue.length) * 100)
    : 0;

  const displayedItems = showAll ? queue : queue.slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer select-none",
          isDragging
            ? "border-violet-500 bg-violet-500/10 scale-[1.01]"
            : "border-slate-700 hover:border-violet-500/60 hover:bg-slate-800/50",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleFileInput}
          disabled={isProcessing}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
            isDragging ? "bg-violet-500/20" : "bg-slate-800"
          )}>
            <Upload className={cn("w-6 h-6", isDragging ? "text-violet-400" : "text-slate-400")} />
          </div>
          <div>
            <p className="text-slate-200 font-medium">
              {isDragging ? "Drop CVs here" : "Drag & drop up to 50 CVs"}
            </p>
            <p className="text-slate-500 text-sm mt-1">PDF, DOCX, or TXT · Max 10 MB each</p>
          </div>
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:border-violet-500" disabled={isProcessing}>
            Browse Files
          </Button>
        </div>
        {queue.length > 0 && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-violet-600 text-white">{queue.length} / {MAX_FILES}</Badge>
          </div>
        )}
      </div>

      {/* Overall Progress Bar */}
      {isProcessing && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              Processing {stats.done + stats.processing} / {stats.total} CVs...
            </span>
            <span className="text-violet-400 font-mono font-bold">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2 bg-slate-700" />
          <div className="flex gap-4 text-xs text-slate-500">
            <span className="text-blue-400">{stats.processing} evaluating</span>
            <span className="text-emerald-400">{stats.done} done</span>
            {stats.error > 0 && <span className="text-red-400">{stats.error} failed</span>}
          </div>
        </div>
      )}

      {/* File Queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-400">Upload Queue</h4>
            {stats.queued > 0 && !isProcessing && (
              <Button
                size="sm"
                onClick={startProcessing}
                className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
              >
                <Zap className="w-3.5 h-3.5" />
                Evaluate {stats.queued} CVs
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
            {displayedItems.map((item, index) => (
              <QueueRow
                key={index}
                item={item}
                index={index}
                onRemove={removeQueued}
                isProcessing={isProcessing}
              />
            ))}
          </div>

          {queue.length > 8 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 py-1 transition-colors"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform", showAll && "rotate-180")} />
              {showAll ? "Show less" : `Show ${queue.length - 8} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function QueueRow({
  item,
  index,
  onRemove,
  isProcessing,
}: {
  item: UploadQueueItem;
  index: number;
  onRemove: (i: number) => void;
  isProcessing: boolean;
}) {
  const fileName = item.file.name.replace(/\.[^.]+$/, "");
  const displayName = item.candidateName || fileName;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-all",
      item.status === "done" && "border-emerald-500/30 bg-emerald-500/5",
      item.status === "error" && "border-red-500/30 bg-red-500/5",
      item.status === "evaluating" && "border-violet-500/30 bg-violet-500/5",
      item.status === "uploading" && "border-blue-500/30 bg-blue-500/5",
      item.status === "queued" && "border-slate-700 bg-slate-800/50",
    )}>
      <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-200 truncate">{displayName}</p>
          {item.matchScore != null && (
            <span className={cn("text-xs font-bold font-mono", getScoreColor(item.matchScore))}>
              {item.matchScore.toFixed(0)}%
            </span>
          )}
        </div>
        {(item.status === "uploading" || item.status === "evaluating") && (
          <div className="mt-1">
            <Progress value={item.progress} className="h-1 bg-slate-700" />
          </div>
        )}
        {item.error && (
          <p className="text-xs text-red-400 mt-0.5 truncate">{item.error}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusIcon status={item.status} />
        {item.status === "queued" && !isProcessing && (
          <button onClick={() => onRemove(index)} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: UploadQueueItem["status"] }) {
  switch (status) {
    case "queued":
      return <div className="w-4 h-4 rounded-full border border-slate-600" />;
    case "uploading":
      return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
    case "evaluating":
      return <Loader2 className="w-4 h-4 animate-spin text-violet-400" />;
    case "done":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
  }
}
