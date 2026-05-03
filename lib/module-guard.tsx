/**
 * Module Guard Middleware
 * 
 * Protects routes and hides UI elements for disabled modules
 * Usage: Wrap protected pages with this component
 */

'use client';

import { useSettings } from '@/lib/hooks/use-settings';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ModuleGuardProps {
  moduleName: string; // e.g., 'module_purchase_order'
  children: React.ReactNode;
}

/**
 * Wrap a page or component with this to protect it from non-admin users
 * and to check if module is enabled
 */
export function ModuleGuard({ moduleName, children }: ModuleGuardProps) {
  const { getSetting, loading } = useSettings();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      const isEnabled = getSetting(moduleName, false);
      
      if (!isEnabled) {
        console.warn(`[ModuleGuard] Module disabled: ${moduleName}`);
        router.push('/admin/dashboard');
      }
    }
  }, [loading, moduleName, getSetting, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isEnabled = getSetting(moduleName, false);
  
  if (!isEnabled) {
    return null; // Or redirect happened, this won't render
  }

  return <>{children}</>;
}

/**
 * Hook to check if a module is enabled
 * Use this in components to conditionally render
 */
export function useModuleEnabled(moduleName: string): boolean {
  const { getSetting, loading } = useSettings();
  
  if (loading) return false;
  return getSetting(moduleName, false);
}

/**
 * Component to conditionally show element if module is enabled
 */
export function ModuleConditional({ 
  moduleName, 
  children 
}: { 
  moduleName: string;
  children: React.ReactNode;
}) {
  const isEnabled = useModuleEnabled(moduleName);
  
  if (!isEnabled) {
    return null;
  }

  return <>{children}</>;
}

export default ModuleGuard;
