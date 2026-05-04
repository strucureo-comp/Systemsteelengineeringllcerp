'use client';

import { useState, useEffect } from 'react';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { PayslipBrowser } from '../_components/payroll-content';
import type { Payroll } from '@/lib/db/types';

export default function PayslipsPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/hr/payroll');
        if (response.ok) {
          const data = await response.json();
          const payrollData = data.payrolls || [];
          setPayrolls(payrollData);
          if (payrollData.length > 0) {
            setSelectedPayroll(payrollData[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch payroll data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <ModuleGuard module="hr">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center p-8">
            <p>Loading payslips...</p>
          </div>
        </div>
      </ModuleGuard>
    );
  }

  if (!selectedPayroll) {
    return (
      <ModuleGuard module="hr">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Payslips</h1>
          <div className="text-center text-muted-foreground p-8">
            No payroll data available yet.
          </div>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="hr">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Payslips</h1>
        <PayslipBrowser payroll={selectedPayroll} />
      </div>
    </ModuleGuard>
  );
}
