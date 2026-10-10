'use client';

import { useEffect, useState } from 'react';
import { SetupLayout } from '@/components/interview/SetupLayout';
import { useInterviewStore } from '@/store/interviewStore';
import { ensureResumeStoreHydrated } from '@/store/resumeStore';
import { ResumeDashboard } from './ResumeDashboard';
import { ResumeEditor } from './ResumeEditor';
import { TailorWizard } from './TailorWizard';

type View = { screen: 'dashboard' } | { screen: 'editor'; id: string } | { screen: 'tailor'; id?: string };

function Toast({ message, kind, onDismiss }: { message: string; kind: 'success' | 'error'; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-full border px-5 py-2.5 text-sm font-medium shadow-xl backdrop-blur-xl ${kind === 'error' ? 'border-red-400/40 bg-red-950/90 text-red-100' : 'border-emerald-400/40 bg-emerald-950/90 text-emerald-100'}`}
    >
      {message}
    </div>
  );
}

/** Top-level resume management page, rendered when stage === 'resumes' */
export function ResumeScreen() {
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>({ screen: 'dashboard' });
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);
  const setStage = useInterviewStore((s) => s.setStage);

  useEffect(() => {
    ensureResumeStoreHydrated();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  const notify = (message: string, kind: 'success' | 'error' = 'success') => {
    setToast({ message, kind });
  };

  const handleBack = () => {
    if (view.screen !== 'dashboard') {
      setView({ screen: 'dashboard' });
    } else {
      setStage('landing');
    }
  };

  return (
    <SetupLayout>
      <div className="flex w-full flex-1 flex-col items-center py-6 px-4 sm:px-6">
        {view.screen === 'dashboard' && (
          <ResumeDashboard
            hydrated={hydrated}
            onOpen={(id) => setView({ screen: 'editor', id })}
            onTailor={(id) => setView({ screen: 'tailor', id })}
            notify={notify}
            onBack={handleBack}
          />
        )}
        {view.screen === 'editor' && (
          <ResumeEditor
            resumeId={view.id}
            onBack={() => setView({ screen: 'dashboard' })}
            onTailor={(id) => setView({ screen: 'tailor', id })}
            notify={notify}
          />
        )}
        {view.screen === 'tailor' && (
          <TailorWizard
            initialResumeId={view.id}
            onExit={() => setView({ screen: 'dashboard' })}
            onSaved={(id) => setView({ screen: 'editor', id })}
            notify={notify}
          />
        )}
      </div>
      {toast && <Toast message={toast.message} kind={toast.kind} onDismiss={() => setToast(null)} />}
    </SetupLayout>
  );
}
