'use client';

import { useState } from 'react';
import { useInterviewStore, RoundType, RoundConfig, Difficulty, EvaluationMode } from '@/store/interviewStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SetupLayout } from './SetupLayout';
import { BackButton } from '@/components/ui/back-button';

const DEFAULT_ROUNDS: Record<RoundType, RoundConfig> = {
  Aptitude: { id: 'r-apt', type: 'Aptitude', questionCount: 10, difficulty: 'Medium', timeLimitMinutes: 15, qualifyingThreshold: 60, status: 'unattempted' },
  Coding: { id: 'r-code', type: 'Coding', questionCount: 2, difficulty: 'Medium', timeLimitMinutes: 45, qualifyingThreshold: 70, status: 'unattempted' },
  GD: { id: 'r-gd', type: 'GD', questionCount: 1, difficulty: 'Medium', timeLimitMinutes: 15, qualifyingThreshold: 60, status: 'unattempted' },
  Technical: { id: 'r-tech', type: 'Technical', questionCount: 10, difficulty: 'Medium', timeLimitMinutes: 30, qualifyingThreshold: 70, status: 'unattempted' },
  HR: { id: 'r-hr', type: 'HR', questionCount: 8, difficulty: 'Medium', timeLimitMinutes: 20, qualifyingThreshold: 60, status: 'unattempted' },
};

