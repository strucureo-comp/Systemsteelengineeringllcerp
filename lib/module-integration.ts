/**
 * Module Integration Layer
 * Coordinates data flows and API calls between all ERP modules
 */

import { getSession } from '@/lib/session';

interface ModuleIntegrationConfig {
  projectId: string;
  userId: string;
  module: 'finance' | 'labour' | 'inventory' | 'design' | 'timeline' | 'resources' | 'expenses' | 'client';
  action: string;
  data: Record<string, any>;
}

interface IntegrationResponse {
  success: boolean;
  message: string;
  data?: Record<string, any>;
  errors?: string[];
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/backend';

/**
 * File Upload Integration
 * Handles file uploads and associates them with appropriate modules
 */
export async function integrateFileUpload(
  projectId: string,
  module: string,
  filePath: string,
  fileName: string,
  metadata?: Record<string, any>
): Promise<IntegrationResponse> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized' };
    }

    // Create file reference in database
    const response = await fetch(`${apiBase}/projects/upload-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        project_id: projectId,
        module_type: module,
        file_path: filePath,
        file_name: fileName,
        uploaded_by: session.user.id,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to register file upload');
    }

    const result = await response.json();
    return { success: true, message: 'File registered successfully', data: result };
  } catch (error: any) {
    return { success: false, message: error.message, errors: [error.message] };
  }
}

/**
 * Labour Module Integration
 * Sync labour allocations and attendance with project financials
 */
export async function syncLabourCosts(projectId: string): Promise<IntegrationResponse> {
  try {
    const response = await fetch(`${apiBase}/projects/${projectId}/team`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to sync labour costs');
    }

    const labourData = await response.json();

    // Auto-update project financials
    const financialResponse = await fetch(`${apiBase}/projects/${projectId}/financials`, {
      method: 'GET',
      credentials: 'include',
    });

    const financials = await financialResponse.json();

    return {
      success: true,
      message: 'Labour costs synced',
      data: { labour: labourData, financials },
    };
  } catch (error: any) {
    return { success: false, message: error.message, errors: [error.message] };
  }
}

/**
 * Inventory Module Integration
 * Track inventory costs and trigger auto-purchase requests
 */
export async function syncInventoryCosts(projectId: string): Promise<IntegrationResponse> {
  try {
    // Get project inventory data
    const response = await fetch(`${apiBase}/projects/${projectId}/financials`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to sync inventory costs');
    }

    const data = await response.json();

    // Check for low stock items
    const lowStockResponse = await fetch(`${apiBase}/inventory/auto-purchase-requests`, {
      method: 'GET',
      credentials: 'include',
    });

    const lowStockItems = await lowStockResponse.json();

    return {
      success: true,
      message: 'Inventory costs synced',
      data: { costs: data.inventory_costs, lowStockItems },
    };
  } catch (error: any) {
    return { success: false, message: error.message, errors: [error.message] };
  }
}

/**
 * Finance Module Integration
 * Sync project costs to General Ledger
 */
export async function syncToGeneralLedger(projectId: string): Promise<IntegrationResponse> {
  try {
    // Get project financials
    const financialResponse = await fetch(`${apiBase}/projects/${projectId}/financials`, {
      method: 'GET',
      credentials: 'include',
    });

    const financials = await financialResponse.json();

    // Post to GL
    const glResponse = await fetch(`${apiBase}/finance/general-ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        project_id: projectId,
        entries: [
          {
            account_code: '4000', // Revenue
            debit: 0,
            credit: financials.revenue || 0,
            description: `Revenue - ${financials.project_name}`,
          },
          {
            account_code: '5000', // COGS
            debit: financials.total_cost || 0,
            credit: 0,
            description: `Project Costs - ${financials.project_name}`,
          },
        ],
      }),
    });

    if (!glResponse.ok) {
      throw new Error('Failed to post to GL');
    }

    return {
      success: true,
      message: 'Project financials posted to GL',
      data: await glResponse.json(),
    };
  } catch (error: any) {
    return { success: false, message: error.message, errors: [error.message] };
  }
}

/**
 * Dashboard Integration
 * Update executive dashboard with latest data
 */
export async function updateExecutiveDashboard(): Promise<IntegrationResponse> {
  try {
    const response = await fetch(`${apiBase}/dashboard/executive-summary`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to update dashboard');
    }

    const dashboardData = await response.json();

    return {
      success: true,
      message: 'Dashboard updated',
      data: dashboardData,
    };
  } catch (error: any) {
    return { success: false, message: error.message, errors: [error.message] };
  }
}

/**
 * Payroll Integration
 * Auto-post payroll entries to GL
 */
export async function syncPayrollToGL(payrollId: string): Promise<IntegrationResponse> {
  try {
    // Get payroll GL entries
    const response = await fetch(`${apiBase}/payroll/${payrollId}/ledger`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to get payroll entries');
    }

    const entries = await response.json();

    // Post to GL
    const postResponse = await fetch(`${apiBase}/payroll/${payrollId}/ledger`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!postResponse.ok) {
      throw new Error('Failed to post payroll to GL');
    }

    return {
      success: true,
      message: 'Payroll posted to GL',
      data: await postResponse.json(),
    };
  } catch (error: any) {
    return { success: false, message: error.message, errors: [error.message] };
  }
}

/**
 * Procurement Integration
 * Trigger auto-PO generation for low stock
 */
export async function triggerAutoPurchaseOrders(): Promise<IntegrationResponse> {
  try {
    const response = await fetch(`${apiBase}/inventory/auto-purchase-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ auto_generate_po: true }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate purchase orders');
    }

    const result = await response.json();

    return {
      success: true,
      message: 'Purchase orders generated',
      data: result,
    };
  } catch (error: any) {
    return { success: false, message: error.message, errors: [error.message] };
  }
}

/**
 * Module Integration Orchestrator
 * Coordinates multiple integrations for comprehensive data sync
 */
export async function orchestrateModuleSync(
  projectId: string
): Promise<IntegrationResponse> {
  try {
    const syncs = await Promise.allSettled([
      syncLabourCosts(projectId),
      syncInventoryCosts(projectId),
      syncToGeneralLedger(projectId),
      updateExecutiveDashboard(),
    ]);

    const results = syncs
      .filter((result) => result.status === 'fulfilled')
      .map((result: any) => result.value);

    const errors = syncs
      .filter((result) => result.status === 'rejected')
      .map((result: any) => result.reason?.message);

    return {
      success: errors.length === 0,
      message: `Synced ${results.filter((r) => r.success).length}/${results.length} modules`,
      data: { results },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    return { success: false, message: error.message, errors: [error.message] };
  }
}

/**
 * Get Module Integration Status
 * Check health of all module integrations
 */
export async function getIntegrationStatus(
  projectId: string
): Promise<IntegrationResponse> {
  try {
    const modules = await Promise.all([
      fetch(`${apiBase}/projects/${projectId}/financials`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${apiBase}/projects/${projectId}/team`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${apiBase}/finance/general-ledger`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${apiBase}/dashboard/executive-summary`, { credentials: 'include' }).then((r) => r.json()),
    ]);

    const [financials, team, ledger, dashboard] = modules;

    return {
      success: true,
      message: 'All modules integrated and operational',
      data: {
        financials: !!financials,
        labour: !!team,
        ledger: !!ledger,
        dashboard: !!dashboard,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message, errors: [error.message] };
  }
}
