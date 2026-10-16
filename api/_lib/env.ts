export function env(key: string): string {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return String(g.process?.env?.[key] ?? '').trim();
}

export function firstEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = env(key);
    if (value) return value;
  }
  return '';
}
