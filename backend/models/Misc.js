const mongoose = require('mongoose');

// ── PLANNING NOTE ────────────────────────────────────────────────────────────
const planningNoteSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: {
        type: String,
        enum: ['idea', 'strategy', 'todo', 'other'],
        default: 'idea'
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ── ENQUIRY (CONTACT FORM) ──────────────────────────────────────────────────
const enquirySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: String,
    message: { type: String, required: true },
    phone: String,
    status: {
        type: String,
        enum: ['new', 'read', 'replied', 'converted'],
        default: 'new'
    }
}, { timestamps: true });

const PlanningNote = mongoose.models.PlanningNote || mongoose.model('PlanningNote', planningNoteSchema);
const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema);

module.exports = {
    PlanningNote,
    Enquiry
};
