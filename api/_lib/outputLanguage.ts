const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  tr: 'Turkish',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  pt: 'Portuguese',
  nl: 'Dutch',
  it: 'Italian',
  ru: 'Russian',
  ar: 'Arabic',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  pl: 'Polish',
};

function scoreLanguage(text: string, marks: RegExp, words: RegExp, minMarks = 0): number {
  const markHits = Number((text.match(marks) || []).length);
  if (minMarks > 0 && markHits < minMarks) return 0;
  return markHits * 3 + Number((text.match(words) || []).length);
}

/** Language of the job, resume, or brief. Never reads the browser locale. */
export function detectTextLanguage(sample: unknown): string {
  const text = String(sample || '').replace(/\s+/g, ' ').slice(0, 4000);
  if (text.length < 40) return '';
  const ranked: [string, number][] = ([
    ['en', scoreLanguage(text, /$^/g, /\b(the|and|with|for|you|your|this|that|from|have|will)\b/gi)],
    ['tr', scoreLanguage(text, /[ğüşıöçĞÜŞİÖÇ]/g, /\b(ve|bir|için|ile|olan|değil|bu|çok|daha|veya)\b/gi, 3)],
    ['de', scoreLanguage(text, /[äöüßÄÖÜ]/g, /\b(und|der|die|das|mit|für|nicht|eine|ist)\b/gi, 2)],
    ['fr', scoreLanguage(text, /[éèêëàùçœÉÈÊËÀÙÇ]/g, /\b(les|des|une|pour|dans|avec|vous|est|pas)\b/gi, 2)],
    ['es', scoreLanguage(text, /[ñ¿¡áéíóúÁÉÍÓÚ]/g, /\b(los|las|para|con|una|que|del|por|como)\b/gi, 2)],
    ['pt', scoreLanguage(text, /[ãõçÃÕÇ]/g, /\b(não|para|com|uma|você|está|dos|das)\b/gi, 2)],
    ['nl', scoreLanguage(text, /[ëï]/g, /\b(het|een|van|voor|niet|met|zijn|ook)\b/gi)],
    ['it', scoreLanguage(text, /[àèéìòù]/g, /\b(che|non|per|una|con|sono|della|questo)\b/gi)],
    ['pl', scoreLanguage(text, /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, /\b(nie|się|jest|dla|oraz|przez|jako)\b/gi, 2)],
    ['ru', scoreLanguage(text, /[А-Яа-яЁё]/g, /$^/g, 8)],
    ['ar', scoreLanguage(text, /[\u0600-\u06FF]/g, /$^/g, 8)],
    ['zh', scoreLanguage(text, /[\u4e00-\u9fff]/g, /$^/g, 4)],
    ['ja', scoreLanguage(text, /[\u3040-\u30ff]/g, /$^/g, 4)],
    ['ko', scoreLanguage(text, /[\uac00-\ud7af]/g, /$^/g, 4)],
  ] as [string, number][]).sort((a, b) => Number(b[1]) - Number(a[1]));
  if (Number(ranked[0][1]) < 3) return 'en';
  if (ranked[0][0] !== 'en' && Number(ranked[0][1]) < Number(ranked[1][1]) + 3) return 'en';
  return ranked[0][0];
}

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] || 'English';
}

/**
 * An explicit language code wins. Otherwise the analyzed document wins.
 * Missing, "auto", or ambiguous detection always falls back to English.
 * Never follows the browser locale or page-chrome language.
 */
export function resolveOutputLanguage(requested: unknown, ...samples: unknown[]): { code: string; name: string } {
  const raw = String(requested || '').trim().toLowerCase().split('-')[0];
  if (raw && raw !== 'auto' && LANGUAGE_NAMES[raw]) {
    return { code: raw, name: LANGUAGE_NAMES[raw] };
  }
  for (const sample of samples) {
    const detected = detectTextLanguage(sample);
    if (detected && LANGUAGE_NAMES[detected]) {
      return { code: detected, name: LANGUAGE_NAMES[detected] };
    }
  }
  return { code: 'en', name: 'English' };
}

export function languageLock(name: string, code: string): string {
  return [
    `LANGUAGE LOCK: Write the ENTIRE response in ${name} (${code}).`,
    'Use the language of the job, resume, or brief being analyzed.',
    'Scores labels, summaries, strengths, gaps, recommendations, proposals, hooks, and candidate notes stay in that language.',
    code === 'en'
      ? 'Do not mix in another language.'
      : 'Do not fall back to English and do not mix languages.',
  ].join(' ');
}
