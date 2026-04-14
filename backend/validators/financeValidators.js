const { body } = require('express-validator');

exports.invoiceValidator = [
    body('customer_id')
        .optional()
        .isMongoId()
        .withMessage('Valid customer ID required'),
    body('invoice_date')
        .isISO8601()
        .withMessage('Valid invoice date required'),
    body('due_date')
        .isISO8601()
        .withMessage('Valid due date required')
        .custom((val, { req }) => {
            if (new Date(val) < new Date(req.body.invoice_date)) {
                throw new Error('Due date must be after invoice date');
            }
            return true;
        }),
    body('items')
        .isArray({ min: 1 })
        .withMessage('At least one line item required'),
    body('items.*.description')
        .trim()
        .notEmpty()
        .withMessage('Line item description required'),
    body('items.*.quantity')
        .optional()
        .isFloat({ min: 0.001 })
        .withMessage('Quantity must be positive'),
    body('items.*.amount')
        .isFloat({ min: 0 })
        .withMessage('Amount must be non-negative'),
    body('items.*.tax_rate')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Tax rate must be between 0 and 100'),
    body('total')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Total must be non-negative')
];

exports.expenseValidator = [
    body('expense_date')
        .isISO8601()
        .withMessage('Valid expense date required'),
    body('category')
        .trim()
        .notEmpty()
        .withMessage('Category is required'),
    body('description')
        .trim()
        .isLength({ min: 3, max: 500 })
        .withMessage('Description must be between 3 and 500 characters'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('total')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Total must be non-negative'),
    body('vendor')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Vendor name too long')
];

exports.accountValidator = [
    body('code')
        .trim()
        .notEmpty()
        .isLength({ min: 1, max: 20 })
        .withMessage('Account code required (max 20 characters)'),
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Account name must be between 2 and 100 characters'),
    body('type')
        .isIn(['asset', 'liability', 'equity', 'revenue', 'expense'])
        .withMessage('Invalid account type')
];

exports.journalEntryValidator = [
    body('date')
        .isISO8601()
        .withMessage('Valid date required'),
    body('description')
        .trim()
        .isLength({ min: 3, max: 500 })
        .withMessage('Description must be between 3 and 500 characters'),
    body('lines')
        .isArray({ min: 2 })
        .withMessage('At least two journal lines required'),
    body('lines.*.account_id')
        .isMongoId()
        .withMessage('Valid account ID required'),
    body('lines.*.debit')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Debit must be non-negative'),
    body('lines.*.credit')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Credit must be non-negative'),
    body('lines.*.description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Line description too long')
];

exports.recurringExpenseValidator = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('category')
        .trim()
        .notEmpty()
        .withMessage('Category is required'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('frequency')
        .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
        .withMessage('Invalid frequency'),
    body('start_date')
        .isISO8601()
        .withMessage('Valid start date required'),
    body('end_date')
        .optional()
        .isISO8601()
        .withMessage('Valid end date required')
        .custom((val, { req }) => {
            if (val && new Date(val) < new Date(req.body.start_date)) {
                throw new Error('End date must be after start date');
            }
            return true;
        })
];
