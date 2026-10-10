'use client';

import { useInterviewStore } from '@/store/interviewStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock, Target, AlertTriangle } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';

export function RoundIntroScreen() {
  const { currentRoundIndex, structuredRounds, evaluationMode, setStage, updateSubStage } = useInterviewStore();
  const round = structuredRounds[currentRoundIndex];

  if (!round) {
    return null;
  }

  const handleBegin = () => {
    // Map round type to interview sub-stage
    if (round.type === 'Coding') {
      updateSubStage('coding');
    } else if (round.type === 'GD') {
      updateSubStage('gd');
    } else if (round.type === 'Technical') {
      updateSubStage('technical');
    } else if (round.type === 'HR') {
      updateSubStage('behavioral');
    } else if (round.type === 'Aptitude') {
      updateSubStage('aptitude');
    }
    setStage('interview');
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-16 px-6 flex flex-col h-full items-center justify-center">
      <div className="mb-8 text-center">
        <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4 border border-white/10">
          Round {currentRoundIndex + 1} of {structuredRounds.length}
        </div>
        <h1 className="text-4xl md:text-5xl font-outfit font-bold mb-4 tracking-tight">{round.type} Round</h1>
      </div>

      <Card className="glass-panel border-white/10 shadow-2xl w-full">
        <CardHeader className="text-center border-b border-white/10 pb-6">
          <CardTitle className="text-2xl mb-2">Instructions</CardTitle>
          <CardDescription className="text-base text-muted-foreground max-w-md mx-auto">
            You are about to begin the {round.type} round. Ensure your camera and microphone are ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <Clock className="w-6 h-6 text-blue-400 mb-2" />
              <div className="text-sm text-muted-foreground mb-1">Time Limit</div>
              <div className="font-semibold text-lg">{round.timeLimitMinutes} Mins</div>
            </div>
            <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <Target className="w-6 h-6 text-green-400 mb-2" />
              <div className="text-sm text-muted-foreground mb-1">Questions</div>
              <div className="font-semibold text-lg">{round.questionCount} Tasks</div>
            </div>
            <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <AlertTriangle className="w-6 h-6 text-amber-400 mb-2" />
              <div className="text-sm text-muted-foreground mb-1">Threshold</div>
              <div className="font-semibold text-lg">{round.qualifyingThreshold}%</div>
            </div>
          </div>
          
          {evaluationMode === 'Elimination' && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p><strong>Elimination Mode Active:</strong> You must score at least {round.qualifyingThreshold}% in this round to unlock the next round. Good luck!</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-white/5 border-t border-white/10 p-6 flex justify-between items-center rounded-b-xl">
          {currentRoundIndex === 0 ? (
            <BackButton onClick={() => setStage('readiness')} />
          ) : (
            <BackButton onClick={() => setStage('report')} label="End Interview" />
          )}
          <Button onClick={handleBegin} size="lg" className="gap-2 font-bold shadow-lg shadow-primary/20 w-full md:w-auto px-12">
            <Play className="w-4 h-4 fill-current" /> Begin Round
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
