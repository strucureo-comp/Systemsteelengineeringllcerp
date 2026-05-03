const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const companyProfileRoutes = require('./routes/company-profile');
const brandingRoutes = require('./routes/branding');
const financeConfigRoutes = require('./routes/finance-config');
const taxConfigurationRoutes = require('./routes/tax-configuration');
const rolesRoutes = require('./routes/roles');
const modulesRoutes = require('./routes/modules');
const approvalConfigRoutes = require('./routes/approval-config');
const currenciesRoutes = require('./routes/currencies');
const workflowRoutes = require('./routes/workflows');
const taxRoutes = require('./routes/tax');
const financeRoutes = require('./routes/finance');
const taxCenterRoutes = require('./routes/tax-center');
const approvalEngineRoutes = require('./routes/approval-engine');
const notificationsRoutes = require('./routes/notifications');
const receivablesRoutes = require('./routes/receivables');
const payablesRoutes = require('./routes/payables');
const inventoryRoutes = require('./routes/inventory');
const projectRoutes = require('./routes/projects');
const hrmsRoutes = require('./routes/hrms');
const crmRoutes = require('./routes/crm');
const procurementRoutes = require('./routes/procurement');
const manufacturingRoutes = require('./routes/manufacturing');
const supportMeetingRoutes = require('./routes/support-meetings');
const fixedAssetsRoutes = require('./routes/fixed-assets');
const stockJournalRoutes = require('./routes/stock-journal');
const projectOpsRoutes = require('./routes/project-ops');
const miscRoutes = require('./routes/misc');
const reportsRoutes = require('./routes/reports');
const salesDocumentsRoutes = require('./routes/sales-documents');
const vouchersRoutes = require('./routes/vouchers');
const financialAuditRoutes = require('./routes/financial-audit');
const seedCompleteData = require('./seed');

// Upload routes
const uploadsRoute = require('./routes/uploads');
const hrmsUploadsRoutes = require('./routes/hrms-uploads');
const financeUploadsRoutes = require('./routes/finance-uploads');
const procurementUploadsRoutes = require('./routes/procurement-uploads');
const settingsUploadsRoutes = require('./routes/settings-uploads');

const app = express();
const PORT = process.env.PORT || 4000;

// Create uploads directory structure on startup
const UPLOAD_ROOT = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_ROOT)) {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    console.log('[Server] Created uploads directory:', UPLOAD_ROOT);
}

// ============================================================================
// SECURITY MIDDLEWARE (MUST BE APPLIED BEFORE ROUTES)
// ============================================================================

// 1. Helmet - Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Next.js handles CSP on frontend
    crossOriginEmbedderPolicy: false
}));

// 2. CORS
app.use(cors({ 
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000', 
    credentials: true 
}));

// 3. Rate Limiters - Define before routes

// Auth rate limiter - Strict limits for login/password reset
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per IP per 15 minutes
    message: { error: 'Too many authentication attempts. Try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit per IP for auth routes (IPv6-safe)
        return ipKeyGenerator(req);
    }
});

// API rate limiter - Per-tenant to prevent large tenants blocking small ones
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // 300 requests per tenant per minute
    message: { error: 'Rate limit exceeded for your account. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit per tenant, not per IP. Falls back to IPv6-safe IP key.
        return req.user?.tenant_id || ipKeyGenerator(req);
    },
    skip: (req) => {
        // Skip rate limiting for superadmin
        return req.user?.role === 'SuperAdmin';
    }
});

// Upload rate limiter
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 uploads per minute
    message: { error: 'Too many uploads. Try again shortly.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Report rate limiter - Reports are heavy queries
const reportLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 report requests per minute
    message: { error: 'Too many report requests. Try again shortly.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiters to specific routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/reports', reportLimiter);
app.use('/uploads', uploadLimiter);
app.use('/api', apiLimiter); // Apply to all API routes

// 4. NoSQL Injection Sanitizer
// Strips $ and . from request body, query, params
// Prevents attacks like: { "email": { "$gt": "" } }
app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`[Security] NoSQL injection attempt blocked: ${key} from IP ${req.ip}`);
    }
}));

// 5. XSS Sanitizer
// Strips HTML tags from request body
// Prevents stored XSS via form inputs
app.use(xssClean());

