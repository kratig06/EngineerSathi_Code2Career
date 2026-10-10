'use client';

import type { ResumeData } from '@/lib/resume-types';
import { toBullets } from '@/lib/resume-pdf';

function range(a: string, b: string) {
  return [a, b].filter((x) => x && x.trim()).join(' – ');
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-4 mb-1.5 border-b border-sky-800/70 pb-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-800">
      {children}
    </h3>
  );
}

function Bullets({ text }: { text: string }) {
  const items = toBullets(text);
  if (!items.length) return null;
  return (
    <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
      {items.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

/** Paper-style, print-friendly resume preview. Mirrors the PDF export layout. */
export function ResumePreview({ data, className = '' }: { data: ResumeData; className?: string }) {
  const p = data.personalInfo;
  const contact = [p.email, p.phone, p.location].filter(Boolean);
  const links = data.links.filter((l) => l.url.trim());
  const isEmpty =
    !p.fullName && !data.summary && !data.education.length && !data.projects.length && !data.experience.length && !data.skills.technical;

  return (
    <article
      aria-label="Resume preview"
      className={`resume-paper mx-auto w-full max-w-[720px] rounded-md bg-white px-8 py-8 text-[12px] leading-snug text-slate-800 shadow-2xl ${className}`}
    >
      <header className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{p.fullName || <span className="text-slate-300">Your Name</span>}</h2>
        {p.headline && <p className="mt-0.5 text-[13px] text-slate-600">{p.headline}</p>}
        {contact.length > 0 && <p className="mt-1 text-[11px] text-slate-600">{contact.join('  |  ')}</p>}
        {links.length > 0 && (
          <p className="text-[11px] text-sky-800">
            {links.map((l, i) => (
              <span key={l.id}>
                {i > 0 && '  |  '}
                {l.url}
              </span>
            ))}
          </p>
        )}
      </header>

      {isEmpty && (
        <p className="mt-10 text-center text-sm text-slate-400">Start filling in the editor — your resume preview appears here.</p>
      )}

      {data.sectionOrder.map((key) => {
        switch (key) {
          case 'summary':
            return data.summary.trim() ? (
              <section key={key}>
                <Heading>Professional Summary</Heading>
                <p className="whitespace-pre-line">{data.summary}</p>
              </section>
            ) : null;
          case 'education':
            return data.education.length ? (
              <section key={key}>
                <Heading>Education</Heading>
                {data.education.map((e) => (
                  <div key={e.id} className="mb-1.5">
                    <div className="flex justify-between gap-3 font-semibold text-slate-900">
                      <span>{e.institution || 'Institution'}</span>
                      <span className="shrink-0 font-normal text-slate-500">{range(e.startDate, e.endDate)}</span>
                    </div>
                    <div className="italic text-slate-600">
                      {[[e.degree, e.field].filter(Boolean).join(', '), e.score].filter(Boolean).join('  ·  ')}
                    </div>
                    <Bullets text={e.details} />
                  </div>
                ))}
              </section>
            ) : null;
          case 'skills':
            return data.skills.technical.trim() || data.skills.soft.trim() ? (
              <section key={key}>
                <Heading>Skills</Heading>
                {data.skills.technical.trim() && (
                  <p>
                    <span className="font-semibold">Technical: </span>
                    {data.skills.technical}
                  </p>
                )}
                {data.skills.soft.trim() && (
                  <p>
                    <span className="font-semibold">Soft skills: </span>
                    {data.skills.soft}
                  </p>
                )}
              </section>
            ) : null;
          case 'projects':
            return data.projects.length ? (
              <section key={key}>
                <Heading>Projects</Heading>
                {data.projects.map((pr) => (
                  <div key={pr.id} className="mb-1.5">
                    <div className="font-semibold text-slate-900">
                      {pr.name || 'Project'}
                      {pr.techStack && <span className="font-normal text-slate-500">  |  {pr.techStack}</span>}
                    </div>
                    {pr.link && <div className="text-[11px] text-sky-800">{pr.link}</div>}
                    <Bullets text={pr.description} />
                  </div>
                ))}
              </section>
            ) : null;
          case 'experience':
            return data.experience.length ? (
              <section key={key}>
                <Heading>Experience</Heading>
                {data.experience.map((e) => (
                  <div key={e.id} className="mb-1.5">
                    <div className="flex justify-between gap-3 font-semibold text-slate-900">
                      <span>
                        {e.role || 'Role'}
                        {e.company && ` — ${e.company}`}
                      </span>
                      <span className="shrink-0 font-normal text-slate-500">{range(e.startDate, e.endDate)}</span>
                    </div>
                    {e.location && <div className="italic text-slate-500">{e.location}</div>}
                    <Bullets text={e.description} />
                  </div>
                ))}
              </section>
            ) : null;
          case 'certifications':
            return data.certifications.length ? (
              <section key={key}>
                <Heading>Certifications</Heading>
                <ul className="list-disc space-y-0.5 pl-4">
                  {data.certifications.map((c) => (
                    <li key={c.id}>
                      {c.name}
                      {c.issuer && ` — ${c.issuer}`}
                      {c.date && ` (${c.date})`}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null;
          case 'achievements':
            return data.achievements.length ? (
              <section key={key}>
                <Heading>Achievements &amp; Activities</Heading>
                <ul className="list-disc space-y-0.5 pl-4">
                  {data.achievements.map((a) => (
                    <li key={a.id}>
                      {a.title}
                      {a.description && ` — ${a.description}`}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null;
          default:
            return null;
        }
      })}
    </article>
  );
}
