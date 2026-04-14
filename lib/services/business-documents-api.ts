const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/backend';
const API_BASE = BASE_URL.startsWith('/')
  ? BASE_URL
  : (BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`);

function token() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bb_token');
}

function authHeaders() {
  const t = token();
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

async function parseJson(res: Response) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Request failed: ${res.status}`);
  }
  return json;
}

export async function getProformaInvoices() {
  const res = await fetch(`${API_BASE}/sales-documents/proforma-invoices`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function createProformaInvoice(payload: any) {
  const res = await fetch(`${API_BASE}/sales-documents/proforma-invoices`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateProformaInvoice(id: string, payload: any) {
  const res = await fetch(`${API_BASE}/sales-documents/proforma-invoices/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function deleteProformaInvoice(id: string) {
  const res = await fetch(`${API_BASE}/sales-documents/proforma-invoices/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function getDeliveryNotes() {
  const res = await fetch(`${API_BASE}/sales-documents/delivery-notes`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function createDeliveryNote(payload: any) {
  const res = await fetch(`${API_BASE}/sales-documents/delivery-notes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateDeliveryNote(id: string, payload: any) {
  const res = await fetch(`${API_BASE}/sales-documents/delivery-notes/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function deleteDeliveryNote(id: string) {
  const res = await fetch(`${API_BASE}/sales-documents/delivery-notes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function getPaymentVouchers() {
  const res = await fetch(`${API_BASE}/vouchers/payment-vouchers`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function createPaymentVoucher(payload: any) {
  const res = await fetch(`${API_BASE}/vouchers/payment-vouchers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updatePaymentVoucher(id: string, payload: any) {
  const res = await fetch(`${API_BASE}/vouchers/payment-vouchers/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function deletePaymentVoucher(id: string) {
  const res = await fetch(`${API_BASE}/vouchers/payment-vouchers/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function approvePaymentVoucher(id: string) {
  const res = await fetch(`${API_BASE}/vouchers/payment-vouchers/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function postPaymentVoucher(id: string) {
  const res = await fetch(`${API_BASE}/vouchers/payment-vouchers/${id}/post`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function getReceiptVouchers() {
  const res = await fetch(`${API_BASE}/vouchers/receipt-vouchers`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function createReceiptVoucher(payload: any) {
  const res = await fetch(`${API_BASE}/vouchers/receipt-vouchers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateReceiptVoucher(id: string, payload: any) {
  const res = await fetch(`${API_BASE}/vouchers/receipt-vouchers/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function deleteReceiptVoucher(id: string) {
  const res = await fetch(`${API_BASE}/vouchers/receipt-vouchers/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function approveReceiptVoucher(id: string) {
  const res = await fetch(`${API_BASE}/vouchers/receipt-vouchers/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function postReceiptVoucher(id: string) {
  const res = await fetch(`${API_BASE}/vouchers/receipt-vouchers/${id}/post`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function getFinancialAuditReport(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  const res = await fetch(`${API_BASE}/financial-audit/report${query ? `?${query}` : ''}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function getFinancialAuditHistory() {
  const res = await fetch(`${API_BASE}/financial-audit/history`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return parseJson(res);
}

// ── SALES INVOICES ────────────────────────────────────────────────────────────

export async function getSalesInvoices() {
  const res = await fetch(`${API_BASE}/sales-documents/invoices`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function createSalesInvoice(payload: any) {
  const res = await fetch(`${API_BASE}/sales-documents/invoices`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateSalesInvoice(id: string, payload: any) {
  const res = await fetch(`${API_BASE}/sales-documents/invoices/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateSalesInvoiceStatus(id: string, status: string, opts: { updatedBy?: string; reason?: string } = {}) {
  const res = await fetch(`${API_BASE}/sales-documents/invoices/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status, ...opts }),
  });
  return parseJson(res);
}

export async function deleteSalesInvoice(id: string) {
  const res = await fetch(`${API_BASE}/sales-documents/invoices/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseJson(res);
}

// ── SALES QUOTATIONS ──────────────────────────────────────────────────────────

export async function getSalesQuotations() {
  const res = await fetch(`${API_BASE}/sales-documents/quotations`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function createSalesQuotation(payload: any) {
  const res = await fetch(`${API_BASE}/sales-documents/quotations`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateSalesQuotation(id: string, payload: any) {
  const res = await fetch(`${API_BASE}/sales-documents/quotations/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateSalesQuotationStatus(id: string, status: string, opts: { updatedBy?: string; reason?: string } = {}) {
  const res = await fetch(`${API_BASE}/sales-documents/quotations/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status, ...opts }),
  });
  return parseJson(res);
}

export async function deleteSalesQuotation(id: string) {
  const res = await fetch(`${API_BASE}/sales-documents/quotations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseJson(res);
}
