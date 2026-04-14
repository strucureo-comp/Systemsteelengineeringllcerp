const mongoose = require('mongoose');

// ── SUPPORT REQUEST ─────────────────────────────────────────────────────────
const supportRequestSchema = new mongoose.Schema({
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project_id: { type: String }, // Optional link to project
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    attachment_url: String
}, { timestamps: true });

// ── MEETING REQUEST ──────────────────────────────────────────────────────────
const meetingRequestSchema = new mongoose.Schema({
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project_id: { type: String }, // Optional link to project
    requested_date: { type: Date, required: true },
    duration_minutes: { type: Number, default: 30 },
    purpose: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'completed'],
        default: 'pending'
    },
    meeting_link: String,
    admin_notes: String
}, { timestamps: true });

const SupportRequest = mongoose.models.SupportRequest || mongoose.model('SupportRequest', supportRequestSchema);
const MeetingRequest = mongoose.models.MeetingRequest || mongoose.model('MeetingRequest', meetingRequestSchema);

module.exports = {
    SupportRequest,
    MeetingRequest
};
