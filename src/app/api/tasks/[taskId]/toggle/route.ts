import { NextResponse } from 'next/server';
import { toggleTask, getOrCreateGuestProfile } from '@/lib/db';

interface Params { params: Promise<{ taskId: string }> }

/** PATCH /api/tasks/[taskId]/toggle */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const profile = getOrCreateGuestProfile();
    const { completed } = await req.json();
    if (typeof completed !== 'boolean') {
      return NextResponse.json({ error: '"completed" must be a boolean.' }, { status: 400 });
    }
    const ok = toggleTask(profile.id, taskId, completed);
    if (!ok) return NextResponse.json({ error: 'Task not found or not owned by you.' }, { status: 404 });
    return NextResponse.json({ toggled: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
