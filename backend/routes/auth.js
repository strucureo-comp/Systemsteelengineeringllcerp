const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const RefreshToken = require('../models/RefreshToken');
const InviteToken = require('../models/InviteToken');
const { Employee } = require('../models/HRMS');
const { auth, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
    loginValidator,
    registerValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    inviteValidator,
    acceptInviteValidator
} = require('../validators/authValidators');

const router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// PUT /api/auth/me - Move to top to ensure no interception
router.put('/me', auth, async (req, res) => {
    try {
        const { 
            full_name, password, signature_url,
            acknowledgement_title, acknowledgement_signature_label, acknowledgement_name_label
        } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (full_name) user.full_name = full_name;
        if (signature_url !== undefined) user.signature_url = signature_url;
        
        if (acknowledgement_title) user.acknowledgement_title = acknowledgement_title;
        if (acknowledgement_signature_label) user.acknowledgement_signature_label = acknowledgement_signature_label;
        if (acknowledgement_name_label) user.acknowledgement_name_label = acknowledgement_name_label;
        
        if (password) {
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.valid) {
                return res.status(400).json({ error: passwordValidation.error });
            }
            user.password = password;
        }

        await user.save();
        res.json({ success: true, user: user.toJSON() });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

function generateAccessToken(user) {
    return jwt.sign(
        { userId: user._id, role: user.role, tenant_id: user.tenant_id },
        process.env.JWT_SECRET,
        { expiresIn: '8h' } // 8 hour working day
    );
}

async function generateRefreshToken(user, req) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    
    const refreshToken = await RefreshToken.create({
        user_id: user._id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        device_info: req.headers['user-agent'] || 'Unknown',
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
    });
    
    return rawToken;
}

function validatePassword(password) {
    // Min 8 chars, 1 uppercase, 1 number, 1 special char
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!minLength) return { valid: false, error: 'Password must be at least 8 characters' };
    if (!hasUppercase) return { valid: false, error: 'Password must contain at least one uppercase letter' };
    if (!hasNumber) return { valid: false, error: 'Password must contain at least one number' };
    if (!hasSpecial) return { valid: false, error: 'Password must contain at least one special character' };
    
    return { valid: true };
}

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

