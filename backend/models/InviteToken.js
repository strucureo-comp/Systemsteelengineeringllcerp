const mongoose = require('mongoose');

const inviteTokenSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true,
        lowercase: true,
        trim: true,
        index: true 
    },
    role: { 
        type: String, 
        required: true,
        default: 'Employee' 
    },
    tenant_id: { 
        type: String, 
        required: true,
        default: 'default',
        index: true 
    },
    token_hash: { 
        type: String, 
        required: true,
        unique: true,
        index: true 
    },
    expires_at: { 
        type: Date, 
        required: true,
        index: true 
    },
    invited_by: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    modules: [{ 
        type: String 
    }],
    used: { 
        type: Boolean, 
        default: false,
        index: true 
    },
    used_at: { 
        type: Date 
    },
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }
}, { timestamps: true });

// Auto-delete expired tokens after 48 hours
inviteTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 172800 });

module.exports = mongoose.model('InviteToken', inviteTokenSchema);