// 6. Request size limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 7. Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// Routes
app.use('/api/auth', authRoutes);
// Settings module routes
app.use('/api/settings/company', companyProfileRoutes);
app.use('/api/settings/branding', brandingRoutes);
app.use('/api/settings/finance-config', financeConfigRoutes);
app.use('/api/settings/taxes', taxConfigurationRoutes);
app.use('/api/settings/roles', rolesRoutes);
app.use('/api/settings/modules', modulesRoutes);
app.use('/api/settings/approvals', approvalConfigRoutes);
app.use('/api/settings/currencies', currenciesRoutes);
// Generic settings key-value route (must come after specific settings routes)
app.use('/api/settings', settingsRoutes);
// Other routes
app.use('/api/workflows', workflowRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/tax-center', taxCenterRoutes);
app.use('/api/approval-engine', approvalEngineRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/receivables', receivablesRoutes);
app.use('/api/payables', payablesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/hrms', hrmsRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/sales-documents', salesDocumentsRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/manufacturing', manufacturingRoutes);
app.use('/api/support-meetings', supportMeetingRoutes);
app.use('/api/fixed-assets', fixedAssetsRoutes);
app.use('/api/stock-journal', stockJournalRoutes);
app.use('/api/project-ops', projectOpsRoutes);
app.use('/api/misc', miscRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/vouchers', vouchersRoutes);
app.use('/api/financial-audit', financialAuditRoutes);

// Upload routes (must come after auth routes)
app.use('/uploads', uploadsRoute);
app.use('/api/hrms', hrmsUploadsRoutes);
app.use('/api/finance', financeUploadsRoutes);
app.use('/api/procurement', procurementUploadsRoutes);
app.use('/api/settings', settingsUploadsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic metrics endpoint for monitoring (basic, no auth)
app.get('/api/metrics', async (req, res) => {
    try {
        const mem = process.memoryUsage();
        const uptime = process.uptime();
        const os = require('os');
        const mongoose = require('mongoose');
        const ApprovalRequest = require('./models/ApprovalEngine').ApprovalRequest;

        const pendingApprovals = await ApprovalRequest.countDocuments({ status: 'pending' });
        const usersCount = await mongoose.model('User').countDocuments();

        res.json({
            status: 'ok',
            uptime_seconds: Math.round(uptime),
            memory: {
                rss: mem.rss,
                heapTotal: mem.heapTotal,
                heapUsed: mem.heapUsed,
                external: mem.external
            },
            pendingApprovals,
            usersCount,
            nodeVersion: process.version,
            platform: os.platform(),
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to compute metrics', detail: err.message });
    }
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'BridgeBreak ERP API Docs'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// ============================================================================
// GLOBAL ERROR HANDLER (MUST BE AFTER ALL ROUTES)
// ============================================================================

app.use((err, req, res, next) => {
    // Multer file errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files uploaded at once.' });
    }
    
    if (err.message?.startsWith('File type not allowed')) {
        return res.status(400).json({ error: err.message });
    }

    // Rate limit errors are handled by express-rate-limit itself
    
    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        return res.status(400).json({ 
            error: 'Validation failed', 
            errors 
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        return res.status(409).json({ 
            error: `${field || 'Field'} already exists` 
        });
    }

    // Mongoose CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({ 
            error: `Invalid ${err.path}: ${err.value}` 
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
    }

    // Default error
    console.error('[Server] Unhandled error:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message || 'Internal server error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Start server
async function start() {
    console.log('[Server] CORS_ORIGIN:', process.env.CORS_ORIGIN);
    console.log('[Server] MONGODB_URI loaded:', process.env.MONGODB_URI ? 'Yes' : 'No');
    console.log('[Server] Connecting to MongoDB...');
    await connectDB();
    console.log('[Server] MongoDB connected, starting Express...');

    app.listen(PORT, () => {
        console.log(`\n[Server] BridgeBreak API running on http://localhost:${PORT}`);
        console.log(`[Server] Health: http://localhost:${PORT}/api/health\n`);
    });
}

module.exports = app;

if (require.main === module) {
    start().catch(err => {
        console.error('[Server] Failed to start:', err);
        process.exit(1);
    });
}

// ============================================================================
// UNHANDLED REJECTION HANDLER
// ============================================================================

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Promise Rejection:', reason);
    // In production, you might want to log to external service
    // and gracefully shutdown the server
});

process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught Exception:', error);
    // In production, gracefully shutdown
    process.exit(1);
});
