const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDelete');

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
        value: { type: Number, default: 0, min: 0 },
        applies_to: { type: String, default: 'gross' },
        mandatory: { type: Boolean, default: false },
        employer_contribution: { type: Number, default: 0, min: 0 }
    }],
    gratuity_applicable: { type: Boolean, default: true },
    overtime_policy: { type: String, default: '1.5x' },
    probation_days: { type: Number, default: 90, min: 0, max: 365 }
}, { _id: false });

// ── DEPARTMENT ───────────────────────────────────────────────────────────────
const hrDepartmentSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    head_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'HRDepartment' },
    is_active: { type: Boolean, default: true, index: true },
    description: String,
    salary_policy: { type: departmentSalaryPolicySchema, default: () => ({}) }
}, { timestamps: true });

// Indexes
hrDepartmentSchema.index({ tenant_id: 1, createdAt: -1 });
hrDepartmentSchema.index({ tenant_id: 1, code: 1 }, { unique: true });
hrDepartmentSchema.index({ tenant_id: 1, is_active: 1 });
hrDepartmentSchema.plugin(softDeletePlugin);

// ── HR ROLE ──────────────────────────────────────────────────────────────────
const hrRoleSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    grade: String,
    min_salary: { type: Number, default: 0, min: 0 },
    max_salary: { type: Number, default: 0, min: 0 },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'HRDepartment' },
    is_active: { type: Boolean, default: true, index: true },
    description: String
}, { timestamps: true });

// Validation: max_salary >= min_salary
hrRoleSchema.pre('save', function(next) {
    if (this.max_salary > 0 && this.max_salary < this.min_salary) {
        return next(new Error('max_salary must be greater than or equal to min_salary'));
    }
    next();
});

// Indexes
hrRoleSchema.index({ tenant_id: 1, createdAt: -1 });
hrRoleSchema.index({ tenant_id: 1, code: 1 }, { unique: true });
hrRoleSchema.index({ tenant_id: 1, department_id: 1 });
hrRoleSchema.plugin(softDeletePlugin);

// ── EMPLOYEE ──────────────────────────────────────────────────────────────────
const employeeSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true, index: true },
    employee_id: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    email: { 
        type: String, 
        lowercase: true, 
        trim: true,
        sparse: true,
        match: [/\S+@\S+\.\S+/, 'Invalid email format']
    },
    phone: { 
        type: String,
        trim: true,
        match: [/^[+]?[\d\s-]{7,15}$/, 'Invalid phone number format']
    },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Position Details
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'HRDepartment', index: true },
    hr_role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'HRRole' },
    skill_type: { type: String, default: 'unskilled', enum: ['skilled', 'semi-skilled', 'unskilled'] },
    employment_type: { type: String, enum: ['full-time', 'contract', 'part-time'], default: 'full-time', index: true },
    joining_date: { type: Date, default: Date.now, max: Date.now },
    status: { 
        type: String, 
        enum: ['active', 'inactive', 'on-leave', 'terminated', 'resigned', 'separated'], 
        default: 'active',
        index: true
    },

    // Financials
    basic_salary: { type: Number, default: 0, min: 0 },
    overtime_rate: { type: Number, default: 0, min: 0 },
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
    gender: { type: String, enum: ['male', 'female', 'other', ''] },
    nationality: String,
    passport_number: String,
    visa_status: String,
    marital_status: { type: String, enum: ['single', 'married', 'divorced', 'widowed', ''] },
    address: String,
    city: String,
    country: String,
    photo_url: String,

    lifecycle_status: { type: String, default: 'confirmed' }
}, { timestamps: true });

// Indexes
employeeSchema.index({ tenant_id: 1, createdAt: -1 });
employeeSchema.index({ tenant_id: 1, employee_id: 1 }, { unique: true });
employeeSchema.index({ tenant_id: 1, department_id: 1 });
employeeSchema.index({ tenant_id: 1, status: 1 });
employeeSchema.index({ tenant_id: 1, employment_type: 1 });
employeeSchema.index({ email: 1 }, { sparse: true });
employeeSchema.index({ user_id: 1 }, { sparse: true });
employeeSchema.plugin(softDeletePlugin);

// ── ATTENDANCE ───────────────────────────────────────────────────────────────
const attendanceSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true, index: true },
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: ['present', 'absent', 'leave', 'holiday', 'half-day'], default: 'present' },
    check_in: String,
    check_out: String,
    overtime_hours: { type: Number, default: 0, min: 0 },
    project_id: { type: String },
    notes: String
}, { timestamps: true });

// Indexes
attendanceSchema.index({ tenant_id: 1, createdAt: -1 });
attendanceSchema.index({ tenant_id: 1, employee_id: 1, date: 1 }, { unique: true });
attendanceSchema.index({ tenant_id: 1, date: 1 });
attendanceSchema.index({ tenant_id: 1, status: 1 });

// ── LEAVE ────────────────────────────────────────────────────────────────────
const leaveSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true, index: true },
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leave_type: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    from_date: { type: Date, required: true, index: true },
    to_date: { type: Date, required: true },
    days: { type: Number, required: true, min: 0.5 },
    reason: String,
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected', 'cancelled'], 
        default: 'pending',
        index: true
    },
    approved_by: { type: String },
    remarks: String
}, { timestamps: true });

// Validation: to_date >= from_date
leaveSchema.pre('validate', function(next) {
    if (this.from_date && this.to_date && new Date(this.to_date) < new Date(this.from_date)) {
        return next(new Error('to_date must be greater than or equal to from_date'));
    }
    return next();
});

