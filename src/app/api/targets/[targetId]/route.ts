import { NextResponse } from 'next/server';
import { getTarget, updateTarget, deleteTarget, getOrCreateGuestProfile } from '@/lib/db';

interface Params { params: Promise<{ targetId: string }> }

/** GET /api/targets/[targetId] */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { targetId } = await params;
    const profile = getOrCreateGuestProfile();
    const target = getTarget(profile.id, targetId);
    if (!target) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json(target);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** PATCH /api/targets/[targetId] */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { targetId } = await params;
    const profile = getOrCreateGuestProfile();
    const body = await req.json();
    const updated = updateTarget(profile.id, targetId, body);
    if (!updated) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** DELETE /api/targets/[targetId] */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { targetId } = await params;
    const profile = getOrCreateGuestProfile();
    const ok = deleteTarget(profile.id, targetId);
    if (!ok) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
