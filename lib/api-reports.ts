/**
 * Reports API Client
 * Comprehensive reporting functions for all ERP modules
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// ==================== FINANCIAL REPORTS ====================

export async function getPnLReport(period = 'month', compare = false) {
  try {
    const res = await fetch(`${API_BASE}/reports/financial/pnl?period=${period}&compare=${compare ? 'true' : 'false'}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getPnLReport error:', e);
  }
  return null;
}

export async function getBalanceSheet(compare = false) {
  try {
    const res = await fetch(`${API_BASE}/reports/financial/balance-sheet?compare=${compare ? 'true' : 'false'}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getBalanceSheet error:', e);
  }
  return null;
}

export async function getCashFlowReport(period = 'month', compare = false) {
  try {
    const res = await fetch(`${API_BASE}/reports/financial/cash-flow?period=${period}&compare=${compare ? 'true' : 'false'}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getCashFlowReport error:', e);
  }
  return null;
}

export async function exportPnLPDF(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/financial/pnl/pdf?period=${period}`, {
      headers: authHeaders()
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profit_loss_${period}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.warn('[API] exportPnLPDF error:', e);
  }
  return false;
}

export async function exportBalanceSheetPDF() {
  try {
    const res = await fetch(`${API_BASE}/reports/financial/balance-sheet/pdf`, {
      headers: authHeaders()
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `balance_sheet_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.warn('[API] exportBalanceSheetPDF error:', e);
  }
  return false;
}

export async function exportCashFlowPDF(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/financial/cash-flow/pdf?period=${period}`, {
      headers: authHeaders()
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cash_flow_${period}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.warn('[API] exportCashFlowPDF error:', e);
  }
  return false;
}

export async function getTrialBalance(asOf?: string) {
  try {
    const params = new URLSearchParams();
    if (asOf) params.set('asOf', asOf);
    const res = await fetch(`${API_BASE}/reports/financial/trial-balance${params.toString() ? `?${params.toString()}` : ''}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getTrialBalance error:', e);
  }
  return null;
}

export async function getGeneralLedger(opts: { account_code?: string; from?: string; to?: string } = {}) {
  try {
    const params = new URLSearchParams();
    if (opts.account_code) params.set('account_code', opts.account_code);
    if (opts.from) params.set('from', opts.from);
    if (opts.to) params.set('to', opts.to);
    const res = await fetch(`${API_BASE}/reports/financial/general-ledger${params.toString() ? `?${params.toString()}` : ''}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getGeneralLedger error:', e);
  }
  return null;
}

export async function getCoaSummary() {
  try {
    const res = await fetch(`${API_BASE}/reports/financial/coa-summary`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getCoaSummary error:', e);
  }
  return null;
}

export async function exportTrialBalancePDF(asOf?: string) {
  try {
    const params = new URLSearchParams();
    if (asOf) params.set('asOf', asOf);
    const res = await fetch(`${API_BASE}/reports/financial/trial-balance/pdf${params.toString() ? `?${params.toString()}` : ''}`, {
      headers: authHeaders()
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trial_balance_${asOf || new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.warn('[API] exportTrialBalancePDF error:', e);
  }
  return false;
}

export async function exportGeneralLedgerPDF(opts: { account_code?: string; from?: string; to?: string } = {}) {
  try {
    const params = new URLSearchParams();
    if (opts.account_code) params.set('account_code', opts.account_code);
    if (opts.from) params.set('from', opts.from);
    if (opts.to) params.set('to', opts.to);
    const res = await fetch(`${API_BASE}/reports/financial/general-ledger/pdf${params.toString() ? `?${params.toString()}` : ''}`, {
      headers: authHeaders()
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `general_ledger_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.warn('[API] exportGeneralLedgerPDF error:', e);
  }
  return false;
}

export async function getComprehensiveFinancialReport(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/comprehensive/financial?period=${period}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getComprehensiveFinancialReport error:', e);
  }
  return null;
}

// ==================== SALES REPORTS ====================

export async function getSalesAnalytics(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/sales/analytics?period=${period}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getSalesAnalytics error:', e);
  }
  return null;
}

export async function getSalesPipeline() {
  try {
    const res = await fetch(`${API_BASE}/reports/sales/pipeline`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getSalesPipeline error:', e);
  }
  return null;
}

export async function getCustomerAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/reports/sales/customers`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getCustomerAnalytics error:', e);
  }
  return null;
}

// ==================== HR REPORTS ====================

export async function getPayrollReport(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/hr/payroll?period=${period}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getPayrollReport error:', e);
  }
  return null;
}

export async function getAttendanceReport(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/hr/attendance?period=${period}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getAttendanceReport error:', e);
  }
  return null;
}

export async function getWorkforceReport() {
  try {
    const res = await fetch(`${API_BASE}/reports/hr/workforce`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getWorkforceReport error:', e);
  }
  return null;
}

export async function getComprehensiveHRReport(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/comprehensive/hr?period=${period}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getComprehensiveHRReport error:', e);
  }
  return null;
}

// ==================== INVENTORY REPORTS ====================

export async function getInventoryValuation() {
  try {
    const res = await fetch(`${API_BASE}/reports/inventory/valuation`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getInventoryValuation error:', e);
  }
  return null;
}

export async function getStockMovements(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/inventory/movements?period=${period}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getStockMovements error:', e);
  }
  return null;
}

// ==================== MANUFACTURING REPORTS ====================

export async function getComprehensiveManufacturingReport(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/comprehensive/manufacturing?period=${period}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getComprehensiveManufacturingReport error:', e);
  }
  return null;
}

// ==================== TAX REPORTS ====================

export async function getVatReport(period = 'quarter') {
  try {
    const res = await fetch(`${API_BASE}/reports/tax/vat?period=${period}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getVatReport error:', e);
  }
  return null;
}

// ==================== DASHBOARD ====================

export async function getDashboardSummary() {
  try {
    const res = await fetch(`${API_BASE}/reports/dashboard/summary`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getDashboardSummary error:', e);
  }
  return null;
}

// ==================== EXPORT FUNCTIONS ====================

export async function exportFinancialReportExcel(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/export/financial/excel?period=${period}`, {
      headers: authHeaders()
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.warn('[API] exportFinancialReportExcel error:', e);
  }
  return false;
}

export async function exportManufacturingReportExcel(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/export/manufacturing/excel?period=${period}`, {
      headers: authHeaders()
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manufacturing_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.warn('[API] exportManufacturingReportExcel error:', e);
  }
  return false;
}

export async function exportHRReportExcel(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/export/hr/excel?period=${period}`, {
      headers: authHeaders()
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hr_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.warn('[API] exportHRReportExcel error:', e);
  }
  return false;
}

export async function exportFinancialReportCSV(period = 'month') {
  try {
    const res = await fetch(`${API_BASE}/reports/export/financial/csv?period=${period}`, {
      headers: authHeaders()
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.warn('[API] exportFinancialReportCSV error:', e);
  }
  return false;
}

// ==================== SCHEDULED REPORTS ====================

export async function getScheduledReports() {
  try {
    const res = await fetch(`${API_BASE}/reports/scheduled`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getScheduledReports error:', e);
  }
  return [];
}

export async function createScheduledReport(data: any) {
  try {
    const res = await fetch(`${API_BASE}/reports/scheduled`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] createScheduledReport error:', e);
  }
  return null;
}

export async function updateScheduledReport(id: string, data: any) {
  try {
    const res = await fetch(`${API_BASE}/reports/scheduled/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (e) {
    console.warn('[API] updateScheduledReport error:', e);
  }
  return false;
}

export async function deleteScheduledReport(id: string) {
  try {
    const res = await fetch(`${API_BASE}/reports/scheduled/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    return res.ok;
  } catch (e) {
    console.warn('[API] deleteScheduledReport error:', e);
  }
  return false;
}

// ==================== REPORT TEMPLATES ====================

export async function getReportTemplates() {
  try {
    const res = await fetch(`${API_BASE}/reports/templates`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] getReportTemplates error:', e);
  }
  return [];
}

export async function createReportTemplate(data: any) {
  try {
    const res = await fetch(`${API_BASE}/reports/templates`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('[API] createReportTemplate error:', e);
  }
  return null;
}
