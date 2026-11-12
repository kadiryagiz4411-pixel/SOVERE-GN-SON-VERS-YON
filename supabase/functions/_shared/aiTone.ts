export const HUMAN_SAMPLING = { temperature: 0.78, top_p: 0.92 } as const;
export const HUMAN_JSON_SAMPLING = { temperature: 0.55, top_p: 0.9 } as const;

export const BANNED_VOICE_LIST = `AI, artificial intelligence, automated, leveraging, synergy, cutting-edge, robust, delve, testament, beacon, game-changer, navigating, in today's fast-paced world, passionate professional, dynamic, harness, pleased to submit, I am writing to express my interest, Furthermore, Moreover, In conclusion, As an AI, It is important to note, I await your esteemed reply, utilize, spearhead, results-driven, detail-oriented`;

export const HUMAN_VOICE_CONTRACT = `HUMAN VOICE — non-negotiable.
You are a sharp senior operator writing as yourself. Not a tool. Not a brand. Not a cover-letter mill.

TONE: Direct, confident, unpretentious. Like a Slack note to a decision-maker who has 20 seconds.
FLOW: Mix short punches with one longer sentence. Uneven paragraph lengths. Contractions are fine.
PERSPECTIVE: First person. "I built", "I shipped", "Here is how we fix this." Never passive corporate distance.

BANNED (zero tolerance): ${BANNED_VOICE_LIST}.
Also ban: "I believe I would be a great fit", "looking forward to hearing", "Dear Hiring Manager", "I hope this finds you", "as a seasoned", "thrilled to apply".

Never mention AI, models, prompts, or that text was generated.
Never invent employers, tools, metrics, or dates.
No markdown dividers, hash headings, or code fences unless the user asked for a CV section layout.`;

export const HUMAN_WRITING_RULES = HUMAN_VOICE_CONTRACT;

export const PROPOSAL_CLOSER_RULES = `PROPOSAL — no-BS framework. You are the freelancer writing this, not an assistant.

1. HOOK: First sentence names their bottleneck from the brief. No greeting. No "I am writing".
2. PROOF: One raw example of a similar mess you already cleaned up. Architecture or a number. No adjectives.
3. PLAN: 3–5 bullets that read like a tactical checklist you would actually run this week.
4. CLOSE: Low-friction and human. Example: "Let's hop on a 10-minute call this week and map the first pass."

Keep it short enough to send now.
${HUMAN_VOICE_CONTRACT}`;

export const CV_WRITER_RULES = `CV — write as the candidate. Summary is first person.

SUMMARY: Exactly two sentences. Who they are, what they break, what they ship.
EXPERIENCE BULLETS: Action-first. Broken → done → changed. Ownership. No fluffy adjectives.
${HUMAN_VOICE_CONTRACT}`;

export const CV_SECTION_FORMAT = `Use CAPS section titles on their own line, then body text. No divider lines.
PROFESSIONAL SUMMARY
EXPERIENCE
EDUCATION
SKILLS`;

const FORBIDDEN_AI_PATTERNS: Array<[RegExp, string]> = [
  [/in today's fast-paced world[,.]?\s*/gi, ''],
  [/i am writing to express my (?:enthusiasm|interest)[^.!\n]*[.!]?\s*/gi, ''],
  [/pleased to submit[^.!\n]*[.!]?\s*/gi, ''],
  [/i hope this (?:email|message)?\s*finds you well[,.]?\s*/gi, ''],
  [/as an? (?:ai|artificial intelligence)[^.!\n]*[.!]?\s*/gi, ''],
  [/powered by (?:ai|artificial intelligence)/gi, ''],
  [/\bartificial intelligence\b/gi, ''],
  [/\bai-powered\b/gi, ''],
  [/\bai-generated\b/gi, ''],
  [/here is (?:a |your )?tailored (?:proposal|cv|resume)[^.!\n]*[.!]?\s*/gi, ''],
  [/based on the (?:job description|provided (?:text|information))[^.!\n]*[.!]?\s*/gi, ''],
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
  [/game[- ]changer/gi, 'real improvement'],
  [/\bsynerg(?:y|ies|istic)\b/gi, 'fit'],
  [/\bspearhead(?:ed|ing|s)?\b/gi, 'led'],
  [/\butiliz(?:e|es|ed|ing)\b/gi, 'used'],
  [/furthermore[,.]?\s*/gi, ''],
  [/moreover[,.]?\s*/gi, ''],
  [/in conclusion[,.]?\s*/gi, ''],
  [/cutting[- ]edge/gi, 'current'],
  [/\bdynamic (?:professional|individual|team player|environment)\b/gi, 'operator'],
  [/testament to/gi, 'proof of'],
  [/\btestament\b/gi, 'proof'],
  [/results[- ]driven/gi, 'focused'],
  [/i am excited to (?:apply|submit|share)/gi, 'I want to'],
  [/thrilled to (?:apply|submit|share)/gi, 'I want to'],
  [/i believe i would be a great fit[^.!\n]*[.!]?\s*/gi, ''],
  [/as a seasoned [^.!,\n]+[,.]?\s*/gi, ''],
];

export function stripAiTone(text: string): string {
  if (!text) return '';
  let cleaned = text;
  for (const [pattern, replacement] of FORBIDDEN_AI_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +\./g, '.')
    .replace(/ +,/g, ',')
    .replace(/([.!?]){2,}/g, '$1')
    .trim();
}
