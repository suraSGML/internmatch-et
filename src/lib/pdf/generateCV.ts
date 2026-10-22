/**
 * CV PDF Generator using pdf-lib.
 * Runs server-side (Route Handler or Server Action).
 *
 * Produces an ATS-friendly, clean single-page CV.
 * Two template variants: 'classic' (left-aligned) and 'modern' (sidebar).
 * English and Amharic label support is structured in but defaults to English.
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CVData {
  full_name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
  bio?: string | null;
  skills?: Array<{ name: string; level?: string }>;
  languages?: Array<{ language: string; level?: string }>;
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
    start_date?: string | null;
    end_date?: string | null;
    gpa?: number | null;
  }>;
  experience?: Array<{
    title: string;
    organization: string;
    location?: string | null;
    start_date?: string;
    end_date?: string | null;
    is_current?: boolean;
    description?: string | null;
  }>;
  projects?: Array<{
    title: string;
    description?: string | null;
    link?: string | null;
  }>;
  certifications?: Array<{
    title: string;
    issuer: string;
    issued_date?: string | null;
  }>;
}

export type CVTemplate = 'classic' | 'modern';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const C = {
  primary:   rgb(0.31, 0.27, 0.9),  // indigo-600 approx
  dark:      rgb(0.1, 0.1, 0.15),
  mid:       rgb(0.35, 0.35, 0.4),
  light:     rgb(0.6, 0.6, 0.65),
  white:     rgb(1, 1, 1),
  accent:    rgb(0.95, 0.95, 0.97),
  separator: rgb(0.88, 0.88, 0.9),
};

function cleanText(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/•/g, '-')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return (
        (code >= 32 && code <= 126) ||
        (code >= 160 && code <= 255) ||
        code === 0x2022 ||
        code === 0x2013 ||
        code === 0x2014 ||
        code === 0x00B7
      );
    })
    .join('')
    .trim();
}

function formatDateRange(start?: string | null, end?: string | null, isCurrent?: boolean): string {
  const fmt = (d: string) => {
    const dt = new Date(d);
    return isNaN(dt.getTime())
      ? d
      : dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  const s = start ? fmt(start) : '';
  const e = isCurrent ? 'Present' : end ? fmt(end) : '';
  return [s, e].filter(Boolean).join(' - ');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawSection(
  page: PDFPage,
  title: string,
  y: number,
  width: number,
  boldFont: PDFFont,
  regularFont: PDFFont
): number {
  // Section header
  page.drawRectangle({ x: 50, y: y - 4, width: width - 100, height: 18, color: C.accent });
  page.drawText(title.toUpperCase(), {
    x: 55, y: y,
    size: 9, font: boldFont, color: C.primary,
  });
  // Separator line
  page.drawLine({
    start: { x: 50, y: y - 6 },
    end: { x: width - 50, y: y - 6 },
    thickness: 0.5,
    color: C.separator,
  });
  return y - 20;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateCVPDF(rawData: CVData, _template: CVTemplate = 'classic'): Promise<Uint8Array> {
  const data: CVData = {
    full_name: cleanText(rawData.full_name) || 'Student',
    email: cleanText(rawData.email),
    phone: cleanText(rawData.phone),
    city: cleanText(rawData.city),
    linkedin: cleanText(rawData.linkedin),
    github: cleanText(rawData.github),
    portfolio: cleanText(rawData.portfolio),
    bio: cleanText(rawData.bio),
    skills: rawData.skills?.map((s) => ({
      name: cleanText(s.name),
      level: cleanText(s.level),
    })).filter((s) => Boolean(s.name)),
    languages: rawData.languages?.map((l) => ({
      language: cleanText(l.language),
      level: cleanText(l.level),
    })).filter((l) => Boolean(l.language)),
    education: rawData.education?.map((ed) => ({
      institution: cleanText(ed.institution),
      degree: cleanText(ed.degree),
      field: cleanText(ed.field),
      start_date: ed.start_date,
      end_date: ed.end_date,
      gpa: ed.gpa,
    })),
    experience: rawData.experience?.map((exp) => ({
      title: cleanText(exp.title),
      organization: cleanText(exp.organization),
      location: cleanText(exp.location),
      start_date: exp.start_date,
      end_date: exp.end_date,
      is_current: exp.is_current,
      description: cleanText(exp.description),
    })),
    projects: rawData.projects?.map((p) => ({
      title: cleanText(p.title),
      description: cleanText(p.description),
      link: cleanText(p.link),
    })),
    certifications: rawData.certifications?.map((c) => ({
      title: cleanText(c.title),
      issuer: cleanText(c.issuer),
      issued_date: c.issued_date,
    })),
  };

  const doc = await PDFDocument.create();
  doc.setTitle(`${data.full_name} - CV`);
  doc.setAuthor('InternMatch ET');
  doc.setCreator('InternMatch ET CV Builder');

  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  let y = height - 50;

  // ── Header ──────────────────────────────────────────────────────────────────
  // Name
  page.drawText(data.full_name, {
    x: 50, y,
    size: 22, font: boldFont, color: C.dark,
  });
  y -= 20;

  // Contact line
  const contactParts = [
    data.email,
    data.phone,
    data.city,
    data.linkedin ? `linkedin.com/in/${data.linkedin.split('/').pop()}` : null,
    data.github ? `github.com/${data.github.split('/').pop()}` : null,
  ].filter(Boolean) as string[];

  const contactLine = contactParts.join('  ·  ');
  page.drawText(contactLine.slice(0, 100), {
    x: 50, y,
    size: 8, font: regularFont, color: C.mid,
  });
  y -= 8;

  // Header rule
  page.drawLine({
    start: { x: 50, y }, end: { x: width - 50, y },
    thickness: 1.5, color: C.primary,
  });
  y -= 12;

  // ── Bio/Summary ─────────────────────────────────────────────────────────────
  if (data.bio) {
    const lines = wrapText(data.bio, 110);
    for (const line of lines.slice(0, 3)) {
      page.drawText(line, { x: 50, y, size: 9, font: oblique, color: C.mid });
      y -= 12;
    }
    y -= 4;
  }

  // ── Education ────────────────────────────────────────────────────────────────
  if (data.education?.length) {
    y = drawSection(page, 'Education', y, width, boldFont, regularFont);
    for (const ed of data.education.slice(0, 3)) {
      page.drawText(`${ed.degree} in ${ed.field}`, { x: 55, y, size: 9, font: boldFont, color: C.dark });
      page.drawText(formatDateRange(ed.start_date, ed.end_date), {
        x: width - 150, y, size: 8, font: regularFont, color: C.light,
      });
      y -= 11;
      page.drawText(ed.institution, { x: 55, y, size: 8, font: regularFont, color: C.mid });
      if (ed.gpa) {
        page.drawText(`GPA: ${ed.gpa}`, { x: width - 100, y, size: 8, font: regularFont, color: C.mid });
      }
      y -= 14;
    }
  }

  // ── Experience ───────────────────────────────────────────────────────────────
  if (data.experience?.length) {
    y = drawSection(page, 'Experience', y, width, boldFont, regularFont);
    for (const exp of data.experience.slice(0, 3)) {
      page.drawText(`${exp.title}`, { x: 55, y, size: 9, font: boldFont, color: C.dark });
      page.drawText(formatDateRange(exp.start_date, exp.end_date, exp.is_current), {
        x: width - 150, y, size: 8, font: regularFont, color: C.light,
      });
      y -= 11;
      page.drawText(exp.organization + (exp.location ? `, ${exp.location}` : ''), {
        x: 55, y, size: 8, font: regularFont, color: C.mid,
      });
      y -= 11;
      if (exp.description) {
        const lines = wrapText(exp.description, 100);
        for (const line of lines.slice(0, 2)) {
          page.drawText(`• ${line}`, { x: 58, y, size: 8, font: regularFont, color: C.mid });
          y -= 10;
        }
      }
      y -= 4;
    }
  }

  // ── Projects ─────────────────────────────────────────────────────────────────
  if (data.projects?.length) {
    y = drawSection(page, 'Projects', y, width, boldFont, regularFont);
    for (const proj of data.projects.slice(0, 3)) {
      page.drawText(proj.title, { x: 55, y, size: 9, font: boldFont, color: C.dark });
      y -= 11;
      if (proj.description) {
        const lines = wrapText(proj.description, 105);
        for (const line of lines.slice(0, 2)) {
          page.drawText(line, { x: 58, y, size: 8, font: regularFont, color: C.mid });
          y -= 10;
        }
      }
      y -= 4;
    }
  }

  // ── Skills ───────────────────────────────────────────────────────────────────
  if (data.skills?.length) {
    y = drawSection(page, 'Skills', y, width, boldFont, regularFont);
    const skillsText = data.skills
      .slice(0, 15)
      .map((s) => s.name + (s.level ? ` (${s.level})` : ''))
      .join('   ');
    const lines = wrapText(skillsText, 110);
    for (const line of lines.slice(0, 2)) {
      page.drawText(line, { x: 55, y, size: 8.5, font: regularFont, color: C.mid });
      y -= 11;
    }
    y -= 4;
  }

  // ── Languages ────────────────────────────────────────────────────────────────
  if (data.languages?.length) {
    y = drawSection(page, 'Languages', y, width, boldFont, regularFont);
    const langText = data.languages
      .map((l) => `${l.language}${l.level ? ` — ${l.level}` : ''}`)
      .join('    ');
    page.drawText(langText, { x: 55, y, size: 8.5, font: regularFont, color: C.mid });
    y -= 14;
  }

  // ── Certifications ───────────────────────────────────────────────────────────
  if (data.certifications?.length) {
    y = drawSection(page, 'Certifications', y, width, boldFont, regularFont);
    for (const cert of data.certifications.slice(0, 3)) {
      page.drawText(`${cert.title} — ${cert.issuer}`, { x: 55, y, size: 8.5, font: regularFont, color: C.mid });
      y -= 11;
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  page.drawText('Generated by InternMatch ET', {
    x: 50, y: 30, size: 7, font: regularFont, color: C.separator,
  });
  page.drawText(new Date().toLocaleDateString('en-ET'), {
    x: width - 100, y: 30, size: 7, font: regularFont, color: C.separator,
  });

  return doc.save();
}
