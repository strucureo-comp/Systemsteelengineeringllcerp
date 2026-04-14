const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
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
    device_info: { 
        type: String 
    },
    ip_address: { 
        type: String 
    },
    user_agent: { 
        type: String 
    },
    revoked: { 
        type: Boolean, 
        default: false,
        index: true 
    },
    revoked_at: { 
        type: Date 
    },
    last_used: { 
        type: Date,
        default: Date.now 
    }
}, { timestamps: true });

// Auto-delete expired tokens after 30 days
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
