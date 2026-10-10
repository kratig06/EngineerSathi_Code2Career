/** Shared helpers for server-side AI calls (resume features). Never import from client code. */

export function aiConfigStatus(): { configured: boolean; provider: string } {
  const provider = process.env.AI_PROVIDER || 'groq';
  const key = provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.GROQ_API_KEY;
  return { configured: Boolean(key && key.trim() && !/^your|xxx|<|placeholder/i.test(key.trim())), provider };
}

export type AiErrorCode = 'AI_NOT_CONFIGURED' | 'AI_RATE_LIMITED' | 'AI_BAD_RESPONSE' | 'AI_UNAVAILABLE';

export function classifyAiError(error: unknown): { code: AiErrorCode; status: number; message: string } {
  const e = error as { statusCode?: number; status?: number; message?: string; name?: string };
  const status = e?.statusCode ?? e?.status;
  const msg = String(e?.message ?? '');
  if (status === 401 || status === 403 || /api key|unauthori[sz]ed|invalid.*key/i.test(msg)) {
    return { code: 'AI_NOT_CONFIGURED', status: 503, message: 'The AI provider rejected the configured API key.' };
  }
  if (status === 429 || /rate limit|quota|too many requests/i.test(msg)) {
    return { code: 'AI_RATE_LIMITED', status: 429, message: 'The AI provider is rate-limiting requests. Please wait a moment and retry.' };
  }
  if (/json|schema|parse/i.test(msg) || e?.name === 'ZodError') {
    return { code: 'AI_BAD_RESPONSE', status: 502, message: 'The AI returned a response that could not be validated. Please retry.' };
  }
  return { code: 'AI_UNAVAILABLE', status: 502, message: 'The AI service is currently unreachable. Please retry shortly.' };
}

/** Extracts the first JSON object from a model response (tolerates code fences / prose). */
export function extractJsonObject(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in AI response');
  return JSON.parse(cleaned.slice(start, end + 1));
}
