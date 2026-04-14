const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
    module: {
        type: String,
        required: true
    },
    view: {
        type: Boolean,
        default: false
    },
    create: {
        type: Boolean,
        default: false
    },
    edit: {
        type: Boolean,
        default: false
    },
    approve: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const RoleSchema = new mongoose.Schema({
    tenant_id: {
        type: String,
        required: true,
        index: true,
        default: 'default'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    permissions: [PermissionSchema],
    isDefault: {
        type: Boolean,
        default: false
    },
    isCustom: {
        type: Boolean,
        default: false
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index for tenant + name uniqueness
RoleSchema.index({ tenant_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Role', RoleSchema);
