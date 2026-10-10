'use client';

import { useInterviewStore } from '@/store/interviewStore';
import { LandingScreen } from '@/components/interview/LandingScreen';
import { SetupScreen } from '@/components/interview/SetupScreen';
import { ConfigurationScreen } from '@/components/interview/ConfigurationScreen';
import { RoundSelectionScreen } from '@/components/interview/RoundSelectionScreen';
import { ReadinessScreen } from '@/components/interview/ReadinessScreen';
import { InterviewRoom } from '@/components/interview/InterviewRoom';
import { RoundIntroScreen } from '@/components/interview/RoundIntroScreen';
import { RoundResultScreen } from '@/components/interview/RoundResultScreen';
import { ReportScreen } from '@/components/interview/ReportScreen';
import { SiteHeader } from '@/components/interview/SiteHeader';
import { ResumeScreen } from '@/components/resume/ResumeScreen';
import { RoadmapScreen } from '@/components/interview/RoadmapScreen';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const stage = useInterviewStore((state) => state.stage);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <SiteHeader />
      <AnimatePresence mode="wait">
        {stage === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex">
            <LandingScreen />
          </motion.div>
        )}
        {stage === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex">
            <SetupScreen />
          </motion.div>
        )}
        {stage === 'configuration' && (
          <motion.div key="configuration" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex">
            <ConfigurationScreen />
          </motion.div>
        )}
        {stage === 'round_selection' && (
          <motion.div key="round_selection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex">
            <RoundSelectionScreen />
          </motion.div>
        )}
        {stage === 'readiness' && (
          <motion.div key="readiness" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex">
            <ReadinessScreen />
          </motion.div>
        )}
        {stage === 'round_intro' && (
          <motion.div key="round_intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="flex-1 flex">
            <RoundIntroScreen />
          </motion.div>
        )}
        {stage === 'interview' && (
          <motion.div key="interview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="flex-1 flex">
            <InterviewRoom />
          </motion.div>
        )}
        {stage === 'round_results' && (
          <motion.div key="round_results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="flex-1 flex">
            <RoundResultScreen />
          </motion.div>
        )}
        {stage === 'roadmap' && (
          <motion.div key="roadmap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex">
            <RoadmapScreen />
          </motion.div>
        )}
        {stage === 'resumes' && (
          <motion.div key="resumes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex">
            <ResumeScreen />
          </motion.div>
        )}
        {stage === 'report' && (
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex">
            <ReportScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
