'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useInterviewStore } from '@/store/interviewStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Video, VideoOff, Send, Maximize2, CheckCircle2, Play, Pause, AlertTriangle, RefreshCw, Code, MessageSquare, Loader2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import Editor from '@monaco-editor/react';
import { useProctoring } from '@/hooks/useProctoring';
import { BackButton, ExitConfirmDialog } from '@/components/ui/back-button';

type SessionState = 'initializing' | 'ready' | 'idle' | 'asking_question' | 'listening' | 'processing_answer' | 'speaking' | 'paused' | 'completed' | 'error';

export function InterviewRoom() {
  const { 
    cameraConsent, micConsent, subStage, currentQuestionIndex,
    transcript, addTranscript, updateSubStage, setStage, interviewMode, structuredRounds, currentRoundIndex,
    isPaused, pauseReason, warnings, setPaused
  } = useInterviewStore();

  const [sessionState, setSessionState] = useState<SessionState>('initializing');
  const [isMuted, setIsMuted] = useState(!micConsent);
  const [isCamOff, setIsCamOff] = useState(!cameraConsent);
  const [textInput, setTextInput] = useState('');
  const [code, setCode] = useState('// Write your solution here\n');
  const [language, setLanguage] = useState('javascript');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [runResult, setRunResult] = useState<{stdout?: string, stderr?: string, error?: string} | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  const currentRound = interviewMode === 'Structured' ? structuredRounds[currentRoundIndex] : null;
  const isCodingStage = subStage === 'coding' || subStage === 'walkthrough';

  // 1. Timer Logic
  useEffect(() => {
    // Set initial time based on round or default
    if (sessionState === 'initializing') {
      setTimeLeft(currentRound ? currentRound.timeLimitMinutes * 60 : 1200);
      fetchQuestions(); // Call real API instead of just skipping to ready
    }
  }, [sessionState, currentRound]);

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (sessionState === 'listening' || sessionState === 'asking_question' || sessionState === 'speaking' || sessionState === 'ready') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState, isPaused]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimeUp = () => {
    addTranscript('interviewer', "Time is up for this section.");
    endInterviewFlow();
  };

  // 2. Microphone & Speech Recognition Logic
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTextInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') setIsMuted(true);
      };
    }
  }, []);

  useEffect(() => {
    if (!isMuted && sessionState === 'listening' && recognitionRef.current) {
      try { recognitionRef.current.start(); } catch (e) {}
    } else if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  }, [isMuted, sessionState]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Setup local camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (!isCamOff && cameraConsent) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: micConsent && !isMuted })
        .then(s => {
          stream = s;
          setLocalStream(s);
          if (videoRef.current) videoRef.current.srcObject = stream;
        }).catch(err => {
          setIsCamOff(true);
          console.error(err);
        });
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [isCamOff, cameraConsent, micConsent, isMuted]);

  // 3. AI API & Answer Pipeline
  const fetchQuestions = async () => {
    try {
      const storeState = useInterviewStore.getState();
      const previousQuestionsText = storeState.allQuestions.map(q => q.text);

      const res = await fetch('/api/interview/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewMode,
          targetRole: storeState.targetRole,
          targetCompany: storeState.targetCompany,
          technicalField: storeState.technicalField,
          experienceLevel: storeState.experienceLevel,
          roundType: currentRound?.type || 'Mixed',
          questionCount: currentRound?.questionCount || 5,
          difficulty: currentRound?.difficulty || 'Medium',
          resumeText: storeState.resumeText,
          previousQuestions: previousQuestionsText
        })
      });
      const data = await res.json();
      if (data.questions) {
        const store = useInterviewStore.getState();
        const initializedQuestions = data.questions.map((q: any) => ({
          ...q,
          status: 'unanswered',
          roundId: currentRound?.id
        }));
        store.setQuestions(initializedQuestions);
        store.setCurrentQuestionIndex(0);
        setSessionState('ready');
      } else {
        throw new Error("No questions generated");
      }
    } catch(err) {
      console.error(err);
      setErrorMsg("Failed to generate questions. Please end the interview and try again.");
      setSessionState('error');
    }
  };

  useEffect(() => {
    if (sessionState === 'ready' && useInterviewStore.getState().questions.length > 0) {
       const firstQ = useInterviewStore.getState().questions[0];
       setSessionState('speaking');
       addTranscript('interviewer', "Hello, I'm Engineer Saathi. Let's begin the round. " + firstQ.text);
       updateSubStage(firstQ.type === 'coding' ? 'coding' : 'technical');
       setTimeout(() => setSessionState('listening'), 2000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState]);

  const endInterviewFlow = useCallback(() => {
    setSessionState('completed');
    if (interviewMode === 'Structured') {
      setStage('round_results');
    } else {
      setStage('report');
    }
  }, [interviewMode, setStage]);

  useProctoring(endInterviewFlow, localStream);

  const submitAnswer = async (answer: string, isCode = false) => {
    if (!answer.trim()) return;
    if (isCode && answer.trim() === '// Write your solution here') return;
    setSessionState('processing_answer');
    addTranscript('candidate', isCode ? `*Submitted code*\n\`\`\`${language}\n${answer}\n\`\`\`` : answer);
    if (!isCode) setTextInput('');
    
    const store = useInterviewStore.getState();
    const currentQ = store.questions[store.currentQuestionIndex];
    if (!currentQ) return;
    
    store.updateQuestionAnswer(store.currentQuestionIndex, { status: 'evaluating' });

    try {
      // Find history for this thread
      const parentId = currentQ.parentQuestionId || currentQ.id;
      const threadQuestions = store.questions.filter(q => q.id === parentId || q.parentQuestionId === parentId);
      const followUpCount = threadQuestions.length - 1;
      const conversationHistory = threadQuestions.map(q => `Q: ${q.text}\nA: ${q.candidateAnswer || '[No Answer]'}`).join('\n\n');

      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.text,
          candidateAnswer: answer,
          expectedAnswerContext: currentQ.expectedAnswerContext,
          isCode,
          conversationHistory,
          interviewType: store.interviewType,
          targetRole: store.targetRole,
          followUpCount,
          timeRemaining: timeLeft
        })
      });
      const data = await res.json();
      
      // Save answer and score
      store.updateQuestionAnswer(store.currentQuestionIndex, {
        candidateAnswer: answer,
        candidateCode: isCode ? answer : undefined,
        codeLanguage: isCode ? language : undefined,
        score: typeof data.score === 'number' ? data.score : undefined,
        feedback: data.feedback,
        status: typeof data.score === 'number' ? 'evaluated' : 'evaluation_failed'
      });

      setSessionState('speaking');
      
      if (data.decision === 'FOLLOW_UP' || data.decision === 'CLARIFY') {
        const newQ = {
          id: `q-${Date.now()}`,
          text: data.interviewerResponse,
          type: currentQ.type,
          stage: currentQ.stage,
          status: 'unanswered' as const,
          isFollowUp: true,
          parentQuestionId: parentId,
          roundId: currentQ.roundId
        };
        store.insertQuestionNext(newQ);
        addTranscript('interviewer', data.interviewerResponse);
        store.setCurrentQuestionIndex(store.currentQuestionIndex + 1);
        setTimeout(() => setSessionState('listening'), 3000);
      } else {
        // NEXT_QUESTION
        const nextIndex = store.currentQuestionIndex + 1;
        const questions = store.questions;
        
        if (nextIndex < questions.length) {
           const nextQ = questions[nextIndex];
           addTranscript('interviewer', `${data.interviewerResponse} Next question: ${nextQ.text}`);
           store.setCurrentQuestionIndex(nextIndex);
           updateSubStage(nextQ.type === 'coding' ? 'coding' : 'technical');
           setTimeout(() => setSessionState('listening'), 3000);
        } else {
           addTranscript('interviewer', `${data.interviewerResponse} That concludes this round! Let's wrap up.`);
           setTimeout(() => endInterviewFlow(), 3000);
        }
      }
    } catch(err) {
      console.error(err);
      setErrorMsg("Failed to evaluate answer. Please try again.");
      store.updateQuestionAnswer(store.currentQuestionIndex, { status: 'evaluation_failed' });
      setSessionState('listening');
    }
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setRunResult(null);
    try {
      const res = await fetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_code: code,
          language_id: language === 'python' ? 71 : language === 'javascript' ? 63 : language === 'java' ? 62 : 54 // Simple mapping
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setRunResult({ error: data.error || 'Execution unavailable' });
      } else {
        setRunResult({ stdout: data.stdout, stderr: data.stderr || data.compile_output });
      }
    } catch (err) {
      setRunResult({ error: 'Failed to contact execution server.' });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSendText = () => submitAnswer(textInput);
  const handleSubmitCode = () => submitAnswer(code, true);

  return (
    <div className="flex-1 flex flex-col h-[100dvh] bg-background overflow-hidden p-4 gap-4 relative">
      {/* Top Header */}
      <div className="flex items-center justify-between glass-panel border-white/10 rounded-xl p-4 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <BackButton onClick={() => setShowExitDialog(true)} className="mr-2" />
          <div className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium animate-pulse flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" /> LIVE
          </div>
          <span className="font-semibold text-lg border-l border-white/20 pl-4">
            Engineer Saathi
          </span>
          {currentRound && (
            <span className="hidden md:inline text-muted-foreground text-sm ml-2">
              • {currentRound.type} Round ({currentQuestionIndex + 1}/{currentRound.questionCount})
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Timer:</span>
            <span className={cn("font-mono text-xl", timeLeft < 60 ? "text-red-400 animate-pulse" : "text-white")}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setShowExitDialog(true)} className="hidden sm:flex">End Interview</Button>
        </div>
      </div>

      <ExitConfirmDialog
        open={showExitDialog}
        onConfirm={() => {
          setShowExitDialog(false);
          endInterviewFlow();
        }}
        onCancel={() => setShowExitDialog(false)}
      />

      {/* Main Content Area - Grid Layout */}
      <div className={cn("flex-1 overflow-hidden grid gap-4", isCodingStage ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1 md:grid-cols-12")}>
        
        {/* Region 1: Left Column (Avatar & Chat) */}
        <div className={cn("flex flex-col gap-4 overflow-hidden", isCodingStage ? "lg:col-span-3" : "md:col-span-8 lg:col-span-8")}>
          
          {/* Top of Left Column: Avatar & Camera Side-by-Side */}
          {currentRound?.type === 'GD' ? (
            <div className="grid grid-cols-2 gap-4 h-48 flex-shrink-0">
               {/* GD Participant 1 */}
               <div className="rounded-2xl overflow-hidden bg-secondary border border-white/10 shadow-lg relative flex flex-col items-center justify-center">
                 <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-[10px] text-white uppercase tracking-wider backdrop-blur-sm z-20 shadow-sm border border-white/10">Candidate 1</div>
                 <img src="/avatars/gd_participant.jpg" className={cn("w-full h-full object-cover absolute inset-0 transition-transform duration-700", sessionState === 'speaking' ? "scale-105" : "scale-100")} alt="Participant 1" />
                 <div className={cn("absolute inset-0 transition-colors duration-500 z-10 ring-inset ring-2 pointer-events-none", sessionState === 'speaking' ? "ring-primary/50 bg-primary/10" : "ring-white/10 bg-black/20")} />
               </div>
               
               {/* User Camera */}
               <div className="rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg relative flex items-center justify-center">
                 <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-[10px] text-muted-foreground uppercase tracking-wider backdrop-blur-sm z-10">You</div>
                 {cameraConsent && !isCamOff ? (
                   <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />
                 ) : (
                   <VideoOff className="w-8 h-8 text-white/20" />
                 )}
                 <div className={cn("absolute bottom-2 right-2 p-1.5 rounded-full backdrop-blur-md z-20", isMuted ? "bg-red-500/50 text-white" : "bg-green-500/50 text-white")}>
                   {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                 </div>
                 {/* Listening State Overlay for User */}
                 {!isMuted && sessionState === 'listening' && (
                    <div className="absolute bottom-2 left-2 flex gap-2 items-center z-20 drop-shadow-md">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                      <span className="text-[10px] font-semibold text-green-400 uppercase tracking-widest drop-shadow">Listening</span>
                    </div>
                 )}
               </div>
            </div>
          ) : (
            <div className="flex gap-4 h-48 flex-shrink-0">
              {/* AI Avatar */}
              <div className="flex-1 rounded-2xl overflow-hidden bg-secondary border border-white/10 shadow-lg relative flex flex-col items-center justify-center">
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-[10px] text-white uppercase tracking-wider backdrop-blur-sm z-20 shadow-sm border border-white/10">AI Interviewer</div>
                <img 
                  src={`/avatars/${(currentRound?.type || 'Technical').toLowerCase()}_interviewer.jpg`}
                  className={cn(
                    "w-full h-full object-cover absolute inset-0 transition-transform duration-700",
                    sessionState === 'speaking' ? "scale-105" : "scale-100"
                  )}
                  alt="AI Avatar"
                  onError={(e) => { e.currentTarget.src = '/avatars/technical_interviewer.jpg'; }}
                />
                <div className={cn(
                  "absolute inset-0 transition-colors duration-500 z-10 ring-inset ring-2 pointer-events-none",
                  sessionState === 'speaking' ? "ring-primary/50 bg-primary/10" :
                  sessionState === 'listening' ? "ring-green-500/50 bg-green-500/10" :
                  sessionState === 'processing_answer' ? "ring-amber-500/50 bg-amber-500/10" :
                  "ring-white/10 bg-transparent"
                )} />
                
                {/* Speaking Indicator */}
                {sessionState === 'speaking' && (
                  <div className="absolute bottom-6 flex gap-1.5 items-end h-8 z-20 drop-shadow-md">
                    <div className="w-2 h-4 bg-primary rounded-t-full animate-[pulse_0.4s_infinite_alternate]" style={{animationDelay: '0ms'}}/>
                    <div className="w-2 h-6 bg-primary rounded-t-full animate-[pulse_0.4s_infinite_alternate]" style={{animationDelay: '150ms'}}/>
                    <div className="w-2 h-3 bg-primary rounded-t-full animate-[pulse_0.4s_infinite_alternate]" style={{animationDelay: '300ms'}}/>
                  </div>
                )}
                {sessionState === 'listening' && (
                  <div className="absolute bottom-6 flex gap-2 items-center z-20 drop-shadow-md">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                    <span className="text-xs font-semibold text-green-400 uppercase tracking-widest drop-shadow">Listening</span>
                  </div>
                )}
                <div className="absolute bottom-2 font-medium text-[10px] tracking-wide capitalize text-white drop-shadow-md z-20">
                  {sessionState.replace('_', ' ')}...
                </div>
              </div>
  
              {/* User Camera */}
              <div className="w-1/3 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg relative flex items-center justify-center">
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-[10px] text-muted-foreground uppercase tracking-wider backdrop-blur-sm z-10">You</div>
                {cameraConsent && !isCamOff ? (
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />
                ) : (
                  <VideoOff className="w-8 h-8 text-white/20" />
                )}
                {/* Mic Status Overlay */}
                <div className={cn("absolute bottom-2 right-2 p-1.5 rounded-full backdrop-blur-md z-20", isMuted ? "bg-red-500/50 text-white" : "bg-green-500/50 text-white")}>
                  {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                </div>
                {/* Listening State Overlay for User */}
                {!isMuted && sessionState === 'listening' && (
                   <div className="absolute bottom-2 left-2 flex gap-1.5 items-center z-20 drop-shadow-md">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                     <span className="text-[10px] font-semibold text-green-400 uppercase tracking-widest drop-shadow hidden sm:inline-block">Listening</span>
                   </div>
                )}
              </div>
            </div>
          )}

          {/* Transcript / Chat Area */}
          <Card className="flex-1 flex flex-col glass-panel border-white/10 overflow-hidden shadow-lg min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {transcript.map((t, i) => (
                <div key={i} className={cn("flex flex-col max-w-[85%]", t.speaker === 'candidate' ? "ml-auto items-end" : "mr-auto items-start")}>
                  <span className="text-xs text-muted-foreground mb-1 ml-1">{t.speaker === 'candidate' ? 'You' : 'Engineer Saathi'}</span>
                  <div className={cn("p-3 rounded-2xl text-sm leading-relaxed", 
                    t.speaker === 'candidate' 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-white/10 text-white rounded-tl-sm border border-white/5"
                  )}>
                    {t.text.includes('```') ? (
                       <pre className="text-xs bg-black/30 p-2 rounded mt-1 overflow-x-auto border border-white/10 whitespace-pre-wrap">
                         {t.text}
                       </pre>
                    ) : (
                      t.text
                    )}
                  </div>
                </div>
              ))}
              {sessionState === 'processing_answer' && (
                <div className="mr-auto flex flex-col max-w-[85%] items-start">
                   <span className="text-xs text-muted-foreground mb-1 ml-1">Engineer Saathi</span>
                   <div className="p-3 rounded-2xl text-sm bg-white/5 text-white rounded-tl-sm border border-white/5 flex gap-1 items-center">
                     <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                     <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                     <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                </div>
              )}
              {errorMsg && (
                <div className="mx-auto bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> {errorMsg}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            {/* Input Area */}
            <div className="p-3 bg-black/20 border-t border-white/10 flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("rounded-full flex-shrink-0 transition-colors", !isMuted && "text-primary bg-primary/20 hover:bg-primary/30")}
                  onClick={() => setIsMuted(!isMuted)}
                  disabled={sessionState === 'processing_answer' || sessionState === 'completed'}
                >
                  {isMuted ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5" />}
                </Button>
                <input 
                  type="text" 
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  placeholder={sessionState === 'processing_answer' ? "Waiting for response..." : isMuted ? "Type your answer here..." : "Listening (or type here)..."}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  disabled={sessionState === 'processing_answer' || sessionState === 'completed'}
                />
                <Button 
                  onClick={handleSendText} 
                  size="icon" 
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0 disabled:opacity-50"
                  disabled={!textInput.trim() || sessionState === 'processing_answer' || sessionState === 'completed'}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Region 2: Center Column (Coding Workspace - ONLY in coding stage) */}
        {isCodingStage && (
          <div className="flex flex-col gap-4 overflow-hidden lg:col-span-6">
            <Card className="flex-1 flex flex-col glass-panel border-white/10 overflow-hidden shadow-xl min-h-0">
              {/* Editor Header */}
              <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-primary/20"><Code className="w-4 h-4 text-primary" /></div>
                  <span className="font-semibold text-sm truncate">Problem: Coding Challenge</span>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded border border-green-500/20 uppercase font-bold tracking-wider hidden sm:inline-block">Live IDE</span>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
              </div>
              
              {/* Problem Statement Overlay / Tab */}
              <div className="p-4 border-b border-white/10 bg-black/10 text-sm shrink-0">
                <p className="mb-2 text-white/90">
                  {useInterviewStore.getState().questions[currentQuestionIndex]?.text || "Write a function to solve the problem."}
                </p>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 relative min-h-0">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={language}
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on'
                  }}
                />
              </div>
            </Card>
          </div>
        )}

        {/* Region 3: Right Column (Information, Progress & Execution Results) */}
        <div className={cn("flex flex-col gap-4 overflow-hidden", isCodingStage ? "lg:col-span-3" : "md:col-span-4 lg:col-span-4")}>
          <Card className="flex-1 glass-panel border-white/10 p-6 flex flex-col items-center space-y-4 shadow-xl overflow-y-auto">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2 border border-white/10 shrink-0">
               <MessageSquare className="w-8 h-8 text-muted-foreground" />
             </div>
             <h3 className="text-xl font-semibold">{currentRound ? currentRound.type : 'Interview'} Round</h3>
             <p className="text-sm text-center text-muted-foreground max-w-[250px]">
               {isCodingStage ? "Write your solution in the editor and click Run Tests when ready." : "Listen to the AI Interviewer and reply using your microphone or the text input."}
             </p>
             <div className="w-full h-px bg-white/10 my-4 shrink-0" />
             <div className="w-full text-left space-y-3 shrink-0">
               <div className="flex flex-col gap-1">
                 <div className="flex justify-between text-xs">
                   <span className="text-muted-foreground">Question Progress</span>
                   <span className="font-medium text-white">{currentQuestionIndex + 1} / {currentRound ? currentRound.questionCount : '∞'}</span>
                 </div>
                 {currentRound && (
                   <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                     <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${((currentQuestionIndex) / currentRound.questionCount) * 100}%` }} />
                   </div>
                 )}
               </div>
               {currentRound && (
                 <div className="flex justify-between text-xs mt-2">
                   <span className="text-muted-foreground">Qualifying Threshold</span>
                   <span className="font-medium text-amber-400">{currentRound.qualifyingThreshold}%</span>
                 </div>
               )}
             </div>
          </Card>
          
          {isCodingStage && (
             <Card className="glass-panel border-white/10 flex flex-col shrink-0 shadow-xl max-h-[50%]">
                <div className="p-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
                   <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Execution Results</span>
                </div>
                
                {/* Run Results Output */}
                <div className="p-3 overflow-y-auto bg-black/40 min-h-[100px] text-xs font-mono">
                  {runResult ? (
                     runResult.error ? (
                       <span className="text-red-400">{runResult.error}</span>
                     ) : (
                       <>
                         {runResult.stdout && <div><span className="text-green-400">Output:</span><br/>{runResult.stdout}</div>}
                         {runResult.stderr && <div className="mt-2"><span className="text-red-400">Errors:</span><br/>{runResult.stderr}</div>}
                         {!runResult.stdout && !runResult.stderr && <span className="text-muted-foreground">Executed successfully with no output.</span>}
                       </>
                     )
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 pt-4">
                       <Code className="w-6 h-6 mb-2" />
                       <span>No execution results yet</span>
                    </div>
                  )}
                </div>

                {/* Editor Footer Actions */}
                <div className="p-3 border-t border-white/10 bg-black/20 flex flex-col gap-2 shrink-0">
                  <div className="flex justify-between gap-2">
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground flex-1" onClick={() => setCode('// Reset code')}>
                      <RefreshCw className="w-4 h-4" /> Reset
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 flex-1" disabled={sessionState === 'processing_answer' || isExecuting} onClick={handleRunCode}>
                      {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} 
                      Run
                    </Button>
                  </div>
                  <Button size="sm" className="gap-2 bg-primary text-primary-foreground w-full" onClick={handleSubmitCode} disabled={sessionState === 'processing_answer'}>
                    <CheckCircle2 className="w-4 h-4" /> Submit Answer
                  </Button>
                </div>
             </Card>
          )}
        </div>
      </div>

      {/* Proctoring Warnings Overlay */}
      {warnings?.length > 0 && !isPaused && (
        <div className="absolute top-20 right-4 flex flex-col gap-2 z-50">
          {warnings.map((w, idx) => (
            <div key={idx} className="bg-orange-500/90 backdrop-blur-md text-white px-4 py-3 rounded-lg shadow-xl border border-orange-400 max-w-sm animate-in slide-in-from-right">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Proctoring Warning ({idx + 1}/5)</h4>
                  <p className="text-xs mt-1">{w.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pause Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-blue-950/90 border-orange-500/50 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-orange-500/20 text-orange-500 rounded-full">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">Session Paused</CardTitle>
                  <CardDescription className="text-orange-200">Action required to continue</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-blue-100">
                {pauseReason === 'warning_threshold' 
                  ? "You have received 4 proctoring warnings. One more warning will terminate the session. Please ensure you remain in full-screen and keep your camera/microphone active."
                  : `Your session was paused due to: ${pauseReason || 'Unknown reason'}. Please restore the required conditions.`}
              </p>
              <div className="bg-black/40 p-4 rounded-lg border border-white/10 text-xs text-blue-200">
                The interview timer is frozen. You will not lose time while paused, but you cannot submit answers until you resume.
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 bg-black/40 border-white/20 text-white hover:bg-white/10" onClick={async () => {
                  if (document.documentElement.requestFullscreen) {
                    try { await document.documentElement.requestFullscreen(); } catch (e) {}
                  }
                  setPaused(false);
                }}>
                  Acknowledge & Resume
                </Button>
                <Button variant="destructive" onClick={endInterviewFlow}>
                  End Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
