import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';

export function getProvider() {
  const providerType = process.env.AI_PROVIDER || 'groq';

  if (providerType === 'gemini') {
    return {
      model: createGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
      })(process.env.GEMINI_MODEL || 'gemini-1.5-pro'),
    };
  }

  // Default to Groq
  return {
    model: createGroq({
      apiKey: process.env.GROQ_API_KEY,
    })(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'),
  };
}
