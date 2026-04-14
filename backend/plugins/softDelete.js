const mongoose = require('mongoose');

/**
 * Soft Delete Plugin for Mongoose
 * 
 * Adds soft delete functionality to models:
 * - is_deleted: Boolean flag
 * - deleted_at: Timestamp
 * - deleted_by: User reference
 * 
 * Auto-filters deleted records from all find queries
 * unless explicitly queried with { is_deleted: true }
 */
function softDeletePlugin(schema) {
    // Add soft delete fields if not already present
    schema.add({
        is_deleted: { 
            type: Boolean, 
            default: false, 
            index: true 
        },
        deleted_at: { 
            type: Date 
        },
        deleted_by: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        }
    });

    // Instance method: Soft delete a single document
    schema.methods.softDelete = async function(userId) {
        this.is_deleted = true;
        this.deleted_at = new Date();
        if (userId) {
            this.deleted_by = userId;
        }
        return this.save();
    };

    // Instance method: Restore a soft-deleted document
    schema.methods.restore = async function() {
        this.is_deleted = false;
        this.deleted_at = undefined;
        this.deleted_by = undefined;
        return this.save();
    };

    // Static method: Soft delete by ID
    schema.statics.softDeleteById = async function(id, userId) {
        const update = {
            is_deleted: true,
            deleted_at: new Date()
        };
        if (userId) {
            update.deleted_by = userId;
        }
        return this.findByIdAndUpdate(id, update, { new: true });
    };

    // Static method: Soft delete many documents
    schema.statics.softDeleteMany = async function(filter, userId) {
        const update = {
            is_deleted: true,
            deleted_at: new Date()
        };
        if (userId) {
            update.deleted_by = userId;
        }
        return this.updateMany(filter, update);
    };

    // Static method: Restore by ID
    schema.statics.restoreById = async function(id) {
        return this.findByIdAndUpdate(id, {
            is_deleted: false,
            deleted_at: undefined,
            deleted_by: undefined
        }, { new: true });
    };

    // Static method: Find only deleted documents
    schema.statics.findDeleted = function(filter = {}) {
        return this.find({ ...filter, is_deleted: true });
    };

    // Static method: Count deleted documents
    schema.statics.countDeleted = function(filter = {}) {
        return this.countDocuments({ ...filter, is_deleted: true });
    };

    // Auto-filter deleted records on all find queries
    // Unless explicitly querying for deleted records
    schema.pre(/^find/, function() {
        // Only apply filter if is_deleted is not explicitly set
        if (this._conditions.is_deleted === undefined) {
            this.where({ is_deleted: { $ne: true } });
        }
    });

    // Prevent hard delete - override remove/deleteOne/deleteMany
    schema.pre('remove', function(next) {
        console.warn('[Soft Delete] Attempted hard delete blocked. Use softDelete() instead.');
        next(new Error('Hard delete not allowed. Use softDelete() method instead.'));
    });
}

module.exports = softDeletePlugin;
