const mongoose = require('mongoose');

const deliveryItemSchema = new mongoose.Schema({
    id: String,
    sku: String,
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: 'pcs' },
    weight: String,
    size: String
}, { _id: false });

const invoiceItemSchema = new mongoose.Schema({
    id: String,
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
}, { _id: false });

const proformaInvoiceSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    number: { type: String, required: true, index: true },
    customerId: String,
    customerName: { type: String, required: true },
    date: { type: String, required: true },
    validUntil: String,
    items: [invoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 5 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    notes: String,
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'rejected', 'completed'],
        default: 'draft'
    },
    createdBy: String,
    approvedBy: String,
    approvedAt: String,
    rejectedBy: String,
    rejectedAt: String,
    rejectedReason: String
}, { timestamps: true });

const deliveryNoteSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    number: { type: String, required: true, index: true },
    date: { type: String, required: true },
    
    // Seller Snapshot (Optional overrides)
    sellerName: String,
    sellerAddress: String,
    sellerTaxId: String,
    sellerContact: String,

    // Buyer/Recipient
    customerId: String,
    customerName: { type: String, required: true },
    customerAddress: String,
    customerContact: String,
    
    // Document Reference
    invoiceRef: String,
    orderRef: String,
    
    // Delivery Info
    shipmentDate: String,
    deliveryDate: String,
    deliveryMethod: String, // courier, vehicle, etc.
    courierName: String,
    vehicleDetails: String,
    warehouseOrigin: String,
    
    // Package Details
    parcelCount: { type: Number, default: 1 },
    totalWeight: String,
    dimensions: String,
    
    items: [deliveryItemSchema],
    specialInstructions: String,
    notes: String,
    
    // Acknowledgement
    receiverName: String,
    receivedAt: String,
    
    status: {
        type: String,
        enum: ['draft', 'shipped', 'delivered', 'cancelled'],
        default: 'draft'
    },
    createdBy: String,
    approvedBy: String,
    approvedAt: String
}, { timestamps: true });

const voucherLineSchema = new mongoose.Schema({
    description: { type: String, required: true },
    accountCode: { type: String, default: '' },
    amount: { type: Number, required: true, default: 0 }
}, { _id: false });

const paymentVoucherSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    voucherNumber: { type: String, required: true, index: true },
    date: { type: String, required: true },
    payeeType: { type: String, enum: ['vendor', 'employee', 'other'], default: 'vendor' },
    payeeName: { type: String, required: true },
    paymentMethod: { type: String, enum: ['cash', 'bank_transfer', 'cheque', 'card'], default: 'bank_transfer' },
    referenceNo: String,
    currency: { type: String, default: 'AED' },
    cashAccountCode: { type: String, default: '1000' },
    lines: [voucherLineSchema],
    totalAmount: { type: Number, default: 0 },
    notes: String,
    status: { type: String, enum: ['draft', 'approved', 'posted', 'cancelled'], default: 'draft' },
    createdBy: String,
    approvedBy: String,
    approvedAt: String,
    journal_entry_id: String,
    postedAt: String
}, { timestamps: true });

const receiptVoucherSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    voucherNumber: { type: String, required: true, index: true },
    date: { type: String, required: true },
    payerType: { type: String, enum: ['customer', 'other'], default: 'customer' },
    payerName: { type: String, required: true },
    receiptMethod: { type: String, enum: ['cash', 'bank_transfer', 'cheque', 'card'], default: 'bank_transfer' },
    referenceNo: String,
    currency: { type: String, default: 'AED' },
    cashAccountCode: { type: String, default: '1000' },
    lines: [voucherLineSchema],
    totalAmount: { type: Number, default: 0 },
    notes: String,
    status: { type: String, enum: ['draft', 'approved', 'posted', 'cancelled'], default: 'draft' },
    createdBy: String,
    approvedBy: String,
    approvedAt: String,
    journal_entry_id: String,
    postedAt: String
}, { timestamps: true });

const financialAuditReportSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    generated_at: { type: String, required: true },
    period: {
        from: { type: String, required: true },
        to: { type: String, required: true }
    },
    executive_summary: {
        overall_health: { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'good' },
        ledger_integrity: { type: Boolean, default: true },
        total_transactions: { type: Number, default: 0 },
        total_accounts: { type: Number, default: 0 }
    },
    financial_summary: {
        total_assets: { type: Number, default: 0 },
        total_liabilities: { type: Number, default: 0 },
        total_equity: { type: Number, default: 0 },
        total_revenue: { type: Number, default: 0 },
        total_expenses: { type: Number, default: 0 },
        net_profit: { type: Number, default: 0 }
    },
    anomalies_detected: [{
        category: { type: String, enum: ['error', 'warning', 'observation'], default: 'observation' },
        description: String,
        severity: { type: String, enum: ['high', 'medium', 'low'], default: 'low' }
    }],
    chart_data: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const ProformaInvoice = mongoose.models.ProformaInvoice || mongoose.model('ProformaInvoice', proformaInvoiceSchema);
const DeliveryNote = mongoose.models.DeliveryNote || mongoose.model('DeliveryNote', deliveryNoteSchema);
const PaymentVoucher = mongoose.models.PaymentVoucher || mongoose.model('PaymentVoucher', paymentVoucherSchema);
const ReceiptVoucher = mongoose.models.ReceiptVoucher || mongoose.model('ReceiptVoucher', receiptVoucherSchema);
const FinancialAuditReport = mongoose.models.FinancialAuditReport || mongoose.model('FinancialAuditReport', financialAuditReportSchema);

// ── SALES INVOICE ──────────────────────────────────────────────────────────
const salesInvoiceItemSchema = new mongoose.Schema({
    id: String,
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
}, { _id: false });

const salesInvoiceSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    number: { type: String, required: true, index: true },
    customerId: String,
    customerName: { type: String, required: true },
    date: { type: String, required: true },
    dueDate: String,
    items: [salesInvoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 5 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    notes: String,
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'rejected', 'completed'],
        default: 'draft'
    },
    createdBy: String,
    approvedBy: String,
    approvedAt: String,
    rejectedBy: String,
    rejectedAt: String,
    rejectedReason: String
}, { timestamps: true });

// ── SALES QUOTATION ────────────────────────────────────────────────────────
const salesQuotationItemSchema = new mongoose.Schema({
    id: String,
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
}, { _id: false });

const salesQuotationSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    number: { type: String, required: true, index: true },
    customerId: String,
    customerName: { type: String, required: true },
    date: { type: String, required: true },
    validUntil: String,
    items: [salesQuotationItemSchema],
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 5 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    notes: String,
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'rejected', 'completed'],
        default: 'draft'
    },
    createdBy: String,
    approvedBy: String,
    approvedAt: String,
    rejectedBy: String,
    rejectedAt: String,
    rejectedReason: String
}, { timestamps: true });

const SalesInvoice = mongoose.models.SalesInvoice || mongoose.model('SalesInvoice', salesInvoiceSchema);
const SalesQuotation = mongoose.models.SalesQuotation || mongoose.model('SalesQuotation', salesQuotationSchema);

module.exports = {
    ProformaInvoice,
    DeliveryNote,
    PaymentVoucher,
    ReceiptVoucher,
    FinancialAuditReport,
    SalesInvoice,
    SalesQuotation
};
