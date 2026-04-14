'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { TitleUpdater } from '../title-updater';
import { Loader2 } from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function DashboardShell({
  children,
  requireAuth = true,
  requireAdmin = false,
}: DashboardShellProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdminUser = (role?: string | null) => {
    const normalized = String(role || '').trim().toLowerCase();
    return normalized === 'admin' || normalized === 'superadmin' || normalized === 'administrator';
  };

  useEffect(() => {
    if (!loading && requireAuth) {
      if (!user) {
        router.push('/login');
      } else if (requireAdmin && !isAdminUser(user?.role)) {
        router.push('/admin/dashboard');
      }
    }
  }, [user, loading, requireAuth, requireAdmin, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (requireAuth && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (requireAdmin && !isAdminUser(user?.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <TitleUpdater />
      {children}
    </>
  );
}
