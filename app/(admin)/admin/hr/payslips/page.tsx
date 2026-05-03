'use client';

import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { PayslipBrowser } from '../_components/payroll-content';

export default function PayslipsPage() {
  return (
    <ModuleGuard module="hr">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Payslips</h1>
        <PayslipBrowser />
      </div>
    </ModuleGuard>
  );
}
