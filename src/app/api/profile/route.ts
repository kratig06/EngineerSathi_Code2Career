import { NextResponse } from 'next/server';
import { getOrCreateGuestProfile, updateProfile } from '@/lib/db';

/** GET /api/profile */
export async function GET() {
  try {
    const profile = getOrCreateGuestProfile();
    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** PATCH /api/profile */
export async function PATCH(req: Request) {
  try {
    const profile = getOrCreateGuestProfile();
    const body = await req.json();
    const updated = updateProfile(profile.id, { displayName: body.displayName, email: body.email, avatarUrl: body.avatarUrl });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
