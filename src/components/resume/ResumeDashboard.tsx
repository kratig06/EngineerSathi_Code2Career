'use client';

import { useState } from 'react';
import { FileText, MoreVertical, Plus, Pencil, Trash2, Sparkles, PenSquare, Wand2, Download, Loader2, FileUp } from 'lucide-react';
import { useResumeStore } from '@/store/resumeStore';
import { Resume, emptyResumeData } from '@/lib/resume-types';
import { exportResumePdf } from '@/lib/resume-pdf';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  hydrated: boolean;
  onOpen: (id: string) => void;
  onTailor: (id?: string) => void;
  notify: (msg: string, kind?: 'success' | 'error') => void;
  onBack: () => void;
}

const dialogCls = 'bg-blue-950/95 backdrop-blur-xl border-white/10 text-white';

function formatDate(ts: number) {
  const d = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const SOURCE_BADGE: Record<Resume['source'], { label: string; cls: string; icon: React.ReactNode }> = {
  scratch: { label: 'Built from scratch', cls: 'bg-sky-500/10 text-sky-200 border-sky-400/30', icon: <PenSquare className="h-3 w-3" /> },
  upload: { label: 'Uploaded', cls: 'bg-violet-500/10 text-violet-200 border-violet-400/30', icon: <FileUp className="h-3 w-3" /> },
  tailored: { label: 'Tailored', cls: 'bg-cyan-500/10 text-cyan-200 border-cyan-400/30', icon: <Sparkles className="h-3 w-3" /> },
};

export function ResumeDashboard({ hydrated, onOpen, onTailor, notify, onBack }: Props) {
  const resumes = useResumeStore((s) => s.resumes);
  const createResume = useResumeStore((s) => s.createResume);
  const renameResume = useResumeStore((s) => s.renameResume);
  const deleteResume = useResumeStore((s) => s.deleteResume);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('My Resume');
  const [newNameErr, setNewNameErr] = useState('');
  const [renameTarget, setRenameTarget] = useState<Resume | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameErr, setRenameErr] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const sorted = [...resumes].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const n = newName.trim();
    if (!n) return setNewNameErr('Please give your resume a name.');
    const r = createResume({ name: n, data: emptyResumeData(), source: 'scratch' });
    setCreateOpen(false);
    notify(`"${r.name}" created.`);
    onOpen(r.id);
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const n = renameValue.trim();
    if (!n) return setRenameErr('Name cannot be empty.');
    if (n.length > 80) return setRenameErr('Keep the name under 80 characters.');
    const res = renameResume(renameTarget.id, n);
    if (res.ok) {
      notify('Resume renamed.');
      setRenameTarget(null);
    } else setRenameErr('Could not rename this resume. Please try again.');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const res = deleteResume(deleteTarget.id);
    if (res.ok) notify(`"${deleteTarget.name}" deleted.`);
    else notify(res.message ?? 'Could not delete resume.', 'error');
    setDeleteTarget(null);
  };

  const handleExport = async (r: Resume) => {
    setExportingId(r.id);
    try {
      await exportResumePdf(r.data, r.name);
    } catch {
      notify('PDF export failed.', 'error');
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="w-full max-w-5xl">
      <div className="rounded-3xl border border-white/10 bg-blue-950/45 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2">
              <BackButton onClick={onBack} />
            </div>
            <h1 className="font-outfit text-3xl font-bold tracking-tight text-white sm:text-4xl">Your Resumes</h1>
            <p className="mt-1.5 max-w-xl text-sm text-blue-100/80 sm:text-base">
              Build a resume from scratch or tailor one for a specific company and role — honestly, without inventing anything.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="resume-add-button"
                size="icon"
                aria-label="Create a new resume"
                className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 to-sky-600 text-white shadow-[0_0_24px_rgba(34,211,238,0.45)] transition-transform hover:scale-105 hover:from-cyan-300 hover:to-sky-500"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 border-white/10 bg-blue-950/95 p-1.5 text-white backdrop-blur-xl">
              <DropdownMenuItem
                id="resume-build-scratch"
                className="cursor-pointer items-start gap-3 rounded-lg p-3 focus:bg-white/10"
                onSelect={() => {
                  setNewName('My Resume');
                  setNewNameErr('');
                  setCreateOpen(true);
                }}
              >
                <PenSquare className="mt-0.5 h-5 w-5 text-sky-300" />
                <div>
                  <div className="font-semibold">Build from Scratch</div>
                  <div className="text-sm text-blue-200/70">Guided editor with live preview and PDF export</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem id="resume-modify-company" className="cursor-pointer items-start gap-3 rounded-lg p-3 focus:bg-white/10" onSelect={() => onTailor()}>
                <Wand2 className="mt-0.5 h-5 w-5 text-cyan-300" />
                <div>
                  <div className="font-semibold">Modify for Company</div>
                  <div className="text-sm text-blue-200/70">Upload or pick a resume, then tailor it with AI</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!hydrated ? (
          <div className="grid gap-3" aria-busy="true" aria-label="Loading resumes">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-white/5 bg-white/5" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/15 bg-black/10 px-6 py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10">
              <FileText className="h-7 w-7 text-cyan-300" />
            </div>
            <h2 className="font-outfit text-xl font-semibold text-white">No resumes yet</h2>
            <p className="mt-1 max-w-sm text-sm text-blue-100/70">Create your first resume to get started. Everything is saved automatically in this browser.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => { setNewName('My Resume'); setNewNameErr(''); setCreateOpen(true); }}>
                <PenSquare className="mr-2 h-4 w-4" /> Build from Scratch
              </Button>
              <Button variant="outline" onClick={() => onTailor()} className="border-cyan-400/40 bg-transparent text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-100">
                <Wand2 className="mr-2 h-4 w-4" /> Upload & Modify for Company
              </Button>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3" aria-label="Saved resumes">
            {sorted.map((r) => {
              const badge = SOURCE_BADGE[r.source];
              return (
                <li key={r.id} className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] pr-2 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.07]">
                  <button
                    type="button"
                    onClick={() => onOpen(r.id)}
                    className="flex min-w-0 flex-1 items-center gap-4 rounded-xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                    aria-label={`Open ${r.name}`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-sky-500/20 to-cyan-500/10">
                      <FileText className="h-5 w-5 text-cyan-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">{r.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-blue-200/70">
                        <span>Edited {formatDate(r.updatedAt)}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${badge.cls}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                        {r.target && (
                          <span className="truncate text-cyan-200/80">
                            {r.target.company} · {r.target.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full text-blue-200 hover:bg-white/10 hover:text-white" aria-label={`More actions for ${r.name}`}>
                        {exportingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 border-white/10 bg-blue-950/95 text-white backdrop-blur-xl">
                      <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-white/10" onSelect={() => onOpen(r.id)}>
                        <PenSquare className="h-4 w-4" /> Modify
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2 focus:bg-white/10"
                        onSelect={() => {
                          setRenameTarget(r);
                          setRenameValue(r.name);
                          setRenameErr('');
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-white/10" onSelect={() => onTailor(r.id)}>
                        <Sparkles className="h-4 w-4" /> Tailor for company
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-white/10" onSelect={() => handleExport(r)}>
                        <Download className="h-4 w-4" /> Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="cursor-pointer gap-2 text-red-300 focus:bg-red-500/15 focus:text-red-200" onSelect={() => setDeleteTarget(r)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 text-center text-[11px] text-blue-200/50">
          Resumes are stored privately in this browser. Content is only sent to the server when you request AI parsing or analysis.
        </p>
      </div>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={dialogCls}>
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Build from Scratch</DialogTitle>
              <DialogDescription className="text-blue-200/70">Name your resume — you can change it any time.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="new-resume-name">Resume name</Label>
              <Input id="new-resume-name" autoFocus value={newName} onChange={(e) => { setNewName(e.target.value); setNewNameErr(''); }} className="border-white/15 bg-black/30 text-white" aria-invalid={Boolean(newNameErr)} />
              {newNameErr && <p role="alert" className="text-sm text-red-300">{newNameErr}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="text-blue-100 hover:bg-white/10">Cancel</Button>
              <Button type="submit">Create & open editor</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={Boolean(renameTarget)} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent className={dialogCls}>
          <form onSubmit={handleRename} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Rename resume</DialogTitle>
              <DialogDescription className="text-blue-200/70">Currently “{renameTarget?.name}”.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="rename-resume">New name</Label>
              <Input id="rename-resume" autoFocus value={renameValue} onChange={(e) => { setRenameValue(e.target.value); setRenameErr(''); }} className="border-white/15 bg-black/30 text-white" aria-invalid={Boolean(renameErr)} />
              {renameErr && <p role="alert" className="text-sm text-red-300">{renameErr}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameTarget(null)} className="text-blue-100 hover:bg-white/10">Cancel</Button>
              <Button type="submit">Save name</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className={dialogCls}>
          <DialogHeader>
            <DialogTitle>Delete resume?</DialogTitle>
            <DialogDescription className="text-blue-200/70">
              “{deleteTarget?.name}” will be permanently removed from this browser. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-blue-100 hover:bg-white/10">Cancel</Button>
            <Button id="confirm-delete-resume" onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-500">
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
