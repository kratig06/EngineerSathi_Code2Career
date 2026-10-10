'use client';

/**
 * RoadmapScreen — full-page roadmap dashboard.
 * Rendered when stage === 'roadmap'.
 */

import { SetupLayout } from '@/components/interview/SetupLayout';
import { RoadmapDashboard } from '@/components/interview/RoadmapDashboard';

export function RoadmapScreen() {
  return (
    <SetupLayout>
      <div className="flex w-full flex-1 flex-col items-center py-6 px-4 sm:px-6">
        <RoadmapDashboard />
      </div>
    </SetupLayout>
  );
}
