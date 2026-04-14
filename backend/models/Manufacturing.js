const mongoose = require('mongoose');

// ── BILL OF MATERIALS (BOM) ──────────────────────────────────────────────────
const bomSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    code: { type: String, required: true, unique: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    product_name: String,
    product_sku: String,
    description: String,
    version: { type: String, default: '1.0' },
    components: [{
        item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
        item_name: String,
        item_sku: String,
        quantity: { type: Number, required: true },
        uom: { type: String, default: 'pcs' },
        waste_factor: { type: Number, default: 0 }, // Percentage
        unit_cost: { type: Number, default: 0 },
        total_cost: { type: Number, default: 0 }
    }],
    total_cost: { type: Number, default: 0 },
    labor_cost: { type: Number, default: 0 },
    overhead_cost: { type: Number, default: 0 },
    total_manufacturing_cost: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

bomSchema.index({ tenant_id: 1, code: 1 }, { unique: true });

// ── WORK CENTER ──────────────────────────────────────────────────────────────
const workCenterSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['assembly', 'machining', 'welding', 'painting', 'packaging', 'quality', 'other'], default: 'assembly' },
    capacity_per_hour: { type: Number, default: 0 },
    cost_per_hour: { type: Number, default: 0 },
    location: String,
    is_active: { type: Boolean, default: true },
    description: String
}, { timestamps: true });

// ── ROUTING (PRODUCTION STEPS) ───────────────────────────────────────────────
const routingSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    code: { type: String, required: true, unique: true },
    bom_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BOM', required: true },
    operations: [{
        sequence: { type: Number, required: true },
        operation_name: { type: String, required: true },
        work_center_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkCenter' },
        work_center_name: String,
        setup_time_minutes: { type: Number, default: 0 },
        cycle_time_minutes: { type: Number, default: 0 },
        description: String
    }],
    total_time_minutes: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true }
}, { timestamps: true });

// ── PRODUCTION ORDER ─────────────────────────────────────────────────────────
const productionOrderSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    order_number: { type: String, required: true, unique: true },
    bom_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BOM', required: true },
    product_name: String,
    product_sku: String,
    quantity: { type: Number, required: true },
    quantity_produced: { type: Number, default: 0 },
    quantity_scrapped: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['draft', 'planned', 'released', 'in_progress', 'quality_check', 'completed', 'cancelled'],
        default: 'draft'
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    planned_start_date: Date,
    planned_end_date: Date,
    actual_start_date: Date,
    actual_end_date: Date,
    project_id: { type: String },
    sales_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    routing_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Routing' },
    
    // Material consumption tracking
    material_issued: { type: Boolean, default: false },
    material_issue_date: Date,
    
    // Cost tracking
    material_cost: { type: Number, default: 0 },
    labor_cost: { type: Number, default: 0 },
    overhead_cost: { type: Number, default: 0 },
    total_cost: { type: Number, default: 0 },
    
    issued_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    internal_notes: String
}, { timestamps: true });

productionOrderSchema.index({ tenant_id: 1, order_number: 1 }, { unique: true });
productionOrderSchema.index({ tenant_id: 1, status: 1 });

// ── WORK ORDER (OPERATION TRACKING) ──────────────────────────────────────────
const workOrderSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    work_order_number: { type: String, required: true, unique: true },
    production_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder', required: true },
    operation_sequence: { type: Number, required: true },
    operation_name: { type: String, required: true },
    work_center_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkCenter' },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'],
        default: 'pending'
    },
    
    planned_start: Date,
    planned_end: Date,
    actual_start: Date,
    actual_end: Date,
    
    quantity_to_produce: { type: Number, required: true },
    quantity_completed: { type: Number, default: 0 },
    quantity_rejected: { type: Number, default: 0 },
    
    time_logs: [{
        employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        start_time: Date,
        end_time: Date,
        duration_minutes: Number,
        notes: String
    }],
    
    notes: String
}, { timestamps: true });

// ── QUALITY INSPECTION ───────────────────────────────────────────────────────
const qualityInspectionSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    inspection_number: { type: String, required: true, unique: true },
    production_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder', required: true },
    work_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
    inspection_type: { type: String, enum: ['in_process', 'final', 'random'], default: 'final' },
    
    inspector_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    inspection_date: { type: Date, default: Date.now },
    
    quantity_inspected: { type: Number, required: true },
    quantity_accepted: { type: Number, default: 0 },
    quantity_rejected: { type: Number, default: 0 },
    
    status: { type: String, enum: ['pending', 'passed', 'failed', 'conditional'], default: 'pending' },
    
    checklist: [{
        parameter: String,
        specification: String,
        actual_value: String,
        result: { type: String, enum: ['pass', 'fail', 'na'], default: 'pass' },
        remarks: String
    }],
    
    defects: [{
        defect_type: String,
        quantity: Number,
        severity: { type: String, enum: ['minor', 'major', 'critical'], default: 'minor' },
        description: String
    }],
    
    overall_remarks: String,
    corrective_action: String,
    attachments: [String]
}, { timestamps: true });

// ── MATERIAL ISSUE ───────────────────────────────────────────────────────────
const materialIssueSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    issue_number: { type: String, required: true, unique: true },
    production_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder', required: true },
    issue_date: { type: Date, default: Date.now },
    issued_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    items: [{
        item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
        item_name: String,
        item_sku: String,
        required_quantity: Number,
        issued_quantity: Number,
        uom: String,
        warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
        unit_cost: Number,
        total_cost: Number
    }],
    
    total_cost: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'issued', 'cancelled'], default: 'draft' },
    notes: String
}, { timestamps: true });

// ── PRODUCTION SCRAP ─────────────────────────────────────────────────────────
const productionScrapSchema = new mongoose.Schema({
    tenant_id: { type: String, index: true, default: 'default' },
    scrap_number: { type: String, required: true, unique: true },
    production_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder', required: true },
    work_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
    
    scrap_date: { type: Date, default: Date.now },
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    quantity: { type: Number, required: true },
    
    reason: { type: String, enum: ['material_defect', 'machine_error', 'operator_error', 'design_issue', 'other'], required: true },
    description: String,
    
    is_reworkable: { type: Boolean, default: false },
    scrap_value: { type: Number, default: 0 },
    
    reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const BOM = mongoose.models.BOM || mongoose.model('BOM', bomSchema);
const WorkCenter = mongoose.models.WorkCenter || mongoose.model('WorkCenter', workCenterSchema);
const Routing = mongoose.models.Routing || mongoose.model('Routing', routingSchema);
const ProductionOrder = mongoose.models.ProductionOrder || mongoose.model('ProductionOrder', productionOrderSchema);
const WorkOrder = mongoose.models.WorkOrder || mongoose.model('WorkOrder', workOrderSchema);
const QualityInspection = mongoose.models.QualityInspection || mongoose.model('QualityInspection', qualityInspectionSchema);
const MaterialIssue = mongoose.models.MaterialIssue || mongoose.model('MaterialIssue', materialIssueSchema);
const ProductionScrap = mongoose.models.ProductionScrap || mongoose.model('ProductionScrap', productionScrapSchema);

module.exports = {
    BOM,
    WorkCenter,
    Routing,
    ProductionOrder,
    WorkOrder,
    QualityInspection,
    MaterialIssue,
    ProductionScrap
};
