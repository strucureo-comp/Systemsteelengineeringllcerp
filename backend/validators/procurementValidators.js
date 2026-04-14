const { body } = require('express-validator');

exports.purchaseOrderValidator = [
    body('vendor_id')
        .isMongoId()
        .withMessage('Valid vendor ID required'),
    body('order_date')
        .isISO8601()
        .withMessage('Valid order date required'),
    body('delivery_date')
        .optional()
        .isISO8601()
        .withMessage('Valid delivery date required')
        .custom((val, { req }) => {
            if (val && new Date(val) < new Date(req.body.order_date)) {
                throw new Error('Delivery date must be after order date');
            }
            return true;
        }),
    body('items')
        .isArray({ min: 1 })
        .withMessage('At least one item required'),
    body('items.*.item_id')
        .optional()
        .isMongoId()
        .withMessage('Valid item ID required'),
    body('items.*.description')
        .trim()
        .notEmpty()
        .withMessage('Item description required'),
    body('items.*.quantity')
        .isFloat({ min: 0.001 })
        .withMessage('Quantity must be positive'),
    body('items.*.unit_price')
        .isFloat({ min: 0 })
        .withMessage('Unit price must be non-negative'),
    body('total_amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Total amount must be non-negative')
];

exports.vendorValidator = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Vendor name must be between 2 and 200 characters'),
    body('email')
        .optional()
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required'),
    body('phone')
        .optional()
        .matches(/^[+]?[\d\s\-()]{7,20}$/)
        .withMessage('Valid phone number required'),
    body('tax_id')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Tax ID too long'),
    body('payment_terms')
        .optional()
        .isInt({ min: 0, max: 365 })
        .withMessage('Payment terms must be between 0 and 365 days')
];

exports.grnValidator = [
    body('purchase_order_id')
        .isMongoId()
        .withMessage('Valid purchase order ID required'),
    body('received_date')
        .isISO8601()
        .withMessage('Valid received date required'),
    body('items')
        .isArray({ min: 1 })
        .withMessage('At least one item required'),
    body('items.*.item_id')
        .optional()
        .isMongoId()
        .withMessage('Valid item ID required'),
    body('items.*.quantity_received')
        .isFloat({ min: 0.001 })
        .withMessage('Quantity received must be positive'),
    body('items.*.quantity_ordered')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Quantity ordered must be non-negative'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notes too long')
];

exports.rfqValidator = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be between 10 and 2000 characters'),
    body('submission_deadline')
        .isISO8601()
        .withMessage('Valid submission deadline required')
        .custom((val) => {
            if (new Date(val) < new Date()) {
                throw new Error('Submission deadline must be in the future');
            }
            return true;
        }),
    body('items')
        .isArray({ min: 1 })
        .withMessage('At least one item required'),
    body('items.*.description')
        .trim()
        .notEmpty()
        .withMessage('Item description required'),
    body('items.*.quantity')
        .isFloat({ min: 0.001 })
        .withMessage('Quantity must be positive')
];
