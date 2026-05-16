const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    },
    token_hash: { 
        type: String, 
        required: true,
        index: true 
    },
    expires_at: { 
        type: Date, 
        required: true
    },
    used: { 
        type: Boolean, 
        default: false,
        index: true 
    },
    used_at: { 
        type: Date 
    },
    ip_address: { 
        type: String 
    },
    user_agent: { 
        type: String 
    }
}, { timestamps: true });

// Auto-delete expired tokens after 24 hours
passwordResetTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
