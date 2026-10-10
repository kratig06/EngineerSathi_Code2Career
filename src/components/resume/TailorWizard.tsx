'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronUp, Download, FileText, FileUp, Loader2,
  RefreshCw, Save, Sparkles, Target, UploadCloud, X, AlertTriangle, Pencil, Info, Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useResumeStore } from '@/store/resumeStore';
import { useInterviewStore } from '@/store/interviewStore';
import { ResumeData, ResumeAnalysis, normalizeResumeData, validateResume } from '@/lib/resume-types';
import { BackButton } from '@/components/ui/back-button';
import { exportResumePdf } from '@/lib/resume-pdf';
import { ResumeForm } from './ResumeForm';
import { ResumePreview } from './ResumePreview';
import { cn } from '@/lib/utils';

const COMPANIES = ['Generic — No specific company', 'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'NVIDIA', 'Adobe', 'Infosys', 'TCS', 'Wipro', 'Accenture', 'Deloitte'];
const ROLES = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full-Stack Engineer', 'Data Scientist', 'AI Engineer', 'DevOps Engineer', 'Data Analyst'];
const MAX_BYTES = 5 * 1024 * 1024;

type Step = 'source' | 'review' | 'target' | 'analyzing' | 'results' | 'changes' | 'save';
const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'source', label: 'Resume' },
  { key: 'review', label: 'Review' },
  { key: 'target', label: 'Target' },
  { key: 'results', label: 'Analysis' },
  { key: 'changes', label: 'Changes' },
  { key: 'save', label: 'Save' },
];

interface Change {
  key: string;
  kind: 'summary' | 'experience' | 'projects';
  itemId?: string;
  label: string;
  original: string;
  suggested: string;
  edited: string;
  rationale: string;
  decision: 'pending' | 'accepted' | 'rejected';
}

interface ApiError {
  message: string;
  code?: string;
}

interface Props {
  initialResumeId?: string;
  onExit: () => void;
  onSaved: (id: string) => void;
  notify: (msg: string, kind?: 'success' | 'error') => void;
}

const panel = 'rounded-2xl border border-white/10 bg-blue-950/50 p-5 shadow-2xl backdrop-blur-xl sm:p-6';
const textareaCls = 'w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-blue-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60';

function applyChanges(base: ResumeData, changes: Change[]): ResumeData {
  const out: ResumeData = JSON.parse(JSON.stringify(base));
  for (const c of changes) {
    if (c.decision !== 'accepted') continue;
    if (c.kind === 'summary') out.summary = c.edited;
    if (c.kind === 'experience') out.experience = out.experience.map((e) => (e.id === c.itemId ? { ...e, description: c.edited } : e));
    if (c.kind === 'projects') out.projects = out.projects.map((p) => (p.id === c.itemId ? { ...p, description: c.edited } : p));
  }
  return out;
}

