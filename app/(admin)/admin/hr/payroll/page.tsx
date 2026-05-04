'use client';

import { useState, useEffect } from 'react';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { PayrollContent } from '../_components/payroll-content';
import type { Employee, SalaryStructure, Payroll } from '@/lib/db/types';

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/hr/payroll');
        if (response.ok) {
          const data = await response.json();
          setEmployees(data.employees || []);
          setSalaryStructures(data.salaryStructures || []);
          setPayrolls(data.payrolls || []);
        }
      } catch (error) {
        console.error('Failed to fetch payroll data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    location.reload();
  };

  if (loading) {
    return (
      <ModuleGuard module="hr">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center p-8">
            <p>Loading payroll data...</p>
          </div>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="hr">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Payroll Run</h1>
        <PayrollContent 
          employees={employees}
          salaryStructures={salaryStructures}
          payrolls={payrolls}
          onRefresh={handleRefresh}
          isLoading={loading}
        />
      </div>
    </ModuleGuard>
  );
}
