import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OutreachMessagesResult } from '@/hooks/useProposalOptimization';
import { MessageSquare, Mail, Linkedin, Copy, Check, Lightbulb } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OutreachMessagesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: OutreachMessagesResult | null;
}

export const OutreachMessagesModal = ({ open, onOpenChange, result }: OutreachMessagesModalProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const linkedInConnectionRequest = result?.linkedInConnectionRequest ?? '';
  const linkedInFollowUp = result?.linkedInFollowUp ?? '';
  const coldEmail = result?.coldEmail ?? { subject: '', body: '' };
  const followUpEmail = result?.followUpEmail ?? { subject: '', body: '' };
  const twitterDM = result?.twitterDM;
  const tips = result?.tips ?? [];

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(text, field)}
      className="h-8 px-2"
    >
      {copiedField === field ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Outreach Messages
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <ScrollArea className="max-h-[70vh] pr-4">
            <Tabs defaultValue="linkedin" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="linkedin" className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="tips" className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Tips
                </TabsTrigger>
              </TabsList>

              <TabsContent value="linkedin" className="space-y-4">
                {/* Connection Request */}
                <div className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">Connection Request</h4>
                    <CopyButton text={linkedInConnectionRequest} field="connection" />
                  </div>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                    {linkedInConnectionRequest}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {linkedInConnectionRequest.length}/300 characters
                  </p>
                </div>

                {/* Follow-up Message */}
                <div className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">Follow-up Message</h4>
                    <CopyButton text={linkedInFollowUp} field="followup" />
                  </div>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                    {linkedInFollowUp}
                  </p>
                </div>

                {/* Twitter DM */}
                {twitterDM && (
                  <div className="border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">Twitter/X DM</h4>
                      <CopyButton text={twitterDM} field="twitter" />
                    </div>
                    <p className="text-sm bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                      {twitterDM}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="email" className="space-y-4">
                {/* Cold Email */}
                <div className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">Cold Email</h4>
                    <CopyButton 
                      text={`Subject: ${coldEmail.subject}\n\n${coldEmail.body}`} 
                      field="cold-email" 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="bg-muted/30 p-2 rounded-lg">
                      <span className="text-xs text-muted-foreground">Subject: </span>
                      <span className="text-sm font-medium">{coldEmail.subject}</span>
                    </div>
                    <p className="text-sm bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                      {coldEmail.body}
                    </p>
                  </div>
                </div>

                {/* Follow-up Email */}
                <div className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">Follow-up Email</h4>
                    <CopyButton 
                      text={`Subject: ${followUpEmail.subject}\n\n${followUpEmail.body}`} 
                      field="followup-email" 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="bg-muted/30 p-2 rounded-lg">
                      <span className="text-xs text-muted-foreground">Subject: </span>
                      <span className="text-sm font-medium">{followUpEmail.subject}</span>
                    </div>
                    <p className="text-sm bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                      {followUpEmail.body}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tips">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <h4 className="font-semibold text-amber-500 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Outreach Tips
                  </h4>
                  <ul className="space-y-3">
                    {tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Loading messages...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
