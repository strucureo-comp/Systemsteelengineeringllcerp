/**
 * HR Data Cleanup Script
 * 
 * Purpose: One-time cleanup of legacy HR data inconsistencies
 * - Remove duplicate leave records
 * - Resolve overlapping approved leaves (keep most recent)
 * - Remove invalid leave records (negative/zero duration)
 * - Sync leave type fields (days_per_year <-> max_days)
 * - Normalize visa status values
 * 
 * Usage: node backend/scripts/cleanup-hr-data.js
 * 
 * Date: March 9, 2026
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Load models
require(path.join(__dirname, '../models/HRMS.js'));

const Leave = mongoose.model('Leave');
const LeaveType = mongoose.model('LeaveType');
const Employee = mongoose.model('Employee');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bridgebreak';

async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB');
    } catch (error) {
        console.error('✗ MongoDB connection failed:', error);
        process.exit(1);
    }
}

async function cleanupLeaveRecords() {
    console.log('\n=== CLEANING UP LEAVE RECORDS ===\n');
    
    let removed = 0;
    let fixed = 0;
    
    try {
        // 1. Remove invalid leaves (negative or zero duration)
        console.log('1. Removing invalid leave records (negative/zero duration)...');
        const allLeaves = await Leave.find().lean();
        
        for (const leave of allLeaves) {
            const from = new Date(leave.from_date);
            const to = new Date(leave.to_date);
            const duration = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
            
            if (duration <= 0 || isNaN(duration)) {
                console.log(`  - Removing invalid leave ${leave._id}: ${from.toISOString().split('T')[0]} to ${to.toISOString().split('T')[0]} (duration: ${duration})`);
                await Leave.deleteOne({ _id: leave._id });
                removed++;
            }
        }
        
        console.log(`  ✓ Removed ${removed} invalid leave records\n`);
        
        // 2. Remove exact duplicates
        console.log('2. Removing duplicate leave records...');
        const leaves = await Leave.find().sort({ created_at: 1 }).lean();
        const seenKeys = new Set();
        let duplicatesRemoved = 0;
        
        for (const leave of leaves) {
            const key = `${leave.employee_id}_${leave.from_date}_${leave.to_date}_${leave.status}`;
            
            if (seenKeys.has(key)) {
                console.log(`  - Removing duplicate: Employee ${leave.employee_id}, ${new Date(leave.from_date).toISOString().split('T')[0]} to ${new Date(leave.to_date).toISOString().split('T')[0]}`);
                await Leave.deleteOne({ _id: leave._id });
                duplicatesRemoved++;
            } else {
                seenKeys.add(key);
            }
        }
        
        console.log(`  ✓ Removed ${duplicatesRemoved} duplicate leave records\n`);
        removed += duplicatesRemoved;
        
        // 3. Resolve overlapping approved leaves (keep most recent)
        console.log('3. Resolving overlapping approved leaves...');
        const employees = await Employee.find({ status: 'active' }).select('_id').lean();
        let overlapsResolved = 0;
        
        for (const emp of employees) {
            const approvedLeaves = await Leave.find({
                employee_id: emp._id,
                status: 'approved'
            }).sort({ created_at: -1 }).lean();
            
            if (approvedLeaves.length < 2) continue;
            
            const toKeep = [];
            const toRemove = [];
            
            for (let i = 0; i < approvedLeaves.length; i++) {
                const current = approvedLeaves[i];
                const currentFrom = new Date(current.from_date);
                const currentTo = new Date(current.to_date);
                
                let hasOverlap = false;
                
                for (const kept of toKeep) {
                    const keptFrom = new Date(kept.from_date);
                    const keptTo = new Date(kept.to_date);
                    
                    // Check for overlap
                    if (currentFrom <= keptTo && currentTo >= keptFrom) {
                        hasOverlap = true;
                        break;
                    }
                }
                
                if (hasOverlap) {
                    toRemove.push(current);
                } else {
                    toKeep.push(current);
                }
            }
            
            if (toRemove.length > 0) {
                console.log(`  - Employee ${emp._id}: Removing ${toRemove.length} overlapping leave(s)`);
                for (const leave of toRemove) {
                    await Leave.deleteOne({ _id: leave._id });
                    overlapsResolved++;
                }
            }
        }
        
        console.log(`  ✓ Resolved ${overlapsResolved} overlapping leave records\n`);
        removed += overlapsResolved;
        
    } catch (error) {
        console.error('✗ Error cleaning up leave records:', error);
    }
    
    return { removed, fixed };
}

async function syncLeaveTypeFields() {
    console.log('\n=== SYNCING LEAVE TYPE FIELDS ===\n');
    
    let synced = 0;
    
    try {
        const leaveTypes = await LeaveType.find();
        
        for (const leaveType of leaveTypes) {
            let updated = false;
            
            // Sync days_per_year and max_days
            if (leaveType.days_per_year && !leaveType.max_days) {
                leaveType.max_days = leaveType.days_per_year;
                updated = true;
                console.log(`  - ${leaveType.name}: Set max_days = ${leaveType.max_days} (from days_per_year)`);
            } else if (leaveType.max_days && !leaveType.days_per_year) {
                leaveType.days_per_year = leaveType.max_days;
                updated = true;
                console.log(`  - ${leaveType.name}: Set days_per_year = ${leaveType.days_per_year} (from max_days)`);
            } else if (leaveType.days_per_year !== leaveType.max_days) {
                // Keep days_per_year as source of truth
                leaveType.max_days = leaveType.days_per_year;
                updated = true;
                console.log(`  - ${leaveType.name}: Synchronized max_days = ${leaveType.max_days}`);
            }
            
            // Set default metadata if missing
            if (leaveType.is_paid === undefined) {
                leaveType.is_paid = true;
                updated = true;
            }
            if (leaveType.requires_approval === undefined) {
                leaveType.requires_approval = true;
                updated = true;
            }
            if (leaveType.carry_forward === undefined) {
                leaveType.carry_forward = false;
                updated = true;
            }
            
            if (updated) {
                await leaveType.save();
                synced++;
            }
        }
        
        console.log(`  ✓ Synced ${synced} leave type records\n`);
        
    } catch (error) {
        console.error('✗ Error syncing leave type fields:', error);
    }
    
    return synced;
}

async function normalizeVisaStatus() {
    console.log('\n=== NORMALIZING VISA STATUS VALUES ===\n');
    
    let normalized = 0;
    
    try {
        const employees = await Employee.find({ visa_status: { $exists: true, $ne: null } });
        
        for (const employee of employees) {
            const original = employee.visa_status;
            let newValue = original;
            
            const lower = String(original).toLowerCase().trim();
            
            // Normalize to standard values
            if (['yes', 'true', 'valid', 'active', '1'].includes(lower)) {
                newValue = 'Active';
            } else if (['no', 'false', 'expired', 'inactive', '0'].includes(lower)) {
                newValue = 'Expired';
            } else if (lower === 'pending') {
                newValue = 'Pending';
            } else if (lower === 'processing') {
                newValue = 'Processing';
            } else if (lower === 'rejected') {
                newValue = 'Rejected';
            } else if (lower === 'cancelled') {
                newValue = 'Cancelled';
            }
            
            if (newValue !== original) {
                console.log(`  - Employee ${employee.employee_id || employee._id}: "${original}" → "${newValue}"`);
                employee.visa_status = newValue;
                await employee.save();
                normalized++;
            }
        }
        
        console.log(`  ✓ Normalized ${normalized} visa status values\n`);
        
    } catch (error) {
        console.error('✗ Error normalizing visa status:', error);
    }
    
    return normalized;
}

async function cleanupSeparations() {
    console.log('\n=== CLEANING UP SEPARATION STATUSES ===\n');
    
    let fixed = 0;
    
    try {
        const Separation = mongoose.model('Separation');
        
        // Find cancelled separations with pending clearance/settlement
        const cancelledSeps = await Separation.find({ status: 'cancelled' });
        
        for (const sep of cancelledSeps) {
            let updated = false;
            
            if (sep.clearance_status === 'pending' || sep.clearance_status === 'in_progress') {
                sep.clearance_status = 'completed';
                updated = true;
            }
            
            if (sep.final_settlement_status === 'pending' || sep.final_settlement_status === 'in_progress') {
                sep.final_settlement_status = 'approved';
                updated = true;
            }
            
            if (updated) {
                console.log(`  - Separation ${sep._id}: Updated clearance/settlement status for cancelled record`);
                await sep.save();
                fixed++;
            }
        }
        
        // Ensure employees with cancelled separations are active
        for (const sep of cancelledSeps) {
            const employee = await Employee.findById(sep.employee_id);
            if (employee && employee.status !== 'active') {
                console.log(`  - Employee ${employee.employee_id || employee._id}: Restoring active status (separation cancelled)`);
                employee.status = 'active';
                await employee.save();
                fixed++;
            }
        }
        
        console.log(`  ✓ Fixed ${fixed} cancelled separation records\n`);
        
    } catch (error) {
        console.error('✗ Error cleaning up separations:', error);
    }
    
    return fixed;
}

async function generateReport(stats) {
    console.log('\n═══════════════════════════════════════');
    console.log('    HR DATA CLEANUP REPORT');
    console.log('═══════════════════════════════════════\n');
    
    console.log('Leave Records:');
    console.log(`  - Removed: ${stats.leavesRemoved} records`);
    console.log(`  - Fixed: ${stats.leavesFixed} records\n`);
    
    console.log('Leave Types:');
    console.log(`  - Synced: ${stats.leaveTypesSynced} records\n`);
    
    console.log('Visa Status:');
    console.log(`  - Normalized: ${stats.visaNormalized} records\n`);
    
    console.log('Separations:');
    console.log(`  - Fixed: ${stats.separationsFixed} records\n`);
    
    const total = stats.leavesRemoved + stats.leavesFixed + stats.leaveTypesSynced + 
                  stats.visaNormalized + stats.separationsFixed;
    
    console.log('═══════════════════════════════════════');
    console.log(`TOTAL RECORDS PROCESSED: ${total}`);
    console.log('═══════════════════════════════════════\n');
}

async function main() {
    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║   HR DATA CLEANUP SCRIPT - v1.0       ║');
    console.log('║   Date: March 9, 2026                 ║');
    console.log('╚═══════════════════════════════════════╝\n');
    
    await connectDB();
    
    const stats = {
        leavesRemoved: 0,
        leavesFixed: 0,
        leaveTypesSynced: 0,
        visaNormalized: 0,
        separationsFixed: 0
    };
    
    // Run cleanup tasks
    const leaveResults = await cleanupLeaveRecords();
    stats.leavesRemoved = leaveResults.removed;
    stats.leavesFixed = leaveResults.fixed;
    
    stats.leaveTypesSynced = await syncLeaveTypeFields();
    stats.visaNormalized = await normalizeVisaStatus();
    stats.separationsFixed = await cleanupSeparations();
    
    // Generate report
    await generateReport(stats);
    
    console.log('✓ Cleanup completed successfully!\n');
    
    await mongoose.connection.close();
    console.log('✓ Database connection closed\n');
    
    process.exit(0);
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('\n✗ FATAL ERROR:', error);
        process.exit(1);
    });
}

module.exports = { main };
