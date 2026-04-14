const mongoose = require('mongoose');

const ModulesConfigSchema = new mongoose.Schema({
    tenant_id: {
        type: String,
        required: true,
        index: true,
        unique: true,
        default: 'default'
    },
    modules: {
        finance: { type: Boolean, default: true },
        sales: { type: Boolean, default: true },
        operations: { type: Boolean, default: false },
        hr: { type: Boolean, default: false },
        inventory: { type: Boolean, default: true },
        projects: { type: Boolean, default: false },
        manufacturing: { type: Boolean, default: false },
        procurement: { type: Boolean, default: true },
        reports: { type: Boolean, default: true },
        compliance: { type: Boolean, default: false }
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ModulesConfig', ModulesConfigSchema);
