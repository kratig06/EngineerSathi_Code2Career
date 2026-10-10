import { NextResponse } from 'next/server';
import { listTargets, createTarget, getOrCreateGuestProfile } from '@/lib/db';

/** GET /api/targets — list all interview targets for the current user */
export async function GET() {
  try {
    const profile = getOrCreateGuestProfile();
    const targets = listTargets(profile.id);
    return NextResponse.json(targets);
  } catch (e) {
    console.error('[GET /api/targets]', (e as Error).message);
    return NextResponse.json({ error: 'Failed to load targets.' }, { status: 500 });
  }
}

/** POST /api/targets — create a new interview target */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { company, role, interviewAt, timezone, jobDescription, notes } = body;
    if (!company?.trim()) return NextResponse.json({ error: 'Company is required.' }, { status: 400 });
    if (!role?.trim()) return NextResponse.json({ error: 'Role is required.' }, { status: 400 });
    if (interviewAt !== undefined && interviewAt !== null && typeof interviewAt !== 'number') {
      return NextResponse.json({ error: 'interviewAt must be a Unix timestamp (ms) or null.' }, { status: 400 });
    }
    const profile = getOrCreateGuestProfile();
    const target = createTarget({ userId: profile.id, company, role, interviewAt: interviewAt ?? null, timezone: timezone ?? 'UTC', jobDescription: jobDescription ?? '', notes: notes ?? '' });
    return NextResponse.json(target, { status: 201 });
  } catch (e) {
    console.error('[POST /api/targets]', (e as Error).message);
    return NextResponse.json({ error: 'Failed to create target.' }, { status: 500 });
  }
}
