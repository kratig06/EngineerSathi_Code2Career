'use client';

import { useState } from 'react';
import { useInterviewStore, ExperienceLevel, InterviewType, Duration } from '@/store/interviewStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { SetupLayout } from './SetupLayout';
import { BackButton } from '@/components/ui/back-button';

export function SetupScreen() {
  const { 
    targetRole, targetCompany, technicalField, experienceLevel, interviewType, interviewDuration,
    updateSetup, setStage 
  } = useInterviewStore();

  const [localState, setLocalState] = useState({
    targetRole: targetRole || '',
    targetCompany: targetCompany || '',
    technicalField: technicalField || '',
    experienceLevel: experienceLevel || '',
    customRole: '',
    customCompany: '',
    customField: '',
  } as {
    targetRole: string; targetCompany: string; technicalField: string;
    experienceLevel: string;
    customRole: string; customCompany: string; customField: string;
  });

  const handleNext = () => {
    updateSetup({
      targetRole: localState.targetRole === 'Other' ? localState.customRole : localState.targetRole,
      targetCompany: localState.targetCompany === 'Other' ? localState.customCompany : localState.targetCompany,
      technicalField: localState.technicalField === 'Other' ? localState.customField : localState.technicalField,
      experienceLevel: localState.experienceLevel as ExperienceLevel,
    });
    setStage('configuration');
  };

  const isFormValid = localState.targetRole && localState.targetCompany && localState.experienceLevel;

  return (
    <SetupLayout>
      <div className="w-full max-w-3xl mx-auto py-6">
        <div className="mb-8 text-center relative z-10 drop-shadow-md">
          <h1 className="text-4xl font-outfit font-bold mb-3 tracking-tight text-white drop-shadow-lg">Let&apos;s prepare for your next opportunity.</h1>
          <p className="text-blue-100 text-lg drop-shadow">Tell us what you&apos;re preparing for. We&apos;ll build your interview around you.</p>
        </div>

        <Card className="glass-panel bg-blue-950/40 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="role" className="text-white">Target Job Role</Label>
                <Select 
                  id="role"
                  value={localState.targetRole}
                  onChange={(e) => setLocalState({...localState, targetRole: e.target.value})}
                  className="bg-black/40 border-white/10 text-white"
                >
                  <option value="" className="bg-blue-950">Select a role</option>
                  <option value="Software Engineer" className="bg-blue-950">Software Engineer</option>
                  <option value="Frontend Developer" className="bg-blue-950">Frontend Developer</option>
                  <option value="Backend Developer" className="bg-blue-950">Backend Developer</option>
                  <option value="Full-Stack Engineer" className="bg-blue-950">Full-Stack Engineer</option>
                  <option value="Data Scientist" className="bg-blue-950">Data Scientist</option>
                  <option value="AI Engineer" className="bg-blue-950">AI Engineer</option>
                  <option value="Other" className="bg-blue-950">Other (Custom)</option>
                </Select>
                {localState.targetRole === 'Other' && (
                  <Input 
                    placeholder="Enter custom role" 
                    value={localState.customRole}
                    onChange={(e) => setLocalState({...localState, customRole: e.target.value})}
                    className="mt-2 bg-black/40 border-white/10 text-white placeholder-white/40"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-white">Target Company</Label>
                <Select 
                  id="company"
                  value={localState.targetCompany}
                  onChange={(e) => setLocalState({...localState, targetCompany: e.target.value})}
                  className="bg-black/40 border-white/10 text-white"
                >
                  <option value="" className="bg-blue-950">Select a company</option>
                  <option value="Generic — No specific company" className="bg-blue-950">Generic — No specific company</option>
                  <option value="Google" className="bg-blue-950">Google</option>
                  <option value="Microsoft" className="bg-blue-950">Microsoft</option>
                  <option value="Amazon" className="bg-blue-950">Amazon</option>
                  <option value="Meta" className="bg-blue-950">Meta</option>
                  <option value="Apple" className="bg-blue-950">Apple</option>
                  <option value="NVIDIA" className="bg-blue-950">NVIDIA</option>
                  <option value="Adobe" className="bg-blue-950">Adobe</option>
                  <option value="Infosys" className="bg-blue-950">Infosys</option>
                  <option value="TCS" className="bg-blue-950">TCS</option>
                  <option value="Wipro" className="bg-blue-950">Wipro</option>
                  <option value="Accenture" className="bg-blue-950">Accenture</option>
                  <option value="Deloitte" className="bg-blue-950">Deloitte</option>
                  <option value="Other" className="bg-blue-950">Other company...</option>
                </Select>
                {localState.targetCompany === 'Other' && (
                  <Input 
                    placeholder="Enter custom company" 
                    value={localState.customCompany}
                    onChange={(e) => setLocalState({...localState, customCompany: e.target.value})}
                    className="mt-2 bg-black/40 border-white/10 text-white placeholder-white/40"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="field" className="text-white">Technical Field</Label>
                <Select 
                  id="field"
                  value={localState.technicalField}
                  onChange={(e) => setLocalState({...localState, technicalField: e.target.value})}
                  className="bg-black/40 border-white/10 text-white"
                >
                  <option value="" className="bg-blue-950">Select field</option>
                  <option value="Software Engineering" className="bg-blue-950">Software Engineering</option>
                  <option value="Data Structures and Algorithms" className="bg-blue-950">Data Structures and Algorithms</option>
                  <option value="Frontend Development" className="bg-blue-950">Frontend Development</option>
                  <option value="Backend Development" className="bg-blue-950">Backend Development</option>
                  <option value="Full-Stack Development" className="bg-blue-950">Full-Stack Development</option>
                  <option value="AI and Machine Learning" className="bg-blue-950">AI and Machine Learning</option>
                  <option value="Data Science" className="bg-blue-950">Data Science</option>
                  <option value="DevOps and Cloud" className="bg-blue-950">DevOps and Cloud</option>
                  <option value="System Design" className="bg-blue-950">System Design</option>
                  <option value="Other" className="bg-blue-950">Other (Custom)</option>
                </Select>
                {localState.technicalField === 'Other' && (
                  <Input 
                    placeholder="Enter custom field" 
                    value={localState.customField}
                    onChange={(e) => setLocalState({...localState, customField: e.target.value})}
                    className="mt-2 bg-black/40 border-white/10 text-white placeholder-white/40"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience" className="text-white">Experience Level</Label>
                <Select 
                  id="experience"
                  value={localState.experienceLevel}
                  onChange={(e) => setLocalState({...localState, experienceLevel: e.target.value})}
                  className="bg-black/40 border-white/10 text-white"
                >
                  <option value="" className="bg-blue-950">Select experience</option>
                  <option value="Student / Fresher" className="bg-blue-950">Student / Fresher</option>
                  <option value="Internship" className="bg-blue-950">Internship</option>
                  <option value="Entry Level" className="bg-blue-950">Entry Level</option>
                  <option value="Intermediate" className="bg-blue-950">Intermediate</option>
                  <option value="Experienced" className="bg-blue-950">Experienced</option>
                </Select>
              </div>

            </div>
          </CardContent>
          <CardFooter className="bg-white/5 border-t border-white/10 p-6 flex justify-between items-center rounded-b-xl">
            <BackButton onClick={() => setStage('landing')} />
            <div className="text-sm font-medium text-white/70">Step 1 of 3</div>
            <Button onClick={handleNext} disabled={!isFormValid} size="lg" className="gap-2 font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 border-0">
              Next Step <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </SetupLayout>
  );
}
