const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    tenant_id: { 
        type: String, 
        default: 'default', 
        required: true,
        index: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true,
        match: [/\S+@\S+\.\S+/, 'Invalid email format']
    },
    password: { 
        type: String, 
        required: true, 
        minlength: [6, 'Password must be at least 6 characters'] 
    },
    full_name: { 
        type: String, 
        required: true, 
        trim: true,
        minlength: [2, 'Name must be at least 2 characters']
    },
    role: { 
        type: String, 
        trim: true, 
        default: 'Employee',
        index: true
    },
    avatar_url: { type: String, default: null },
    signature_url: { type: String, default: null },
    acknowledgement_title: { type: String, default: 'RECEIVER ACKNOWLEDGEMENT' },
    acknowledgement_signature_label: { type: String, default: 'SIGNATURE / COMPANY STAMP' },
    acknowledgement_name_label: { type: String, default: 'NAME' },
    is_active: { 
        type: Boolean, 
        default: true,
        index: true
    },
    status: { 
        type: String, 
        enum: ['active', 'pending', 'disabled'], 
        default: 'active',
        index: true
    },
    invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    invited_at: { type: Date },
    last_login: { type: Date },
    invitation_token: { type: String },
    invitation_expires: { type: Date },
    password_reset_token: { type: String },
    password_reset_expires: { type: Date },
}, { timestamps: true });

// ============================================================================
// INDEXES
// ============================================================================

// Compound indexes for common queries
userSchema.index({ tenant_id: 1, createdAt: -1 });
userSchema.index({ tenant_id: 1, role: 1 });
userSchema.index({ tenant_id: 1, status: 1 });
userSchema.index({ tenant_id: 1, is_active: 1 });
userSchema.index({ email: 1 }, { unique: true });

// Sparse indexes for optional fields
userSchema.index({ invitation_token: 1 }, { sparse: true });
userSchema.index({ password_reset_token: 1 }, { sparse: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
