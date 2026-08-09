import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Share2, 
  Twitter, 
  Linkedin, 
  Copy, 
  Check,
  Crown,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface SuccessSnapshotProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beforeScore: number;
  afterScore: number;
  applicationCount?: number;
}

export const SuccessSnapshot = ({
  open,
  onOpenChange,
  beforeScore,
  afterScore,
  applicationCount = 1,
}: SuccessSnapshotProps) => {
  const [copied, setCopied] = useState(false);
  
  const shareMessage = `I was getting ignored. Then Sovereign helped me optimize my applications.\n\nBefore: ${beforeScore}% acceptance rate\nAfter: ${afterScore}% acceptance rate\n\n📈 ${afterScore - beforeScore}% improvement\n\nCheck it out: https://sovereignapp.pro`;
  
  const shareUrl = 'https://sovereignapp.pro';
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareMessage);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleTwitterShare = () => {
    const tweetText = encodeURIComponent(`I was getting ignored. Sovereign fixed my applications.\n\n📊 ${beforeScore}% → ${afterScore}% acceptance rate\n\nStop writing generic proposals. Start getting accepted.\n\n`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };
  
  const handleLinkedInShare = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };
  
  const handleRedditShare = () => {
    const title = encodeURIComponent(`Went from ${beforeScore}% to ${afterScore}% acceptance rate on my job applications`);
    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${title}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border p-0 overflow-hidden">
        {/* Header with gold gradient */}
        <div className="p-6 pb-4 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Success Snapshot
                </DialogTitle>
                <span className="text-sm text-amber-500 font-medium">
                  Elite Feature
                </span>
              </div>
            </div>
            <DialogDescription className="text-muted-foreground text-base">
              Share your milestone with others and help them discover a better way to apply.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Snapshot Preview */}
        <div className="px-6 py-4">
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-card to-amber-500/5 p-5">
            {/* Quote */}
            <p className="text-foreground font-medium text-center mb-4">
              "I was getting ignored. Sovereign fixed my applications."
            </p>
            
            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mb-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Before</p>
                <p className="text-3xl font-bold text-muted-foreground">{beforeScore}%</p>
              </div>
              
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-amber-500" />
                <span className="text-lg font-bold text-amber-500">
                  +{afterScore - beforeScore}%
                </span>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">After</p>
                <p className="text-3xl font-bold text-amber-500">{afterScore}%</p>
              </div>
            </div>
            
            {/* Branding */}
            <div className="flex items-center justify-center gap-2 pt-3 border-t border-border">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Crown className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">sovereignapp.pro</span>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="px-6 pb-6 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={handleTwitterShare}
              className="flex-col h-auto py-3 hover:bg-[#1DA1F2]/10 hover:border-[#1DA1F2]/30"
            >
              <Twitter className="w-5 h-5 mb-1 text-[#1DA1F2]" />
              <span className="text-xs">Twitter/X</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleLinkedInShare}
              className="flex-col h-auto py-3 hover:bg-[#0A66C2]/10 hover:border-[#0A66C2]/30"
            >
              <Linkedin className="w-5 h-5 mb-1 text-[#0A66C2]" />
              <span className="text-xs">LinkedIn</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleRedditShare}
              className="flex-col h-auto py-3 hover:bg-[#FF4500]/10 hover:border-[#FF4500]/30"
            >
              <ExternalLink className="w-5 h-5 mb-1 text-[#FF4500]" />
              <span className="text-xs">Reddit</span>
            </Button>
          </div>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Share Text
              </>
            )}
          </Button>
          
          <p className="text-center text-xs text-muted-foreground">
            Your privacy is protected—no personal data is shared.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
