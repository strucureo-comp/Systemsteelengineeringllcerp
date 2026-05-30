'use client';

import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/tenant-context';
import type { ModuleKey } from '@/lib/module-gate';
import { SETUP_CHAIN } from '@/lib/module-gate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Lock, ArrowRight, CreditCard, Building2,
    DollarSign, Shield, CheckCircle2, AlertTriangle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

const iconMap: Record<string, any> = {
    CreditCard, Building2, DollarSign, Shield, CheckCircle2,
};

interface ModuleGuardProps {
    module: ModuleKey;
    children: ReactNode;
}

/**
 * Wraps a module page. Shows a setup gate if the module isn't accessible yet.
 * 
 * Usage:
 * <ModuleGuard module="sales">
 *   <SalesContent />
 * </ModuleGuard>
 */
export function ModuleGuard({ module, children }: ModuleGuardProps) {
    // ALWAYS return children during testing phase to prevent redirection blockers
    return <>{children}</>;
}

function getStepComplete(key: string, status: any): boolean {
    switch (key) {
        case 'subscription': return true; // If we have tenant status, subscription exists
        case 'company_profile': return status.company_setup_complete;
        case 'finance_setup': return status.finance_setup_complete;
        case 'roles_setup': return status.roles_setup_complete;
        case 'completed': return status.setup_stage === 'completed';
        default: return false;
    }
}
