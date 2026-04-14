const fs = require('fs');
const path = require('path');
const Attachment = require('../models/Attachment');
const { UPLOAD_ROOT } = require('../services/storageService');

/**
 * Storage Maintenance Job
 * Run weekly via cron to clean up orphaned files and monitor disk usage
 */

// ═══════════════════════════════════════
// 1. ORPHAN CLEANUP
// ═══════════════════════════════════════
async function cleanupOrphanedFiles() {
    console.log('[Storage Maintenance] Starting orphan cleanup...');
    
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Find soft-deleted attachments older than 30 days
        const orphanedAttachments = await Attachment.find({
            is_deleted: true,
            deleted_at: { $lt: thirtyDaysAgo }
        });

        let deletedCount = 0;
        let errorCount = 0;

        for (const attachment of orphanedAttachments) {
            try {
                const filePath = path.join(UPLOAD_ROOT, attachment.file_path);
                
                // Confirm file is deleted from disk
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`[Storage Maintenance] Deleted orphaned file: ${attachment.file_path}`);
                }

                // Remove Attachment record from DB permanently
                await Attachment.deleteOne({ _id: attachment._id });
                deletedCount++;
            } catch (err) {
                console.error(`[Storage Maintenance] Error deleting ${attachment.file_path}:`, err);
                errorCount++;
            }
        }

        console.log(`[Storage Maintenance] Orphan cleanup complete: ${deletedCount} deleted, ${errorCount} errors`);
        return { deletedCount, errorCount };
    } catch (error) {
        console.error('[Storage Maintenance] Orphan cleanup failed:', error);
        throw error;
    }
}

// ═══════════════════════════════════════
// 2. DISK USAGE REPORT
// ═══════════════════════════════════════
function getDirectorySize(dirPath) {
    let totalSize = 0;

    if (!fs.existsSync(dirPath)) {
        return 0;
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            totalSize += getDirectorySize(filePath);
        } else {
            totalSize += stats.size;
        }
    }

    return totalSize;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

async function generateDiskUsageReport() {
    console.log('[Storage Maintenance] Generating disk usage report...');
    
    try {
        const report = [];
        const tenantDirs = fs.readdirSync(UPLOAD_ROOT);
        const ALERT_THRESHOLD_GB = 10;
        const ALERT_THRESHOLD_BYTES = ALERT_THRESHOLD_GB * 1024 * 1024 * 1024;

        for (const tenantId of tenantDirs) {
            const tenantPath = path.join(UPLOAD_ROOT, tenantId);
            const stats = fs.statSync(tenantPath);

            if (stats.isDirectory()) {
                const size = getDirectorySize(tenantPath);
                const sizeFormatted = formatBytes(size);
                const sizeGB = size / (1024 * 1024 * 1024);

                report.push({
                    tenantId,
                    size,
                    sizeFormatted,
                    sizeGB: sizeGB.toFixed(2),
                    alert: size > ALERT_THRESHOLD_BYTES
                });

                console.log(`[Storage Maintenance] Tenant ${tenantId}: ${sizeFormatted} (${sizeGB.toFixed(2)} GB)`);

                if (size > ALERT_THRESHOLD_BYTES) {
                    console.warn(`[Storage Maintenance] ⚠️  ALERT: Tenant ${tenantId} exceeds ${ALERT_THRESHOLD_GB}GB threshold!`);
                }
            }
        }

        // Calculate total usage
        const totalSize = report.reduce((sum, r) => sum + r.size, 0);
        console.log(`[Storage Maintenance] Total disk usage: ${formatBytes(totalSize)}`);

        return report;
    } catch (error) {
        console.error('[Storage Maintenance] Disk usage report failed:', error);
        throw error;
    }
}

// ═══════════════════════════════════════
// 3. MISSING FILE CHECK
// ═══════════════════════════════════════
async function checkMissingFiles() {
    console.log('[Storage Maintenance] Checking for missing files...');
    
    try {
        const activeAttachments = await Attachment.find({ is_deleted: false });
        const missingFiles = [];

        for (const attachment of activeAttachments) {
            const filePath = path.join(UPLOAD_ROOT, attachment.file_path);
            
            if (!fs.existsSync(filePath)) {
                missingFiles.push({
                    id: attachment._id,
                    file_path: attachment.file_path,
                    reference_type: attachment.reference_type,
                    reference_id: attachment.reference_id,
                    uploaded_at: attachment.uploaded_at
                });
                
                console.warn(`[Storage Maintenance] ⚠️  Missing file: ${attachment.file_path}`);
            }
        }

        if (missingFiles.length > 0) {
            console.warn(`[Storage Maintenance] Found ${missingFiles.length} missing files!`);
            // Optionally: Mark these attachments as deleted or send alert
        } else {
            console.log('[Storage Maintenance] All files present and accounted for.');
        }

        return missingFiles;
    } catch (error) {
        console.error('[Storage Maintenance] Missing file check failed:', error);
        throw error;
    }
}

// ═══════════════════════════════════════
// 4. EXPIRY ALERTS (for HR documents)
// ═══════════════════════════════════════
async function checkExpiringDocuments() {
    console.log('[Storage Maintenance] Checking for expiring documents...');
    
    try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringDocs = await Attachment.find({
            is_deleted: false,
            expiry_date: {
                $exists: true,
                $ne: null,
                $lte: thirtyDaysFromNow
            }
        }).populate('reference_id');

        if (expiringDocs.length > 0) {
            console.warn(`[Storage Maintenance] ⚠️  ${expiringDocs.length} documents expiring within 30 days:`);
            
            expiringDocs.forEach(doc => {
                console.warn(`  - ${doc.document_type} (${doc.original_name}) expires on ${doc.expiry_date.toLocaleDateString()}`);
            });
        } else {
            console.log('[Storage Maintenance] No documents expiring soon.');
        }

        return expiringDocs;
    } catch (error) {
        console.error('[Storage Maintenance] Expiry check failed:', error);
        throw error;
    }
}

// ═══════════════════════════════════════
// MAIN MAINTENANCE RUNNER
// ═══════════════════════════════════════
async function runStorageMaintenance() {
    console.log('\n═══════════════════════════════════════');
    console.log('STORAGE MAINTENANCE JOB STARTED');
    console.log('═══════════════════════════════════════\n');

    try {
        // 1. Cleanup orphaned files
        const cleanupResult = await cleanupOrphanedFiles();

        // 2. Generate disk usage report
        const diskReport = await generateDiskUsageReport();

        // 3. Check for missing files
        const missingFiles = await checkMissingFiles();

        // 4. Check expiring documents
        const expiringDocs = await checkExpiringDocuments();

        console.log('\n═══════════════════════════════════════');
        console.log('STORAGE MAINTENANCE JOB COMPLETED');
        console.log('═══════════════════════════════════════\n');

        return {
            success: true,
            cleanup: cleanupResult,
            diskReport,
            missingFiles,
            expiringDocs
        };
    } catch (error) {
        console.error('\n═══════════════════════════════════════');
        console.error('STORAGE MAINTENANCE JOB FAILED');
        console.error('═══════════════════════════════════════\n');
        console.error(error);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Export for manual execution or cron job
module.exports = {
    runStorageMaintenance,
    cleanupOrphanedFiles,
    generateDiskUsageReport,
    checkMissingFiles,
    checkExpiringDocuments
};

// Allow running directly: node backend/jobs/storageMaintenance.js
if (require.main === module) {
    const connectDB = require('../config/db');
    
    connectDB()
        .then(() => runStorageMaintenance())
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Maintenance job error:', err);
            process.exit(1);
        });
}
