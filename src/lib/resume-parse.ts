import { ResumeData, emptyResumeData, uid, SectionKey } from '@/lib/resume-types';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type UploadKind = 'pdf' | 'docx';

export function detectUploadKind(fileName: string, mime: string, head: Uint8Array): UploadKind | null {
  const lower = fileName.toLowerCase();
  const isPdfMagic = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
  const isZipMagic = head[0] === 0x50 && head[1] === 0x4b; // PK (docx is a zip)
  if ((lower.endsWith('.pdf') || mime === 'application/pdf') && isPdfMagic) return 'pdf';
  if (
    (lower.endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') &&
    isZipMagic
  )
    return 'docx';
  return null;
}

const HEADINGS: { key: SectionKey | 'skip'; re: RegExp }[] = [
  { key: 'summary', re: /^(professional\s+)?(summary|profile|objective|about( me)?|career objective)$/i },
  { key: 'education', re: /^(education|academic(s| background| qualifications)?|qualifications)$/i },
  { key: 'skills', re: /^((technical|key|core)\s+)?skills( & tools| and tools)?$|^technologies$|^tech stack$/i },
  { key: 'projects', re: /^(academic\s+|personal\s+|key\s+)?projects$/i },
  { key: 'experience', re: /^((work|professional)\s+)?experience$|^internships?$|^employment( history)?$|^work history$/i },
  { key: 'certifications', re: /^certifications?( & courses)?$|^courses$|^licenses( & certifications)?$/i },
  { key: 'achievements', re: /^(achievements|awards|honou?rs|extra[- ]?curricular( activities)?|activities|positions of responsibility)$/i },
  { key: 'links', re: /^(links|profiles|online presence)$/i },
];

/**
 * Deterministic (non-AI) extraction: detects contact details and splits the text into
 * sections by common headings. Content inside each section is kept verbatim so the
 * user can review and correct it — nothing is invented.
 */
export function heuristicExtract(rawText: string): { data: ResumeData; detectedSections: string[] } {
  const data = emptyResumeData();
  const text = rawText.replace(/\r/g, '');
  const lines = text.split('\n').map((l) => l.trim());

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (email) data.personalInfo.email = email[0];
  const phone = text.match(/(\+?\d[\d\s().-]{8,}\d)/);
  if (phone) data.personalInfo.phone = phone[0].trim();

  const urls = Array.from(new Set(text.match(/(https?:\/\/[^\s|,]+|(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|leetcode\.com)\/[^\s|,]+)/gi) ?? []));
  data.links = urls.slice(0, 6).map((u) => ({
    id: uid('lnk'),
    label: /linkedin/i.test(u) ? 'LinkedIn' : /github/i.test(u) ? 'GitHub' : /leetcode/i.test(u) ? 'LeetCode' : 'Website',
    url: u,
  }));

  const firstLine = lines.find((l) => l.length > 1);
  if (firstLine && firstLine.length < 60 && !/@|\d{5,}/.test(firstLine)) data.personalInfo.fullName = firstLine;

  const buckets: Partial<Record<SectionKey, string[]>> = {};
  let current: SectionKey | null = null;
  for (const line of lines) {
    const normalized = line.replace(/[:|]+$/, '').trim();
    const match = normalized.length < 45 ? HEADINGS.find((h) => h.re.test(normalized)) : undefined;
    if (match && match.key !== 'skip') {
      current = match.key;
      buckets[current] = buckets[current] ?? [];
      continue;
    }
    if (current && line) buckets[current]!.push(line);
  }

  const join = (k: SectionKey) => (buckets[k] ?? []).join('\n').trim();
  if (join('summary')) data.summary = join('summary');
  if (join('skills')) data.skills.technical = (buckets.skills ?? []).join(', ').replace(/\s*,\s*,/g, ',');
  if (join('education'))
    data.education = [{ id: uid('edu'), institution: (buckets.education ?? [])[0] ?? '', degree: '', field: '', startDate: '', endDate: '', score: '', details: (buckets.education ?? []).slice(1).join('\n') }];
  if (join('experience'))
    data.experience = [{ id: uid('exp'), company: '', role: (buckets.experience ?? [])[0] ?? '', location: '', startDate: '', endDate: '', description: (buckets.experience ?? []).slice(1).join('\n') }];
  if (join('projects'))
    data.projects = [{ id: uid('prj'), name: (buckets.projects ?? [])[0] ?? '', techStack: '', link: '', description: (buckets.projects ?? []).slice(1).join('\n') }];
  if (join('certifications'))
    data.certifications = (buckets.certifications ?? []).map((l) => ({ id: uid('cert'), name: l.replace(/^[-•*]\s*/, ''), issuer: '', date: '', link: '' }));
  if (join('achievements'))
    data.achievements = (buckets.achievements ?? []).map((l) => ({ id: uid('ach'), title: l.replace(/^[-•*]\s*/, ''), description: '' }));

  return { data, detectedSections: Object.keys(buckets) };
}

/** Lower-cased resume text used to verify that a claimed skill is actually supported. */
export function containsTerm(haystack: string, term: string): boolean {
  const h = haystack.toLowerCase();
  const t = term.toLowerCase().trim();
  if (!t) return false;
  if (h.includes(t)) return true;
  // tolerate punctuation differences e.g. "node.js" vs "nodejs", "c++" kept literal
  const strip = (s: string) => s.replace(/[\s.\-_/]/g, '');
  return strip(h).includes(strip(t));
}
