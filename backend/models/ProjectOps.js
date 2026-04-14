const mongoose = require('mongoose');

// ── TIMESHEET ───────────────────────────────────────────────────────────────
const timesheetSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    project_id: { type: String, required: true },
    date: { type: Date, required: true },
    hours: { type: Number, required: true },
    task: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ── RESOURCE BOOKING ─────────────────────────────────────────────────────────
const resourceBookingSchema = new mongoose.Schema({
    resource_type: { type: String, enum: ['equipment', 'vehicle', 'personnel'], required: true },
    resource_id: { type: String, required: true },
    project_id: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'ongoing', 'completed', 'cancelled'], default: 'scheduled' },
    notes: String
}, { timestamps: true });

const Timesheet = mongoose.models.Timesheet || mongoose.model('Timesheet', timesheetSchema);
const ResourceBooking = mongoose.models.ResourceBooking || mongoose.model('ResourceBooking', resourceBookingSchema);

module.exports = {
    Timesheet,
    ResourceBooking
};
