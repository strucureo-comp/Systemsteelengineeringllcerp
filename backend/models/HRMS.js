const mongoose = require('mongoose');

const departmentSalaryPolicySchema = new mongoose.Schema({
    contract_types_allowed: [{ type: String, enum: ['full-time', 'contract', 'part-time', 'intern'] }],
    default_salary_template: { type: String, default: '' },
    earning_components: [{
        component_id: String,
        mandatory: { type: Boolean, default: false }
    }],
    deduction_components: [{
        name: String,
        type: { type: String, enum: ['flat', 'percentage', 'formula'], default: 'percentage' },
        value: { type: Number, default: 0 },
        applies_to: { type: String, default: 'gross' },
        mandatory: { type: Boolean, default: false },
        employer_contribution: { type: Number, default: 0 }
    }],
    gratuity_applicable: { type: Boolean, default: true },
    overtime_policy: { type: String, default: '1.5x' },
    probation_days: { type: Number, default: 90 }
}, { _id: false });

// ── DEPARTMENT ───────────────────────────────────────────────────────────────
const hrDepartmentSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    head_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'HRDepartment' },
    is_active: { type: Boolean, default: true },
    description: String,
    salary_policy: { type: departmentSalaryPolicySchema, default: () => ({}) }
}, { timestamps: true });

// ── HR ROLE ──────────────────────────────────────────────────────────────────
const hrRoleSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    grade: String,
    min_salary: { type: Number, default: 0 },
    max_salary: { type: Number, default: 0 },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'HRDepartment' },
    is_active: { type: Boolean, default: true },
    description: String
}, { timestamps: true });

// ── EMPLOYEE ──────────────────────────────────────────────────────────────────
const employeeSchema = new mongoose.Schema({
    employee_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: String,
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional link to login account

    // Position Details
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'HRDepartment' },
    hr_role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'HRRole' },
    skill_type: { type: String, default: 'unskilled' }, // skilled, semi-skilled, unskilled
    employment_type: { type: String, enum: ['full-time', 'contract', 'part-time'], default: 'full-time' },
    joining_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive', 'on-leave', 'terminated', 'resigned', 'separated'], default: 'active' },

    // Financials
    basic_salary: { type: Number, default: 0 },
    overtime_rate: { type: Number, default: 0 },
    bank_details: {
        account_name: String,
        account_number: String,
        bank_name: String,
        iban: String,
        swift_code: String,
        branch: String
    },

    // Emergency Contacts
    emergency_contacts: [{
        name: String,
        relationship: String,
        phone: String,
        email: String,
        address: String,
        is_primary: { type: Boolean, default: false }
    }],

    // Documents
    documents: [{
        type: { type: String, enum: ['passport', 'visa', 'id_card', 'certificate', 'contract', 'other'] },
        document_number: String,
        issue_date: Date,
        expiry_date: Date,
        issuing_authority: String,
        file_url: String,
        notes: String
    }],

    // Personal Info
    date_of_birth: Date,
    gender: String,
    nationality: String,
    passport_number: String,
    visa_status: String,
    marital_status: String,
    address: String,
    city: String,
    country: String,
    photo_url: String,

    lifecycle_status: { type: String, default: 'confirmed' }
}, { timestamps: true });

// ── ATTENDANCE ───────────────────────────────────────────────────────────────
const attendanceSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'leave', 'holiday', 'half-day'], default: 'present' },
    check_in: String,
    check_out: String,
    overtime_hours: { type: Number, default: 0 },
    project_id: { type: String }, // Links to project if on site
    notes: String
}, { timestamps: true });

attendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });

// ── LEAVE ────────────────────────────────────────────────────────────────────
const leaveSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leave_type: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    from_date: { type: Date, required: true },
    to_date: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    approved_by: { type: String },
    remarks: String
}, { timestamps: true });

leaveSchema.pre('validate', function(next) {
    if (this.from_date && this.to_date && new Date(this.to_date) < new Date(this.from_date)) {
        return next(new Error('to_date must be greater than or equal to from_date'));
    }
    return next();
});

