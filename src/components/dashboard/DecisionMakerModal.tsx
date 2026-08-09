import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DecisionMakerResult } from '@/hooks/useProposalOptimization';
import { Users, Building, AlertTriangle, CheckCircle, Linkedin, Target } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DecisionMakerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: DecisionMakerResult | null;
}

export const DecisionMakerModal = ({ open, onOpenChange, result }: DecisionMakerModalProps) => {
  const primaryDecisionMaker = result?.primaryDecisionMaker ?? { title: '', department: '', influence: '', linkedInSearchTip: '' };
  const secondaryStakeholders = result?.secondaryStakeholders ?? [];
  const companyInsights = result?.companyInsights ?? { companyType: '', hiringStyle: '', greenFlags: [], redFlags: [] };
  const outreachStrategy = result?.outreachStrategy ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="w-5 h-5 text-amber-500" />
            Decision-Maker Analysis
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Primary Decision Maker */}
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-4">
                <h3 className="font-semibold text-amber-500 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Primary Decision Maker
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-medium">{primaryDecisionMaker.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium">{primaryDecisionMaker.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Influence:</span>
                    <span className="font-medium">{primaryDecisionMaker.influence}</span>
                  </div>
                  <div className="mt-3 p-3 bg-background/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-500 mb-1">
                      <Linkedin className="w-4 h-4" />
                      LinkedIn Search Tip
                    </div>
                    <p className="text-sm">{primaryDecisionMaker.linkedInSearchTip}</p>
                  </div>
                </div>
              </div>

              {/* Secondary Stakeholders */}
              {secondaryStakeholders.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Other Stakeholders
                  </h3>
                  <div className="space-y-2">
                    {secondaryStakeholders.map((stakeholder, index) => (
                      <div key={index} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium">{stakeholder.title}</span>
                        <span className="text-muted-foreground text-sm">{stakeholder.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Company Insights */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" />
                  Company Insights
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">Company Type</span>
                    <p className="font-medium">{companyInsights.companyType}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">Hiring Style</span>
                    <p className="font-medium">{companyInsights.hiringStyle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-green-500 text-sm font-medium mb-2">
                      <CheckCircle className="w-4 h-4" />
                      Green Flags
                    </div>
                    <ul className="space-y-1">
                      {companyInsights.greenFlags.map((flag, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-red-500 text-sm font-medium mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Red Flags
                    </div>
                    <ul className="space-y-1">
                      {companyInsights.redFlags.map((flag, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Outreach Strategy */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h3 className="font-semibold text-primary mb-2">Recommended Outreach Strategy</h3>
                <p className="text-sm">{outreachStrategy}</p>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Loading analysis...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
