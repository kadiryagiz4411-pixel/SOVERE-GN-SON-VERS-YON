export interface DocumentSection {
  title: string;
  paragraphs: string[];
  bullets: string[];
}

const KNOWN_HEADERS = /^(professional summary|summary|profile|experience|work experience|professional experience|education|skills|core skills|technical skills|certifications|achievements|projects|languages|proposal|cover letter|hook|value|approach|next step|cta|outreach)$/i;

function stripInlineMarkdown(line: string): string {
  return String(line || '')
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*>\s?/, '')
    .replace(/\s+$/g, '')
    .trim();
}

export function stripMarkdownMarkers(raw: string): string {
  return String(raw || '')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, '').replace(/```/g, ''))
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/^\s*\*{3,}\s*$/gm, '')
    .split('\n')
    .map(stripInlineMarkdown)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isRule(line: string): boolean {
  return /^\s*[-*_]{3,}\s*$/.test(line);
}

function isBullet(line: string): boolean {
  return /^\s*(?:[-•*]|\d+[.)])\s+/.test(line);
}

function bulletText(line: string): string {
  return stripInlineMarkdown(line.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, ''));
}

function isSectionHeader(line: string): boolean {
  const trimmed = stripInlineMarkdown(line);
  if (!trimmed || trimmed.length < 2 || trimmed.length > 56) return false;
  if (isBullet(line) || isRule(line)) return false;
  if (KNOWN_HEADERS.test(trimmed)) return true;
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (letters.length < 3) return false;
  const upper = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  return upper;
}

function titleCaseHeader(raw: string): string {
  const cleaned = stripInlineMarkdown(raw).replace(/:$/, '');
  if (!cleaned) return '';
  if (KNOWN_HEADERS.test(cleaned)) {
    return cleaned.replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  if (cleaned === cleaned.toUpperCase()) {
    return cleaned.replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  return cleaned;
}

export function parseDocumentSections(raw: string): DocumentSection[] {
  const text = stripMarkdownMarkers(raw);
  if (!text) return [];

  const lines = text.split('\n');
  const sections: DocumentSection[] = [];
  let current: DocumentSection = { title: '', paragraphs: [], bullets: [] };

  const pushCurrent = () => {
    if (current.title || current.paragraphs.length || current.bullets.length) {
      sections.push(current);
    }
    current = { title: '', paragraphs: [], bullets: [] };
  };

  for (const line of lines) {
    if (!line.trim() || isRule(line)) continue;
    if (isSectionHeader(line)) {
      pushCurrent();
      current.title = titleCaseHeader(line);
      continue;
    }
    if (isBullet(line)) {
      const item = bulletText(line);
      if (item) current.bullets.push(item);
      continue;
    }
    const paragraph = stripInlineMarkdown(line);
    if (paragraph) current.paragraphs.push(paragraph);
  }
  pushCurrent();

  return sections.filter((section) => section.paragraphs.length > 0 || section.bullets.length > 0);
}

export function documentPlainText(sections: DocumentSection[]): string {
  return sections
    .map((section) => {
      const parts = [
        section.title,
        ...section.paragraphs,
        ...section.bullets.map((item) => `• ${item}`),
      ].filter(Boolean);
      return parts.join('\n');
    })
    .join('\n\n')
    .trim();
}
