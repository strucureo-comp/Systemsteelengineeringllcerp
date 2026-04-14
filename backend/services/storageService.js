const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

const ALLOWED_TYPES = {
    documents: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    images: ['image/jpeg', 'image/png', 'image/webp']
};

// Ensure directory exists before saving
const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Build disk storage for a given module/path
const createStorage = (getFolderPath) =>
    multer.diskStorage({
        destination: (req, file, cb) => {
            const folder = getFolderPath(req);
            const fullPath = path.join(UPLOAD_ROOT, folder);
            ensureDir(fullPath);
            cb(null, fullPath);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const uniqueName = `${uuidv4()}${ext}`;
            cb(null, uniqueName);
        }
    });

// Generic uploader factory
const createUploader = ({ getFolderPath, allowedTypes, maxSizeMB = 10 }) =>
    multer({
        storage: createStorage(getFolderPath),
        limits: { fileSize: maxSizeMB * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`File type not allowed: ${file.mimetype}`));
            }
        }
    });

// Delete a file from disk safely
const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error('File delete error:', err);
    }
};

// Resize image using sharp (for avatars and logos)
const resizeImage = async (filePath, width, height) => {
    const resized = filePath.replace(/(\.[\w]+)$/, '_resized$1');
    await sharp(filePath)
        .resize(width, height, { fit: 'cover' })
        .toFile(resized);
    fs.unlinkSync(filePath);
    fs.renameSync(resized, filePath);
};

// ── Specific uploaders per module ──

const hrDocumentUploader = createUploader({
    getFolderPath: (req) => {
        const tenantId = req.user?.tenant_id || 'default';
        return `${tenantId}/hr/employees/${req.params.employeeId}/documents`;
    },
    allowedTypes: ALLOWED_TYPES.documents,
    maxSizeMB: 10
});

const avatarUploader = createUploader({
    getFolderPath: (req) => {
        const tenantId = req.user?.tenant_id || 'default';
        return `${tenantId}/hr/employees/${req.params.employeeId}/avatar`;
    },
    allowedTypes: ALLOWED_TYPES.images,
    maxSizeMB: 3
});

const invoiceAttachmentUploader = createUploader({
    getFolderPath: (req) => {
        const tenantId = req.user?.tenant_id || 'default';
        return `${tenantId}/finance/invoices/${req.params.invoiceId}`;
    },
    allowedTypes: ALLOWED_TYPES.documents,
    maxSizeMB: 20
});

const expenseAttachmentUploader = createUploader({
    getFolderPath: (req) => {
        const tenantId = req.user?.tenant_id || 'default';
        return `${tenantId}/finance/expenses/${req.params.expenseId}`;
    },
    allowedTypes: ALLOWED_TYPES.documents,
    maxSizeMB: 10
});

const poAttachmentUploader = createUploader({
    getFolderPath: (req) => {
        const tenantId = req.user?.tenant_id || 'default';
        return `${tenantId}/procurement/purchase-orders/${req.params.poId}`;
    },
    allowedTypes: ALLOWED_TYPES.documents,
    maxSizeMB: 20
});

const grnAttachmentUploader = createUploader({
    getFolderPath: (req) => {
        const tenantId = req.user?.tenant_id || 'default';
        return `${tenantId}/procurement/grn/${req.params.grnId}`;
    },
    allowedTypes: ALLOWED_TYPES.documents,
    maxSizeMB: 20
});

const logoUploader = createUploader({
    getFolderPath: (req) => {
        const tenantId = req.user?.tenant_id || 'default';
        return `${tenantId}/settings/branding`;
    },
    allowedTypes: ALLOWED_TYPES.images,
    maxSizeMB: 5
});

module.exports = {
    hrDocumentUploader,
    avatarUploader,
    invoiceAttachmentUploader,
    expenseAttachmentUploader,
    poAttachmentUploader,
    grnAttachmentUploader,
    logoUploader,
    deleteFile,
    resizeImage,
    UPLOAD_ROOT,
    ensureDir
};
