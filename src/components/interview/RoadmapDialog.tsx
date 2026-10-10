import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Map, Brain, Code, UserCheck, MessageSquare, Play } from 'lucide-react';

interface RoadmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: () => void;
}

const STAGES = [
  { id: 'aptitude', title: 'Aptitude & Logic', icon: Brain, desc: 'Master quantitative and logical reasoning tests.' },
  { id: 'coding', title: 'Coding & DSA', icon: Code, desc: 'Practice algorithmic problem solving and data structures.' },
  { id: 'technical', title: 'Technical Rounds', icon: Map, desc: 'Deep dive into system design and domain knowledge.' },
  { id: 'gd', title: 'Group Discussions', icon: MessageSquare, desc: 'Improve communication and teamwork skills.' },
  { id: 'hr', title: 'HR & Behavioral', icon: UserCheck, desc: 'Prepare for leadership principles and culture fit.' },
];

export function RoadmapDialog({ open, onOpenChange, onStart }: RoadmapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-blue-950/90 border-cyan-500/30 backdrop-blur-xl text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-cyan-400">
            <Map className="w-6 h-6" /> Interview Roadmap
          </DialogTitle>
          <DialogDescription className="text-blue-100/70">
            A comprehensive path to mastering your engineering interview. Engineer Saathi can guide you through every stage.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative border-l border-white/20 ml-3 space-y-6">
            {STAGES.map((stage, i) => (
              <div key={stage.id} className="relative pl-6">
                <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-blue-900 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                  <stage.icon className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">{stage.title}</h4>
                  <p className="text-sm text-blue-100/70">{stage.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t border-white/10">
          <Button onClick={() => { onOpenChange(false); onStart(); }} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
            Start the Journey <Play className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
