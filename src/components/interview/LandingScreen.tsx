'use client';

import { useState } from 'react';
import { useInterviewStore } from '@/store/interviewStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Brain, TrendingUp, FileText, Map, User, ArrowRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypewriterDisplay } from './TypewriterHero';
import { RoadmapDialog } from './RoadmapDialog';
import { FeedbackDialog } from './FeedbackDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LandingScreen() {
  const { updateSetup, setStage } = useInterviewStore();
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleStart = () => {
    updateSetup({ targetRole: '' }); // Reset or keep empty
    setStage('setup');
  };

  return (
    <div className="relative min-h-[100svh] w-full flex flex-col items-center overflow-x-hidden">
      {/* Background Image - Made brighter and more premium */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/engineer-saathi-landing.webp)' }}
      />
      {/* Subtle blue-teal overlay instead of heavy black layer */}
      <div className="fixed inset-0 z-0 bg-blue-950/40 bg-gradient-to-t from-blue-950/70 via-transparent to-transparent" />
      <div className="fixed inset-0 z-0 bg-black/20" /> {/* Slight dimming for contrast but much lighter than before */}

      {/* Top Navigation Bar is now in SiteHeader */}

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-5xl flex-1 justify-center pb-20 pt-10">
        <h1 className="text-5xl md:text-7xl font-outfit font-bold text-white mb-6 tracking-tight drop-shadow-2xl">
          Master Your Next <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-300 to-blue-400">Engineering Interview</span>
        </h1>
        <p className="text-lg md:text-xl text-blue-50 max-w-2xl mb-12 drop-shadow-lg font-medium">
          Excel with personalized, AI-driven practice for technical interviews. Engineer Saathi guides you to success.
        </p>

        {/* Dynamic Typewriter Hero & CTA */}
        <div className="flex flex-col sm:flex-row w-full max-w-3xl gap-4 p-3 bg-blue-950/30 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <TypewriterDisplay />
          <Button 
            onClick={handleStart}
            size="lg"
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 h-[56px] rounded-xl font-bold text-base transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] hover:scale-[1.02] shrink-0"
          >
            Start Practicing Now <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Three Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full">
          <button onClick={handleStart} className="text-left focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl">
            <Card className="glass-panel border-white/20 bg-white/10 backdrop-blur-md p-8 flex flex-col items-center text-center hover:bg-white/20 hover:border-cyan-400/50 transition-all duration-300 group h-full shadow-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-primary/30 transition-all border border-primary/30">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Targeted Mock Interviews</h3>
              <p className="text-sm text-blue-100/80 leading-relaxed mb-4 flex-1">
                Practice structured interviews tailored to real engineering roles.
              </p>
              <div className="text-xs font-semibold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Start Practice <ChevronRight className="w-3 h-3" />
              </div>
            </Card>
          </button>

          <button onClick={() => setShowFeedback(true)} className="text-left focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-2xl">
            <Card className="glass-panel border-white/20 bg-white/10 backdrop-blur-md p-8 flex flex-col items-center text-center hover:bg-white/20 hover:border-blue-400/50 transition-all duration-300 group h-full shadow-lg hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-blue-500/30 transition-all border border-blue-500/30">
                <Brain className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Personalized AI Feedback</h3>
              <p className="text-sm text-blue-100/80 leading-relaxed mb-4 flex-1">
                Receive detailed, evidence-based feedback on your answers and progress.
              </p>
              <div className="text-xs font-semibold text-blue-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Explore Features <ChevronRight className="w-3 h-3" />
              </div>
            </Card>
          </button>

          <button onClick={() => setShowRoadmap(true)} className="text-left focus:outline-none focus:ring-2 focus:ring-green-400 rounded-2xl">
            <Card className="glass-panel border-white/20 bg-white/10 backdrop-blur-md p-8 flex flex-col items-center text-center hover:bg-white/20 hover:border-green-400/50 transition-all duration-300 group h-full shadow-lg hover:shadow-[0_0_25px_rgba(74,222,128,0.2)] hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-green-500/30 transition-all border border-green-500/30">
                <TrendingUp className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Build Interview Confidence</h3>
              <p className="text-sm text-blue-100/80 leading-relaxed mb-4 flex-1">
                Improve your communication and technical skills in a supportive environment.
              </p>
              <div className="text-xs font-semibold text-green-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                View Roadmap <ChevronRight className="w-3 h-3" />
              </div>
            </Card>
          </button>
        </div>
      </main>
      
      <RoadmapDialog open={showRoadmap} onOpenChange={setShowRoadmap} onStart={handleStart} />
      <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} onStart={handleStart} />
    </div>
  );
}
