'use client';

import { useState, useRef } from 'react';
import { useInterviewStore, InterviewMode, RoundType, RoundConfig, Difficulty, EvaluationMode } from '@/store/interviewStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, UploadCloud, CheckCircle2, FileText, Layers, Briefcase, Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
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

export function ConfigurationScreen() {
  const { 
    language, voiceProfile, resumeFileName, interviewMode, evaluationMode, structuredRounds,
    updateConsent, setInterviewMode, setEvaluationMode, setStructuredRounds, setStage
  } = useInterviewStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [localLang, setLocalLang] = useState(language || 'English');
  const [localVoice, setLocalVoice] = useState(voiceProfile || 'professional');
  const [localResume, setLocalResume] = useState(resumeFileName || '');
  const [mode, setMode] = useState<InterviewMode>(interviewMode || 'Generic');
  const [evalMode, setEvalMode] = useState<EvaluationMode>(evaluationMode || 'Elimination');
  const [rounds, setRounds] = useState<RoundConfig[]>(
    structuredRounds.length > 0 ? structuredRounds : [
      { ...DEFAULT_ROUNDS.Aptitude, id: `r-${Date.now()}-apt` },
      { ...DEFAULT_ROUNDS.Coding, id: `r-${Date.now()}-code` },
      { ...DEFAULT_ROUNDS.Technical, id: `r-${Date.now()}-tech` }
    ]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalResume(file.name);
    }
  };

  const handleAddRound = (type: RoundType) => {
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

  const handleUpdateRound = (id: string, field: keyof RoundConfig, value: any) => {
    setRounds(rounds.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleNext = () => {
    updateConsent({
      language: localLang,
      voiceProfile: localVoice,
      resumeFileName: localResume
    });
    setInterviewMode(mode);
    if (mode === 'Structured') {
      setStage('round_selection');
    } else {
      setStage('readiness');
    }
  };

  return (
    <SetupLayout>
      <div className="w-full max-w-4xl mx-auto py-6 flex flex-col h-full overflow-y-auto">
        <div className="mb-8 text-center relative z-10 drop-shadow-md">
          <h1 className="text-4xl font-outfit font-bold mb-3 tracking-tight text-white drop-shadow-lg">Interview Configuration</h1>
          <p className="text-blue-100 text-lg drop-shadow">Upload your resume, select your language, and choose your interview mode.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className="glass-panel bg-blue-950/40 backdrop-blur-xl border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Resume & Context</CardTitle>
              <CardDescription className="text-blue-200">We'll personalize the questions based on your background.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Upload Resume (Optional)</Label>
                <div 
                  className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors bg-black/20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                  {localResume ? (
                    <>
                      <FileText className="w-8 h-8 text-primary mb-2" />
                      <p className="font-medium text-sm text-center text-white">{localResume}</p>
                      <p className="text-xs text-blue-200 mt-1 text-center">Click to replace</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-blue-200 mb-2" />
                      <p className="font-medium text-sm text-center text-white">Click to browse or drag & drop</p>
                      <p className="text-xs text-blue-200 mt-1 text-center">PDF, DOCX up to 5MB</p>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-blue-200 text-center mt-2 leading-tight">Privacy Notice: Your resume is processed securely during this session to tailor questions and is not permanently stored.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel bg-blue-950/40 backdrop-blur-xl border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Language & Voice</CardTitle>
              <CardDescription className="text-blue-200">Choose how the AI communicates with you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="language" className="text-white">Interview Language</Label>
                <Select 
                  id="language"
                  value={localLang}
                  onChange={(e) => setLocalLang(e.target.value)}
                  className="bg-black/40 border-white/10 text-white"
                >
                  <option value="English" className="bg-blue-950">English</option>
                  <option value="Hindi" className="bg-blue-950">Hindi</option>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="voice" className="text-white">Interviewer Voice Profile</Label>
                <Select 
                  id="voice"
                  value={localVoice}
                  onChange={(e) => setLocalVoice(e.target.value)}
                  className="bg-black/40 border-white/10 text-white"
                >
                  <option value="professional" className="bg-blue-950">Professional & Direct</option>
                  <option value="friendly" className="bg-blue-950">Friendly & Supportive</option>
                  <option value="strict" className="bg-blue-950">Strict & Challenging</option>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-bold mb-4 text-white drop-shadow-md">Select Interview Mode</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className={cn("p-6 rounded-xl border-2 cursor-pointer transition-all flex flex-col h-full", mode === 'Generic' ? "border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "border-white/10 bg-black/40 hover:border-white/20")}
              onClick={() => setMode('Generic')}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("p-2 rounded-full", mode === 'Generic' ? "bg-orange-500/20 text-orange-400" : "bg-white/10 text-blue-200")}>
                  <Briefcase className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-lg text-white">Generic Interview</h4>
              </div>
              <p className="text-sm text-blue-100 flex-1">Practice a balanced mix of aptitude, coding, technical, and HR questions in one continuous session. No elimination.</p>
            </div>
            
            <div 
              className={cn("p-6 rounded-xl border-2 cursor-pointer transition-all flex flex-col h-full", mode === 'Structured' ? "border-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.3)]" : "border-white/10 bg-black/40 hover:border-white/20")}
              onClick={() => setMode('Structured')}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("p-2 rounded-full", mode === 'Structured' ? "bg-cyan-400/20 text-cyan-400" : "bg-white/10 text-blue-200")}>
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-lg text-white">Detailed Structured Interview</h4>
              </div>
              <p className="text-sm text-blue-100 flex-1">Simulate a real-world, multi-round recruitment process with customizable elimination thresholds.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center bg-blue-950/60 backdrop-blur-xl border border-white/10 p-6 rounded-xl shadow-2xl">
          <BackButton onClick={() => setStage('setup')} />
          <div className="text-sm text-blue-200 font-medium">Step 2 of 3</div>
          <Button onClick={handleNext} size="lg" className="gap-2 font-semibold shadow-lg bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20 border-0">
            Next Step <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </SetupLayout>
  );
}
