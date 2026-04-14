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
    const router = useRouter();
    const { checkAccess, setupProgress, loading, tenantStatus } = useTenant();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const access = checkAccess(module);

    if (access.accessible) {
        return <>{children}</>;
    }

    // Show the setup gate
    return (
        <div className="space-y-8 pb-12 max-w-3xl mx-auto animate-in fade-in duration-500">

            {/* Blocked Banner */}
            <Card className="rounded-3xl border-border bg-card overflow-hidden shadow-lg mt-10">
                <CardContent className="p-12 text-center space-y-6">
                    <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mx-auto shadow-inner border">
                        <Lock className="h-10 w-10 text-primary/50" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-widest uppercase text-foreground mb-2">Module Suspended</h2>
                        <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider max-w-md mx-auto">
                            {access.reason || "This system hub is disabled for your tenant. Contact your system administrator to re-enable access."}
                        </p>
                    </div>
                    {access.redirect_to ? (
                        <Button
                            onClick={() => router.push(access.redirect_to!)}
                            className="rounded-xl font-bold uppercase tracking-widest text-[11px] gap-2 mt-6 h-11 px-8"
                        >
                            {access.required_stage === 'company_profile' && 'Go to Company Setup'}
                            {access.required_stage === 'finance_setup' && 'Go to Finance Setup'}
                            {access.required_stage === 'roles_setup' && 'Go to Users & Roles'}
                            {!access.required_stage && 'Go to Settings'}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={() => router.push('/admin/dashboard')}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-bold uppercase tracking-widest text-[11px] gap-2 mt-6 h-11 px-8 shadow-sm"
                        >
                            Return to Dashboard
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Setup Progress Chain (Only if it's a new tenant setup block) */}
            {access.required_stage && (
                <Card className="rounded-3xl border-border/50">
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold">Setup Progress</h3>
                            <p className="text-sm text-muted-foreground">
                                Complete these steps to unlock all modules
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative">
                            <div className="h-2 bg-muted rounded-full">
                                <div
                                    className="h-2 bg-primary rounded-full transition-all duration-700"
                                    style={{ width: `${setupProgress.percentage}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 font-semibold">
                                Step {setupProgress.step} of {setupProgress.total}: {setupProgress.label}
                            </p>
                        </div>

                        {/* Steps */}
                        <div className="space-y-3">
                            {SETUP_CHAIN.map((step, i) => {
                                const Icon = iconMap[step.icon] || CheckCircle2;
                                const isComplete = tenantStatus ? getStepComplete(step.key, tenantStatus) : false;
                                const isCurrent = !isComplete && (i === 0 || (tenantStatus ? getStepComplete(SETUP_CHAIN[i - 1].key, tenantStatus) : false));

                                return (
                                    <div
                                        key={step.key}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-2xl transition-all",
                                            isComplete ? "bg-primary/5" : isCurrent ? "bg-primary/5 border border-primary/20" : "bg-muted/20 opacity-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                            isComplete ? "bg-primary/10 text-primary" :
                                                isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-sm font-semibold", isComplete && "text-primary")}>
                                                {step.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{step.description}</p>
                                        </div>
                                        {isComplete && (
                                            <Badge className="bg-primary/10 text-primary border-none rounded-full text-[10px] font-bold">
                                                Done
                                            </Badge>
                                        )}
                                        {isCurrent && (
                                            <Badge className="bg-primary text-primary-foreground border-none rounded-full text-[10px] font-bold animate-pulse">
                                                Current
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
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
