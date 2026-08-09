import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FullStrategyResult } from '@/hooks/useProposalOptimization';
import { 
  Map, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  ListChecks,
  MessageSquare,
  DollarSign,
  Sparkles,
  XCircle,
  Shield
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface FullStrategyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: FullStrategyResult | null;
}

export const FullStrategyModal = ({ open, onOpenChange, result }: FullStrategyModalProps) => {
  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'Strong Match': return 'text-green-500 bg-green-500/10';
      case 'Good Match': return 'text-emerald-500 bg-emerald-500/10';
      case 'Moderate Match': return 'text-yellow-500 bg-yellow-500/10';
      case 'Weak Match': return 'text-orange-500 bg-orange-500/10';
      case 'Not Recommended': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-black';
      case 'Low': return 'bg-gray-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const overallAssessment = result?.overallAssessment ?? { fitScore: 0, summary: '', verdict: '' };
  const whyApplicationsFail = result?.whyApplicationsFail ?? [];
  const differentiators = result?.differentiators ?? [];
  const riskFactors = result?.riskFactors ?? [];
  const actionPlan = result?.actionPlan ?? [];
  const interviewPrep = result?.interviewPrep ?? { likelyQuestions: [], questionsToAsk: [], keyTalkingPoints: [] };
  const salaryInsight = result?.salaryInsight;
  const finalAdvice = result?.finalAdvice ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Map className="w-5 h-5 text-amber-500" />
            Full Application Strategy
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <ScrollArea className="max-h-[75vh] pr-4">
            <div className="space-y-6">
              {/* Overall Assessment */}
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-500" />
                    Overall Assessment
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVerdictColor(overallAssessment.verdict)}`}>
                    {overallAssessment.verdict}
                  </span>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Fit Score</span>
                    <span className="text-2xl font-bold text-amber-500">{overallAssessment.fitScore}%</span>
                  </div>
                  <Progress value={overallAssessment.fitScore} className="h-2" />
                </div>
                
                <p className="text-sm">{overallAssessment.summary}</p>
              </div>

              {/* Why Applications Fail */}
              {whyApplicationsFail.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    Why Similar Applications Fail
                  </h3>
                  <div className="space-y-3">
                    {whyApplicationsFail.map((item, index) => (
                      <div key={index} className="border rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{item.reason}</p>
                            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {item.howToAvoid}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Differentiators */}
              {differentiators.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    What Could Make You Stand Out
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {differentiators.map((diff, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm">{diff}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {riskFactors.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Risk Factors & Mitigations
                  </h3>
                  <div className="space-y-2">
                    {riskFactors.map((item, index) => (
                      <div key={index} className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
                        <div className="text-sm">
                          <span className="text-red-500 font-medium">Risk: </span>
                          {item.risk}
                        </div>
                        <div className="text-sm">
                          <span className="text-green-500 font-medium">Fix: </span>
                          {item.mitigation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Plan */}
              {actionPlan.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-primary" />
                    Action Plan
                  </h3>
                  <div className="space-y-2">
                    {actionPlan.map((step, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {step.step}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{step.action}</p>
                          <p className="text-xs text-muted-foreground">{step.timing}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(step.priority)}`}>
                          {step.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interview Prep */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Interview Preparation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-xl p-4">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Likely Questions</h4>
                    <ul className="space-y-2">
                      {interviewPrep.likelyQuestions.map((q, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border rounded-xl p-4">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Questions to Ask</h4>
                    <ul className="space-y-2">
                      {interviewPrep.questionsToAsk.map((q, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-green-500">•</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border rounded-xl p-4">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Key Talking Points</h4>
                    <ul className="space-y-2">
                      {interviewPrep.keyTalkingPoints.map((p, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Salary Insight */}
              {salaryInsight && (
                <div className="border rounded-xl p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Salary Insight
                  </h3>
                  <div className="mb-3">
                    <span className="text-muted-foreground text-sm">Estimated Range: </span>
                    <span className="font-bold text-lg text-green-500">{salaryInsight.estimatedRange}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Negotiation Tips:</span>
                    <ul className="mt-2 space-y-1">
                      {salaryInsight.negotiationTips.map((tip, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500 mt-1 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Final Advice */}
              {finalAdvice && (
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-5">
                  <h3 className="font-semibold text-amber-500 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Final Advice
                  </h3>
                  <p className="text-sm italic">"{finalAdvice}"</p>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Loading strategy...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
