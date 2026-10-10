import { expect, test, describe } from 'vitest';
import { calculateRoundScore } from '../lib/scoring';
import { Question } from '../store/interviewStore';

describe('Scoring Pipeline', () => {
  test('Test A - All answers blank (no evaluated questions)', () => {
    const questions: Question[] = Array.from({ length: 10 }, (_, i) => ({
      id: `q${i}`, text: `Q${i}`, type: 'spoken', stage: 'technical', status: 'unanswered'
    }));

    const result = calculateRoundScore(questions);
    
    expect(result.answeredQuestions.length).toBe(0);
    expect(result.hasScores).toBe(false);
    expect(result.calculatedScore).toBeNull();
  });

  test('Test B - One evaluated, one unanswered', () => {
    const questions: Question[] = [
      { id: 'q1', text: 'Q1', type: 'spoken', stage: 'technical', status: 'unanswered' },
      { id: 'q2', text: 'Q2', type: 'spoken', stage: 'technical', status: 'evaluated', score: 80, candidateAnswer: 'Good answer' }
    ];

    const result = calculateRoundScore(questions);
    
    expect(result.answeredQuestions.length).toBe(1);
    expect(result.hasScores).toBe(true);
    expect(result.calculatedScore).toBe(80);
  });

  test('Test C - Partial interview', () => {
    const questions: Question[] = [
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `q${i}`, text: `Q${i}`, type: 'spoken' as const, stage: 'technical' as const, status: 'evaluated' as const, score: 70
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `uq${i}`, text: `UQ${i}`, type: 'spoken' as const, stage: 'technical' as const, status: 'unanswered' as const
      }))
    ];

    const result = calculateRoundScore(questions);
    
    expect(result.answeredQuestions.length).toBe(3);
    expect(result.hasScores).toBe(true);
    expect(result.calculatedScore).toBe(70);
  });

  test('Test D - Evaluation failure does not count', () => {
    const questions: Question[] = [
      { id: 'q1', text: 'Q1', type: 'spoken', stage: 'technical', status: 'evaluation_failed', candidateAnswer: 'Some answer' },
      { id: 'q2', text: 'Q2', type: 'spoken', stage: 'technical', status: 'evaluated', score: 50, candidateAnswer: 'Bad answer' }
    ];

    const result = calculateRoundScore(questions);
    
    expect(result.answeredQuestions.length).toBe(1);
    expect(result.hasScores).toBe(true);
    expect(result.calculatedScore).toBe(50);
  });
});
