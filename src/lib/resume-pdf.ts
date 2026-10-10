import type { ResumeData } from '@/lib/resume-types';

/** Splits a free-text description into bullet lines (supports "-", "•", "*" or newline separated). */
export function toBullets(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*[-•*▪]\s*/, '').trim())
    .filter(Boolean);
}

function dateRange(a: string, b: string) {
  return [a, b].filter((x) => x && x.trim()).join(' – ');
}

/**
 * Generates a real text-based PDF (selectable, ATS-friendly) using jsPDF.
 * Only resume content is rendered — no app navigation or editor controls.
 */
export async function exportResumePdf(data: ResumeData, fileName: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48;
  const contentW = pageW - M * 2;
  let y = M;

  const ensure = (h: number) => {
    if (y + h > pageH - M) {
      doc.addPage();
      y = M;
    }
  };

  const text = (str: string, opts: { size?: number; bold?: boolean; italic?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}) => {
    const { size = 10, bold = false, italic = false, color = [30, 30, 30], indent = 0, gap = 1.35 } = opts;
    doc.setFont('helvetica', bold ? (italic ? 'bolditalic' : 'bold') : italic ? 'italic' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(str, contentW - indent) as string[];
    for (const line of lines) {
      ensure(size * gap);
      doc.text(line, M + indent, y + size);
      y += size * gap;
    }
  };

  const rowLeftRight = (left: string, right: string, size = 10.5) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    const rightW = right ? doc.getTextWidth(right) + 8 : 0;
    const leftLines = doc.splitTextToSize(left, contentW - rightW) as string[];
    ensure(size * 1.4 * leftLines.length);
    doc.setTextColor(20, 20, 20);
    leftLines.forEach((l, i) => doc.text(l, M, y + size + i * size * 1.4));
    if (right) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(90, 90, 90);
      doc.text(right, pageW - M, y + size, { align: 'right' });
    }
    y += size * 1.4 * leftLines.length;
  };

  const bullets = (desc: string) => {
    for (const b of toBullets(desc)) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.8);
      const lines = doc.splitTextToSize(b, contentW - 14) as string[];
      ensure(9.8 * 1.4);
      doc.setTextColor(30, 30, 30);
      doc.text('•', M + 3, y + 9.8);
      lines.forEach((l) => {
        ensure(9.8 * 1.4);
        doc.text(l, M + 14, y + 9.8);
        y += 9.8 * 1.4;
      });
    }
  };

  const heading = (label: string) => {
    ensure(34);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(14, 80, 120);
    doc.text(label.toUpperCase(), M, y + 11);
    y += 16;
    doc.setDrawColor(14, 80, 120);
    doc.setLineWidth(0.8);
    doc.line(M, y, pageW - M, y);
    y += 6;
  };

  // Header
  const p = data.personalInfo;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(p.fullName || 'Your Name', pageW / 2, y + 20, { align: 'center' });
  y += 30;
  if (p.headline) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(p.headline, pageW / 2, y + 10, { align: 'center' });
    y += 16;
  }
  const contact = [p.email, p.phone, p.location].filter(Boolean).join('  |  ');
  const linkLine = data.links.filter((l) => l.url).map((l) => l.url).join('  |  ');
  doc.setFontSize(9.5);
  doc.setTextColor(70, 70, 70);
  for (const line of [contact, linkLine].filter(Boolean)) {
    const wrapped = doc.splitTextToSize(line, contentW) as string[];
    wrapped.forEach((w) => {
      doc.text(w, pageW / 2, y + 10, { align: 'center' });
      y += 13;
    });
  }
  y += 2;

  for (const key of data.sectionOrder) {
    switch (key) {
      case 'summary':
        if (data.summary.trim()) {
          heading('Professional Summary');
          text(data.summary.trim(), { size: 10 });
        }
        break;
      case 'education':
        if (data.education.length) {
          heading('Education');
          data.education.forEach((e) => {
            rowLeftRight(e.institution, dateRange(e.startDate, e.endDate));
            const sub = [[e.degree, e.field].filter(Boolean).join(', '), e.score].filter(Boolean).join('  ·  ');
            if (sub) text(sub, { size: 9.8, italic: true, color: [60, 60, 60] });
            if (e.details) bullets(e.details);
            y += 4;
          });
        }
        break;
      case 'skills':
        if (data.skills.technical.trim() || data.skills.soft.trim()) {
          heading('Skills');
          if (data.skills.technical.trim()) text(`Technical: ${data.skills.technical.trim()}`, { size: 10 });
          if (data.skills.soft.trim()) text(`Soft skills: ${data.skills.soft.trim()}`, { size: 10 });
        }
        break;
      case 'projects':
        if (data.projects.length) {
          heading('Projects');
          data.projects.forEach((pr) => {
            rowLeftRight(pr.name + (pr.techStack ? `  |  ${pr.techStack}` : ''), '');
            if (pr.link) text(pr.link, { size: 9, color: [14, 80, 120] });
            if (pr.description) bullets(pr.description);
            y += 4;
          });
        }
        break;
      case 'experience':
        if (data.experience.length) {
          heading('Experience');
          data.experience.forEach((e) => {
            rowLeftRight(`${e.role}${e.company ? ` — ${e.company}` : ''}`, dateRange(e.startDate, e.endDate));
            if (e.location) text(e.location, { size: 9.5, italic: true, color: [80, 80, 80] });
            if (e.description) bullets(e.description);
            y += 4;
          });
        }
        break;
      case 'certifications':
        if (data.certifications.length) {
          heading('Certifications');
          data.certifications.forEach((c) => {
            text(`• ${c.name}${c.issuer ? ` — ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}`, { size: 10 });
          });
        }
        break;
      case 'achievements':
        if (data.achievements.length) {
          heading('Achievements & Activities');
          data.achievements.forEach((a) => {
            text(`• ${a.title}${a.description ? ` — ${a.description}` : ''}`, { size: 10 });
          });
        }
        break;
      case 'links':
        // rendered in header
        break;
    }
  }

  const safe = (fileName || 'resume').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'resume';
  doc.save(`${safe}.pdf`);
}
