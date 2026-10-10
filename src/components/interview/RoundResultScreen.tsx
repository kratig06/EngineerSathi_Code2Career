'use client';

import { useInterviewStore } from '@/store/interviewStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, RotateCcw, XCircle, CheckCircle2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateRoundScore } from '@/lib/scoring';
import { BackButton } from '@/components/ui/back-button';

export function RoundResultScreen() {
  const { currentRoundIndex, structuredRounds, evaluationMode, setStage, setCurrentRoundIndex, updateRound, questions } = useInterviewStore();
  const round = structuredRounds[currentRoundIndex];

  if (!round) return null;

  const { hasScores, calculatedScore } = calculateRoundScore(questions);

  const score = round.score ?? calculatedScore ?? 0;
  const passed = hasScores ? score >= round.qualifyingThreshold : false;
  const isEliminated = evaluationMode === 'Elimination' && !passed;
  const isLastRound = currentRoundIndex === structuredRounds.length - 1;

  const handleNext = () => {
    // Save score and status
    updateRound(currentRoundIndex, { score: hasScores ? score : undefined, status: passed ? 'completed' : 'eliminated' });
    
    // Archive questions before moving on
    useInterviewStore.getState().archiveCurrentQuestions();

    if (isEliminated) {
      // End interview, mark rest as skipped/eliminated
      structuredRounds.forEach((r, idx) => {
        if (idx > currentRoundIndex) {
          updateRound(idx, { status: 'skipped' });
        }
      });
      setStage('report');
    } else if (isLastRound) {
      setStage('report');
    } else {
      setCurrentRoundIndex(currentRoundIndex + 1);
      setStage('round_intro');
    }
  };

  const handleRetry = () => {
    // Retry this round
    updateRound(currentRoundIndex, { score: undefined, status: 'in_progress' });
    setStage('round_intro');
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-16 px-6 flex flex-col h-full items-center justify-center">
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-outfit font-bold mb-4 tracking-tight">Round Results</h1>
        <p className="text-muted-foreground text-lg">Evaluation for the {round.type} Round.</p>
      </div>

      <Card className="glass-panel border-white/10 shadow-2xl w-full">
        <CardHeader className="text-center border-b border-white/10 pb-6">
          <div className="flex justify-center mb-4">
            {passed ? (
              <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                <XCircle className="w-10 h-10" />
              </div>
            )}
          </div>
          <CardTitle className="text-3xl mb-2">{hasScores ? (passed ? 'Round Passed!' : 'Threshold Not Met') : 'Round Skipped / Unanswered'}</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {hasScores ? (
              <>
                You scored <strong className={passed ? "text-green-400" : "text-red-400"}>{score}%</strong> 
                (Threshold: {round.qualifyingThreshold}%)
              </>
            ) : (
              <>Not Scored (Threshold: {round.qualifyingThreshold}%)</>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 pb-8 space-y-6">
          <div className="bg-black/20 border border-white/5 rounded-xl p-6">
            <h4 className="font-semibold mb-3">AI Evaluation Feedback</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {round.feedback || "You demonstrated a reasonable understanding of the concepts. Your communication was clear, but some technical depth was missing in the edge cases. Focus on optimizing your solutions and articulating trade-offs more clearly."}
            </p>
          </div>

          {isEliminated && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-lg p-4 text-center">
              <strong>Elimination Mode:</strong> Since you did not meet the qualifying threshold, the simulation will end here. You can review your report or retry this round.
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-white/5 border-t border-white/10 p-6 flex justify-between gap-4 rounded-b-xl">
          {isEliminated ? (
            <>
               <Button onClick={handleRetry} variant="outline" className="gap-2">
                 <RotateCcw className="w-4 h-4" /> Retry Round
               </Button>
               <Button onClick={handleNext} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                 <FileText className="w-4 h-4" /> View Final Report
               </Button>
            </>
          ) : (
            <>
              <BackButton onClick={() => setStage('report')} label="End Interview" />
              <Button onClick={handleNext} size="lg" className="gap-2 font-bold shadow-lg shadow-primary/20">
                {isLastRound ? 'View Final Report' : 'Next Round'} <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