export function TailorWizard({ initialResumeId, onExit, onSaved, notify }: Props) {
  const resumes = useResumeStore((s) => s.resumes);
  const createResume = useResumeStore((s) => s.createResume);
  const saveResumeData = useResumeStore((s) => s.saveResumeData);
  const targetCompany = useInterviewStore((s) => s.targetCompany);
  const targetRole = useInterviewStore((s) => s.targetRole);
  const interviewTarget = { company: targetCompany, role: targetRole };

  const initial = initialResumeId ? resumes.find((r) => r.id === initialResumeId) : undefined;
  const [step, setStep] = useState<Step>(initial ? 'review' : 'source');
  const [sourceId, setSourceId] = useState<string | null>(initial?.id ?? null);
  const [upload, setUpload] = useState<{ fileName: string; rawText: string; warning: string | null; method: string } | null>(null);
  const [baseData, setBaseData] = useState<ResumeData | null>(initial ? JSON.parse(JSON.stringify(initial.data)) : null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<ApiError | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [company, setCompany] = useState(COMPANIES[0]);
  const [customCompany, setCustomCompany] = useState('');
  const [role, setRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [jd, setJd] = useState('');
  const [targetErr, setTargetErr] = useState('');

  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<ApiError | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const [finalData, setFinalData] = useState<ResumeData | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');
  const [keepUploadedOriginal, setKeepUploadedOriginal] = useState(true);
  const [saveErr, setSaveErr] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const source = sourceId ? resumes.find((r) => r.id === sourceId) : undefined;
  const companyValue = company === 'Other' ? customCompany.trim() : company;
  const roleValue = role === 'Other' ? customRole.trim() : role;
  const reviewIssues = useMemo(() => (baseData ? validateResume(baseData) : []), [baseData]);
  const tailored = useMemo(() => (baseData ? applyChanges(baseData, changes) : null), [baseData, changes]);

  /* ---------- Step 1: source ---------- */
  const pickSaved = (id: string) => {
    const r = resumes.find((x) => x.id === id);
    if (!r) return;
    setSourceId(id);
    setUpload(null);
    setBaseData(JSON.parse(JSON.stringify(r.data)));
    setStep('review');
  };

  const uploadFile = async (file: File) => {
    setUploadError(null);
    setLastFile(file);
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setUploadError({ message: 'Only PDF and DOCX files are supported.', code: 'UNSUPPORTED_TYPE' });
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError({ message: 'File is larger than 5 MB. Please upload a smaller file.', code: 'FILE_TOO_LARGE' });
      return;
    }
    if (file.size === 0) {
      setUploadError({ message: 'The selected file is empty.', code: 'EMPTY_FILE' });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/resume/parse', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError({ message: json.error ?? `Upload failed (${res.status}).`, code: json.code });
        return;
      }
      setSourceId(null);
      setUpload({ fileName: json.fileName, rawText: json.rawText, warning: json.structureWarning, method: json.method });
      setBaseData(normalizeResumeData(json.data));
      setStep('review');
    } catch {
      setUploadError({ message: 'Network error while uploading. Check your connection and retry.', code: 'NETWORK' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /* ---------- Step 4: analysis ---------- */
  const runAnalysis = async () => {
    if (!baseData) return;
    setAnalysisError(null);
    setStep('analyzing');
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/resume/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: baseData, company: companyValue, role: roleValue, jobDescription: jd }),
        signal: ctrl.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnalysisError({ message: json.error ?? `Analysis failed (${res.status}).`, code: json.code });
        return;
      }
      const a = json as ResumeAnalysis;
      setAnalysis(a);
      const list: Change[] = [];
      if (a.summarySuggestion) {
        list.push({ key: 'summary', kind: 'summary', label: 'Professional summary', original: baseData.summary, suggested: a.summarySuggestion.suggested, edited: a.summarySuggestion.suggested, rationale: a.summarySuggestion.rationale, decision: 'pending' });
      }
      for (const s of a.descriptionSuggestions) {
        const item = s.section === 'experience' ? baseData.experience.find((e) => e.id === s.itemId) : baseData.projects.find((p) => p.id === s.itemId);
        if (!item) continue;
        const label = s.section === 'experience' ? `Experience · ${'role' in item ? `${item.role} at ${item.company}` : ''}` : `Project · ${'name' in item ? item.name : ''}`;
        list.push({ key: `${s.section}:${s.itemId}`, kind: s.section, itemId: s.itemId, label, original: item.description, suggested: s.suggested, edited: s.suggested, rationale: s.rationale, decision: 'pending' });
      }
      setChanges(list);
      setStep('results');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setAnalysisError({ message: 'Network error while contacting the analysis service. Please retry.', code: 'NETWORK' });
    }
  };

  const goToSave = (data: ResumeData) => {
    setFinalData(JSON.parse(JSON.stringify(data)));
    const baseName = source?.name ?? upload?.fileName.replace(/\.(pdf|docx)$/i, '') ?? 'Resume';
    const tgt = [companyValue && !companyValue.startsWith('Generic') ? companyValue : '', roleValue].filter(Boolean).join(' ');
    setSaveName(tgt ? `${baseName} — ${tgt}` : `${baseName} (tailored)`);
    setSaveErr('');
    setStep('save');
  };

  /* ---------- Step 8: save ---------- */
  const handleSave = () => {
    if (!finalData) return;
    const n = saveName.trim();
    if (!n) return setSaveErr('Please name the tailored resume.');
    const issues = validateResume(finalData);
    if (issues.length) return setSaveErr(`Please fix: ${issues.map((i) => i.message).join(' ')}`);
    const target = roleValue ? { company: companyValue || 'Generic', role: roleValue } : undefined;

    if (saveMode === 'overwrite' && source) {
      const res = saveResumeData(source.id, finalData, source.revision);
      if (!res.ok) return setSaveErr(res.reason === 'conflict' ? 'The original changed since you started. Save as a new resume instead.' : 'Could not save. Please retry.');
      setSavedId(source.id);
      notify('Original resume updated.');
      return;
    }
    let parentId = source?.id;
    if (upload && keepUploadedOriginal && baseData) {
      const orig = createResume({ name: upload.fileName.replace(/\.(pdf|docx)$/i, '') || 'Uploaded resume', data: baseData, source: 'upload' });
      parentId = orig.id;
    }
    const r = createResume({ name: n, data: finalData, source: 'tailored', parentId, target });
    setSavedId(r.id);
    notify(`Saved “${r.name}” as a new resume.`);
  };

  const exportFinal = async () => {
    if (!finalData) return;
    setExporting(true);
    try {
      await exportResumePdf(finalData, saveName || 'tailored-resume');
    } catch {
      notify('PDF export failed.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const setDecision = (key: string, decision: Change['decision']) => setChanges((cs) => cs.map((c) => (c.key === key ? { ...c, decision } : c)));
  const setEdited = (key: string, edited: string) => setChanges((cs) => cs.map((c) => (c.key === key ? { ...c, edited } : c)));

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === (step === 'analyzing' ? 'results' : step));

  /* ---------- Render ---------- */
  return (
    <div className="w-full max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-blue-950/50 p-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BackButton onClick={onExit} />
          <div>
            <h1 className="font-outfit text-lg font-semibold text-white">Modify for Company</h1>
            <p className="text-sm text-blue-200/70">Tailor honestly — suggestions never add qualifications you don&apos;t have.</p>
          </div>
        </div>
        <ol className="flex flex-wrap items-center gap-1 text-[11px]" aria-label="Progress">
          {STEP_LABELS.map((s, i) => (
            <li key={s.key} className={cn('flex items-center gap-1 rounded-full px-2.5 py-1', i < stepIndex ? 'bg-emerald-500/15 text-emerald-200' : i === stepIndex ? 'bg-cyan-500/20 text-white' : 'text-blue-200/50')} aria-current={i === stepIndex ? 'step' : undefined}>
              {i < stepIndex ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              <span>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* STEP 1 */}
      {step === 'source' && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className={panel} aria-labelledby="pick-saved">
            <h2 id="pick-saved" className="mb-1 font-outfit text-lg font-semibold text-white">Use a saved resume</h2>
            <p className="mb-4 text-sm text-blue-200/70">Your original stays unchanged unless you choose to overwrite it.</p>
            {resumes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-blue-200/60">No saved resumes yet — upload one instead.</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {resumes.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => pickSaved(r.id)} className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left hover:border-cyan-400/40 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60">
                      <FileText className="h-5 w-5 shrink-0 text-cyan-200" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">{r.name}</span>
                        <span className="text-[11px] text-blue-200/60">Edited {new Date(r.updatedAt).toLocaleDateString()}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-blue-200/60" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={panel} aria-labelledby="upload-new">
            <h2 id="upload-new" className="mb-1 font-outfit text-lg font-semibold text-white">Upload a resume</h2>
            <p className="mb-4 text-sm text-blue-200/70">PDF or DOCX, up to 5 MB. You&apos;ll review the extracted content next.</p>
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload resume file"
              onClick={() => !uploading && fileRef.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !uploading && fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); }}
              className={cn('flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60', dragOver ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/20 bg-black/20 hover:bg-white/5')}
            >
              <input ref={fileRef} id="resume-upload-input" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
              {uploading ? (
                <>
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-cyan-300" />
                  <p className="text-sm font-medium text-white">Reading your resume…</p>
                  <p className="text-sm text-blue-200/60">Extracting text and detecting sections</p>
                </>
              ) : (
                <>
                  <UploadCloud className="mb-2 h-8 w-8 text-blue-200" />
                  <p className="text-sm font-medium text-white">Click to browse or drag &amp; drop</p>
                  <p className="text-sm text-blue-200/60">PDF, DOCX · max 5 MB</p>
                </>
              )}
            </div>
            {uploadError && (
              <div role="alert" className="mt-3 flex items-start justify-between gap-2 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">
                <span className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{uploadError.message}</span>
                {lastFile && !['UNSUPPORTED_TYPE', 'FILE_TOO_LARGE', 'EMPTY_FILE'].includes(uploadError.code ?? '') && (
                  <Button size="sm" variant="outline" onClick={() => lastFile && uploadFile(lastFile)} className="shrink-0 border-red-300/40 bg-transparent text-red-100 hover:bg-red-500/20">
                    <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* STEP 2 */}
      {step === 'review' && baseData && (
        <div className="space-y-4">
          <div className={panel}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-outfit text-lg font-semibold text-white">Review &amp; correct your information</h2>
                <p className="text-sm text-blue-200/70">
                  {upload ? <>Extracted from <span className="text-white">{upload.fileName}</span> ({upload.method === 'ai' ? 'AI-structured' : 'basic detection'}). Fix anything that was misread.</> : <>From <span className="text-white">{source?.name}</span>. Changes here only apply to the tailored copy.</>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('source')} className="text-blue-100 hover:bg-white/10">Change resume</Button>
                <Button onClick={() => setStep('target')} disabled={reviewIssues.some((i) => i.field === 'fullName')}>
                  Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
            {upload?.warning && (
              <p className="mt-3 flex gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-sm text-amber-100"><Info className="mt-0.5 h-4 w-4 shrink-0" />{upload.warning}</p>
            )}
            {upload && (
              <div className="mt-3">
                <button type="button" onClick={() => setShowRaw((v) => !v)} aria-expanded={showRaw} className="flex items-center gap-1 text-sm text-cyan-200 hover:text-cyan-100">
                  {showRaw ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} View extracted raw text
                </button>
                {showRaw && <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-blue-100/80">{upload.rawText}</pre>}
              </div>
            )}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ResumeForm data={baseData} onChange={setBaseData} issues={reviewIssues} showErrors />
            <div className="hidden lg:block"><div className="sticky top-4 max-h-[calc(100svh-2rem)] overflow-y-auto rounded-xl"><ResumePreview data={baseData} /></div></div>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 'target' && (
        <section className={cn(panel, 'mx-auto max-w-3xl')}>
          <h2 className="mb-1 flex items-center gap-2 font-outfit text-lg font-semibold text-white"><Target className="h-5 w-5 text-cyan-300" /> What are you applying for?</h2>
          <p className="mb-5 text-sm text-blue-200/70">Pick “Generic” if you don&apos;t have a specific company in mind.</p>
          {(interviewTarget.company || interviewTarget.role) && (
            <button type="button" className="mb-4 text-sm text-cyan-200 underline-offset-2 hover:underline" onClick={() => {
              const c = interviewTarget.company;
              if (c) { if (COMPANIES.includes(c)) setCompany(c); else { setCompany('Other'); setCustomCompany(c); } }
              const r = interviewTarget.role;
              if (r) { if (ROLES.includes(r)) setRole(r); else { setRole('Other'); setCustomRole(r); } }
            }}>
              Use my interview setup ({[interviewTarget.company, interviewTarget.role].filter(Boolean).join(' · ')})
            </button>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tailor-company" className="text-white">Target company</Label>
              <Select id="tailor-company" value={company} onChange={(e) => setCompany(e.target.value)} className="border-white/15 bg-black/30 text-white">
                {COMPANIES.map((c) => <option key={c} value={c} className="bg-blue-950">{c}</option>)}
                <option value="Other" className="bg-blue-950">Other company…</option>
              </Select>
              {company === 'Other' && <Input aria-label="Company name" placeholder="Company name" value={customCompany} onChange={(e) => setCustomCompany(e.target.value)} className="mt-2 border-white/15 bg-black/30 text-white" />}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tailor-role" className="text-white">Target role <span className="text-cyan-300">*</span></Label>
              <Select id="tailor-role" value={role} onChange={(e) => { setRole(e.target.value); setTargetErr(''); }} className="border-white/15 bg-black/30 text-white">
                <option value="" className="bg-blue-950">Select a role</option>
                {ROLES.map((r) => <option key={r} value={r} className="bg-blue-950">{r}</option>)}
                <option value="Other" className="bg-blue-950">Other role…</option>
              </Select>
              {role === 'Other' && <Input aria-label="Role title" placeholder="e.g. SDE-1, ML Intern" value={customRole} onChange={(e) => { setCustomRole(e.target.value); setTargetErr(''); }} className="mt-2 border-white/15 bg-black/30 text-white" />}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tailor-jd" className="text-white">Job description <span className="text-blue-200/60">(optional, recommended)</span></Label>
              <textarea id="tailor-jd" value={jd} onChange={(e) => setJd(e.target.value)} rows={7} maxLength={8000} placeholder="Paste the job posting here for the most accurate keyword matching." className={textareaCls} />
              <p className="text-right text-[11px] text-blue-200/50">{jd.length}/8000</p>
            </div>
          </div>
          {targetErr && <p role="alert" className="mt-2 text-sm text-red-300">{targetErr}</p>}
          <div className="mt-5 flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep('review')} className="text-blue-100 hover:bg-white/10"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
            <Button id="run-resume-analysis" onClick={() => {
              if (!roleValue) return setTargetErr('Please choose or enter a target role.');
              if (company === 'Other' && !customCompany.trim()) return setTargetErr('Please enter the company name.');
              runAnalysis();
            }}>
              <Sparkles className="mr-1.5 h-4 w-4" /> Analyse my resume
            </Button>
          </div>
        </section>
      )}

      {/* STEP 4 */}
      {step === 'analyzing' && (
        <section className={cn(panel, 'mx-auto max-w-xl text-center')} aria-live="polite">
          {!analysisError ? (
            <div className="py-8">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-cyan-300" />
              <h2 className="font-outfit text-lg font-semibold text-white">Analysing against {roleValue}{companyValue && !companyValue.startsWith('Generic') ? ` at ${companyValue}` : ''}…</h2>
              <p className="mt-1 text-sm text-blue-200/70">Comparing skills, experience and keywords. This usually takes 5–20 seconds.</p>
              <Button variant="ghost" className="mt-4 text-blue-100 hover:bg-white/10" onClick={() => { abortRef.current?.abort(); setStep('target'); }}>Cancel</Button>
            </div>
          ) : (
            <div className="py-6">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-300" />
              <h2 className="font-outfit text-lg font-semibold text-white">Analysis couldn&apos;t be completed</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-blue-100/80">{analysisError.message}</p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                {analysisError.code !== 'AI_NOT_CONFIGURED' && <Button onClick={runAnalysis}><RefreshCw className="mr-1.5 h-4 w-4" /> Retry</Button>}
                <Button variant="outline" onClick={() => baseData && goToSave(baseData)} className="border-white/20 bg-transparent text-white hover:bg-white/10"><Pencil className="mr-1.5 h-4 w-4" /> Edit manually instead</Button>
                <Button variant="ghost" onClick={() => setStep('target')} className="text-blue-100 hover:bg-white/10">Back</Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* STEP 5 */}
      {step === 'results' && analysis && (
        <div className="space-y-4">
          <section className={panel}>
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex shrink-0 flex-col items-center">
                <div className={cn('flex h-24 w-24 items-center justify-center rounded-full border-4 text-2xl font-bold', analysis.matchLevel === 'Strong' ? 'border-emerald-400 text-emerald-200' : analysis.matchLevel === 'Moderate' ? 'border-amber-400 text-amber-200' : 'border-red-400 text-red-200')}>
                  {analysis.matchScore}
                </div>
                <span className="mt-2 text-sm font-semibold text-white">{analysis.matchLevel} match</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-outfit text-lg font-semibold text-white">How this was determined</h2>
                <p className="mt-1 text-sm text-blue-100/85">{analysis.matchExplanation}</p>
                {analysis.keywordCoverage.percent !== null && (
                  <p className="mt-2 text-sm text-blue-200/70">
                    Verified keyword coverage: <span className="font-semibold text-white">{analysis.keywordCoverage.found.length}/{analysis.keywordCoverage.found.length + analysis.keywordCoverage.missing.length}</span> ({analysis.keywordCoverage.percent}%) of key {jd ? 'job-description' : 'role'} requirements appear in your resume text. The score is an AI estimate; the coverage figure is computed by direct text matching.
                  </p>
                )}
              </div>
            </div>
          </section>
          <div className="grid gap-4 md:grid-cols-2">
            <section className={panel}>
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-white"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Relevant skills you already have</h3>
              {analysis.relevantSkills.length ? (
                <div className="flex flex-wrap gap-1.5">{analysis.relevantSkills.map((s) => <span key={s} className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-sm text-emerald-100">{s}</span>)}</div>
              ) : <p className="text-sm text-blue-200/60">No directly matching skills were found in your resume text.</p>}
            </section>
            <section className={panel}>
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-white"><AlertTriangle className="h-4 w-4 text-amber-300" /> Missing or weak keywords</h3>
              <p className="mb-2 text-[11px] text-blue-200/60">Gaps only — these are <strong>not</strong> added to your resume. Address them only if you genuinely have the experience.</p>
              {analysis.missingKeywords.length ? (
                <ul className="space-y-1.5 text-sm">{analysis.missingKeywords.map((k) => <li key={k.keyword}><span className="rounded border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-sm text-amber-100">{k.keyword}</span> <span className="text-blue-100/75">{k.note}</span></li>)}</ul>
              ) : <p className="text-sm text-blue-200/60">No major keyword gaps detected.</p>}
            </section>
            <section className={panel}>
              <h3 className="mb-2 font-semibold text-white">Relevant experience &amp; projects</h3>
              {analysis.relevantExperience.length ? (
                <ul className="space-y-2 text-sm">{analysis.relevantExperience.map((r, i) => <li key={i}><span className="font-medium text-white">{r.title}</span><span className="block text-blue-100/70">{r.why}</span></li>)}</ul>
              ) : <p className="text-sm text-blue-200/60">None identified as directly relevant.</p>}
            </section>
            <section className={panel}>
              <h3 className="mb-2 font-semibold text-white">Skills to consider developing</h3>
              {analysis.skillsToDevelop.length ? (
                <ul className="space-y-2 text-sm">{analysis.skillsToDevelop.map((s) => <li key={s.skill}><span className="font-medium text-cyan-200">{s.skill}</span><span className="block text-blue-100/70">{s.reason}</span></li>)}</ul>
              ) : <p className="text-sm text-blue-200/60">No specific recommendations.</p>}
            </section>
          </div>
          <div className="flex flex-col justify-between gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setStep('target')} className="text-blue-100 hover:bg-white/10"><ArrowLeft className="mr-1.5 h-4 w-4" /> Change target</Button>
            <Button onClick={() => setStep('changes')}>Review {changes.length} suggested change{changes.length === 1 ? '' : 's'} <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* STEP 6-7 */}
      {step === 'changes' && baseData && tailored && (
        <div className="space-y-4">
          <div className={cn(panel, 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between')}>
            <div>
              <h2 className="font-outfit text-lg font-semibold text-white">Before &amp; after</h2>
              <p className="text-sm text-blue-200/70">Accept, reject or edit each suggestion. Rejected and pending items keep your original wording.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setChanges((cs) => cs.map((c) => ({ ...c, decision: 'accepted' })))} className="border-white/20 bg-transparent text-white hover:bg-white/10">Accept all</Button>
              <Button size="sm" variant="outline" onClick={() => setChanges((cs) => cs.map((c) => ({ ...c, decision: 'rejected' })))} className="border-white/20 bg-transparent text-white hover:bg-white/10">Reject all</Button>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              {changes.length === 0 && <p className={cn(panel, 'text-sm text-blue-200/70')}>The AI did not propose wording changes. You can still edit manually in the next step.</p>}
              {changes.map((c) => (
                <article key={c.key} className={cn('rounded-xl border p-4 backdrop-blur-xl', c.decision === 'accepted' ? 'border-emerald-400/40 bg-emerald-500/[0.07]' : c.decision === 'rejected' ? 'border-white/10 bg-black/20 opacity-75' : 'border-white/10 bg-blue-950/50')}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-white">{c.label}</h3>
                    <span className={cn('rounded-full px-2 py-0.5 text-sm font-semibold uppercase', c.decision === 'accepted' ? 'bg-emerald-500/20 text-emerald-200' : c.decision === 'rejected' ? 'bg-white/10 text-blue-200' : 'bg-amber-500/15 text-amber-200')}>{c.decision}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-red-200/70">Before</p>
                      <p className="whitespace-pre-line rounded-md border border-red-400/20 bg-red-500/[0.06] p-2 text-sm text-blue-100/80">{c.original || <em className="text-blue-200/50">(empty)</em>}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-emerald-200/70">After (suggestion)</p>
                      {editingKey === c.key ? (
                        <textarea aria-label={`Edit suggestion for ${c.label}`} value={c.edited} onChange={(e) => setEdited(c.key, e.target.value)} rows={6} className={cn(textareaCls, 'text-sm')} />
                      ) : (
                        <p className="whitespace-pre-line rounded-md border border-emerald-400/20 bg-emerald-500/[0.06] p-2 text-sm text-white">{c.edited}</p>
                      )}
                    </div>
                  </div>
                  {c.rationale && <p className="mt-2 text-[11px] text-blue-200/70"><strong className="text-blue-100">Why:</strong> {c.rationale}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => { setDecision(c.key, 'accepted'); setEditingKey(null); }} className="h-8 bg-emerald-600 text-white hover:bg-emerald-500"><Check className="mr-1 h-3.5 w-3.5" /> Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => { setDecision(c.key, 'rejected'); setEditingKey(null); }} className="h-8 border-white/20 bg-transparent text-white hover:bg-white/10"><X className="mr-1 h-3.5 w-3.5" /> Reject</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingKey(editingKey === c.key ? null : c.key)} className="h-8 text-cyan-200 hover:bg-cyan-500/10"><Pencil className="mr-1 h-3.5 w-3.5" /> {editingKey === c.key ? 'Done editing' : 'Edit'}</Button>
                    {c.edited !== c.suggested && <Button size="sm" variant="ghost" onClick={() => setEdited(c.key, c.suggested)} className="h-8 text-blue-200 hover:bg-white/10"><Undo2 className="mr-1 h-3.5 w-3.5" /> Reset</Button>}
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden lg:block">
              <div className="sticky top-4 max-h-[calc(100svh-2rem)] overflow-y-auto rounded-xl">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-200/70">Live tailored preview</p>
                <ResumePreview data={tailored} />
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setStep('results')} className="text-blue-100 hover:bg-white/10"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to analysis</Button>
            <Button onClick={() => goToSave(tailored)}>Continue to final edit &amp; save <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* STEP 8 */}
      {step === 'save' && finalData && (
        <div className="space-y-4">
          <section className={panel}>
            {savedId ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                <h2 className="font-outfit text-xl font-semibold text-white">Saved!</h2>
                <p className="text-sm text-blue-100/80">“{saveName}” is in your resumes{saveMode === 'new' ? ' — your original is unchanged.' : '.'}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={exportFinal} disabled={exporting}>{exporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />} Export PDF</Button>
                  <Button variant="outline" onClick={() => onSaved(savedId)} className="border-white/20 bg-transparent text-white hover:bg-white/10"><Pencil className="mr-1.5 h-4 w-4" /> Open in editor</Button>
                  <Button variant="ghost" onClick={onExit} className="text-blue-100 hover:bg-white/10">Back to resumes</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-3">
                  <h2 className="font-outfit text-lg font-semibold text-white">Final edit &amp; save</h2>
                  <div className="space-y-1.5">
                    <Label htmlFor="tailored-name" className="text-white">Name for this version</Label>
                    <Input id="tailored-name" value={saveName} onChange={(e) => { setSaveName(e.target.value); setSaveErr(''); }} className="border-white/15 bg-black/30 text-white" />
                  </div>
                  <fieldset className="flex flex-col gap-2 text-sm text-blue-100 sm:flex-row sm:gap-5">
                    <legend className="sr-only">Save mode</legend>
                    <label className="flex items-center gap-2"><input type="radio" name="save-mode" checked={saveMode === 'new'} onChange={() => setSaveMode('new')} className="accent-cyan-400" /> Save as a new resume (recommended)</label>
                    {source && <label className="flex items-center gap-2"><input type="radio" name="save-mode" checked={saveMode === 'overwrite'} onChange={() => setSaveMode('overwrite')} className="accent-cyan-400" /> Replace “{source.name}”</label>}
                  </fieldset>
                  {upload && saveMode === 'new' && (
                    <label className="flex items-center gap-2 text-sm text-blue-100"><input type="checkbox" checked={keepUploadedOriginal} onChange={(e) => setKeepUploadedOriginal(e.target.checked)} className="accent-cyan-400" /> Also save the uploaded original as its own resume</label>
                  )}
                  {saveErr && <p role="alert" className="text-sm text-red-300">{saveErr}</p>}
                </div>
                <div className="flex gap-2">
                  {analysis && <Button variant="ghost" onClick={() => setStep('changes')} className="text-blue-100 hover:bg-white/10"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>}
                  <Button id="save-tailored-resume" onClick={handleSave}><Save className="mr-1.5 h-4 w-4" /> Save resume</Button>
                </div>
              </div>
            )}
          </section>
          {!savedId && (
            <div className="grid gap-6 lg:grid-cols-2">
              <ResumeForm data={finalData} onChange={setFinalData} issues={validateResume(finalData)} showErrors={Boolean(saveErr)} />
              <div className="hidden lg:block"><div className="sticky top-4 max-h-[calc(100svh-2rem)] overflow-y-auto rounded-xl"><ResumePreview data={finalData} /></div></div>
            </div>
          )}
        </div>
      )}

      {step === 'source' && (
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-blue-200/50"><FileUp className="h-3 w-3" /> Uploaded files are processed in memory to extract text and are not stored on the server.</p>
      )}
    </div>
  );
}
