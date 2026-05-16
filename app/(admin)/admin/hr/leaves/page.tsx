'use client';

import { useState, useEffect } from 'react';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { AttendanceLeave } from '../_components/attendance-leave';
import type { Employee, Leave, LeaveType, Holiday } from '@/lib/db/types';
import { getEmployees, getLeaves, getLeaveTypes, getHolidays } from '@/lib/api';

export default function LeavesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [empData, leaveData, typeData, holidayData] = await Promise.all([
          getEmployees(),
          getLeaves(),
          getLeaveTypes(),
          getHolidays()
        ]);

        setEmployees(empData || []);
        setLeaves(leaveData || []);
        setLeaveTypes(typeData || []);
        setHolidays(holidayData || []);
      } catch (error) {
        console.error('Failed to fetch leaves data:', error);
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
            <p>Loading leaves data...</p>
          </div>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="hr">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Leaves</h1>
        <AttendanceLeave 
          employees={employees}
          leaves={leaves}
          leaveTypes={leaveTypes}
          holidays={holidays}
          onRefresh={handleRefresh}
        />
      </div>
    </ModuleGuard>
  );
}
