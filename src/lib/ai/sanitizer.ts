/**
 * sanitizer.ts — Anti-AI natural-tone pipeline.
 *
 * Strips robotic phrasing from every generated proposal, rationale, and
 * outreach email so output reads like a concise human wrote it.
 */

const FORBIDDEN_AI_PATTERNS: Array<[RegExp, string]> = [
  [/in today's fast-paced world[,.]?\s*/gi, ''],
  [/in today's competitive (?:market|landscape)[,.]?\s*/gi, ''],
  [/i am writing to express my (?:enthusiasm|interest)[,.]?\s*/gi, ''],
  [/i hope this (?:email|message) finds you well[,.]?\s*/gi, ''],
  [/please (?:do not|don't) hesitate to (?:reach out|contact me)[,.]?\s*/gi, ''],
  [/as an? (?:ai|artificial intelligence) (?:language )?model[,.]?\s*/gi, ''],
  [/here is (?:a |your )?tailored (?:proposal|cv|resume)[^.!\n]*[.!]?\s*/gi, ''],
  [/based on the (?:job description|provided (?:text|information))[^.!\n]*[.!]?\s*/gi, ''],
  [/note:\s*specific roles were not provided[^.!\n]*[.!]?\s*/gi, ''],
  [/\bpivotal\b/gi, 'important'],
  [/\bdetail[- ]oriented\b/gi, 'careful'],
  [/hit the ground running/gi, 'start fast'],
  [/\bdynamic\b/gi, 'active'],
  [/\bspearhead(?:ed|ing|s)?\b/gi, 'led'],
  [/delve into/gi, 'look at'],
  [/delves into/gi, 'looks at'],
  [/\bleverage(?:s|d)?\b/gi, 'use'],
  [/\bleveraging\b/gi, 'using'],
  [/testament to/gi, 'proof of'],
  [/\bsynerg(?:y|ies|istic)\b/gi, 'fit'],
  [/\bseamlessly\b/gi, 'smoothly'],
  [/game[- ]changer/gi, 'real improvement'],
  [/\bspearheaded\b/gi, 'led'],
  [/\borchestrated\b/gi, 'ran'],
  [/\butilized\b/gi, 'used'],
  [/\bfacilitated\b/gi, 'helped'],
  [/it is worth noting that\s*/gi, ''],
  [/in conclusion[,.]?\s*/gi, ''],
  [/to summarize[,.]?\s*/gi, ''],
  [/furthermore[,.]?\s*/gi, ''],
  [/moreover[,.]?\s*/gi, ''],
  [/additionally[,.]?\s*/gi, 'Also, '],
  [/i would like to take this opportunity to\s*/gi, ''],
  [/passionate about (?:driving|delivering)\s*/gi, 'focused on '],
  [/robust (?:solution|platform|approach)/gi, 'solid solution'],
  [/cutting[- ]edge/gi, 'current'],
  [/state[- ]of[- ]the[- ]art/gi, 'current'],
  [/holistic approach/gi, 'full picture'],
  [/unlock(?:ing)? (?:the )?potential/gi, 'get more from'],
  [/at the end of the day[,.]?\s*/gi, ''],
  [/moving forward[,.]?\s*/gi, ''],
  [/circle back/gi, 'follow up'],
  [/touch base/gi, 'check in'],
  [/deep dive/gi, 'close look'],
  [/low[- ]hanging fruit/gi, 'easy wins'],
  [/best[- ]in[- ]class/gi, 'strong'],
  [/world[- ]class/gi, 'strong'],
  [/i am excited to (?:apply|submit|share)/gi, 'I want to'],
  [/thrilled to (?:apply|submit|share)/gi, 'I want to'],
];

/** Collapse leftover punctuation / empty clauses after replacements. */
function tidyWhitespace(text: string): string {
  return text
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +\./g, '.')
    .replace(/ +,/g, ',')
    .replace(/([.!?]){2,}/g, '$1')
    .replace(/^\s*[,;:.]\s*/gm, '')
    .trim();
}

export function sanitizeAiText(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText;
  for (const [pattern, replacement] of FORBIDDEN_AI_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return tidyWhitespace(cleaned);
}

export function sanitizeList(items: string[] | undefined | null): string[] {
  if (!items) return [];
  return items.map(sanitizeAiText).filter(Boolean);
}
