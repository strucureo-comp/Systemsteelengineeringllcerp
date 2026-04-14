const mongoose = require('mongoose');

// ── CONDITION ──────────────────────────────────────────────────────────────────
const conditionSchema = new mongoose.Schema({
    field: { type: String, required: true },
    operator: { type: String, required: true, default: '==' },
    value: { type: String, default: '' },
}, { _id: false });

// ── STAGE ──────────────────────────────────────────────────────────────────────
const stageSchema = new mongoose.Schema({
    order: { type: Number, required: true },
    role: { type: String, required: true },
    mode: { type: String, enum: ['sequential', 'parallel'], default: 'sequential' },
    escalateAfterHrs: { type: Number, default: 0 },
}, { _id: false });

// ── APPROVAL WORKFLOW (ENTERPRISE) ────────────────────────────────────────────
const approvalWorkflowV2Schema = new mongoose.Schema({
    name: { type: String, required: true },
    docType: { type: String, required: true, index: true },
    enabled: { type: Boolean, default: true },
    conditions: [conditionSchema],
    stages: [stageSchema],
    autoReject: { type: Boolean, default: false },
    autoRejectDays: { type: Number, default: 0 },
}, { timestamps: true });
approvalWorkflowV2Schema.index({ docType: 1, enabled: 1 });

// ── SOD RULE ──────────────────────────────────────────────────────────────────
const sodRuleSchema = new mongoose.Schema({
    rule: { type: String, required: true },
    applies: { type: String, default: '' },
    risk: { type: String, enum: ['critical', 'high', 'medium'], default: 'high' },
    enforced: { type: Boolean, default: true },
}, { timestamps: true });

// ── APPROVAL REQUEST ────────────────────────────────────────────────────────────
const approvalRequestSchema = new mongoose.Schema({
    reqId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    department: { type: String, required: true },
    requester: { type: String, required: true },
    requesterRole: { type: String, required: true },
    amount: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    description: { type: String },
    metadata: [{ label: String, value: String }],
    documents: [{ type: String }],
    history: [{
        action: String,
        user: String,
        time: String,
        notes: String
    }]
}, { timestamps: true });

const ApprovalWorkflowV2 = mongoose.models.ApprovalWorkflowV2 || mongoose.model('ApprovalWorkflowV2', approvalWorkflowV2Schema);
const SodRule = mongoose.models.SodRule || mongoose.model('SodRule', sodRuleSchema);
const ApprovalRequest = mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', approvalRequestSchema);

module.exports = { ApprovalWorkflowV2, SodRule, ApprovalRequest };
