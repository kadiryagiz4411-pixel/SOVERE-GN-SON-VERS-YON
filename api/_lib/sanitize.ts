const FORBIDDEN_AI_PATTERNS: Array<[RegExp, string]> = [
  [/in today's fast-paced world[,.]?\s*/gi, ''],
  [/in today's competitive (?:market|landscape)[,.]?\s*/gi, ''],
  [/i am writing to express my (?:enthusiasm|interest)[^.!\n]*[.!]?\s*/gi, ''],
  [/pleased to submit[^.!\n]*[.!]?\s*/gi, ''],
  [/i hope this (?:email|message)?\s*finds you well[,.]?\s*/gi, ''],
  [/please (?:do not|don't) hesitate to (?:reach out|contact me)[,.]?\s*/gi, ''],
  [/as an? (?:ai|artificial intelligence)[^.!\n]*[.!]?\s*/gi, ''],
  [/powered by (?:ai|artificial intelligence)/gi, ''],
  [/\bartificial intelligence\b/gi, ''],
  [/\bai-powered\b/gi, ''],
  [/\bai-generated\b/gi, ''],
  [/here is (?:a |your )?tailored (?:proposal|cv|resume)[^.!\n]*[.!]?\s*/gi, ''],
  [/based on the (?:job description|provided (?:text|information))[^.!\n]*[.!]?\s*/gi, ''],
  [/note:\s*specific roles were not provided[^.!\n]*[.!]?\s*/gi, ''],
  [/it is important to note that\s*/gi, ''],
  [/i await your (?:esteemed )?reply[^.!\n]*[.!]?\s*/gi, ''],
  [/looking forward to hearing from you[^.!\n]*[.!]?\s*/gi, "I'll be around if you want to talk this week."],
  [/dear hiring manager[,.]?\s*/gi, ''],
  [/passionate professional/gi, 'operator'],
  [/\bpassionate about\b/gi, 'focused on'],
  [/delve into/gi, 'look at'],
  [/\bdelve[sd]?\b/gi, 'look'],
  [/\bleverag(?:e|es|ed|ing)\b/gi, 'use'],
  [/\bharness(?:es|ed|ing)?\b/gi, 'use'],
  [/\bautomated (?:solution|solutions|process|processes|workflow|workflows|system|systems)\b/gi, 'handled work'],
  [/\brobust (?:solution|solutions|platform|approach|framework)\b/gi, 'solid'],
  [/\bbeacon of\b/gi, 'sign of'],
  [/\bnavigat(?:e|ing) (?:the |today['’]s |this )/gi, 'working through ']
  [/\bseamlessly\b/gi, 'smoothly'],
  [/game[- ]changer/gi, 'real improvement'],
  [/\bsynerg(?:y|ies|istic)\b/gi, 'fit'],
  [/\bspearhead(?:ed|ing|s)?\b/gi, 'led'],
  [/\borchestrated\b/gi, 'ran'],
  [/\butiliz(?:e|es|ed|ing)\b/gi, 'used'],
  [/\bpivotal\b/gi, 'important'],
  [/\bdetail[- ]oriented\b/gi, 'careful'],
  [/hit the ground running/gi, 'start fast'],
  [/\bdynamic (?:professional|individual|team player|environment)\b/gi, 'operator'],
  [/testament to/gi, 'proof of'],
  [/\btestament\b/gi, 'proof'],
  [/furthermore[,.]?\s*/gi, ''],
  [/moreover[,.]?\s*/gi, ''],
  [/in conclusion[,.]?\s*/gi, ''],
  [/to summarize[,.]?\s*/gi, ''],
  [/additionally[,.]?\s*/gi, 'Also, '],
  [/i would like to take this opportunity to\s*/gi, ''],
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
  [/results[- ]driven/gi, 'focused'],
  [/i am excited to (?:apply|submit|share)/gi, 'I want to'],
  [/thrilled to (?:apply|submit|share)/gi, 'I want to'],
  [/i believe i would be a great fit[^.!\n]*[.!]?\s*/gi, ''],
  [/as a seasoned [^.!,\n]+[,.]?\s*/gi, ''],
];

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

export function sanitizeDeep(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeAiText(value);
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeDeep(item);
    }
    return out;
  }
  return value;
}
