import { extractRequiredSkills, normalizeSkillList } from '@/lib/matchScore';

export type ArmorResult = {
  original: string;
  armored: string;
  keywordsEmbedded: string[];
  missingBefore: string[];
};

function cleanResume(raw: string): string {
  return String(raw || '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstName(resume: string): string {
  const line = resume.split('\n').map((item) => item.trim()).find((item) => item.length > 1 && item.length < 72);
  return line || 'Candidate';
}

export function armorResume(resumeText: string, jobText: string): ArmorResult {
  const original = cleanResume(resumeText);
  const job = String(jobText || '');
  const required = extractRequiredSkills(job);
  const existing = normalizeSkillList(original.split(/[\n,|/•]+/).slice(0, 80));
  const missingBefore = required.filter((skill) =>
    !original.toLowerCase().includes(skill.toLowerCase()),
  ).slice(0, 10);
  const keywordsEmbedded = [...new Set([...existing.slice(0, 8), ...required])].slice(0, 16);
  const name = firstName(original);
  const summaryBits = [
    `${name} ships the brief in week one.`,
    missingBefore.length
      ? `Ready on ${missingBefore.slice(0, 4).join(', ')} with proof, not filler.`
      : 'Keyword density already covers the listing.',
    'Clear first deliverable, measurable outcome, no waiting on a long ramp.',
  ];
  const kept = original
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== name)
    .slice(0, 80);
  const armored = [
    `# ${name}`,
    '',
    '## Professional Summary',
    summaryBits.join(' '),
    '',
    '## Core Skills',
    keywordsEmbedded.map((skill) => `- ${skill}`).join('\n'),
    '',
    '## Experience',
    kept.map((line) => (line.startsWith('-') || line.startsWith('•') ? line : `- ${line}`)).join('\n'),
    '',
    missingBefore.length
      ? `## Listing Alignment\n${missingBefore.map((skill) => `- Embedded ${skill} into scope, tools, and first-week plan.`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n');

  return {
    original: original || 'No resume text yet.',
    armored,
    keywordsEmbedded,
    missingBefore,
  };
}

export async function extractResumeFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = String(file.type || '');
  if (type.includes('text') || name.endsWith('.txt') || name.endsWith('.html') || name.endsWith('.htm')) {
    return cleanResume(await file.text());
  }
  if (name.endsWith('.docx') || type.includes('wordprocessingml')) {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    const xml = await zip.file('word/document.xml')?.async('string');
    return cleanResume(
      String(xml || '')
        .replace(/<w:p[^>]*>/g, '\n')
        .replace(/<[^>]+>/g, ' '),
    );
  }
  const raw = await file.text();
  return cleanResume(
    raw
      .replace(/[^\x20-\x7E\u00A0-\u024F\u0400-\u04FF\n\r\t ğüşıöçĞÜŞİÖÇ]/g, ' ')
      .replace(/\s{3,}/g, '\n'),
  );
}
