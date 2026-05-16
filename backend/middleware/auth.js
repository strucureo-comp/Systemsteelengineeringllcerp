const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function auth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
        }

        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // OPTIMIZATION: Select only needed fields and use lean() for faster fetching
            const user = await User.findById(decoded.userId)
                .select('tenant_id role is_active full_name email status')
                .lean();

            if (!user || user.status === 'inactive') {
                return res.status(401).json({ error: 'User not found or inactive', code: 'USER_INACTIVE' });
            }

            req.user = user;
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
        }
    } catch (error) {
        console.error('[Auth Middleware] Error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

function adminOnly(req, res, next) {
    const role = (req.user.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin' && role !== 'administrator') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = { auth, adminOnly };
