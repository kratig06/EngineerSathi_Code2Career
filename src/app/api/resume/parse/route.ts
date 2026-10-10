import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getProvider } from '@/lib/ai-provider';
import { aiConfigStatus, classifyAiError, extractJsonObject } from '@/lib/ai-helpers';
import { MAX_UPLOAD_BYTES, detectUploadKind, heuristicExtract } from '@/lib/resume-parse';
import { normalizeResumeData, resumeToPlainText, ResumeData } from '@/lib/resume-types';

async function extractText(kind: 'pdf' | 'docx', buffer: Buffer): Promise<string> {
  if (kind === 'pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text ?? '';
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? '';
}

/** Asks the AI to place the *verbatim* extracted text into structured fields. */
async function aiStructure(rawText: string): Promise<ResumeData> {
  const { model } = getProvider();
  const result = await generateText({
    model,
    temperature: 0,
    prompt: `You convert raw resume text into structured JSON. Copy information EXACTLY as written.
STRICT RULES:
- Do NOT invent, infer, embellish or add any degree, job, skill, date, metric, certification or link that is not literally present in the text.
- If a field is not present, use an empty string or an empty array.
- Keep bullet points as separate lines inside "description"/"details" separated by "\\n".

Return ONLY a JSON object with this exact shape:
{"personalInfo":{"fullName":"","headline":"","email":"","phone":"","location":""},
"summary":"",
"education":[{"institution":"","degree":"","field":"","startDate":"","endDate":"","score":"","details":""}],
"skills":{"technical":"comma separated","soft":"comma separated"},
"projects":[{"name":"","techStack":"","link":"","description":""}],
"experience":[{"company":"","role":"","location":"","startDate":"","endDate":"","description":""}],
"certifications":[{"name":"","issuer":"","date":"","link":""}],
"achievements":[{"title":"","description":""}],
"links":[{"label":"","url":""}]}

RESUME TEXT:
"""
${rawText.slice(0, 12000)}
"""`,
  });
  return normalizeResumeData(extractJsonObject(result.text));
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload request.', code: 'BAD_REQUEST' }, { status: 400 });
  }
  const file = form.get('file');
  const useAi = form.get('structure') !== 'false';
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file was uploaded.', code: 'NO_FILE' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'The uploaded file is empty.', code: 'EMPTY_FILE' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File is larger than 5 MB.', code: 'FILE_TOO_LARGE' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectUploadKind(file.name, file.type, buffer.subarray(0, 8));
  if (!kind) {
    return NextResponse.json(
      { error: 'Unsupported file. Please upload a PDF or DOCX resume (legacy .doc is not supported).', code: 'UNSUPPORTED_TYPE' },
      { status: 415 },
    );
  }

  let rawText = '';
  try {
    rawText = (await extractText(kind, buffer)).replace(/\u0000/g, '').trim();
  } catch (e) {
    // Do not log file contents — only the failure type.
    console.error('[resume/parse] extraction failed:', kind, (e as Error)?.name);
    return NextResponse.json(
      { error: `We couldn't read this ${kind.toUpperCase()}. It may be corrupted or password-protected.`, code: 'PARSE_FAILED' },
      { status: 422 },
    );
  }

  if (rawText.length < 30) {
    return NextResponse.json(
      { error: 'No readable text was found. Scanned/image-only PDFs are not supported — please upload a text-based file.', code: 'NO_TEXT' },
      { status: 422 },
    );
  }

  const heuristic = heuristicExtract(rawText);
  let data = heuristic.data;
  let method: 'ai' | 'heuristic' = 'heuristic';
  let structureWarning: string | null = null;

  const ai = aiConfigStatus();
  if (useAi && ai.configured) {
    try {
      const structured = await aiStructure(rawText);
      // Keep AI structure only if it actually captured content.
      if (resumeToPlainText(structured).length > 40) {
        data = structured;
        method = 'ai';
      } else {
        structureWarning = 'AI structuring returned little content; showing basic section detection instead.';
      }
    } catch (e) {
      const info = classifyAiError(e);
      structureWarning = `${info.message} Showing basic section detection — please review each field.`;
    }
  } else if (useAi) {
    structureWarning = 'AI is not configured on the server, so sections were detected with basic rules. Please review each field.';
  }

  return NextResponse.json({
    fileName: file.name,
    kind,
    rawText: rawText.slice(0, 20000),
    data,
    method,
    detectedSections: heuristic.detectedSections,
    structureWarning,
  });
}
