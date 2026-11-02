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

function scoreLanguage(text: string, marks: RegExp, words: RegExp): number {
  return Number((text.match(marks) || []).length) * 3 + Number((text.match(words) || []).length);
}

/** Language of the job, resume, or brief. Never reads the browser locale. */
export function detectTextLanguage(sample: unknown): string {
  const text = String(sample || '').replace(/\s+/g, ' ').slice(0, 4000);
  if (text.length < 40) return '';
  const ranked: [string, number][] = ([
    ['tr', scoreLanguage(text, /[ğüşıöçĞÜŞİÖÇ]/g, /\b(ve|bir|için|ile|olan|değil|bu|çok|daha|veya)\b/gi)],
    ['de', scoreLanguage(text, /[äöüßÄÖÜ]/g, /\b(und|der|die|das|mit|für|nicht|eine|ist)\b/gi)],
    ['fr', scoreLanguage(text, /[éèêëàùçœÉÈÊËÀÙÇ]/g, /\b(les|des|une|pour|dans|avec|vous|est|pas)\b/gi)],
    ['es', scoreLanguage(text, /[ñ¿¡áéíóúÁÉÍÓÚ]/g, /\b(los|las|para|con|una|que|del|por|como)\b/gi)],
    ['pt', scoreLanguage(text, /[ãõçÃÕÇ]/g, /\b(não|para|com|uma|você|está|dos|das)\b/gi)],
    ['nl', scoreLanguage(text, /[ëï]/g, /\b(het|een|van|voor|niet|met|zijn|ook)\b/gi)],
    ['it', scoreLanguage(text, /[àèéìòù]/g, /\b(che|non|per|una|con|sono|della|questo)\b/gi)],
    ['pl', scoreLanguage(text, /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, /\b(nie|się|jest|dla|oraz|przez|jako)\b/gi)],
    ['ru', scoreLanguage(text, /[А-Яа-яЁё]/g, /$^/g)],
    ['ar', scoreLanguage(text, /[\u0600-\u06FF]/g, /$^/g)],
    ['zh', scoreLanguage(text, /[\u4e00-\u9fff]/g, /$^/g)],
    ['ja', scoreLanguage(text, /[\u3040-\u30ff]/g, /$^/g)],
    ['ko', scoreLanguage(text, /[\uac00-\ud7af]/g, /$^/g)],
    ['en', scoreLanguage(text, /$^/g, /\b(the|and|with|for|you|your|this|that|from|have|will)\b/gi)],
  ] as [string, number][]).sort((a, b) => Number(b[1]) - Number(a[1]));
  if (Number(ranked[0][1]) < 3) return '';
  if (Number(ranked[0][1]) < Number(ranked[1][1]) + 2) return '';
  return ranked[0][0];
}

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] || 'English';
}

/**
 * An explicit language code wins. Otherwise the analyzed document wins.
 * A missing or "auto" choice never invents English before the text is read.
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
  if (raw && raw !== 'auto' && /^[a-z]{2}$/.test(raw)) {
    return { code: raw, name: raw.toUpperCase() };
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
