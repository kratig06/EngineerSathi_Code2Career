'use client';

import { useInterviewStore } from '@/store/interviewStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Download, RefreshCw, Trophy, Target, Code, MessageSquare, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateRoundScore } from '@/lib/scoring';
import { BackButton } from '@/components/ui/back-button';

const mockCompetencyData = [
  { subject: 'Technical', A: 85, fullMark: 100 },
  { subject: 'Problem Solving', A: 90, fullMark: 100 },
  { subject: 'Coding', A: 75, fullMark: 100 },
  { subject: 'Communication', A: 88, fullMark: 100 },
  { subject: 'System Design', A: 70, fullMark: 100 },
];

export function ReportScreen() {
  const { targetRole, targetCompany, setStage, interviewMode, structuredRounds, questions, allQuestions, warnings } = useInterviewStore();

  // Combine past archived questions and current round's questions (deduplicated by id)
  const combinedQuestions = [...allQuestions];
  questions.forEach(q => {
    if (!combinedQuestions.find(cq => cq.id === q.id)) {
      combinedQuestions.push(q);
    }
  });

  const { answeredQuestions, hasScores, calculatedScore: averageScore, threads } = calculateRoundScore(combinedQuestions);
  
  const isTerminated = warnings.length >= 5;
  const scoreCategory = isTerminated ? "Terminated Early" : hasScores 
    ? (averageScore! >= 80 ? "Strong Candidate" : averageScore! >= 60 ? "Good Potential" : "Needs Practice")
    : "Not scored yet";

  const handleRestart = () => {
    useInterviewStore.getState().setQuestions([]);
    useInterviewStore.setState({ allQuestions: [] });
    useInterviewStore.getState().setStructuredRounds([]);
    useInterviewStore.getState().resetWarnings();
    useInterviewStore.setState({ transcript: [] });
    setStage('setup');
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-6 overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="mb-2">
            <BackButton onClick={() => setStage('landing')} label="Back to Home" />
          </div>
          <h1 className="text-4xl font-outfit font-bold tracking-tight mb-2">Interview Performance Report</h1>
          <p className="text-muted-foreground text-lg">
            {targetRole} {targetCompany ? `at ${targetCompany}` : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 border-white/20"><Download className="w-4 h-4" /> Download PDF</Button>
          <Button onClick={handleRestart} className="gap-2"><RefreshCw className="w-4 h-4" /> Start New Interview</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Overall Score */}
        <Card className="glass-panel border-white/10 shadow-xl flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500"></div>
          <Trophy className="w-12 h-12 text-yellow-400 mb-4" />
          <h2 className="text-4xl lg:text-6xl font-outfit font-bold text-white mb-2">
            {hasScores ? averageScore : "Not scored yet"}
            {hasScores && <span className="text-2xl text-muted-foreground">/100</span>}
          </h2>
          <p className="text-lg font-medium text-primary">{scoreCategory}</p>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            {answeredQuestions.length} of {combinedQuestions.length} questions evaluated.
          </p>
          {warnings.length > 0 && (
            <div className={cn("mt-4 text-xs font-semibold px-3 py-1 rounded-full", isTerminated ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400")}>
              {warnings.length} Proctoring Warning{warnings.length > 1 ? 's' : ''} Issued
            </div>
          )}
        </Card>

        {/* Competency Radar or Structured Rounds */}
        <Card className="glass-panel border-white/10 shadow-xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>{interviewMode === 'Structured' ? 'Round-by-Round Results' : 'Competency Breakdown'}</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            {interviewMode === 'Structured' ? (
              <div className="w-full h-full overflow-y-auto space-y-3 pr-2">
                {structuredRounds.map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <h4 className="font-semibold text-sm">{i + 1}. {r.type} Round</h4>
                      <p className="text-xs text-muted-foreground">Threshold: {r.qualifyingThreshold}%</p>
                    </div>
                    <div className="text-right">
                      {r.status === 'unattempted' || r.status === 'skipped' ? (
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Not Attempted</span>
                      ) : (
                        <div>
                          <div className={cn("font-bold text-lg", (r.score ?? 0) >= r.qualifyingThreshold ? "text-green-400" : "text-red-400")}>
                            {r.score}%
                          </div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                            {(r.score ?? 0) >= r.qualifyingThreshold ? 'Qualified' : 'Eliminated'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mockCompetencyData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Candidate" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Improvement Plan */}
        <Card className="glass-panel border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Actionable Improvement Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">Top Strengths</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Articulating your thought process clearly before writing code.</li>
                <li>Handling edge cases effectively in initial logic.</li>
                <li>Professional communication and structuring of responses.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">Areas to Improve</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Optimizing time complexity from O(N^2) to O(N) in array problems.</li>
                <li>Familiarity with advanced system design trade-offs.</li>
                <li>Code readability and consistent variable naming.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Question Review */}
        <Card className="glass-panel border-white/10 shadow-xl flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" /> Question Review</CardTitle>
            <CardDescription>Review your specific answers and model responses.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[400px] space-y-4 pr-2">
            
            {threads.length === 0 ? (
               <div className="text-center text-muted-foreground py-8">No questions were asked during this session.</div>
            ) : threads.map((thread, i) => {
              const mainQ = thread[0];
              const followUps = thread.slice(1);
              const hasAnswer = Boolean(mainQ.candidateCode || mainQ.candidateAnswer);
              const displayStatus = mainQ.status || 'unanswered';
              
              return (
              <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-sm text-primary max-w-[70%]">Q{i + 1}: {mainQ.text}</h5>
                  <span className={cn(
                    "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border",
                    displayStatus === 'evaluated' ? "bg-green-500/20 text-green-400 border-green-500/20" :
                    displayStatus === 'unanswered' ? "bg-gray-500/20 text-gray-400 border-gray-500/20" :
                    displayStatus === 'skipped' ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/20" :
                    "bg-blue-500/20 text-blue-400 border-blue-500/20"
                  )}>
                    {displayStatus.replace('_', ' ')}
                  </span>
                </div>
                
                <div className={cn("p-3 rounded text-sm mb-3 whitespace-pre-wrap font-mono", hasAnswer ? "bg-black/20 text-muted-foreground italic" : "bg-red-500/10 text-red-400")}>
                  {hasAnswer ? (mainQ.candidateCode || mainQ.candidateAnswer) : "Not answered"}
                </div>
                
                <div className="text-sm space-y-2">
                  {displayStatus === 'evaluated' && mainQ.score !== undefined && (
                    <p><span className="font-semibold text-green-400">Score:</span> {mainQ.score}/100</p>
                  )}
                  {mainQ.feedback && displayStatus !== 'unanswered' && displayStatus !== 'skipped' && (
                    <p><span className="font-semibold text-amber-400">Feedback:</span> {mainQ.feedback}</p>
                  )}
                  <p><span className="font-semibold text-blue-400">Expected:</span> {mainQ.expectedAnswerContext}</p>
                </div>

                {followUps.length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 border-white/10 space-y-4">
                    {followUps.map((fq, fi) => {
                      const fHasAnswer = Boolean(fq.candidateCode || fq.candidateAnswer);
                      const fStatus = fq.status || 'unanswered';
                      return (
                        <div key={fi} className="p-3 bg-black/10 rounded-lg">
                          <h6 className="font-medium text-xs text-primary mb-1">Follow-up: {fq.text}</h6>
                          <div className={cn("p-2 rounded text-xs mb-2 whitespace-pre-wrap font-mono", fHasAnswer ? "bg-black/20 text-muted-foreground italic" : "bg-red-500/10 text-red-400")}>
                            {fHasAnswer ? (fq.candidateCode || fq.candidateAnswer) : "Not answered"}
                          </div>
                          <div className="text-xs space-y-1">
                            {fStatus === 'evaluated' && fq.score !== undefined && (
                              <p><span className="font-semibold text-green-400">Score:</span> {fq.score}/100</p>
                            )}
                            {fq.feedback && (
                              <p><span className="font-semibold text-amber-400">Feedback:</span> {fq.feedback}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )})}

          </CardContent>
        </Card>
      </div>
      
    </div>
  );
}
