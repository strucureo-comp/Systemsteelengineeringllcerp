'use client';

import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { PayrollContent } from '../_components/payroll-content';

export default function PayrollPage() {
  return (
    <ModuleGuard module="hr">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Payroll Run</h1>
        <PayrollContent />
      </div>
    </ModuleGuard>
  );
}