export function RoundSelectionScreen() {
  const { 
    evaluationMode, structuredRounds,
    setEvaluationMode, setStructuredRounds, setStage
  } = useInterviewStore();

  const [evalMode, setEvalMode] = useState<EvaluationMode>(evaluationMode || 'Elimination');
  const [rounds, setRounds] = useState<RoundConfig[]>(
    structuredRounds.length > 0 ? structuredRounds : [
      { ...DEFAULT_ROUNDS.Aptitude, id: `r-${Date.now()}-apt` },
      { ...DEFAULT_ROUNDS.Coding, id: `r-${Date.now()}-code` },
      { ...DEFAULT_ROUNDS.Technical, id: `r-${Date.now()}-tech` }
    ]
  );

  const handleAddRound = (type: RoundType) => {
    // eslint-disable-next-line react-hooks/purity
    setRounds([...rounds, { ...DEFAULT_ROUNDS[type], id: `r-${Date.now()}-${type}` }]);
  };

  const handleRemoveRound = (id: string) => {
    setRounds(rounds.filter(r => r.id !== id));
  };

  const handleMoveRound = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === rounds.length - 1)) return;
    const newRounds = [...rounds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newRounds[index], newRounds[targetIndex]] = [newRounds[targetIndex], newRounds[index]];
    setRounds(newRounds);
  };

  const handleUpdateRound = (id: string, field: keyof RoundConfig, value: unknown) => {
    setRounds(rounds.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleNext = () => {
    setEvaluationMode(evalMode);
    setStructuredRounds(rounds);
    setStage('readiness');
  };

  return (
    <SetupLayout>
      <div className="w-full max-w-4xl mx-auto py-6 flex flex-col h-full overflow-y-auto">
        <div className="mb-8 text-center relative z-10 drop-shadow-md">
          <h1 className="text-4xl font-outfit font-bold mb-3 tracking-tight text-white drop-shadow-lg">Customize Your Rounds</h1>
          <p className="text-blue-100 text-lg drop-shadow">Select the interview rounds you want to practice and configure them.</p>
        </div>

        <Card className="glass-panel bg-blue-950/40 backdrop-blur-xl border-cyan-500/30 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <CardTitle className="text-cyan-400">Structured Round Configuration</CardTitle>
            <CardDescription className="text-blue-200">Select rounds, arrange order, and set qualifying rules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/10">
              <span className="font-semibold text-sm text-white">Add Round:</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(DEFAULT_ROUNDS) as RoundType[]).map(type => (
                  <Button key={type} size="sm" variant="outline" onClick={() => handleAddRound(type)} className="gap-1 bg-blue-950/50 text-white border-white/20 hover:bg-white/10 h-8">
                    <Plus className="w-3 h-3" /> {type}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {rounds.map((round, index) => (
                <div key={round.id} className="border border-white/10 rounded-xl p-4 bg-black/40 shadow-inner">
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">{index + 1}</div>
                      <span className="font-semibold text-white">{round.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white" onClick={() => handleMoveRound(index, 'up')} disabled={index === 0}><ChevronUp className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white" onClick={() => handleMoveRound(index, 'down')} disabled={index === rounds.length - 1}><ChevronDown className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleRemoveRound(round.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-blue-200 uppercase tracking-wider">Questions</Label>
                      <Input type="number" min="1" value={round.questionCount} onChange={(e) => handleUpdateRound(round.id, 'questionCount', parseInt(e.target.value) || 1)} className="h-8 text-sm bg-black/40 text-white border-white/10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-blue-200 uppercase tracking-wider">Difficulty</Label>
                      <Select value={round.difficulty} onChange={(e) => handleUpdateRound(round.id, 'difficulty', e.target.value as Difficulty)} className="h-8 text-sm bg-black/40 text-white border-white/10">
                        <option value="Easy" className="bg-blue-950">Easy</option>
                        <option value="Medium" className="bg-blue-950">Medium</option>
                        <option value="Hard" className="bg-blue-950">Hard</option>
                        <option value="Adaptive" className="bg-blue-950">Adaptive</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-blue-200 uppercase tracking-wider">Time (min)</Label>
                      <Input type="number" min="1" value={round.timeLimitMinutes} onChange={(e) => handleUpdateRound(round.id, 'timeLimitMinutes', parseInt(e.target.value) || 1)} className="h-8 text-sm bg-black/40 text-white border-white/10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-blue-200 uppercase tracking-wider">Threshold %</Label>
                      <Input type="number" min="0" max="100" value={round.qualifyingThreshold} onChange={(e) => handleUpdateRound(round.id, 'qualifyingThreshold', parseInt(e.target.value) || 0)} className="h-8 text-sm bg-black/40 text-white border-white/10" />
                    </div>
                  </div>
                </div>
              ))}
              {rounds.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-white/10 rounded-xl text-blue-200 text-sm">
                  No rounds selected. Add a round to begin.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10">
              <Label className="mb-3 block text-white">Evaluation Mode</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  className={cn("p-4 rounded-xl border cursor-pointer transition-colors", evalMode === 'Elimination' ? "border-red-400 bg-red-400/20 shadow-[0_0_15px_rgba(248,113,113,0.2)]" : "border-white/10 bg-black/20 hover:border-white/20")}
                  onClick={() => setEvalMode('Elimination')}
                >
                  <h4 className="font-semibold text-red-400 mb-1 text-sm">Elimination Mode</h4>
                  <p className="text-xs text-blue-200">End simulation if a round&apos;s threshold is failed.</p>
                </div>
                <div 
                  className={cn("p-4 rounded-xl border cursor-pointer transition-colors", evalMode === 'Continue' ? "border-cyan-400 bg-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : "border-white/10 bg-black/20 hover:border-white/20")}
                  onClick={() => setEvalMode('Continue')}
                >
                  <h4 className="font-semibold text-cyan-400 mb-1 text-sm">Continue Mode</h4>
                  <p className="text-xs text-blue-200">Practice all selected rounds regardless of score.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-between items-center bg-blue-950/60 backdrop-blur-xl border border-white/10 p-6 rounded-xl shadow-2xl">
          <BackButton onClick={() => setStage('configuration')} />
          <div className="text-sm text-blue-200 font-medium">Step 3 of 3</div>
          <Button onClick={handleNext} disabled={rounds.length === 0} size="lg" className="gap-2 font-semibold shadow-lg bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20 border-0">
            Proceed to Readiness <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </SetupLayout>
  );
}
