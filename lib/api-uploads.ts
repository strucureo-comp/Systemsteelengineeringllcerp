/**
 * File Upload API Functions
 * Centralized API calls for file upload operations
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/backend';

function authHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bb_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// ═══════════════════════════════════════
// HR EMPLOYEE DOCUMENTS
// ═══════════════════════════════════════

export async function getEmployeeDocuments(employeeId: string) {
    try {
        const res = await fetch(`${API_BASE}/hrms/employees/${employeeId}/documents`, {
            headers: authHeaders()
        });
        if (res.ok) return res.json();
    } catch (e) {
        console.warn('[API] getEmployeeDocuments error:', e);
    }
    return [];
}

export async function deleteEmployeeDocument(employeeId: string, attachmentId: string) {
    try {
        const res = await fetch(`${API_BASE}/hrms/employees/${employeeId}/documents/${attachmentId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        return res.ok;
    } catch (e) {
        console.warn('[API] deleteEmployeeDocument error:', e);
        return false;
    }
}

// ═══════════════════════════════════════
// FINANCE ATTACHMENTS
// ═══════════════════════════════════════

export async function getInvoiceAttachments(invoiceId: string) {
    try {
        const res = await fetch(`${API_BASE}/finance/invoices/${invoiceId}/attachments`, {
            headers: authHeaders()
        });
        if (res.ok) return res.json();
    } catch (e) {
        console.warn('[API] getInvoiceAttachments error:', e);
    }
    return [];
}

export async function deleteInvoiceAttachment(invoiceId: string, attachmentId: string) {
    try {
        const res = await fetch(`${API_BASE}/finance/invoices/${invoiceId}/attachments/${attachmentId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        return res.ok;
    } catch (e) {
        console.warn('[API] deleteInvoiceAttachment error:', e);
        return false;
    }
}

export async function getExpenseAttachments(expenseId: string) {
    try {
        const res = await fetch(`${API_BASE}/finance/expenses/${expenseId}/attachments`, {
            headers: authHeaders()
        });
        if (res.ok) return res.json();
    } catch (e) {
        console.warn('[API] getExpenseAttachments error:', e);
    }
    return [];
}

// ═══════════════════════════════════════
// PROCUREMENT ATTACHMENTS
// ═══════════════════════════════════════

export async function getPOAttachments(poId: string) {
    try {
        const res = await fetch(`${API_BASE}/procurement/purchase-orders/${poId}/attachments`, {
            headers: authHeaders()
        });
        if (res.ok) return res.json();
    } catch (e) {
        console.warn('[API] getPOAttachments error:', e);
    }
    return [];
}

export async function getGRNAttachments(grnId: string) {
    try {
        const res = await fetch(`${API_BASE}/procurement/grn/${grnId}/attachments`, {
            headers: authHeaders()
        });
        if (res.ok) return res.json();
    } catch (e) {
        console.warn('[API] getGRNAttachments error:', e);
    }
    return [];
}
