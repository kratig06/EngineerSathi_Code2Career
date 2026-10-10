'use client';

import { useId, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ResumeData,
  SectionKey,
  SECTION_LABELS,
  newEntry,
  ValidationIssue,
} from '@/lib/resume-types';

const inputCls = 'bg-black/30 border-white/15 text-white placeholder:text-blue-200/40 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-0';
const textareaCls =
  'w-full min-h-[88px] rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-blue-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 resize-y';

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  multiline,
  type = 'text',
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  multiline?: boolean;
  type?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-blue-100">
        {label}
        {required && <span className="ml-0.5 text-cyan-300" aria-hidden>*</span>}
      </Label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(textareaCls, error && 'border-red-400/70')}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        />
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={cn(inputCls, error && 'border-red-400/70')}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        />
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[11px] text-blue-200/60">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-[11px] text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

type ListKey = 'education' | 'projects' | 'experience' | 'certifications' | 'achievements' | 'links';

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function EntryShell({
  title,
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  title: string;
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-cyan-100">{title}</span>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-blue-200 hover:bg-white/10 hover:text-white" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${title} up`}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-blue-200 hover:bg-white/10 hover:text-white" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${title} down`}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-300 hover:bg-red-500/15 hover:text-red-200" onClick={onRemove} aria-label={`Remove ${title}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

interface SectionProps {
  id: string;
  title: string;
  count?: number;
  index?: number;
  total?: number;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onMoveSection?: (index: number, dir: -1 | 1) => void;
  children: React.ReactNode;
}

function Section({ id, title, count, index, total = 0, isOpen, onToggle, onMoveSection, children }: SectionProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-blue-950/40 backdrop-blur-md">
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={isOpen}
          aria-controls={`sec-${id}`}
          className="flex flex-1 items-center justify-between gap-2 rounded-xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          <span className="font-outfit text-sm font-semibold text-white">
            {title}
            {typeof count === 'number' && count > 0 && <span className="ml-2 rounded-full bg-cyan-500/15 px-2 py-0.5 text-sm text-cyan-200">{count}</span>}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-blue-200" /> : <ChevronDown className="h-4 w-4 text-blue-200" />}
        </button>
        {typeof index === 'number' && onMoveSection && (
          <>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-blue-200/70 hover:bg-white/10 hover:text-white" onClick={() => onMoveSection(index, -1)} disabled={index === 0} aria-label={`Move ${title} section up`}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-blue-200/70 hover:bg-white/10 hover:text-white" onClick={() => onMoveSection(index, 1)} disabled={index === total - 1} aria-label={`Move ${title} section down`}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
      {isOpen && (
        <div id={`sec-${id}`} className="space-y-3 px-4 pb-4">
          {children}
        </div>
      )}
    </section>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="w-full border-dashed border-white/20 bg-transparent text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-100">
      <Plus className="mr-1 h-4 w-4" /> {label}
    </Button>
  );
}

interface ResumeFormProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  issues?: ValidationIssue[];
  showErrors?: boolean;
}

/** Controlled, structured resume editor. Used by the builder and by the upload review step. */
export function ResumeForm({ data, onChange, issues = [], showErrors = false }: ResumeFormProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({ personal: true, summary: true });
  const err = (field: string) => (showErrors ? issues.find((i) => i.field === field || i.field.startsWith(`${field}`))?.message : undefined);

  const set = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => onChange({ ...data, [key]: value });
  const setPI = (k: keyof ResumeData['personalInfo'], v: string) => set('personalInfo', { ...data.personalInfo, [k]: v });

  function updateItem<K extends ListKey>(key: K, id: string, patch: Partial<ResumeData[K][number]>) {
    set(key, (data[key] as Array<{ id: string }>).map((x) => (x.id === id ? { ...x, ...patch } : x)) as ResumeData[K]);
  }
  function removeItem<K extends ListKey>(key: K, id: string) {
    set(key, (data[key] as Array<{ id: string }>).filter((x) => x.id !== id) as ResumeData[K]);
  }
  function moveItem<K extends ListKey>(key: K, i: number, dir: -1 | 1) {
    set(key, move(data[key] as Array<{ id: string }>, i, dir) as ResumeData[K]);
  }
  function addItem<K extends ListKey>(key: K) {
    set(key, [...(data[key] as Array<{ id: string }>), newEntry[key]()] as ResumeData[K]);
    setOpen((o) => ({ ...o, [key]: true }));
  }

  const moveSection = (i: number, dir: -1 | 1) => set('sectionOrder', move(data.sectionOrder, i, dir));
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const renderSection = (key: SectionKey, index: number) => {
    const title = SECTION_LABELS[key];
    const common = { id: key, title, index, total: data.sectionOrder.length, isOpen: open[key] ?? false, onToggle: toggle, onMoveSection: moveSection };
    switch (key) {
      case 'summary':
        return (
          <Section key={key} {...common}>
            <Field label="Summary or objective" multiline value={data.summary} onChange={(v) => set('summary', v)} placeholder="2–4 sentences about your focus, strengths and what you're looking for." />
          </Section>
        );
      case 'education':
        return (
          <Section key={key} {...common} count={data.education.length}>
            {data.education.map((e, i) => (
              <EntryShell key={e.id} title={e.institution || `Education ${i + 1}`} index={i} count={data.education.length} onMove={(d) => moveItem('education', i, d)} onRemove={() => removeItem('education', e.id)}>
                <Field label="Institution" required value={e.institution} onChange={(v) => updateItem('education', e.id, { institution: v })} error={err(`education.${e.id}.institution`)} />
                <Field label="Degree" value={e.degree} onChange={(v) => updateItem('education', e.id, { degree: v })} placeholder="B.Tech" />
                <Field label="Field of study" value={e.field} onChange={(v) => updateItem('education', e.id, { field: v })} placeholder="Computer Science" />
                <Field label="CGPA / Percentage" value={e.score} onChange={(v) => updateItem('education', e.id, { score: v })} />
                <Field label="Start" value={e.startDate} onChange={(v) => updateItem('education', e.id, { startDate: v })} placeholder="Aug 2021" />
                <Field label="End" value={e.endDate} onChange={(v) => updateItem('education', e.id, { endDate: v })} placeholder="May 2025 / Present" />
                <div className="sm:col-span-2">
                  <Field label="Details (one per line)" multiline value={e.details} onChange={(v) => updateItem('education', e.id, { details: v })} placeholder="Relevant coursework, honours…" />
                </div>
              </EntryShell>
            ))}
            <AddBtn label="Add education" onClick={() => addItem('education')} />
          </Section>
        );
      case 'skills':
        return (
          <Section key={key} {...common}>
            <Field label="Technical skills" multiline value={data.skills.technical} onChange={(v) => set('skills', { ...data.skills, technical: v })} placeholder="Java, Python, React, SQL, Git…" hint="Comma-separated. Only list skills you can discuss in an interview." />
            <Field label="Soft skills" value={data.skills.soft} onChange={(v) => set('skills', { ...data.skills, soft: v })} placeholder="Communication, Leadership…" />
          </Section>
        );
      case 'projects':
        return (
          <Section key={key} {...common} count={data.projects.length}>
            {data.projects.map((p, i) => (
              <EntryShell key={p.id} title={p.name || `Project ${i + 1}`} index={i} count={data.projects.length} onMove={(d) => moveItem('projects', i, d)} onRemove={() => removeItem('projects', p.id)}>
                <Field label="Project name" required value={p.name} onChange={(v) => updateItem('projects', p.id, { name: v })} error={err(`projects.${p.id}.name`)} />
                <Field label="Tech stack" value={p.techStack} onChange={(v) => updateItem('projects', p.id, { techStack: v })} placeholder="Next.js, PostgreSQL" />
                <div className="sm:col-span-2">
                  <Field label="Link" value={p.link} onChange={(v) => updateItem('projects', p.id, { link: v })} placeholder="https://github.com/…" />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Description (one bullet per line)" multiline value={p.description} onChange={(v) => updateItem('projects', p.id, { description: v })} />
                </div>
              </EntryShell>
            ))}
            <AddBtn label="Add project" onClick={() => addItem('projects')} />
          </Section>
        );
      case 'experience':
        return (
          <Section key={key} {...common} count={data.experience.length}>
            {data.experience.map((e, i) => (
              <EntryShell key={e.id} title={[e.role, e.company].filter(Boolean).join(' @ ') || `Experience ${i + 1}`} index={i} count={data.experience.length} onMove={(d) => moveItem('experience', i, d)} onRemove={() => removeItem('experience', e.id)}>
                <Field label="Company" required value={e.company} onChange={(v) => updateItem('experience', e.id, { company: v })} error={err(`experience.${e.id}`)} />
                <Field label="Role" required value={e.role} onChange={(v) => updateItem('experience', e.id, { role: v })} placeholder="Software Engineering Intern" />
                <Field label="Start" value={e.startDate} onChange={(v) => updateItem('experience', e.id, { startDate: v })} />
                <Field label="End" value={e.endDate} onChange={(v) => updateItem('experience', e.id, { endDate: v })} placeholder="Present" />
                <div className="sm:col-span-2">
                  <Field label="Location" value={e.location} onChange={(v) => updateItem('experience', e.id, { location: v })} placeholder="Bengaluru / Remote" />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Responsibilities & impact (one bullet per line)" multiline value={e.description} onChange={(v) => updateItem('experience', e.id, { description: v })} />
                </div>
              </EntryShell>
            ))}
            <AddBtn label="Add experience or internship" onClick={() => addItem('experience')} />
          </Section>
        );
      case 'certifications':
        return (
          <Section key={key} {...common} count={data.certifications.length}>
            {data.certifications.map((c, i) => (
              <EntryShell key={c.id} title={c.name || `Certification ${i + 1}`} index={i} count={data.certifications.length} onMove={(d) => moveItem('certifications', i, d)} onRemove={() => removeItem('certifications', c.id)}>
                <Field label="Name" required value={c.name} onChange={(v) => updateItem('certifications', c.id, { name: v })} error={err(`certifications.${c.id}.name`)} />
                <Field label="Issuer" value={c.issuer} onChange={(v) => updateItem('certifications', c.id, { issuer: v })} />
                <Field label="Date" value={c.date} onChange={(v) => updateItem('certifications', c.id, { date: v })} />
                <Field label="Credential link" value={c.link} onChange={(v) => updateItem('certifications', c.id, { link: v })} />
              </EntryShell>
            ))}
            <AddBtn label="Add certification" onClick={() => addItem('certifications')} />
          </Section>
        );
      case 'achievements':
        return (
          <Section key={key} {...common} count={data.achievements.length}>
            {data.achievements.map((a, i) => (
              <EntryShell key={a.id} title={a.title || `Achievement ${i + 1}`} index={i} count={data.achievements.length} onMove={(d) => moveItem('achievements', i, d)} onRemove={() => removeItem('achievements', a.id)}>
                <Field label="Title" value={a.title} onChange={(v) => updateItem('achievements', a.id, { title: v })} placeholder="Winner, Smart India Hackathon 2024" />
                <Field label="Details" value={a.description} onChange={(v) => updateItem('achievements', a.id, { description: v })} />
              </EntryShell>
            ))}
            <AddBtn label="Add achievement or activity" onClick={() => addItem('achievements')} />
          </Section>
        );
      case 'links':
        return (
          <Section key={key} {...common} count={data.links.length}>
            {data.links.map((l, i) => (
              <EntryShell key={l.id} title={l.label || `Link ${i + 1}`} index={i} count={data.links.length} onMove={(d) => moveItem('links', i, d)} onRemove={() => removeItem('links', l.id)}>
                <Field label="Label" value={l.label} onChange={(v) => updateItem('links', l.id, { label: v })} placeholder="GitHub / LinkedIn / Portfolio" />
                <Field label="URL" value={l.url} onChange={(v) => updateItem('links', l.id, { url: v })} error={err(`links.${l.id}.url`)} placeholder="https://…" />
              </EntryShell>
            ))}
            <AddBtn label="Add link" onClick={() => addItem('links')} />
          </Section>
        );
    }
  };

  return (
    <div className="space-y-3">
      <Section id="personal" title="Contact Information" isOpen={open.personal ?? false} onToggle={toggle}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name" required value={data.personalInfo.fullName} onChange={(v) => setPI('fullName', v)} error={err('fullName')} />
          <Field label="Headline" value={data.personalInfo.headline} onChange={(v) => setPI('headline', v)} placeholder="Final-year CSE student · Backend developer" />
          <Field label="Email" type="email" required value={data.personalInfo.email} onChange={(v) => setPI('email', v)} error={err('email')} />
          <Field label="Phone" type="tel" value={data.personalInfo.phone} onChange={(v) => setPI('phone', v)} />
          <div className="sm:col-span-2">
            <Field label="Location" value={data.personalInfo.location} onChange={(v) => setPI('location', v)} placeholder="City, State" />
          </div>
        </div>
      </Section>
      {data.sectionOrder.map((k, i) => renderSection(k, i))}
    </div>
  );
}
