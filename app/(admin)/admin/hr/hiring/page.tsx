'use client';

import { ModuleGuard } from '@/components/shared/layout/module-guard';
import RecruitmentModule from '../_components/recruitment-module';

export default function HiringPage() {
  return (
    <ModuleGuard module="hr">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Job Openings</h1>
        <RecruitmentModule />
      </div>
    </ModuleGuard>
  );
}
