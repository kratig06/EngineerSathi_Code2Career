/**
 * Simple server-side helper to call the configured AI provider.
 * Never import this from client code.
 */

import { generateText } from 'ai';
import { getProvider } from './ai-provider';

export interface CallAIOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export async function callAI({ systemPrompt, userPrompt, maxTokens = 1024, temperature = 0.7 }: CallAIOptions): Promise<string> {
  const { model } = getProvider();
  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: maxTokens,
    temperature,
  });
  return text;
}
