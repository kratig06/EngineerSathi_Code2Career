import { Question } from '@/store/interviewStore';

export function calculateRoundScore(questions: Question[]) {
  const answeredQuestions = questions.filter(q => q.status === 'evaluated' && q.score !== undefined);
  
  // Group by parent question to avoid double-counting follow-ups
  const threads = new Map<string, Question[]>();
  for (const q of answeredQuestions) {
    const parentId = q.isFollowUp && q.parentQuestionId ? q.parentQuestionId : q.id;
    if (!threads.has(parentId)) {
      threads.set(parentId, []);
    }
    threads.get(parentId)!.push(q);
  }

  let totalScore = 0;
  const threadCount = threads.size;

  for (const thread of Array.from(threads.values())) {
    const threadSum = thread.reduce((acc, q) => acc + (q.score || 0), 0);
    totalScore += threadSum / thread.length; // Average score within the thread
  }

  const hasScores = threadCount > 0;
  const calculatedScore = hasScores ? Math.round(totalScore / threadCount) : null;

  return {
    answeredQuestions,
    totalScore: Math.round(totalScore),
    hasScores,
    calculatedScore,
    threads: Array.from(threads.values()),
  };
}