// Indexes
leaveSchema.index({ tenant_id: 1, createdAt: -1 });
leaveSchema.index({ tenant_id: 1, employee_id: 1, from_date: 1 });
leaveSchema.index({ tenant_id: 1, status: 1 });
leaveSchema.plugin(softDeletePlugin);

// ── PAYROLL ──────────────────────────────────────────────────────────────────
const payrollSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true, index: true },
    month: { type: String, required: true }, // YYYY-MM
    status: { 
        type: String, 
        enum: ['draft', 'pending_approval', 'approved', 'rejected', 'finalized', 'processed', 'posted', 'paid'], 
        default: 'draft',
        index: true
    },
    total_gross: { type: Number, default: 0, min: 0 },
    total_deductions: { type: Number, default: 0, min: 0 },
    total_net: { type: Number, default: 0, min: 0 },
    deletedAt: { type: Date, default: null },
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
        basic_pay: { type: Number, min: 0 },
        overtime_pay: { type: Number, min: 0 },
        allowances: { type: Number, min: 0 },
        deductions: { type: Number, min: 0 },
        net_pay: { type: Number, min: 0 },
        status: String,
        payslip_number: String,
        payslip_generated_at: Date,
    }]
}, { timestamps: true });

// Indexes
payrollSchema.index({ tenant_id: 1, createdAt: -1 });
payrollSchema.index({ tenant_id: 1, month: 1 }, { unique: true });
payrollSchema.index({ tenant_id: 1, status: 1 });
payrollSchema.index({ tenant_id: 1, posted_at: -1 });

// NOTE: Payroll should NEVER be hard deleted - use status: 'cancelled' instead
// Soft delete plugin NOT applied intentionally

// ── SALARY STRUCTURE ─────────────────────────────────────────────────────────
const salaryStructureSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true, index: true },
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    effective_from: { type: Date, required: true, index: true },
    basic: { type: Number, required: true, default: 0, min: 0 },
    hra: { type: Number, default: 0, min: 0 },
    da: { type: Number, default: 0, min: 0 },
    ta: { type: Number, default: 0, min: 0 },
    special_allowance: { type: Number, default: 0, min: 0 },
    pf_employee: { type: Number, default: 0, min: 0 },
    pf_employer: { type: Number, default: 0, min: 0 },
    esi_employee: { type: Number, default: 0, min: 0 },
    esi_employer: { type: Number, default: 0, min: 0 },
    professional_tax: { type: Number, default: 0, min: 0 },
    tds: { type: Number, default: 0, min: 0 },
    gross_salary: { type: Number, default: 0, min: 0 },
    net_salary: { type: Number, default: 0, min: 0 },
    is_current: { type: Boolean, default: true, index: true },
    notes: String
}, { timestamps: true });

// Auto-calculate gross and net salary
salaryStructureSchema.pre('save', function (next) {
    this.gross_salary = this.basic + this.hra + this.da + this.ta + this.special_allowance;
    this.net_salary = this.gross_salary - (this.pf_employee + this.esi_employee + this.professional_tax + this.tds);
    next();
});

// Indexes
salaryStructureSchema.index({ tenant_id: 1, createdAt: -1 });
salaryStructureSchema.index({ tenant_id: 1, employee_id: 1, effective_from: -1 });
salaryStructureSchema.index({ tenant_id: 1, is_current: 1 });
salaryStructureSchema.plugin(softDeletePlugin);

// ── LEAVE TYPE ───────────────────────────────────────────────────────────────
const leaveTypeSchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    days_per_year: { type: Number, default: 0, min: 0 },
    max_days: { type: Number, default: 0, min: 0 },
    is_paid: { type: Boolean, default: true },
    carry_forward: { type: Boolean, default: false },
    max_carry: { type: Number, default: 0, min: 0 },
    requires_approval: { type: Boolean, default: true },
    is_active: { type: Boolean, default: true, index: true },
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

// Indexes
leaveTypeSchema.index({ tenant_id: 1, createdAt: -1 });
leaveTypeSchema.index({ tenant_id: 1, code: 1 }, { unique: true });
leaveTypeSchema.index({ tenant_id: 1, is_active: 1 });
leaveTypeSchema.plugin(softDeletePlugin);

// ── HOLIDAY ──────────────────────────────────────────────────────────────────
const holidaySchema = new mongoose.Schema({
    tenant_id: { type: String, default: 'default', required: true, index: true },
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    type: { type: String, enum: ['national', 'regional', 'company'], default: 'company' },
    description: String,
    is_active: { type: Boolean, default: true, index: true }
}, { timestamps: true });

// Indexes
holidaySchema.index({ tenant_id: 1, createdAt: -1 });
holidaySchema.index({ tenant_id: 1, date: 1 });
holidaySchema.index({ tenant_id: 1, type: 1 });
holidaySchema.plugin(softDeletePlugin);

// Export all models
const HRDepartment = mongoose.models.HRDepartment || mongoose.model('HRDepartment', hrDepartmentSchema);
const HRRole = mongoose.models.HRRole || mongoose.model('HRRole', hrRoleSchema);
const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
const Leave = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);
const Payroll = mongoose.models.Payroll || mongoose.model('Payroll', payrollSchema);
const SalaryStructure = mongoose.models.SalaryStructure || mongoose.model('SalaryStructure', salaryStructureSchema);
const LeaveType = mongoose.models.LeaveType || mongoose.model('LeaveType', leaveTypeSchema);
const Holiday = mongoose.models.Holiday || mongoose.model('Holiday', holidaySchema);

module.exports = {
    HRDepartment,
    HRRole,
    Employee,
    Attendance,
    Leave,
    Payroll,
    SalaryStructure,
    LeaveType,
    Holiday
};
