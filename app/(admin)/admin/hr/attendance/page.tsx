'use client';

import { ModuleGuard } from '@/components/shared/layout/module-guard';
import AttendanceTracking from '../_components/attendance-tracking';

export default function AttendancePage() {
  return (
    <ModuleGuard module="hr">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Attendance</h1>
        <AttendanceTracking />
      </div>
    </ModuleGuard>
  );
}
'use client';

import { ModuleGuard } from '@/components/shared/layout/module-guard';
import AttendanceTracking from '../_components/attendance-tracking';

export default function AttendancePage() {
  return (
    <ModuleGuard module="hr">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Attendance</h1>
        <AttendanceTracking />
      </div>
    </ModuleGuard>
  );
}
