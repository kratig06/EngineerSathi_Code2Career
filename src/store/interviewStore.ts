import { create } from 'zustand';

export type ExperienceLevel = 'Student / Fresher' | 'Internship' | 'Entry Level' | 'Intermediate' | 'Experienced' | '';
export type InterviewType = 'Technical' | 'Coding' | 'Behavioral' | 'HR' | 'Mixed interview' | '';
export type Duration = 10 | 20 | 30 | 0;
export type InterviewStage = 'landing' | 'setup' | 'configuration' | 'round_selection' | 'readiness' | 'interview' | 'report' | 'round_intro' | 'evaluating_round' | 'round_results' | 'resumes' | 'roadmap';

export type InterviewSubStage = 'warmup' | 'resume' | 'technical' | 'coding' | 'walkthrough' | 'behavioral' | 'closing' | 'aptitude' | 'gd';

export type InterviewMode = 'Generic' | 'Structured' | '';
export type RoundType = 'Aptitude' | 'Coding' | 'GD' | 'Technical' | 'HR';
export type EvaluationMode = 'Elimination' | 'Continue';
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
export type RoundStatus = 'unattempted' | 'in_progress' | 'completed' | 'eliminated' | 'skipped';

export interface RoundConfig {
  id: string;
  type: RoundType;
  questionCount: number;
  difficulty: Difficulty;
  timeLimitMinutes: number;
  qualifyingThreshold: number;
  status: RoundStatus;
  score?: number;
  feedback?: string;
}

export type QuestionStatus = 'unanswered' | 'draft' | 'submitted' | 'evaluating' | 'evaluated' | 'evaluation_failed' | 'skipped';

export interface Question {
  id: string;
  text: string;
  type: 'spoken' | 'coding';
  stage: InterviewSubStage;
  expectedAnswerContext?: string;
  candidateAnswer?: string;
  candidateCode?: string;
  codeLanguage?: string;
  score?: number;
  feedback?: string;
  status?: QuestionStatus;
  isFollowUp?: boolean;
  parentQuestionId?: string;
  roundId?: string;
}

export interface InterviewState {
  stage: InterviewStage;
  
  // Setup
  interviewMode: InterviewMode;
  targetRole: string;
  targetCompany: string;
  technicalField: string;
  experienceLevel: ExperienceLevel;
  interviewType: InterviewType;
  interviewDuration: Duration;
  
  // Structured Setup
  evaluationMode: EvaluationMode;
  structuredRounds: RoundConfig[];
  currentRoundIndex: number;
  
  // Consent
  language: string;
  voiceProfile: string;
  resumeFileName: string;
  resumeText: string;
  priorExperience: string;
  improvementArea: string;
  cameraConsent: boolean;
  micConsent: boolean;

  // Interview execution
  subStage: InterviewSubStage;
  questions: Question[];
  allQuestions: Question[];
  currentQuestionIndex: number;
  transcript: { speaker: 'interviewer' | 'candidate'; text: string; timestamp: number }[];
  timeRemaining: number;
  isPaused: boolean;
  pauseReason: string | null;
  warnings: { type: string; message: string; timestamp: number }[];

  // Report
  report: unknown;

  // Actions
  setStage: (stage: InterviewStage) => void;
  setInterviewMode: (mode: InterviewMode) => void;
  updateSetup: (data: Partial<Pick<InterviewState, 'targetRole' | 'targetCompany' | 'technicalField' | 'experienceLevel' | 'interviewType' | 'interviewDuration'>>) => void;
  updateConsent: (data: Partial<Pick<InterviewState, 'language' | 'voiceProfile' | 'resumeFileName' | 'resumeText' | 'priorExperience' | 'improvementArea' | 'cameraConsent' | 'micConsent'>>) => void;
  
  // Structured config
  setEvaluationMode: (mode: EvaluationMode) => void;
  setStructuredRounds: (rounds: RoundConfig[]) => void;
  setCurrentRoundIndex: (index: number) => void;
  updateRound: (index: number, data: Partial<RoundConfig>) => void;
  
  setQuestions: (questions: Question[]) => void;
  insertQuestionNext: (question: Question) => void;
  archiveCurrentQuestions: () => void;
  setCurrentQuestionIndex: (index: number) => void;
  addTranscript: (speaker: 'interviewer' | 'candidate', text: string) => void;
  updateSubStage: (subStage: InterviewSubStage) => void;
  setTimeRemaining: (time: number) => void;
  setPaused: (paused: boolean, reason?: string) => void;
  addWarning: (type: string, message: string) => void;
  resetWarnings: () => void;
  setReport: (report: unknown) => void;
  updateQuestionAnswer: (questionIndex: number, data: Partial<Question>) => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
  stage: 'landing',
  interviewMode: '',
  targetRole: '',
  targetCompany: '',
  technicalField: '',
  experienceLevel: '',
  interviewType: '',
  interviewDuration: 0,
  
  evaluationMode: 'Continue',
  structuredRounds: [],
  currentRoundIndex: 0,
  
  language: 'English',
  voiceProfile: 'professional',
  resumeFileName: '',
  resumeText: '',
  priorExperience: '',
  improvementArea: '',
  cameraConsent: false,
  micConsent: false,

  subStage: 'warmup',
  questions: [],
  allQuestions: [],
  currentQuestionIndex: 0,
  transcript: [],
  timeRemaining: 0,
  isPaused: false,
  pauseReason: null,
  warnings: [],

  report: null,

  setStage: (stage) => set({ stage }),
  setInterviewMode: (mode) => set({ interviewMode: mode }),
  updateSetup: (data) => set((state) => ({ ...state, ...data })),
  updateConsent: (data) => set((state) => ({ ...state, ...data })),
  
  setEvaluationMode: (mode) => set({ evaluationMode: mode }),
  setStructuredRounds: (rounds) => set({ structuredRounds: rounds }),
  setCurrentRoundIndex: (index) => set({ currentRoundIndex: index }),
  updateRound: (index, data) => set((state) => {
    const rounds = [...state.structuredRounds];
    rounds[index] = { ...rounds[index], ...data };
    return { structuredRounds: rounds };
  }),
  
  setQuestions: (questions) => set({ questions }),
  insertQuestionNext: (question) => set((state) => {
    const questions = [...state.questions];
    questions.splice(state.currentQuestionIndex + 1, 0, question);
    return { questions };
  }),
  archiveCurrentQuestions: () => set((state) => ({ allQuestions: [...state.allQuestions, ...state.questions] })),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  addTranscript: (speaker, text) => set((state) => ({
    transcript: [...state.transcript, { speaker, text, timestamp: Date.now() }]
  })),
  updateSubStage: (subStage) => set({ subStage }),
  setTimeRemaining: (timeRemaining) => set({ timeRemaining }),
  setPaused: (isPaused, reason) => set({ isPaused, pauseReason: reason || null }),
  addWarning: (type, message) => set((state) => {
    const lastWarning = state.warnings.filter(w => w.type === type).pop();
    if (lastWarning && Date.now() - lastWarning.timestamp < 5000) return state;
    return { warnings: [...state.warnings, { type, message, timestamp: Date.now() }] };
  }),
  resetWarnings: () => set({ warnings: [] }),
  setReport: (report) => set({ report }),
  updateQuestionAnswer: (index, data) => set((state) => {
    const questions = [...state.questions];
    questions[index] = { ...questions[index], ...data };
    return { questions };
  }),
}));
