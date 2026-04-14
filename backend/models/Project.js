const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: String,
    status: {
        type: String,
        enum: ['pending', 'accepted', 'in_progress', 'testing', 'completed', 'cancelled'],
        default: 'pending'
    },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    progress: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
