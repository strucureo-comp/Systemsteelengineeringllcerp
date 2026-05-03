'use client';

import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { HREvents } from '../_components/hr-events';

export default function WorkflowsPage() {
  return (
    <ModuleGuard module="hr">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Workflows</h1>
        <HREvents employees={[]} events={[]} onRefresh={() => {}} />
      </div>
    </ModuleGuard>
  );
}
