const { body } = require('express-validator');

exports.loginValidator = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
];

exports.registerValidator = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Password must contain at least one special character'),
    body('full_name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters')
];

exports.forgotPasswordValidator = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required')
];

exports.resetPasswordValidator = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Password must contain at least one special character')
];

exports.inviteValidator = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required'),
    body('role')
        .optional()
        .isIn(['Employee', 'Manager', 'Admin', 'SuperAdmin'])
        .withMessage('Invalid role'),
    body('modules')
        .optional()
        .isArray()
        .withMessage('Modules must be an array')
];

exports.acceptInviteValidator = [
    body('token')
        .notEmpty()
        .withMessage('Invitation token is required'),
    body('full_name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Password must contain at least one special character')
];
