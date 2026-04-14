const { body } = require('express-validator');

exports.employeeValidator = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('full_name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    body('email')
        .optional()
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required'),
    body('mobile')
        .optional()
        .matches(/^[+]?[\d\s\-()]{7,20}$/)
        .withMessage('Valid phone number required'),
    body('salary')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Salary must be non-negative'),
    body('basic_salary')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Basic salary must be non-negative'),
    body('joining_date')
        .optional()
        .isISO8601()
        .withMessage('Valid joining date required'),
    body('date_of_birth')
        .optional()
        .isISO8601()
        .withMessage('Valid date of birth required'),
    body('department_id')
        .optional()
        .isMongoId()
        .withMessage('Valid department ID required'),
    body('designation')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Designation too long')
];

exports.leaveValidator = [
    body('employee_id')
        .isMongoId()
        .withMessage('Valid employee ID required'),
    body('leave_type_id')
        .isMongoId()
        .withMessage('Valid leave type ID required'),
    body('start_date')
        .isISO8601()
        .withMessage('Valid start date required'),
    body('end_date')
        .isISO8601()
        .withMessage('Valid end date required')
        .custom((val, { req }) => {
            if (new Date(val) < new Date(req.body.start_date)) {
                throw new Error('End date must be after start date');
            }
            return true;
        }),
    body('reason')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Reason must be between 5 and 500 characters'),
    body('days')
        .optional()
        .isFloat({ min: 0.5 })
        .withMessage('Days must be at least 0.5')
];

exports.attendanceValidator = [
    body('employee_id')
        .isMongoId()
        .withMessage('Valid employee ID required'),
    body('date')
        .isISO8601()
        .withMessage('Valid date required'),
    body('check_in')
        .optional()
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('Valid check-in time required (HH:MM format)'),
    body('check_out')
        .optional()
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('Valid check-out time required (HH:MM format)'),
    body('status')
        .optional()
        .isIn(['present', 'absent', 'half-day', 'leave', 'holiday'])
        .withMessage('Invalid attendance status')
];

exports.departmentValidator = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Department name must be between 2 and 100 characters'),
    body('code')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Department code too long'),
    body('manager_id')
        .optional()
        .isMongoId()
        .withMessage('Valid manager ID required')
];

exports.payrollValidator = [
    body('employee_id')
        .isMongoId()
        .withMessage('Valid employee ID required'),
    body('month')
        .isInt({ min: 1, max: 12 })
        .withMessage('Month must be between 1 and 12'),
    body('year')
        .isInt({ min: 2000, max: 2100 })
        .withMessage('Valid year required'),
    body('basic_salary')
        .isFloat({ min: 0 })
        .withMessage('Basic salary must be non-negative'),
    body('allowances')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Allowances must be non-negative'),
    body('deductions')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Deductions must be non-negative'),
    body('net_salary')
        .isFloat({ min: 0 })
        .withMessage('Net salary must be non-negative')
];

exports.performanceReviewValidator = [
    body('employee_id')
        .isMongoId()
        .withMessage('Valid employee ID required'),
    body('reviewer_id')
        .isMongoId()
        .withMessage('Valid reviewer ID required'),
    body('review_date')
        .isISO8601()
        .withMessage('Valid review date required'),
    body('rating')
        .isFloat({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    body('comments')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Comments too long')
];
