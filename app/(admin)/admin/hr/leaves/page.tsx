'use client';

import { ModuleGuard } from '@/components/shared/layout/module-guard';
import AttendanceLeave from '../_components/attendance-leave';

export default function LeavesPage() {
  return (
    <ModuleGuard module="hr">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Leaves</h1>
        <AttendanceLeave />
      </div>
    </ModuleGuard>
  );
}
