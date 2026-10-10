import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getProvider } from '@/lib/ai-provider';
import { aiConfigStatus, classifyAiError, extractJsonObject } from '@/lib/ai-helpers';
import { containsTerm } from '@/lib/resume-parse';
import { analysisSchema, normalizeResumeData, resumeToPlainText, ResumeAnalysis } from '@/lib/resume-types';

export async function POST(req: Request) {
  let body: { resume?: unknown; company?: string; role?: string; jobDescription?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.', code: 'BAD_REQUEST' }, { status: 400 });
  }

  const role = (body.role ?? '').trim();
  const company = (body.company ?? '').trim() || 'Generic (no specific company)';
  const jd = (body.jobDescription ?? '').trim().slice(0, 8000);
  if (!role) return NextResponse.json({ error: 'A target role is required.', code: 'BAD_REQUEST' }, { status: 400 });

  const data = normalizeResumeData(body.resume);
  const resumeText = resumeToPlainText(data);
  if (resumeText.length < 40) {
    return NextResponse.json({ error: 'The resume has too little content to analyse.', code: 'EMPTY_RESUME' }, { status: 400 });
  }

  const ai = aiConfigStatus();
  if (!ai.configured) {
    return NextResponse.json(
      { error: 'AI analysis is unavailable because no AI API key is configured on the server. You can still edit your resume manually.', code: 'AI_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  // Give the model stable IDs so suggestions can be mapped back to real entries only.
  const items = [
    ...data.experience.map((e) => ({ section: 'experience', itemId: e.id, title: `${e.role} at ${e.company}`, description: e.description })),
    ...data.projects.map((p) => ({ section: 'projects', itemId: p.id, title: p.name, description: p.description })),
  ];

  const prompt = `You are a meticulous career coach and ATS expert. Analyse the candidate's resume against the target.

TARGET COMPANY: ${company}
TARGET ROLE: ${role}
JOB DESCRIPTION: ${jd ? `"""${jd}"""` : '(not provided — use typical expectations for this role at this company)'}

RESUME:
"""
${resumeText.slice(0, 10000)}
"""

EDITABLE ITEMS (experience/projects, reference them by itemId):
${JSON.stringify(items).slice(0, 8000)}

ABSOLUTE RULES — FACTUAL INTEGRITY:
- NEVER invent qualifications, employers, degrees, dates, metrics, numbers, tools or skills.
- Rewrites may only rephrase, reorder, clarify or emphasise facts ALREADY in the resume. If a metric is absent, do not add one.
- "relevantSkills" must list only skills explicitly present in the resume.
- Job keywords the resume does not support go in "missingKeywords" (as gaps), NEVER into rewrites.
- "descriptionSuggestions" must use an itemId from EDITABLE ITEMS and return the full rewritten description, one bullet per line.

Return ONLY a JSON object:
{
 "matchScore": 0-100 integer,
 "matchLevel": "Strong" | "Moderate" | "Weak",
 "matchExplanation": "2-4 sentences explaining how the score was determined (skills overlap, experience relevance, gaps)",
 "jobKeywords": ["8-20 key skills/requirements for this role (from the JD if provided)"],
 "relevantSkills": ["..."],
 "relevantExperience": [{"title": "experience or project name", "why": "why it is relevant"}],
 "missingKeywords": [{"keyword": "...", "note": "how/if the candidate could address it honestly"}],
 "summarySuggestion": {"suggested": "rewritten summary using only facts from the resume", "rationale": "..."} or null,
 "descriptionSuggestions": [{"section": "experience" | "projects", "itemId": "...", "suggested": "...", "rationale": "..."}],
 "skillsToDevelop": [{"skill": "...", "reason": "..."}]
}`;

  try {
    const { model } = getProvider();
    const result = await generateText({ model, prompt, temperature: 0.2 });
    const parsed = analysisSchema.parse(extractJsonObject(result.text));

    // --- Server-side integrity checks: never trust the model blindly ---
    const validIds = new Map(items.map((i) => [i.itemId, i]));
    const descriptionSuggestions = parsed.descriptionSuggestions.filter((s) => {
      const item = validIds.get(s.itemId);
      return item && item.section === s.section && s.suggested.trim() && s.suggested.trim() !== item.description.trim();
    });
    const relevantSkills = parsed.relevantSkills.filter((s) => containsTerm(resumeText, s));
    const missingKeywords = parsed.missingKeywords.filter((k) => !containsTerm(resumeText, k.keyword));

    const jobKeywords = Array.from(new Set(parsed.jobKeywords.map((k) => k.trim()).filter(Boolean))).slice(0, 25);
    const found = jobKeywords.filter((k) => containsTerm(resumeText, k));
    const missing = jobKeywords.filter((k) => !containsTerm(resumeText, k));

    const analysis: ResumeAnalysis = {
      ...parsed,
      matchScore: Math.round(parsed.matchScore),
      relevantSkills,
      missingKeywords,
      descriptionSuggestions,
      summarySuggestion: parsed.summarySuggestion?.suggested.trim() ? parsed.summarySuggestion : null,
      jobKeywords,
      keywordCoverage: {
        found,
        missing,
        percent: jobKeywords.length ? Math.round((found.length / jobKeywords.length) * 100) : null,
      },
      provider: ai.provider,
    };
    return NextResponse.json(analysis);
  } catch (e) {
    const info = classifyAiError(e);
    console.error('[resume/analyze] failed:', info.code);
    return NextResponse.json({ error: info.message, code: info.code }, { status: info.status });
  }
}