// ── PAYROLL ──────────────────────────────────────────────────────────────────
const payrollSchema = new mongoose.Schema({
    month: { type: String, required: true }, // YYYY-MM
    status: { type: String, enum: ['draft', 'pending_approval', 'approved', 'rejected', 'finalized', 'processed', 'posted', 'paid'], default: 'draft' },
    total_gross: { type: Number, default: 0 },
    total_deductions: { type: Number, default: 0 },
    total_net: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null }, // Soft-delete timestamp
    finance_journal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    processed_at: Date,
    posted_at: Date,

    // Approval workflow fields
    submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submitted_at: Date,
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_at: Date,
    rejection_reason: String,

    lines: [{
        employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        basic_pay: Number,
        overtime_pay: Number,
        allowances: Number,
        deductions: Number,
        net_pay: Number,
        status: String,
        payslip_number: String,
        payslip_generated_at: Date,
    }]
}, { timestamps: true });

// Add unique index on month to prevent duplicate payroll cycles
payrollSchema.index({ month: 1 }, { unique: true });

// ── SALARY STRUCTURE ─────────────────────────────────────────────────────────
const salaryStructureSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    effective_from: { type: Date, required: true },
    basic: { type: Number, required: true, default: 0 },
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    ta: { type: Number, default: 0 },
    special_allowance: { type: Number, default: 0 },
    pf_employee: { type: Number, default: 0 },
    pf_employer: { type: Number, default: 0 },
    esi_employee: { type: Number, default: 0 },
    esi_employer: { type: Number, default: 0 },
    professional_tax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    gross_salary: { type: Number, default: 0 },
    net_salary: { type: Number, default: 0 },
    is_current: { type: Boolean, default: true },
    notes: String
}, { timestamps: true });

// Virtual fields for calculations
salaryStructureSchema.pre('save', function (next) {
    // Calculate gross salary (all earnings)
    this.gross_salary = this.basic + this.hra + this.da + this.ta + this.special_allowance;

    // Calculate net salary (gross - all deductions)
    this.net_salary = this.gross_salary - (this.pf_employee + this.esi_employee + this.professional_tax + this.tds);

    next();
});

// ── LEAVE TYPE ───────────────────────────────────────────────────────────────
const leaveTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    days_per_year: { type: Number, default: 0 },
    max_days: { type: Number, default: 0 },
    is_paid: { type: Boolean, default: true },
    carry_forward: { type: Boolean, default: false },
    max_carry: { type: Number, default: 0 },
    requires_approval: { type: Boolean, default: true },
    is_active: { type: Boolean, default: true },
    description: String
}, { timestamps: true });

leaveTypeSchema.pre('save', function(next) {
    if (typeof this.days_per_year === 'number') {
        this.max_days = this.days_per_year;
    } else if (typeof this.max_days === 'number') {
        this.days_per_year = this.max_days;
    }
    next();
});

// ── HOLIDAY ──────────────────────────────────────────────────────────────────
const holidaySchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['national', 'regional', 'company'], default: 'company' },
    description: String,
    is_active: { type: Boolean, default: true }
}, { timestamps: true });

// ── HR EVENT ────────────────────────────────────────────────────────────────
const hrEventSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    type: {
        type: String,
        enum: ['hiring', 'appraisal', 'promotion', 'transfer', 'warning', 'layoff', 'exit'],
        required: true
    },
    title: { type: String, required: true },
    description: String,
    event_date: { type: Date, required: true },
    effective_date: Date,
    metadata: mongoose.Schema.Types.Mixed,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ── JOB OPENING ──────────────────────────────────────────────────────────────
