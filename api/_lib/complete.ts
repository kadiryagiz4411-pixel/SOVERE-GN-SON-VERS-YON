export async function completeChat(apiKey: string, opts: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model || 'gpt-4o-mini',
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 900,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let errorData: unknown = raw.slice(0, 800);
    try {
      errorData = raw ? JSON.parse(raw) : {};
    } catch {
      errorData = { raw: raw.slice(0, 800) };
    }
    console.error('OpenAI API response error:', res.status, errorData);
    const err = new Error(`OpenAI API error: ${res.status} ${res.statusText}`) as Error & {
      response?: { data?: unknown };
    };
    err.response = { data: errorData };
    throw err;
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return String(data.choices?.[0]?.message?.content || '').trim();
}

export function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
