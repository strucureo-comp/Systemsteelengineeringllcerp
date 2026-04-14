const Role = require('../models/Role');

// Cache for role permissions (5 minute TTL)
const roleCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getRolePermissions(tenant_id, roleName) {
    const cacheKey = `${tenant_id}:${roleName}`;
    const cached = roleCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.permissions;
    }
    
    const role = await Role.findOne({ 
        tenant_id, 
        name: roleName 
    }).lean();
    
    if (role) {
        roleCache.set(cacheKey, {
            permissions: role.permissions || [],
            timestamp: Date.now()
        });
        return role.permissions || [];
    }
    
    return [];
}

function requirePermission(module, action) {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({ 
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED' 
                });
            }
            
            // Admin/SuperAdmin bypass all permission checks
            const role = (user.role || '').toLowerCase();
            if (role === 'admin' || role === 'superadmin' || role === 'administrator') {
                return next();
            }
            
            // Fetch role permissions
            const tenant_id = user.tenant_id || 'default';
            const permissions = await getRolePermissions(tenant_id, user.role);
            
            // Find permission for this module
            const modulePerm = permissions.find(p => p.module === module);
            
            if (!modulePerm) {
                return res.status(403).json({ 
                    error: `No access to ${module} module`,
                    code: 'MODULE_ACCESS_DENIED',
                    module,
                    action
                });
            }
            
            // Check specific action permission
            if (!modulePerm[action]) {
                return res.status(403).json({ 
                    error: `You don't have ${action} permission on ${module}`,
                    code: 'PERMISSION_DENIED',
                    module,
                    action,
                    required: action
                });
            }
            
            next();
        } catch (error) {
            console.error('[Permission Middleware] Error:', error);
            return res.status(500).json({ 
                error: 'Permission check failed',
                code: 'PERMISSION_CHECK_ERROR' 
            });
        }
    };
}

// Clear cache for a specific tenant/role
function clearRoleCache(tenant_id, roleName) {
    const cacheKey = `${tenant_id}:${roleName}`;
    roleCache.delete(cacheKey);
}

// Clear entire cache
function clearAllRoleCache() {
    roleCache.clear();
}

module.exports = { 
    requirePermission,
    clearRoleCache,
    clearAllRoleCache
};
