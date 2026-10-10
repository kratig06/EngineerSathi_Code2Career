import { z } from 'zod';

export type SectionKey =
  | 'summary'
  | 'education'
  | 'skills'
  | 'projects'
  | 'experience'
  | 'certifications'
  | 'achievements'
  | 'links';

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'summary',
  'education',
  'skills',
  'projects',
  'experience',
  'certifications',
  'achievements',
  'links',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: 'Professional Summary',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  experience: 'Experience & Internships',
  certifications: 'Certifications',
  achievements: 'Achievements & Activities',
  links: 'Links',
};

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  score: string;
  details: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  techStack: string;
  link: string;
  description: string;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  date: string;
  link: string;
}

export interface AchievementEntry {
  id: string;
  title: string;
  description: string;
}

export interface LinkEntry {
  id: string;
  label: string;
  url: string;
}

export interface ResumeData {
  personalInfo: {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
  };
  summary: string;
  education: EducationEntry[];
  skills: { technical: string; soft: string };
  projects: ProjectEntry[];
  experience: ExperienceEntry[];
  certifications: CertificationEntry[];
  achievements: AchievementEntry[];
  links: LinkEntry[];
  sectionOrder: SectionKey[];
}

export type ResumeSource = 'scratch' | 'upload' | 'tailored';

export interface Resume {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Monotonic counter used to prevent stale autosaves from overwriting newer data. */
  revision: number;
  source: ResumeSource;
  parentId?: string;
  target?: { company: string; role: string };
  data: ResumeData;
}

export function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyResumeData(): ResumeData {
  return {
    personalInfo: { fullName: '', headline: '', email: '', phone: '', location: '' },
    summary: '',
    education: [],
    skills: { technical: '', soft: '' },
    projects: [],
    experience: [],
    certifications: [],
    achievements: [],
    links: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
  };
}

export const newEntry = {
  education: (): EducationEntry => ({ id: uid('edu'), institution: '', degree: '', field: '', startDate: '', endDate: '', score: '', details: '' }),
  projects: (): ProjectEntry => ({ id: uid('prj'), name: '', techStack: '', link: '', description: '' }),
  experience: (): ExperienceEntry => ({ id: uid('exp'), company: '', role: '', location: '', startDate: '', endDate: '', description: '' }),
  certifications: (): CertificationEntry => ({ id: uid('cert'), name: '', issuer: '', date: '', link: '' }),
  achievements: (): AchievementEntry => ({ id: uid('ach'), title: '', description: '' }),
  links: (): LinkEntry => ({ id: uid('lnk'), label: '', url: '' }),
};

/* ---------------- Validation ---------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationIssue {
  field: string;
  message: string;
}

/** Only a minimal set of fields is required; all other sections are optional. */
export function validateResume(data: ResumeData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!data.personalInfo.fullName.trim()) issues.push({ field: 'fullName', message: 'Full name is required.' });
  if (!data.personalInfo.email.trim()) issues.push({ field: 'email', message: 'Email is required.' });
  else if (!EMAIL_RE.test(data.personalInfo.email.trim())) issues.push({ field: 'email', message: 'Enter a valid email address.' });
  data.education.forEach((e, i) => {
    if (!e.institution.trim()) issues.push({ field: `education.${e.id}.institution`, message: `Education #${i + 1}: institution is required.` });
  });
  data.experience.forEach((e, i) => {
    if (!e.company.trim() || !e.role.trim()) issues.push({ field: `experience.${e.id}`, message: `Experience #${i + 1}: company and role are required.` });
  });
  data.projects.forEach((p, i) => {
    if (!p.name.trim()) issues.push({ field: `projects.${p.id}.name`, message: `Project #${i + 1}: name is required.` });
  });
  data.certifications.forEach((c, i) => {
    if (!c.name.trim()) issues.push({ field: `certifications.${c.id}.name`, message: `Certification #${i + 1}: name is required.` });
  });
  data.links.forEach((l, i) => {
    if (l.url.trim() && !/^https?:\/\/|^[\w.-]+\.[a-z]{2,}/i.test(l.url.trim())) {
      issues.push({ field: `links.${l.id}.url`, message: `Link #${i + 1}: enter a valid URL.` });
    }
  });
  return issues;
}

/* ---------------- Text serialisation (used for AI context + interview integration) ---------------- */