// POST /api/auth/signup
router.post('/signup', validate(registerValidator), async (req, res) => {
    try {
        const { email, password, full_name } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.error });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() }).lean();
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Determine role: First user is always Admin
        const userCount = await User.countDocuments();
        const role = userCount === 0 ? 'Admin' : 'Employee';

        const user = await User.create({
            email: email.toLowerCase(),
            password,
            full_name,
            role,
            tenant_id: 'default'
        });

        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user, req);

        res.status(201).json({
            user: user.toJSON(),
            token: accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('[Auth] Signup Error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', validate(loginValidator), async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.is_active || user.status === 'disabled') {
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        user.last_login = new Date();
        user.status = 'active';
        await user.save();

        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user, req);

        res.json({
            user: user.toJSON(),
            token: accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('[Auth] Login Error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        // Find all non-expired, non-revoked refresh tokens
        const tokens = await RefreshToken.find({
            expires_at: { $gt: new Date() },
            revoked: false
        }).populate('user_id');

        // Find matching token by comparing hashes
        let matchedToken = null;
        for (const token of tokens) {
            const isMatch = await bcrypt.compare(refreshToken, token.token_hash);
            if (isMatch) {
                matchedToken = token;
                break;
            }
        }

        if (!matchedToken) {
            return res.status(401).json({ error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' });
        }

        const user = matchedToken.user_id;
        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Update last used timestamp
        matchedToken.last_used = new Date();
        await matchedToken.save();

        // Generate new access token
        const accessToken = generateAccessToken(user);

        const userJson = user.toJSON ? user.toJSON() : user;
        res.json({
            token: accessToken,
            user: userJson
        });
    } catch (error) {
        console.error('[Auth] Refresh Error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

// POST /api/auth/logout - Invalidate refresh token
router.post('/logout', auth, async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // Find and revoke the refresh token
            const tokens = await RefreshToken.find({
                user_id: req.user._id,
                revoked: false
            });

            for (const token of tokens) {
                const isMatch = await bcrypt.compare(refreshToken, token.token_hash);
                if (isMatch) {
                    token.revoked = true;
                    token.revoked_at = new Date();
                    await token.save();
                    break;
                }
            }
        }

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('[Auth] Logout Error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
    // If req.user is a lean object (from optimization), it won't have .toJSON()
    const userJson = req.user.toJSON ? req.user.toJSON() : req.user;
    res.json({ user: userJson });
});


// ============================================================================
// PASSWORD RESET ROUTES
// ============================================================================

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordValidator), async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Always return success to prevent email enumeration
        const user = await User.findOne({ email: email.toLowerCase() }).lean();
        
        if (user) {
            // Generate raw token
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = await bcrypt.hash(rawToken, 10);
            
            // Save token to database
            await PasswordResetToken.create({
                user_id: user._id,
                token_hash: tokenHash,
                expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent']
            });
            
            // Send password reset email
            const { sendEmail } = require('../services/emailService');
            const { passwordResetEmail } = require('../services/emailTemplates');
            
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
            const { subject, html } = passwordResetEmail({
                userName: user.full_name,
                resetUrl,
                company: { name: process.env.COMPANY_NAME || 'ERP System' }
            });
            
            await sendEmail({
                to: user.email,
                subject,
                html,
                reference_type: 'password_reset',
                reference_id: user._id
            });
            
            console.log(`[Password Reset] Token for ${email}: ${rawToken}`);
            console.log(`[Password Reset] Link: ${resetUrl}`);
        }

        // Always return success
        res.json({ 
            success: true, 
            message: 'If an account exists with that email, a password reset link has been sent.' 
        });
    } catch (error) {
        console.error('[Auth] Forgot Password Error:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', validate(resetPasswordValidator), async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.error });
        }

        // Find all non-expired, non-used tokens
        const tokens = await PasswordResetToken.find({
            expires_at: { $gt: new Date() },
            used: false
        });

        // Find matching token by comparing hashes
        let matchedToken = null;
        for (const dbToken of tokens) {
            const isMatch = await bcrypt.compare(token, dbToken.token_hash);
            if (isMatch) {
                matchedToken = dbToken;
                break;
            }
        }

        if (!matchedToken) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Get user and update password
        const user = await User.findById(matchedToken.user_id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.password = newPassword; // Will be hashed by pre-save hook
        await user.save();

        // Mark token as used
        matchedToken.used = true;
        matchedToken.used_at = new Date();
        await matchedToken.save();

        // Invalidate all other reset tokens for this user
        await PasswordResetToken.updateMany(
            { user_id: user._id, _id: { $ne: matchedToken._id }, used: false },
            { used: true, used_at: new Date() }
        );

        // Revoke all refresh tokens (force re-login)
        await RefreshToken.updateMany(
            { user_id: user._id, revoked: false },
            { revoked: true, revoked_at: new Date() }
        );

        res.json({ 
            success: true, 
            message: 'Password reset successfully. Please log in with your new password.' 
        });
    } catch (error) {
        console.error('[Auth] Reset Password Error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// ============================================================================
// USER INVITATION ROUTES
// ============================================================================

// POST /api/auth/invite - Invite new user
router.post('/invite', auth, adminOnly, validate(inviteValidator), async (req, res) => {
    try {
        const { email, role, modules } = req.body;
        const tenant_id = req.user?.tenant_id || 'default';

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() }).lean();
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Check if there's already a pending invite
        const existingInvite = await InviteToken.findOne({
            email: email.toLowerCase(),
            tenant_id,
            used: false,
            expires_at: { $gt: new Date() }
        }).lean();

        if (existingInvite) {
            return res.status(400).json({ error: 'An invitation has already been sent to this email' });
        }

        // Generate invitation token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 10);

        const invite = await InviteToken.create({
            email: email.toLowerCase(),
            role: role || 'Employee',
            tenant_id,
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
            invited_by: req.user._id,
            modules: modules || []
        });

        // Send invitation email
        const { sendEmail } = require('../services/emailService');
        const { inviteEmail } = require('../services/emailTemplates');
        
        const signupUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${rawToken}`;
        const { subject, html } = inviteEmail({
            invitedBy: req.user,
            role: role || 'Employee',
            company: { name: process.env.COMPANY_NAME || 'ERP System' },
            signupUrl
        });
        
        await sendEmail({
            tenant_id,
            to: email,
            subject,
            html,
            reference_type: 'user_invite',
            reference_id: invite._id,
            sent_by: req.user._id
        });

        console.log(`[User Invite] Token for ${email}: ${rawToken}`);
        console.log(`[User Invite] Link: ${signupUrl}`);

        res.status(201).json({
            success: true,
            message: `Invitation sent to ${email}`,
            invite: {
                id: invite._id,
                email: invite.email,
                role: invite.role,
                expires_at: invite.expires_at
            }
        });
    } catch (error) {
        console.error('[Auth] Invite Error:', error);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

// GET /api/auth/invites - List pending invites
router.get('/invites', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const invites = await InviteToken.find({
            tenant_id,
            used: false,
            expires_at: { $gt: new Date() }
        })
        .populate('invited_by', 'full_name email')
        .sort({ createdAt: -1 })
        .lean();

        res.json({ success: true, data: invites });
    } catch (error) {
        console.error('[Auth] List Invites Error:', error);
        res.status(500).json({ error: 'Failed to fetch invitations' });
    }
});

// DELETE /api/auth/invites/:id - Cancel invitation
router.delete('/invites/:id', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        
        const invite = await InviteToken.findOne({
            _id: req.params.id,
            tenant_id
        });

        if (!invite) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        if (invite.used) {
            return res.status(400).json({ error: 'Invitation has already been accepted' });
        }

        await InviteToken.deleteOne({ _id: invite._id });

        res.json({ success: true, message: 'Invitation cancelled' });
    } catch (error) {
        console.error('[Auth] Cancel Invite Error:', error);
        res.status(500).json({ error: 'Failed to cancel invitation' });
    }
});

// POST /api/auth/accept-invite - Accept invitation and create account
router.post('/accept-invite', validate(acceptInviteValidator), async (req, res) => {
    try {
        const { token, full_name, password } = req.body;

        if (!token || !full_name || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.error });
        }

        // Find matching invite token
        const invites = await InviteToken.find({
            used: false,
            expires_at: { $gt: new Date() }
        });

        let matchedInvite = null;
        for (const invite of invites) {
            const isMatch = await bcrypt.compare(token, invite.token_hash);
            if (isMatch) {
                matchedInvite = invite;
                break;
            }
        }

        if (!matchedInvite) {
            return res.status(400).json({ error: 'Invalid or expired invitation token' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: matchedInvite.email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            email: matchedInvite.email,
            password,
            full_name,
            role: matchedInvite.role,
            tenant_id: matchedInvite.tenant_id,
            status: 'active',
            is_active: true
        });

        // Create employee record stub
        try {
            await Employee.create({
                employee_id: `EMP-${Date.now()}`,
                name: full_name,
                email: matchedInvite.email,
                user_id: user._id,
                status: 'active'
            });
        } catch (empError) {
            console.warn('[Auth] Failed to create employee record:', empError.message);
            // Continue even if employee creation fails
        }

        // Mark invite as used
        matchedInvite.used = true;
        matchedInvite.used_at = new Date();
        matchedInvite.user_id = user._id;
        await matchedInvite.save();

        // Generate tokens and auto-login
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user, req);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: user.toJSON(),
            token: accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('[Auth] Accept Invite Error:', error);
        res.status(500).json({ error: 'Failed to accept invitation' });
    }
});

// ============================================================================
// USER MANAGEMENT ROUTES (Admin)
// ============================================================================

// GET /api/auth/users
router.get('/users', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const skip = (page - 1) * limit;
        const role = req.query.role;
        const type = req.query.type;

        const filter = { tenant_id };
        if (role) {
            filter.role = role;
        } else if (type === 'employee') {
            filter.role = 'Employee';
        } else if (type === 'system') {
            filter.role = { $ne: 'Employee' };
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-password')
                .populate('invited_by', 'full_name')
                .sort({ full_name: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter)
        ]);

        res.json({ 
            success: true, 
            data: users,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/auth/users/:id
router.get('/users/:id', auth, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const user = await User.findOne({ _id: req.params.id, tenant_id }).select('-password').lean();
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
});

// PUT /api/auth/users/:id
router.put('/users/:id', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const { full_name, email, role, status } = req.body;

        const user = await User.findOne({ _id: req.params.id, tenant_id });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (full_name) user.full_name = full_name;
        if (email) user.email = email.toLowerCase();
        if (role) user.role = role;
        if (status) user.status = status;
        if (req.body.signature_url !== undefined) user.signature_url = req.body.signature_url;

        if (req.body.password) {
            const passwordValidation = validatePassword(req.body.password);
            if (!passwordValidation.valid) {
                return res.status(400).json({ error: passwordValidation.error });
            }
            user.password = req.body.password;
        }

        await user.save();

        res.json({
            success: true,
            data: user.toJSON(),
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';

        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        }

        const user = await User.findOneAndDelete({ _id: req.params.id, tenant_id });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

// PUT /api/auth/users/:id/toggle-status
router.put('/users/:id/toggle-status', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const { status } = req.body;

        if (req.params.id === req.user._id.toString() && status === 'disabled') {
            return res.status(400).json({ success: false, error: 'Cannot disable your own account' });
        }

        const user = await User.findOne({ _id: req.params.id, tenant_id });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        user.status = status;
        user.is_active = status === 'active';
        await user.save();

        res.json({
            success: true,
            data: user.toJSON(),
            message: `User ${status === 'active' ? 'enabled' : 'disabled'} successfully`
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ success: false, error: 'Failed to update user status' });
    }
});

// PUT /api/auth/users/:id/change-role
router.put('/users/:id/change-role', auth, adminOnly, async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ success: false, error: 'Role is required' });
        }

        const user = await User.findOne({ _id: req.params.id, tenant_id });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        user.role = role;
        await user.save();

        res.json({
            success: true,
            data: user.toJSON(),
            message: `User role changed to ${role}`
        });
    } catch (error) {
        console.error('Error changing user role:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
