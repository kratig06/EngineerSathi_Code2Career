'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CloudOff, Download, Eye, Loader2, PencilLine, Sparkles, AlertTriangle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Input } from '@/components/ui/input';
import { useResumeStore } from '@/store/resumeStore';
import { ResumeData, validateResume } from '@/lib/resume-types';
import { exportResumePdf } from '@/lib/resume-pdf';
import { ResumeForm } from './ResumeForm';
import { ResumePreview } from './ResumePreview';
import { cn } from '@/lib/utils';

type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error' | 'conflict';

interface Props {
  resumeId: string;
  onBack: () => void;
  onTailor: (resumeId: string) => void;
  notify: (msg: string, kind?: 'success' | 'error') => void;
}

const AUTOSAVE_MS = 800;

export function ResumeEditor({ resumeId, onBack, onTailor, notify }: Props) {
  const resume = useResumeStore((s) => s.resumes.find((r) => r.id === resumeId));
  const saveResumeData = useResumeStore((s) => s.saveResumeData);
  const renameResume = useResumeStore((s) => s.renameResume);

  const [draft, setDraft] = useState<ResumeData | null>(resume?.data ?? null);
  const baseRevision = useRef<number>(resume?.revision ?? 0);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [statusMsg, setStatusMsg] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(resume?.updatedAt ?? null);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [showErrors, setShowErrors] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(resume?.name ?? '');
  const [nameError, setNameError] = useState('');
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const conflictRef = useRef(false);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    conflictRef.current = status === 'conflict';
  }, [status]);

  const issues = useMemo(() => (draft ? validateResume(draft) : []), [draft]);

  const doSave = useCallback(
    (force = false) => {
      const data = draftRef.current;
      if (!data || !dirty.current) return true;
      setStatus('saving');
      const res = saveResumeData(resumeId, data, baseRevision.current, force);
      if (res.ok) {
        baseRevision.current = res.revision;
        dirty.current = false;
        conflictRef.current = false;
        setStatus('saved');
        setSavedAt(Date.now());
        return true;
      }
      if (res.reason === 'conflict') {
        conflictRef.current = true;
        setStatus('conflict');
        setStatusMsg('This resume was changed in another tab.');
      } else if (res.reason === 'storage') {
        setStatus('error');
        setStatusMsg(`Not saved: ${res.message}`);
      } else {
        setStatus('error');
        setStatusMsg('This resume no longer exists.');
      }
      return false;
    },
    [resumeId, saveResumeData],
  );

  const handleChange = (next: ResumeData) => {
    setDraft(next);
    draftRef.current = next;
    dirty.current = true;
    if (!conflictRef.current) setStatus('unsaved');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!conflictRef.current) doSave();
    }, AUTOSAVE_MS);
  };

  // Flush pending changes on unmount; warn before closing the tab with unsaved work.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        doSave();
        if (dirty.current) {
          e.preventDefault();
        }
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (timer.current) clearTimeout(timer.current);
      if (dirty.current) doSave();
    };
  }, [doSave]);

  if (!resume || !draft) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-blue-950/50 p-8 text-center text-white">
        <p className="mb-4">This resume could not be found. It may have been deleted.</p>
        <Button onClick={onBack}>Back to resumes</Button>
      </div>
    );
  }

  const loadLatest = () => {
    const latest = useResumeStore.getState().getResume(resumeId);
    if (!latest) return;
    setDraft(latest.data);
    draftRef.current = latest.data;
    baseRevision.current = latest.revision;
    dirty.current = false;
    conflictRef.current = false;
    setStatus('saved');
    setNameDraft(latest.name);
  };

  const keepMine = () => {
    dirty.current = true;
    if (doSave(true)) notify('Your version was saved.');
  };

  const commitName = () => {
    const n = nameDraft.trim();
    if (!n) {
      setNameError('Name cannot be empty.');
      return;
    }
    if (n.length > 80) {
      setNameError('Keep the name under 80 characters.');
      return;
    }
    // Flush content first so rename does not race with a pending autosave.
    doSave();
    const res = renameResume(resumeId, n);
    if (res.ok) {
      baseRevision.current = res.revision;
      setEditingName(false);
      setNameError('');
    } else {
      setNameError('Could not rename. Please try again.');
    }
  };

  const handleExport = async () => {
    if (issues.length) {
      setShowErrors(true);
      setMobileTab('edit');
      notify('Please fix the highlighted required fields before exporting.', 'error');
      return;
    }
    setExporting(true);
    try {
      doSave();
      await exportResumePdf(draft, resume.name);
      notify('PDF downloaded.');
    } catch {
      notify('PDF export failed. Please try again.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleBack = () => {
    if (timer.current) clearTimeout(timer.current);
    if (dirty.current && status !== 'conflict' && !doSave()) {
      if (!confirm('Your latest changes could not be saved. Leave anyway?')) return;
    }
    onBack();
  };

  const renderStatusPill = () => {
    const map: Record<SaveStatus, { icon: React.ReactNode; text: string; cls: string }> = {
      saved: { icon: <Check className="h-3.5 w-3.5" />, text: savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved', cls: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10' },
      unsaved: { icon: <PencilLine className="h-3.5 w-3.5" />, text: 'Unsaved changes', cls: 'text-amber-200 border-amber-400/30 bg-amber-500/10' },
      saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: 'Saving…', cls: 'text-cyan-200 border-cyan-400/30 bg-cyan-500/10' },
      error: { icon: <CloudOff className="h-3.5 w-3.5" />, text: 'Not saved', cls: 'text-red-200 border-red-400/30 bg-red-500/10' },
      conflict: { icon: <AlertTriangle className="h-3.5 w-3.5" />, text: 'Save paused', cls: 'text-amber-200 border-amber-400/30 bg-amber-500/10' },
    };
    const s = map[status];
    return (
      <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium', s.cls)}>
        {s.icon}
        {s.text}
      </span>
    );
  };

  return (
    <div className="flex w-full max-w-7xl flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-blue-950/50 p-3 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <BackButton onClick={handleBack} />
          {editingName ? (
            <form
              className="flex min-w-0 flex-1 items-start gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                commitName();
              }}
            >
              <div className="min-w-0 flex-1">
                <Input
                  autoFocus
                  aria-label="Resume name"
                  value={nameDraft}
                  onChange={(e) => {
                    setNameDraft(e.target.value);
                    setNameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingName(false);
                      setNameDraft(resume.name);
                    }
                  }}
                  className="h-9 border-white/20 bg-black/30 text-white"
                />
                {nameError && <p role="alert" className="mt-1 text-[11px] text-red-300">{nameError}</p>}
              </div>
              <Button type="submit" size="sm" className="h-9">Save</Button>
            </form>
          ) : (
            <button type="button" onClick={() => setEditingName(true)} className="group flex min-w-0 items-center gap-2 rounded-md px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60" aria-label={`Rename resume ${resume.name}`}>
              <h1 className="truncate font-outfit text-lg font-semibold text-white">{resume.name}</h1>
              <Pencil className="h-3.5 w-3.5 shrink-0 text-blue-200/60 group-hover:text-white" />
            </button>
          )}
          {resume.target && (
            <span className="hidden shrink-0 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200 lg:inline">
              {resume.target.company} · {resume.target.role}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {renderStatusPill()}
          <Button variant="outline" size="sm" onClick={() => { doSave(); onTailor(resumeId); }} className="border-cyan-400/40 bg-transparent text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-100">
            <Sparkles className="mr-1.5 h-4 w-4" /> Tailor for company
          </Button>
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
            Export PDF
          </Button>
        </div>
      </div>

      {status === 'conflict' && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <span>{statusMsg} Autosave is paused so neither version is lost.</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={loadLatest} className="border-amber-300/40 bg-transparent text-amber-100 hover:bg-amber-500/20">Load latest</Button>
            <Button size="sm" onClick={keepMine}>Keep my version</Button>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">
          <span>{statusMsg}</span>
          <Button size="sm" variant="outline" onClick={() => { dirty.current = true; doSave(); }} className="border-red-300/40 bg-transparent text-red-100 hover:bg-red-500/20">Retry</Button>
        </div>
      )}
      {showErrors && issues.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
          <p className="mb-1 font-semibold">Please complete these required fields:</p>
          <ul className="list-disc pl-5 text-sm">
            {issues.map((i) => <li key={i.field}>{i.message}</li>)}
          </ul>
        </div>
      )}

      {/* Mobile tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-blue-950/50 p-1 lg:hidden" role="tablist" aria-label="Editor view">
        {(['edit', 'preview'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={mobileTab === t} onClick={() => setMobileTab(t)} className={cn('flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors', mobileTab === t ? 'bg-cyan-500/20 text-white' : 'text-blue-200 hover:text-white')}>
            {t === 'edit' ? <PencilLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {t === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={cn('min-w-0', mobileTab !== 'edit' && 'hidden lg:block')}>
          <ResumeForm data={draft} onChange={handleChange} issues={issues} showErrors={showErrors} />
        </div>
        <div className={cn('min-w-0', mobileTab !== 'preview' && 'hidden lg:block')}>
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100svh-2rem)] lg:overflow-y-auto rounded-xl">
            <ResumePreview data={draft} />
          </div>
        </div>
      </div>
    </div>
  );
}