export function resumeToPlainText(data: ResumeData): string {
  const p = data.personalInfo;
  const lines: string[] = [];
  lines.push([p.fullName, p.headline].filter(Boolean).join(' — '));
  lines.push([p.email, p.phone, p.location].filter(Boolean).join(' | '));
  for (const key of data.sectionOrder) {
    switch (key) {
      case 'summary':
        if (data.summary.trim()) lines.push('\nSUMMARY', data.summary.trim());
        break;
      case 'education':
        if (data.education.length) {
          lines.push('\nEDUCATION');
          data.education.forEach((e) =>
            lines.push(`- ${[e.degree, e.field].filter(Boolean).join(', ')} at ${e.institution} (${[e.startDate, e.endDate].filter(Boolean).join(' – ')}) ${e.score} ${e.details}`.trim()),
          );
        }
        break;
      case 'skills':
        if (data.skills.technical.trim() || data.skills.soft.trim()) {
          lines.push('\nSKILLS');
          if (data.skills.technical.trim()) lines.push(`Technical: ${data.skills.technical.trim()}`);
          if (data.skills.soft.trim()) lines.push(`Soft: ${data.skills.soft.trim()}`);
        }
        break;
      case 'projects':
        if (data.projects.length) {
          lines.push('\nPROJECTS');
          data.projects.forEach((pr) => lines.push(`- ${pr.name}${pr.techStack ? ` [${pr.techStack}]` : ''}: ${pr.description}`));
        }
        break;
      case 'experience':
        if (data.experience.length) {
          lines.push('\nEXPERIENCE');
          data.experience.forEach((e) =>
            lines.push(`- ${e.role} at ${e.company} (${[e.startDate, e.endDate].filter(Boolean).join(' – ')}): ${e.description}`),
          );
        }
        break;
      case 'certifications':
        if (data.certifications.length) {
          lines.push('\nCERTIFICATIONS');
          data.certifications.forEach((c) => lines.push(`- ${c.name}${c.issuer ? ` (${c.issuer})` : ''} ${c.date}`.trim()));
        }
        break;
      case 'achievements':
        if (data.achievements.length) {
          lines.push('\nACHIEVEMENTS');
          data.achievements.forEach((a) => lines.push(`- ${a.title}${a.description ? `: ${a.description}` : ''}`));
        }
        break;
      case 'links':
        if (data.links.length) {
          lines.push('\nLINKS');
          data.links.forEach((l) => lines.push(`- ${l.label}: ${l.url}`));
        }
        break;
    }
  }
  return lines.filter((l) => l !== undefined).join('\n').trim();
}

/** Ensures data loaded from storage or AI has every expected field. */
export function normalizeResumeData(input: unknown): ResumeData {
  const base = emptyResumeData();
  const d = (input ?? {}) as Partial<ResumeData> & Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const arr = <T,>(v: unknown, map: (x: Record<string, unknown>) => T): T[] =>
    Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').map((x) => map(x as Record<string, unknown>)) : [];
  const pi = (d.personalInfo ?? {}) as Record<string, unknown>;
  const skills = d.skills as unknown;
  let technical = '';
  let soft = '';
  if (skills && typeof skills === 'object' && !Array.isArray(skills)) {
    technical = str((skills as Record<string, unknown>).technical);
    soft = str((skills as Record<string, unknown>).soft);
  } else if (Array.isArray(skills)) {
    // legacy shape: [{ category, items }]
    technical = skills.map((s: { items?: string }) => s?.items ?? '').filter(Boolean).join(', ');
  }
  const order = Array.isArray(d.sectionOrder)
    ? (d.sectionOrder.filter((k) => DEFAULT_SECTION_ORDER.includes(k as SectionKey)) as SectionKey[])
    : [];
  for (const k of DEFAULT_SECTION_ORDER) if (!order.includes(k)) order.push(k);

  return {
    personalInfo: {
      fullName: str(pi.fullName),
      headline: str(pi.headline),
      email: str(pi.email),
      phone: str(pi.phone),
      location: str(pi.location),
    },
    summary: str(d.summary),
    education: arr(d.education, (x) => ({
      id: str(x.id) || uid('edu'),
      institution: str(x.institution),
      degree: str(x.degree),
      field: str(x.field),
      startDate: str(x.startDate),
      endDate: str(x.endDate) || str(x.duration),
      score: str(x.score),
      details: str(x.details),
    })),
    skills: { technical, soft },
    projects: arr(d.projects, (x) => ({
      id: str(x.id) || uid('prj'),
      name: str(x.name),
      techStack: str(x.techStack),
      link: str(x.link),
      description: str(x.description),
    })),
    experience: arr(d.experience, (x) => ({
      id: str(x.id) || uid('exp'),
      company: str(x.company),
      role: str(x.role),
      location: str(x.location),
      startDate: str(x.startDate),
      endDate: str(x.endDate) || str(x.duration),
      description: str(x.description),
    })),
    certifications: arr(d.certifications, (x) => ({
      id: str(x.id) || uid('cert'),
      name: str(x.name),
      issuer: str(x.issuer),
      date: str(x.date),
      link: str(x.link),
    })),
    achievements: arr(d.achievements, (x) => ({
      id: str(x.id) || uid('ach'),
      title: str(x.title),
      description: str(x.description),
    })),
    links: arr(d.links, (x) => ({
      id: str(x.id) || uid('lnk'),
      label: str(x.label) || str(x.name),
      url: str(x.url),
    })),
    sectionOrder: order.length ? order : base.sectionOrder,
  };
}

/* ---------------- AI response schemas ---------------- */

export const analysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchLevel: z.enum(['Strong', 'Moderate', 'Weak']),
  matchExplanation: z.string(),
  jobKeywords: z.array(z.string()).default([]),
  relevantSkills: z.array(z.string()).default([]),
  relevantExperience: z.array(z.object({ title: z.string(), why: z.string() })).default([]),
  missingKeywords: z.array(z.object({ keyword: z.string(), note: z.string().default('') })).default([]),
  summarySuggestion: z
    .object({ suggested: z.string(), rationale: z.string().default('') })
    .nullable()
    .default(null),
  descriptionSuggestions: z
    .array(
      z.object({
        section: z.enum(['experience', 'projects']),
        itemId: z.string(),
        suggested: z.string(),
        rationale: z.string().default(''),
      }),
    )
    .default([]),
  skillsToDevelop: z.array(z.object({ skill: z.string(), reason: z.string().default('') })).default([]),
});

export type ResumeAnalysis = z.infer<typeof analysisSchema> & {
  keywordCoverage: { found: string[]; missing: string[]; percent: number | null };
  provider: string;
};
