/**
 * Runtime env reader. Uses bracket access so bundlers cannot replace
 * process.env.OPENAI_API_KEY with `undefined` at build time.
 */

function processEnvBag(): Record<string, string | undefined> {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    if (proc && proc.env && typeof proc.env === 'object') return proc.env;
  } catch {
    /* ignore */
  }
  return {};
}

export function env(key: string): string {
  const name = String(key || '');
  if (!name) return '';
  try {
    const value = processEnvBag()[name];
    if (value != null && String(value).trim()) return String(value).trim();
  } catch {
    /* ignore */
  }
  try {
    const deno = (globalThis as { Deno?: { env?: { get?: (n: string) => string | undefined } } }).Deno;
    const fromDeno = deno?.env?.get?.(name);
    if (fromDeno && String(fromDeno).trim()) return String(fromDeno).trim();
  } catch {
    /* ignore */
  }
  return '';
}

export function firstEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = env(key);
    if (value) return value;
  }
  return '';
}