const jobOpeningSchema = new mongoose.Schema({
    job_title: { type: String, required: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'HRDepartment' },
    hr_role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'HRRole' },
    positions: { type: Number, default: 1 },
    employment_type: { type: String, enum: ['full-time', 'contract', 'part-time'], default: 'full-time' },
    experience_required: String,
    salary_range: { min: Number, max: Number },
    skills_required: [String],
    job_description: String,
    status: { type: String, enum: ['open', 'on-hold', 'closed', 'filled'], default: 'open' },
    posted_date: { type: Date, default: Date.now },
    closing_date: Date,
    hiring_manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ── APPLICANT ────────────────────────────────────────────────────────────────
const applicantSchema = new mongoose.Schema({
    job_opening_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JobOpening', required: true },
    applicant_name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    current_company: String,
    current_designation: String,
    total_experience: Number, // in years
    expected_salary: Number,
    notice_period: String,
    resume_url: String,
    cover_letter: String,
    
    // Application Status
    status: { type: String, enum: ['applied', 'screening', 'interview', 'offer', 'rejected', 'hired'], default: 'applied' },
    applied_date: { type: Date, default: Date.now },
    
    // Interview Tracking
    interviews: [{
        round: String,
        date: Date,
        interviewer: String,
        feedback: String,
        rating: Number,
        result: { type: String, enum: ['pass', 'fail', 'pending'], default: 'pending' }
    }],
    
    // Offer Details
    offer_letter_sent: { type: Boolean, default: false },
    offer_letter_date: Date,
    offer_salary: Number,
    offer_status: { type: String, enum: ['pending', 'accepted', 'rejected', 'withdrawn'] },
    
    notes: String
}, { timestamps: true });

// ── OFFER LETTER ─────────────────────────────────────────────────────────────
const offerLetterSchema = new mongoose.Schema({
    applicant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Applicant', required: true },
    job_opening_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JobOpening', required: true },
    offer_date: { type: Date, default: Date.now },
    designation: String,
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'HRDepartment' },
    
    // Compensation
    basic_salary: Number,
    allowances: {
        hra: Number,
        transport: Number,
        special: Number
    },
    gross_salary: Number,
    
    joining_date: Date,
    employment_type: { type: String, enum: ['full-time', 'contract', 'part-time'] },
    probation_period: Number, // in months
    
    status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected', 'withdrawn'], default: 'draft' },
    accepted_date: Date,
    rejected_reason: String,
    
    terms_and_conditions: String,
    file_url: String
}, { timestamps: true });

// ── LEAVE BALANCE ────────────────────────────────────────────────────────────
const leaveBalanceSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leave_type: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    year: { type: Number, required: true },
    total_allocated: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    carried_forward: { type: Number, default: 0 }
}, { timestamps: true });

leaveBalanceSchema.index({ employee_id: 1, leave_type: 1, year: 1 }, { unique: true });

// Calculate available leaves automatically
leaveBalanceSchema.pre('save', function(next) {
    this.available = this.total_allocated + this.carried_forward - this.used - this.pending;
    next();
});

// ── DISCIPLINARY ACTION ──────────────────────────────────────────────────────
const disciplinaryActionSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    incident_date: { type: Date, required: true },
    reported_date: { type: Date, default: Date.now },
    
    type: { type: String, enum: ['warning', 'written-warning', 'suspension', 'termination', 'performance-issue', 'misconduct', 'other'], required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    
    title: { type: String, required: true },
    description: String,
    
    // Action Taken
    action_taken: String,
    warning_letter_issued: { type: Boolean, default: false },
    warning_letter_date: Date,
    suspension_days: Number,
    
    // Follow-up
    follow_up_required: { type: Boolean, default: false },
    follow_up_date: Date,
    resolution_status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
    resolution_notes: String,
    
    reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    witnesses: [String],
    attachments: [{ file_url: String, file_name: String }]
}, { timestamps: true });

// ── EMPLOYEE DOCUMENT ────────────────────────────────────────────────────────
const employeeDocumentSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    
    document_type: { 
        type: String, 
        enum: ['passport', 'visa', 'emirates_id', 'labour_card', 'certificate', 'qualification', 'contract', 'insurance', 'driving_license', 'other'],
        required: true 
    },
    document_name: { type: String, required: true },
    document_number: String,
    
    issue_date: Date,
    expiry_date: Date,
    issuing_authority: String,
    issuing_country: String,
    
    // GCC-specific fields
    sponsor: String,
    profession: String, // For visa/labour card
    
    file_url: String,
    file_name: String,
    
    // Expiry Tracking
    has_expiry: { type: Boolean, default: true },
    alert_days_before: { type: Number, default: 30 }, // Alert 30 days before expiry
    is_expired: { type: Boolean, default: false },
    reminder_sent: { type: Boolean, default: false },
    
    status: { type: String, enum: ['active', 'expired', 'renewed', 'cancelled'], default: 'active' },
    notes: String
}, { timestamps: true });

// Auto-calculate expiry status
employeeDocumentSchema.pre('save', function(next) {
    if (this.has_expiry && this.expiry_date) {
        const today = new Date();
        this.is_expired = new Date(this.expiry_date) < today;
    }
    next();
});

