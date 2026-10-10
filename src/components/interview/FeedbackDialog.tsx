import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Brain, Star, CheckCircle, BarChart, FileText } from 'lucide-react';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: () => void;
}

export function FeedbackDialog({ open, onOpenChange, onStart }: FeedbackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-blue-950/90 border-cyan-500/30 backdrop-blur-xl text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-cyan-400">
            <Brain className="w-6 h-6" /> Personalized AI Feedback
          </DialogTitle>
          <DialogDescription className="text-blue-100/70">
            Discover how Engineer Saathi analyzes your performance to accelerate your growth.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
            <div className="flex gap-3 items-start">
              <Star className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-semibold text-sm">Actionable Scoring</h5>
                <p className="text-xs text-blue-100/60 mt-1">Receive precise 0-100 scores based on correctness, clarity, and completeness.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-semibold text-sm">Detailed Question Reviews</h5>
                <p className="text-xs text-blue-100/60 mt-1">Compare your answer line-by-line with the expected optimal response context.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <BarChart className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-semibold text-sm">Competency Analysis</h5>
                <p className="text-xs text-blue-100/60 mt-1">Identify your top strengths and core areas to improve across different interview modes.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={() => { onOpenChange(false); onStart(); }} className="gap-2 w-full bg-cyan-600 hover:bg-cyan-700 text-white border-0 shadow-lg shadow-cyan-500/20">
            Experience it now <FileText className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
