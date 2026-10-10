import { NextResponse } from 'next/server';
import { getRoadmap, getRoadmapTasks, getOrCreateGuestProfile } from '@/lib/db';

interface Params { params: Promise<{ targetId: string }> }

/** GET /api/targets/[targetId]/roadmap */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { targetId } = await params;
    const profile = getOrCreateGuestProfile();
    const roadmap = getRoadmap(profile.id, targetId);
    if (!roadmap) return NextResponse.json({ roadmap: null, tasks: [] });
    const tasks = getRoadmapTasks(roadmap.id);
    return NextResponse.json({ roadmap, tasks });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
