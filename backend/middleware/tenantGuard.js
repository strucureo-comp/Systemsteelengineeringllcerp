/**
 * Tenant Isolation Middleware
 * Ensures users can only access documents from their own tenant
 * 
 * Usage:
 * const { tenantGuard } = require('../middleware/tenantGuard');
 * router.get('/invoices/:id', auth, tenantGuard(InvoiceAR), async (req, res) => { ... });
 */

/**
 * Create tenant guard middleware for a specific model
 * @param {Model} Model - Mongoose model to check
 * @param {string} idParam - Name of the ID parameter (default: 'id')
 * @returns {Function} Express middleware
 */
function tenantGuard(Model, idParam = 'id') {
    return async (req, res, next) => {
        try {
            // Skip if no ID parameter
            if (!req.params[idParam]) {
                return next();
            }

            const docId = req.params[idParam];
            
            // Validate ObjectId format
            if (!docId.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ 
                    error: 'Invalid ID format',
                    code: 'INVALID_ID' 
                });
            }

            // Fetch document with only tenant_id field
            const doc = await Model.findById(docId).select('tenant_id').lean();

            if (!doc) {
                return res.status(404).json({ 
                    error: 'Document not found',
                    code: 'NOT_FOUND' 
                });
            }

            // Check tenant isolation
            const userTenantId = req.user?.tenant_id || 'default';
            const docTenantId = doc.tenant_id || 'default';

            if (docTenantId !== userTenantId) {
                console.warn(`[Tenant Guard] Access denied: User tenant ${userTenantId} tried to access document from tenant ${docTenantId}`);
                return res.status(403).json({ 
                    error: 'Access denied - tenant mismatch',
                    code: 'TENANT_MISMATCH' 
                });
            }

            // Attach document ID to request for convenience
            req.documentId = docId;
            next();
        } catch (error) {
            console.error('[Tenant Guard] Error:', error);
            return res.status(500).json({ 
                error: 'Tenant validation failed',
                code: 'TENANT_GUARD_ERROR' 
            });
        }
    };
}

/**
 * Ensure query filters include tenant_id
 * Use this middleware on list/search endpoints
 */
function ensureTenantFilter(req, res, next) {
    const userTenantId = req.user?.tenant_id || 'default';
    
    // Add tenant_id to query if not present
    if (!req.query.tenant_id) {
        req.query.tenant_id = userTenantId;
    }
    
    // Prevent querying other tenants
    if (req.query.tenant_id !== userTenantId) {
        return res.status(403).json({ 
            error: 'Cannot query other tenants',
            code: 'TENANT_QUERY_DENIED' 
        });
    }
    
    next();
}

/**
 * Attach tenant_id to request body for create operations
 */
function attachTenantId(req, res, next) {
    const userTenantId = req.user?.tenant_id || 'default';
    
    if (req.body && !req.body.tenant_id) {
        req.body.tenant_id = userTenantId;
    }
    
    // Prevent creating documents for other tenants
    if (req.body.tenant_id !== userTenantId) {
        return res.status(403).json({ 
            error: 'Cannot create documents for other tenants',
            code: 'TENANT_CREATE_DENIED' 
        });
    }
    
    next();
}

module.exports = {
    tenantGuard,
    ensureTenantFilter,
    attachTenantId
};
