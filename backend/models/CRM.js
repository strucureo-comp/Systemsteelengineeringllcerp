const mongoose = require('mongoose');

// ── CUSTOMER ACCOUNT (CRM) ──────────────────────────────────────────────────
const customerAccountSchema = new mongoose.Schema({
    name: { type: String, required: true },
    industry: String,
    website: String,
    phone: String,
    address: String,
    tax_id: String,
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'inactive', 'prospect'], default: 'prospect' },
    notes: String
}, { timestamps: true });

// ── CONTACT ──────────────────────────────────────────────────────────────────
const contactSchema = new mongoose.Schema({
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerAccount' },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: String,
    phone: String,
    title: String,
    is_primary: { type: Boolean, default: false }
}, { timestamps: true });

// ── LEAD (DEPRECATED - Merged into Opportunity) ─────────────────────────────
const leadSchema = new mongoose.Schema({
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    company: String,
    email: String,
    phone: String,
    status: { type: String, enum: ['new', 'contacted', 'qualified', 'lost', 'converted'], default: 'new' },
    source: String,
    potential_value: { type: Number, default: 0 },
    probability: { type: Number, default: 0 },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
}, { timestamps: true });

// ── OPPORTUNITY (Now includes Leads) ─────────────────────────────────────────
const opportunitySchema = new mongoose.Schema({
    // Lead fields (for new leads before they have a customer account)
    is_lead: { type: Boolean, default: false },
    first_name: String,
    last_name: String,
    email: String,
    phone: String,
    company: String,
    source: String,
    
    // Opportunity fields
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerAccount' },
    name: { type: String, required: true },
    amount: { type: Number, default: 0 },
    stage: {
        type: String,
        enum: ['new_lead', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'],
        default: 'new_lead'
    },
    probability: { type: Number, default: 10 },
    close_date: Date,
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    
    // Activity tracking
    followUps: [{
        type: { type: String, enum: ['Call', 'Email', 'Meeting', 'Site Visit'], default: 'Call' },
        scheduledAt: Date,
        status: { type: String, enum: ['Pending', 'Completed', 'Missed'], default: 'Pending' },
        notes: String,
        priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' }
    }]
}, { timestamps: true });

// ── ACTIVITY ─────────────────────────────────────────────────────────────────
const activitySchema = new mongoose.Schema({
    type: { type: String, enum: ['call', 'email', 'meeting', 'task', 'note'], required: true },
    subject: { type: String, required: true },
    description: String,
    due_date: Date,
    completed: { type: Boolean, default: false },
    lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerAccount' },
    opportunity_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ── SALES ORDER ──────────────────────────────────────────────────────────────
const salesOrderSchema = new mongoose.Schema({
    order_number: { type: String, required: true, unique: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerAccount', required: true },
    project_id: { type: String },
    total_amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'draft'
    },
    lines: [{
        description: String,
        quantity: Number,
        unit_price: Number,
        amount: Number
    }],
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ── QUOTATION (Sales Proposal with Approval Workflow) ───────────────────────
const quotationLineSchema = new mongoose.Schema({
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unit_price: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 } // quantity * unit_price
});

const approvalLevelSchema = new mongoose.Schema({
    level: { type: Number, required: true },
    role: { type: String, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    user_name: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    comments: String,
    actioned_at: Date
}, { _id: false });

const quotationSchema = new mongoose.Schema({
    quotation_number: { type: String, required: true, unique: true, index: true },
    
    // Customer Information
    customer_type: { type: String, enum: ['registry', 'manual'], default: 'registry' },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerAccount' },
    
    // Manual customer entry fields
    customer_company_name: String,
    customer_contact_person: String,
    customer_email: String,
    customer_phone: String,
    customer_address: String,
    customer_city: String,
    customer_country: String,
    customer_tax_id: String,
    
    // Document dates
    quotation_date: { type: Date, default: Date.now },
    valid_until: Date,
    
    // Line items
    lines: [quotationLineSchema],
    
    // Financial calculations
    subtotal: { type: Number, default: 0 },
    tax_mode: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    tax_rate: { type: Number, default: 5 }, // Percentage
    tax_amount: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    
    // Document status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'sent', 'accepted', 'declined', 'expired'],
        default: 'draft'
    },
    
    // Approval workflow
    approval_config: {
        levels: [approvalLevelSchema]
    },
    current_approval_level: { type: Number, default: 0 },
    
    // Notes and terms
    notes: String,
    terms_and_conditions: { type: String, default: 'Payment terms: Net 30 days\nDelivery: As per agreement\nValidity: 30 days from quotation date' },
    internal_notes: String,
    
    // Metadata
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_by_name: String,
    submitted_at: Date,
    approved_at: Date,
    rejected_at: Date,
    rejection_reason: String,
    
    // Conversion tracking
    converted_to_invoice: { type: Boolean, default: false },
    invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InvoiceAR' },
    converted_at: Date
}, { timestamps: true });

// Auto-calculate subtotal before saving
quotationSchema.pre('save', function(next) {
    if (this.lines && this.lines.length > 0) {
        this.subtotal = this.lines.reduce((sum, line) => sum + (line.total || 0), 0);
        
        // Auto-calculate tax if in auto mode
        if (this.tax_mode === 'auto') {
            this.tax_amount = this.subtotal * (this.tax_rate / 100);
        }
        
        this.total_amount = this.subtotal + this.tax_amount;
    }
    next();
});

const CustomerAccount = mongoose.models.CustomerAccount || mongoose.model('CustomerAccount', customerAccountSchema);
const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
const Opportunity = mongoose.models.Opportunity || mongoose.model('Opportunity', opportunitySchema);
const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
const SalesOrder = mongoose.models.SalesOrder || mongoose.model('SalesOrder', salesOrderSchema);
const Quotation = mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema);

module.exports = {
    CustomerAccount,
    Contact,
    Lead,
    Opportunity,
    Activity,
    SalesOrder,
    Quotation
};
