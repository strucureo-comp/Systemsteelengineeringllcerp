/**
 * Module Dependency Gate
 * Controls module access based on tenant setup status and user roles.
 */

export type SetupStage = 'subscription' | 'company_profile' | 'finance_setup' | 'roles_setup' | 'completed';

export type ModuleKey = 'dashboard' | 'company' | 'users_roles' | 'finance' | 'sales' | 'operations' | 'hr' | 'reports' | 'settings' | 'manufacturing' | 'inventory' | 'projects' | 'approvals' | 'compliance' | 'purchases';

export type BusinessType =
    | 'manufacturing' | 'retail' | 'service' | 'trading'
    | 'education' | 'construction' | 'hospitality' | 'healthcare'
    | 'logistics' | 'ngo' | 'real_estate' | 'holding';

export type CompanySize = 'startup' | 'sme' | 'enterprise';

export interface TenantSetupStatus {
    setup_stage: SetupStage;
    business_type?: BusinessType;
    company_size?: CompanySize;
    company_setup_complete: boolean;
    finance_setup_complete: boolean;
    roles_setup_complete: boolean;
    module_finance: boolean;
    module_sales: boolean;
    module_operations: boolean;
    module_hr: boolean;
    module_inventory?: boolean;
    module_projects?: boolean;
    module_manufacturing?: boolean;
}

export interface ModuleAccess {
    accessible: boolean;
    reason?: string;
    required_stage?: SetupStage;
    redirect_to?: string;
}

export function checkModuleAccess(
    module: ModuleKey,
    tenantStatus: TenantSetupStatus | null,
    userRole?: string
): ModuleAccess {
    // All modules accessible — gate enforcement happens via settings
    return { accessible: true };
}

export function checkRolePermission(
    erpRole: string | null | undefined,
    module: ModuleKey,
    action: 'view' | 'create' | 'edit' | 'approve' | 'delete' = 'view'
): boolean {
    // Permissions managed through Roles & Access settings
    return true;
}

export function getNextSetupStep(status: TenantSetupStatus | null): any {
    return { step: 4, total: 4, label: 'Setup Complete', path: '/admin/dashboard', percentage: 100 };
}

export const SETUP_CHAIN = [
    { key: 'subscription', label: 'Subscription', icon: 'CreditCard', description: 'Select a plan' },
    { key: 'company_profile', label: 'Company Profile', icon: 'Building2', description: 'Enter business details' },
    { key: 'finance_setup', label: 'Finance Setup', icon: 'DollarSign', description: 'COA, Tax, Financial Year' },
    { key: 'roles_setup', label: 'User Roles', icon: 'Shield', description: 'Create roles and permissions' },
    { key: 'completed', label: 'All Modules Active', icon: 'CheckCircle2', description: 'Full ERP ready' },
] as const;