// ── SHIFT ────────────────────────────────────────────────────────────────────
const shiftSchema = new mongoose.Schema({
    shift_name: { type: String, required: true, unique: true },
    shift_code: { type: String, required: true, unique: true },
    start_time: { type: String, required: true }, // HH:MM format
    end_time: { type: String, required: true },
    break_duration: { type: Number, default: 0 }, // minutes
    working_hours: { type: Number, default: 8 },
    is_night_shift: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    color_code: String, // For UI display
    description: String
}, { timestamps: true });

// ── ROSTER ───────────────────────────────────────────────────────────────────
const rosterSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    shift_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
    date: { type: Date, required: true },
    
    // Site/Location for multi-site operations
    site_name: String,
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    
    // Roster status
    status: { type: String, enum: ['scheduled', 'confirmed', 'cancelled', 'completed'], default: 'scheduled' },
    
    // Override shift timings if needed
    custom_start_time: String,
    custom_end_time: String,
    
    notes: String
}, { timestamps: true });

rosterSchema.index({ employee_id: 1, date: 1 }, { unique: true });

// ── SEPARATION ───────────────────────────────────────────────────────────────
const separationSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    
    // Separation Details
    separation_type: { type: String, enum: ['resignation', 'termination', 'retirement', 'contract-end', 'absconding'], required: true },
    reason: String,
    resignation_date: Date,
    last_working_date: { type: Date, required: true },
    notice_period_days: { type: Number, default: 0 },
    notice_served_days: { type: Number, default: 0 },
    
    // Exit Interview
    exit_interview_conducted: { type: Boolean, default: false },
    exit_interview_date: Date,
    exit_interview_feedback: String,
    
    // Clearance
    clearance_status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
    clearance_checklist: [{
        item: String,
        department: String,
        cleared: { type: Boolean, default: false },
        cleared_by: String,
        cleared_date: Date,
        remarks: String
    }],
    
    // Final Settlement
    final_settlement_status: { type: String, enum: ['pending', 'calculated', 'approved', 'paid'], default: 'pending' },
    
    status: { type: String, enum: ['initiated', 'in-progress', 'completed', 'cancelled'], default: 'initiated' }
}, { timestamps: true });

// ── FINAL SETTLEMENT ─────────────────────────────────────────────────────────
const finalSettlementSchema = new mongoose.Schema({
    separation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Separation', required: true },
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    
    // Calculation Date
    calculation_date: { type: Date, default: Date.now },
    last_working_date: Date,
    
    // Dues Payable
    unpaid_salary: { type: Number, default: 0 },
    salary_days: { type: Number, default: 0 },
    leave_encashment: { type: Number, default: 0 },
    leave_days_encashed: { type: Number, default: 0 },
    end_of_service_benefit: { type: Number, default: 0 }, // Gratuity/EOSB
    bonus_or_incentive: { type: Number, default: 0 },
    notice_pay: { type: Number, default: 0 },
    other_allowances: { type: Number, default: 0 },
    
    // Deductions
    unpaid_leaves: { type: Number, default: 0 },
    loans_outstanding: { type: Number, default: 0 },
    advance_salary: { type: Number, default: 0 },
    notice_period_recovery: { type: Number, default: 0 },
    other_deductions: { type: Number, default: 0 },
    
    // Totals
    total_payable: { type: Number, default: 0 },
    total_deductions: { type: Number, default: 0 },
    net_settlement_amount: { type: Number, default: 0 },
    
    // Payment
    payment_status: { type: String, enum: ['pending', 'approved', 'paid'], default: 'pending' },
    payment_date: Date,
    payment_mode: String,
    payment_reference: String,
    
    // Approvals
    calculated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_date: Date,
    
    notes: String
}, { timestamps: true });

