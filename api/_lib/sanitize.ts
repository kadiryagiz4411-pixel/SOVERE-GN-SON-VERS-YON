const FORBIDDEN_AI_PATTERNS: Array<[RegExp, string]> = [
  [/in today's fast-paced world[,.]?\s*/gi, ''],
  [/in today's competitive (?:market|landscape)[,.]?\s*/gi, ''],
  [/i am writing to express my (?:enthusiasm|interest)[,.]?\s*/gi, ''],
  [/i hope this (?:email|message) finds you well[,.]?\s*/gi, ''],
  [/please (?:do not|don't) hesitate to (?:reach out|contact me)[,.]?\s*/gi, ''],
  [/as an? (?:ai|artificial intelligence) (?:language )?model[,.]?\s*/gi, ''],
  [/delve into/gi, 'look at'],
  [/\bleverage(?:s|d|ing)?\b/gi, 'use'],
  [/\bseamlessly\b/gi, 'smoothly'],
  [/game[- ]changer/gi, 'real improvement'],
  [/\bsynerg(?:y|ies|istic)\b/gi, 'fit'],
  [/\bspearheaded\b/gi, 'led'],
  [/\borchestrated\b/gi, 'ran'],
  [/\butilized\b/gi, 'used'],
  [/furthermore[,.]?\s*/gi, ''],
  [/moreover[,.]?\s*/gi, ''],
  [/i am excited to (?:apply|submit|share)/gi, 'I want to'],
  [/thrilled to (?:apply|submit|share)/gi, 'I want to'],
  [/cutting[- ]edge/gi, 'current'],
  [/state[- ]of[- ]the[- ]art/gi, 'current'],
];

export function sanitizeAiText(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText;
  for (const [pattern, replacement] of FORBIDDEN_AI_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +\./g, '.')
    .replace(/ +,/g, ',')
    .trim();
}
