/**
 * Clean raw LLM output before JSON.parse.
 * Models often wrap payloads in ```json ... ``` fences.
 */
export function stripMarkdownFences(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();
  text = text.replace(/^```(?:json|javascript|js|ts)?\s*/i, '');
  text = text.replace(/\s*```$/i, '');
  return text.trim();
}

export function parseLLMJson<T>(raw: string): T {
  const cleaned = stripMarkdownFences(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch (firstError) {
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch (secondError) {
        console.error('[parseLLMJson] nested extract failed', secondError);
      }
    }
    console.error('[parseLLMJson] failed', firstError, raw.slice(0, 240));
    throw firstError;
  }
}
