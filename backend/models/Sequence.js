const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
    tenant_id: { 
        type: String, 
        required: true,
        index: true,
        default: 'default'
    },
    key: { 
        type: String, 
        required: true,
        index: true 
    },
    value: { 
        type: Number, 
        required: true,
        default: 0 
    },
    prefix: {
        type: String,
        default: ''
    },
    pad_length: {
        type: Number,
        default: 4
    }
}, { timestamps: true });

// Compound unique index for tenant + key
sequenceSchema.index({ tenant_id: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Sequence', sequenceSchema);
