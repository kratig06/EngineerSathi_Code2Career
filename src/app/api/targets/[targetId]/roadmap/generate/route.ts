import { NextResponse } from 'next/server';
import { createOrReplaceRoadmap, getOrCreateGuestProfile } from '@/lib/db';
import { callAI } from '@/lib/ai';

interface Params { params: Promise<{ targetId: string }> }

const SYSTEM_PROMPT = `You are an expert interview coach. Generate a detailed preparation roadmap as a JSON array of tasks.
Each task: { "sequence": number, "title": string, "description": string, "category": "dsa"|"system_design"|"behavioral"|"technical"|"aptitude"|"networking"|"research"|"mock"|"other" }
Return ONLY valid JSON — an array of 8-14 tasks ordered from easiest/earliest to hardest/latest.`;

/** POST /api/targets/[targetId]/roadmap/generate */
export async function POST(req: Request, { params }: Params) {
  try {
    const { targetId } = await params;
    const profile = getOrCreateGuestProfile();
    const { company, role, interviewAt, jobDescription } = await req.json();

    const daysLeft = interviewAt
      ? Math.max(1, Math.round((interviewAt - Date.now()) / 86_400_000))
      : 30;

    const userPrompt = [
      `Target company: ${company}`,
      `Role: ${role}`,
      `Days until interview: ${daysLeft}`,
      jobDescription ? `Job description excerpt: ${jobDescription.slice(0, 800)}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const raw = await callAI({ systemPrompt: SYSTEM_PROMPT, userPrompt, maxTokens: 2048 });

    // Extract JSON array from the AI response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI did not return a valid JSON array.');
    const tasks: { sequence: number; title: string; description: string; category: string }[] = JSON.parse(jsonMatch[0]);

    // Persist and return
    const roadmap = createOrReplaceRoadmap(profile.id, targetId, `${role} @ ${company}`, tasks, true);
    return NextResponse.json({ roadmap });
  } catch (e) {
    console.error('[POST roadmap/generate]', (e as Error).message);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
