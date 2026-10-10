'use client';

/**
 * RoadmapDashboard — "My Interview Roadmaps"
 *
 * Rendered when the user opens the Roadmap section from the header.
 * Shows company-targeting cards with live countdown timers and AI-generated
 * preparation roadmaps.  Backed by the /api/targets API (SQLite).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Edit3,
  MapPin,
  Plus,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { useInterviewStore } from '@/store/interviewStore';
import { BackButton } from '@/components/ui/back-button';

/* ────────────────────────────────────────────────────────── */
/* Types                                                       */
/* ────────────────────────────────────────────────────────── */

interface InterviewTarget {
  id: string;
  company: string;
  role: string;
  interviewAt: number | null;
  timezone: string;
  jobDescription: string;
  notes: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

interface RoadmapTask {
  id: string;
  sequence: number;
  title: string;
  description: string;
  category: string;
  plannedDate: string | null;
  completed: boolean;
  completedAt: number | null;
}

interface Roadmap {
  id: string;
  targetId: string;
  title: string;
}

interface RoadmapData {
  roadmap: Roadmap | null;
  tasks: RoadmapTask[];
}

/* ────────────────────────────────────────────────────────── */
/* Helpers                                                     */
/* ────────────────────────────────────────────────────────── */

const CATEGORY_COLORS: Record<string, string> = {
  dsa: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  system_design: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  behavioral: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  technical: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  aptitude: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  networking: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  research: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  mock: 'bg-green-500/20 text-green-300 border-green-500/30',
  other: 'bg-white/10 text-white/50 border-white/20',
};

const CATEGORY_LABEL: Record<string, string> = {
  dsa: 'DSA',
  system_design: 'System Design',
  behavioral: 'Behavioral',
  technical: 'Technical',
  aptitude: 'Aptitude',
  networking: 'Networking',
  research: 'Research',
  mock: 'Mock Interview',
  other: 'Other',
};

function formatCountdown(ms: number): { d: number; h: number; m: number; s: number; passed: boolean } {
  const passed = ms <= 0;
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { d, h, m, s, passed };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/* ────────────────────────────────────────────────────────── */
/* Countdown component                                         */
/* ────────────────────────────────────────────────────────── */

function LiveCountdown({ targetMs }: { targetMs: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = targetMs - now;
  const { d, h, m, s, passed } = formatCountdown(diff);

  if (passed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-rose-400 font-mono">
        <Clock className="w-3 h-3" /> Interview passed
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1 font-mono text-sm">
      {d > 0 && (
        <span className="flex flex-col items-center">
          <span className="text-white font-bold text-lg leading-none">{pad(d)}</span>
          <span className="text-white/40 text-sm">d</span>
        </span>
      )}
      {d > 0 && <span className="text-white/30 mb-3">:</span>}
      <span className="flex flex-col items-center">
        <span className="text-white font-bold text-lg leading-none">{pad(h)}</span>
        <span className="text-white/40 text-sm">h</span>
      </span>
      <span className="text-white/30 mb-3">:</span>
      <span className="flex flex-col items-center">
        <span className="text-white font-bold text-lg leading-none">{pad(m)}</span>
        <span className="text-white/40 text-sm">m</span>
      </span>
      <span className="text-white/30 mb-3">:</span>
      <span className="flex flex-col items-center">
        <span className="text-cyan-400 font-bold text-lg leading-none tabular-nums">{pad(s)}</span>
        <span className="text-white/40 text-sm">s</span>
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* AddTargetModal                                              */
/* ────────────────────────────────────────────────────────── */

const COMPANY_OPTIONS = [
  'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'NVIDIA', 'Adobe',
  'Infosys', 'TCS', 'Wipro', 'Accenture', 'Deloitte', 'Cognizant', 'Other',
];

interface AddTargetModalProps {
  existing?: InterviewTarget;
  onSave: (data: Partial<InterviewTarget>) => Promise<void>;
  onClose: () => void;
}

function AddTargetModal({ existing, onSave, onClose }: AddTargetModalProps) {
  const [company, setCompany] = useState(existing?.company ?? '');
  const [customCompany, setCustomCompany] = useState(existing && !COMPANY_OPTIONS.includes(existing.company) ? existing.company : '');
  const [role, setRole] = useState(existing?.role ?? '');
  const [interviewDate, setInterviewDate] = useState(
    existing?.interviewAt ? new Date(existing.interviewAt).toISOString().slice(0, 16) : '',
  );
  const [jobDescription, setJobDescription] = useState(existing?.jobDescription ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const resolvedCompany = company === 'Other' ? customCompany : company;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedCompany.trim() || !role.trim()) return;
    setSaving(true);
    await onSave({
      company: resolvedCompany.trim(),
      role: role.trim(),
      interviewAt: interviewDate ? new Date(interviewDate).getTime() : null,
      jobDescription,
      notes,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-blue-950/95 border border-cyan-500/20 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            {existing ? 'Edit Target' : 'Add Interview Target'}
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors rounded-full p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/60 mb-1 font-medium">Company *</label>
            <select
              value={COMPANY_OPTIONS.includes(company) ? company : company ? 'Other' : ''}
              onChange={(e) => { setCompany(e.target.value); if (e.target.value !== 'Other') setCustomCompany(''); }}
              className="w-full rounded-lg bg-blue-900/50 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
              required
            >
              <option value="">Select company…</option>
              {COMPANY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {(company === 'Other' || (!COMPANY_OPTIONS.includes(company) && company)) && (
              <input
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                placeholder="Company name…"
                className="mt-2 w-full rounded-lg bg-blue-900/50 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
                required
              />
            )}
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1 font-medium">Role / Position *</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Software Engineer, Data Scientist…"
              className="w-full rounded-lg bg-blue-900/50 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1 font-medium">Interview Date & Time</label>
            <input
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              className="w-full rounded-lg bg-blue-900/50 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1 font-medium">Job Description (optional)</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the JD here for AI-powered roadmap generation…"
              rows={3}
              className="w-full rounded-lg bg-blue-900/50 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1 font-medium">Personal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any personal notes or reminders…"
              rows={2}
              className="w-full rounded-lg bg-blue-900/50 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !resolvedCompany.trim() || !role.trim()}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-blue-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              {existing ? 'Save Changes' : 'Add Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* RoadmapTaskList                                             */
/* ────────────────────────────────────────────────────────── */

function RoadmapTaskList({ roadmapData, onToggle }: { roadmapData: RoadmapData; onToggle: (id: string, completed: boolean) => void }) {
  const { tasks } = roadmapData;
  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-white/50 tabular-nums">{done}/{tasks.length}</span>
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => onToggle(task.id, !task.completed)}
            className={`w-full text-left flex items-start gap-3 rounded-xl p-3 border transition-all duration-200 group ${task.completed ? 'border-white/5 bg-white/3 opacity-60' : 'border-white/10 bg-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5'}`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {task.completed
                ? <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                : <Circle className="w-4 h-4 text-white/30 group-hover:text-cyan-400/60 transition-colors" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${task.completed ? 'line-through text-white/40' : 'text-white'}`}>{task.title}</span>
                <span className={`text-sm px-1.5 py-0.5 rounded border font-medium ${CATEGORY_COLORS[task.category] ?? CATEGORY_COLORS.other}`}>
                  {CATEGORY_LABEL[task.category] ?? task.category}
                </span>
              </div>
              {task.description && <p className="text-xs text-white/40 mt-0.5 leading-snug">{task.description}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* TargetCard                                                  */
/* ────────────────────────────────────────────────────────── */

interface TargetCardProps {
  target: InterviewTarget;
  onEdit: () => void;
  onDelete: () => void;
  onStartInterview: () => void;
}

function TargetCard({ target, onEdit, onDelete, onStartInterview }: TargetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoadmap = useCallback(async () => {
    setLoadingRoadmap(true);
    setError(null);
    try {
      const res = await fetch(`/api/targets/${target.id}/roadmap`);
      if (!res.ok) throw new Error('Failed to load roadmap.');
      const data = await res.json();
      setRoadmapData(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingRoadmap(false);
    }
  }, [target.id]);

  const handleExpand = () => {
    setExpanded((v) => {
      if (!v && !roadmapData) loadRoadmap();
      return !v;
    });
  };

  const generateRoadmap = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/targets/${target.id}/roadmap/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: target.company, role: target.role, interviewAt: target.interviewAt, jobDescription: target.jobDescription }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Generation failed.');
      await loadRoadmap();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    if (!roadmapData) return;
    // Optimistic update
    setRoadmapData((prev) =>
      prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, completed } : t)) } : prev,
    );
    try {
      await fetch(`/api/tasks/${taskId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
    } catch {
      await loadRoadmap(); // rollback on failure
    }
  };

  const completedCount = roadmapData?.tasks.filter((t) => t.completed).length ?? 0;
  const totalCount = roadmapData?.tasks.length ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-950/80 to-blue-900/40 backdrop-blur-sm overflow-hidden shadow-xl transition-all duration-300 hover:border-cyan-500/20">
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-base leading-tight">{target.company}</h3>
              <p className="text-sm text-white/50 mt-0.5">{target.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} title="Edit" className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} title="Delete" className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Countdown */}
        {target.interviewAt && (
          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(target.interviewAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <LiveCountdown targetMs={target.interviewAt} />
          </div>
        )}

        {/* Notes */}
        {target.notes && (
          <p className="mt-3 text-xs text-white/40 italic border-l border-white/10 pl-3">{target.notes}</p>
        )}

        {/* Action row */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onStartInterview}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white text-xs font-semibold transition-all shadow-lg shadow-orange-500/20"
          >
            <Rocket className="w-3.5 h-3.5" /> Start Mock Interview
          </button>
          <button
            onClick={handleExpand}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-cyan-400/30 text-xs transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            {expanded ? 'Hide' : 'Roadmap'}
            {totalCount > 0 && !expanded && (
              <span className="ml-1 text-cyan-400 font-mono">{completedCount}/{totalCount}</span>
            )}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded roadmap panel */}
      {expanded && (
        <div className="border-t border-white/10 bg-blue-950/60 p-5 space-y-4">
          {loadingRoadmap && (
            <div className="flex items-center justify-center py-8 gap-2 text-white/40">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading roadmap…</span>
            </div>
          )}

          {!loadingRoadmap && error && (
            <div className="text-sm text-rose-400 flex items-center gap-2">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}

          {!loadingRoadmap && !error && roadmapData?.tasks.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <Sparkles className="w-8 h-8 text-cyan-400/40 mx-auto" />
              <p className="text-sm text-white/40">No roadmap yet. Generate one with AI!</p>
              <button
                onClick={generateRoadmap}
                disabled={generating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {generating ? 'Generating…' : 'Generate AI Roadmap'}
              </button>
            </div>
          )}

          {!loadingRoadmap && !error && roadmapData && roadmapData.tasks.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  Preparation Tasks
                </h4>
                <button
                  onClick={generateRoadmap}
                  disabled={generating}
                  title="Re-generate roadmap"
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-cyan-300 transition-colors disabled:opacity-40"
                >
                  {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Regenerate
                </button>
              </div>
              <RoadmapTaskList roadmapData={roadmapData} onToggle={toggleTask} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Main Dashboard                                              */
/* ────────────────────────────────────────────────────────── */

export function RoadmapDashboard() {
  const setStage = useInterviewStore((s) => s.setStage);
  const updateConsent = useInterviewStore((s) => s.updateConsent);

  const [targets, setTargets] = useState<InterviewTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<InterviewTarget | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const hasFetched = useRef(false);
  const loadTargets = useCallback(async () => {
    if (hasFetched.current) setLoading(false);
    try {
      const res = await fetch('/api/targets');
      if (!res.ok) throw new Error('Failed to load targets');
      const data = await res.json();
      setTargets(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      hasFetched.current = true;
    }
  }, []);

  useEffect(() => { loadTargets(); }, [loadTargets]);

  const handleSave = async (data: Partial<InterviewTarget>) => {
    if (editTarget) {
      const res = await fetch(`/api/targets/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      setTargets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const created = await res.json();
      setTargets((prev) => [created, ...prev]);
    }
    setShowModal(false);
    setEditTarget(undefined);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/targets/${id}`, { method: 'DELETE' });
    setTargets((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
  };

  const handleStartInterview = (target: InterviewTarget) => {
    // Pass company/role context into the interview store before navigating
    updateConsent({ resumeText: target.jobDescription ?? '' });
    // Use setStage to navigate to setup; the configuration screen will use these values
    setStage('setup');
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="mr-2">
            <BackButton onClick={() => setStage('landing')} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MapPin className="w-6 h-6 text-cyan-400" /> My Interview Roadmaps
            </h1>
            <p className="text-sm text-white/40 mt-0.5">Track every company you're targeting — with AI prep plans & live countdowns.</p>
          </div>
        </div>
        <button
          onClick={() => { setEditTarget(undefined); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-blue-950 text-sm font-semibold transition-colors shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" /> Add Target
        </button>
      </div>

      {/* Body */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-white/30">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading your roadmaps…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-950/30 p-6 text-rose-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && targets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center space-y-3">
          <Target className="w-10 h-10 text-cyan-400/30 mx-auto" />
          <p className="text-white/40 font-medium">No targets yet</p>
          <p className="text-sm text-white/25">Add your first interview target to start tracking your preparation.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add your first target
          </button>
        </div>
      )}

      {!loading && !error && targets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-1">
          {targets.map((target) =>
            deletingId === target.id ? null : (
              <TargetCard
                key={target.id}
                target={target}
                onEdit={() => { setEditTarget(target); setShowModal(true); }}
                onDelete={() => handleDelete(target.id)}
                onStartInterview={() => handleStartInterview(target)}
              />
            ),
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddTargetModal
          existing={editTarget}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
        />
      )}
    </div>
  );
}