const payrollDeletionAuditSchema = new mongoose.Schema({
    payroll_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' },
    month: String,
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// Auto-calculate totals
finalSettlementSchema.pre('save', function(next) {
    this.total_payable = this.unpaid_salary + this.leave_encashment + this.end_of_service_benefit + 
                        this.bonus_or_incentive + this.notice_pay + this.other_allowances;
    
    this.total_deductions = this.unpaid_leaves + this.loans_outstanding + this.advance_salary + 
                           this.notice_period_recovery + this.other_deductions;
    
    this.net_settlement_amount = this.total_payable - this.total_deductions;
    next();
});

// ── OVERTIME LOG ─────────────────────────────────────────────────────────────
const overtimeLogSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    hours_worked: { type: Number, required: true },
    standard_hours: { type: Number, default: 8 },
    overtime_hours: { type: Number, required: true },
    rate_multiplier: { type: Number, default: 1.5 }, // 1.5x, 2.0x, 2.5x
    overtime_amount: { type: Number, required: true },
    notes: String,
    status: { type: String, enum: ['logged', 'approved', 'rejected', 'paid'], default: 'logged' },
    
    // Link to payroll
    payroll_cycle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' },
    
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_at: Date,
    rejection_reason: String
}, { timestamps: true });

overtimeLogSchema.index({ employee_id: 1, date: 1 }, { unique: true });

// Auto-calculate overtime_hours and overtime_amount
overtimeLogSchema.pre('save', function(next) {
    if (this.hours_worked && this.standard_hours) {
        this.overtime_hours = Math.max(0, this.hours_worked - this.standard_hours);
    }
    next();
});

// ── PAYMENT DETAILS ──────────────────────────────────────────────────────────
const paymentDetailsSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    payment_method: { type: String, enum: ['bank_transfer', 'cheque', 'cash', 'crypto'], default: 'bank_transfer' },
    
    // Bank Transfer Details
    bank_name: String,
    account_holder_name: String,
    iban: String,
    account_number: String,
    branch_code: String,
    swift_code: String,
    bank_country: { type: String, default: 'AE' },
    
    // Payment Schedule
    frequency: { type: String, enum: ['monthly', 'weekly', 'bi-weekly', 'bi-monthly'], default: 'monthly' },
    payment_date_of_month: { type: Number, default: -1 }, // 1-31 or -1 for last day
    beneficiary_reference: String,
    special_notes: String,
    
    // Verification
    verified: { type: Boolean, default: false },
    verification_date: Date,
    verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ── BIOMETRIC DEVICE ─────────────────────────────────────────────────────────
const biometricDeviceSchema = new mongoose.Schema({
    device_id: { type: String, required: true, unique: true },
    device_name: { type: String, required: true },
    device_type: { type: String, enum: ['biometric', 'rfid', 'nfc', 'mobile_app', 'manual'], default: 'biometric' },
    location: String,
    latitude: Number,
    longitude: Number,
    manufacturer: String,
    api_key: String,
    is_active: { type: Boolean, default: true },
    last_synced: Date,
    notes: String
}, { timestamps: true });

// ── ATTENDANCE LOG (Enhanced) ────────────────────────────────────────────────
const attendanceLogSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    attendance_date: { type: Date, required: true },
    
    // Check-in Details
    check_in_time: Date,
    check_in_device_id: String,
    check_in_device_type: { type: String, enum: ['biometric', 'mobile_app', 'rfid', 'nfc', 'manual'] },
    check_in_location: String,
    check_in_latitude: Number,
    check_in_longitude: Number,
    check_in_method: { type: String, enum: ['fingerprint', 'face', 'rfid', 'nfc', 'mobile_app', 'manual_entry'] },
    
    // Check-out Details
    check_out_time: Date,
    check_out_device_id: String,
    check_out_device_type: { type: String, enum: ['biometric', 'mobile_app', 'rfid', 'nfc', 'manual'] },
    check_out_location: String,
    check_out_latitude: Number,
    check_out_longitude: Number,
    check_out_method: { type: String, enum: ['fingerprint', 'face', 'rfid', 'nfc', 'mobile_app', 'manual_entry'] },
    
    // Calculated Fields
    total_hours_worked: Number,
    overtime_hours: Number,
    
    status: { type: String, enum: ['pending', 'checked_in', 'checked_out', 'absent', 'holiday', 'leave'], default: 'pending' },
    notes: String,
    
    // Verification
    verification_status: { type: String, enum: ['pending', 'verified', 'flagged'], default: 'pending' },
    verification_notes: String,
    verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    created_by: String // device_id or user_id
}, { timestamps: true });

attendanceLogSchema.index({ employee_id: 1, attendance_date: 1 }, { unique: true });

