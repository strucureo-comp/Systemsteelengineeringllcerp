'use client';

import { useState, useEffect } from 'react';
import { ModuleGuard } from '@/components/shared/layout/module-guard';
import { AttendanceTracking } from '../_components/attendance-tracking';
import type { Employee, Attendance, Leave, Holiday } from '@/lib/db/types';
import { getEmployees, getAttendance, getLeaves, getHolidays } from '@/lib/api';

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch all necessary data in parallel
        const [empData, attData, leaveData, holidayData] = await Promise.all([
          getEmployees(),
          getAttendance(),
          getLeaves(),
          getHolidays()
        ]);
        
        setEmployees(empData || []);
        setAttendance(attData || []);
        setLeaves(leaveData || []);
        setHolidays(holidayData || []);
      } catch (error) {
        console.error('Failed to fetch attendance data:', error);
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
            <p>Loading attendance data...</p>
          </div>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="hr">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Attendance</h1>
        <AttendanceTracking 
          employees={employees}
          attendance={attendance}
          leaves={leaves}
          holidays={holidays}
          onRefresh={handleRefresh}
        />
      </div>
    </ModuleGuard>
  );
}