// Auto-calculate hours
attendanceLogSchema.pre('save', function(next) {
    if (this.check_in_time && this.check_out_time) {
        const diffMs = new Date(this.check_out_time) - new Date(this.check_in_time);
        this.total_hours_worked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
        this.status = 'checked_out';
    } else if (this.check_in_time) {
        this.status = 'checked_in';
    }
    next();
});

const HRDepartment = mongoose.models.HRDepartment || mongoose.model('HRDepartment', hrDepartmentSchema);
const HRRole = mongoose.models.HRRole || mongoose.model('HRRole', hrRoleSchema);
const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
const Leave = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);
const Payroll = mongoose.models.Payroll || mongoose.model('Payroll', payrollSchema);
const SalaryStructure = mongoose.models.SalaryStructure || mongoose.model('SalaryStructure', salaryStructureSchema);
const LeaveType = mongoose.models.LeaveType || mongoose.model('LeaveType', leaveTypeSchema);
const Holiday = mongoose.models.Holiday || mongoose.model('Holiday', holidaySchema);
const HREvent = mongoose.models.HREvent || mongoose.model('HREvent', hrEventSchema);
const JobOpening = mongoose.models.JobOpening || mongoose.model('JobOpening', jobOpeningSchema);
const Applicant = mongoose.models.Applicant || mongoose.model('Applicant', applicantSchema);
const OfferLetter = mongoose.models.OfferLetter || mongoose.model('OfferLetter', offerLetterSchema);
const LeaveBalance = mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', leaveBalanceSchema);
const DisciplinaryAction = mongoose.models.DisciplinaryAction || mongoose.model('DisciplinaryAction', disciplinaryActionSchema);
const EmployeeDocument = mongoose.models.EmployeeDocument || mongoose.model('EmployeeDocument', employeeDocumentSchema);
const Shift = mongoose.models.Shift || mongoose.model('Shift', shiftSchema);
const Roster = mongoose.models.Roster || mongoose.model('Roster', rosterSchema);
const Separation = mongoose.models.Separation || mongoose.model('Separation', separationSchema);
const FinalSettlement = mongoose.models.FinalSettlement || mongoose.model('FinalSettlement', finalSettlementSchema);
const PayrollDeletionAudit = mongoose.models.PayrollDeletionAudit || mongoose.model('PayrollDeletionAudit', payrollDeletionAuditSchema);
const OvertimeLog = mongoose.models.OvertimeLog || mongoose.model('OvertimeLog', overtimeLogSchema);

// ── TIMESHEET ENTRY ────────────────────────────────────────────────────────────
const timesheetEntrySchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    task_description: String,
    hours_worked: { type: Number, required: true },
    break_hours: { type: Number, default: 0 },
    start_time: String, // HH:mm format
    end_time: String, // HH:mm format
    work_type: { type: String, enum: ['regular', 'overtime', 'holiday', 'leave'], default: 'regular' },
    status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected'], default: 'draft' },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_at: Date,
    rejection_reason: String,
    notes: String,
    // Link to payroll for payroll processing
    payroll_cycle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' },
    // Billable tracking
    billable: { type: Boolean, default: true },
    hourly_rate: Number,
}, { timestamps: true });

timesheetEntrySchema.index({ employee_id: 1, date: 1 }, { unique: true });
timesheetEntrySchema.index({ employee_id: 1, project_id: 1, date: 1 });

const TimesheetEntry = mongoose.models.TimesheetEntry || mongoose.model('TimesheetEntry', timesheetEntrySchema);

const PaymentDetails = mongoose.models.PaymentDetails || mongoose.model('PaymentDetails', paymentDetailsSchema);
const BiometricDevice = mongoose.models.BiometricDevice || mongoose.model('BiometricDevice', biometricDeviceSchema);
const AttendanceLog = mongoose.models.AttendanceLog || mongoose.model('AttendanceLog', attendanceLogSchema);

module.exports = {
    HRDepartment,
    HRRole,
    Employee,
    Attendance,
    Leave,
    Payroll,
    SalaryStructure,
    LeaveType,
    Holiday,
    HREvent,
    JobOpening,
    Applicant,
    OfferLetter,
    LeaveBalance,
    DisciplinaryAction,
    EmployeeDocument,
    Shift,
    Roster,
    Separation,
    FinalSettlement,
    PayrollDeletionAudit,
    OvertimeLog,
    TimesheetEntry,
    PaymentDetails,
    BiometricDevice,
    AttendanceLog
};
