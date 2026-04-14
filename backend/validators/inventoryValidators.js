const { body } = require('express-validator');

exports.stockAdjustmentValidator = [
    body('item_id')
        .isMongoId()
        .withMessage('Valid item ID required'),
    body('warehouse_id')
        .optional()
        .isMongoId()
        .withMessage('Valid warehouse ID required'),
    body('adjustment_qty')
        .isFloat()
        .not().equals(0)
        .withMessage('Adjustment quantity cannot be zero'),
    body('reason_code')
        .isIn(['damaged', 'expired', 'found', 'lost', 'opening_balance', 'count_correction', 'sample', 'other'])
        .withMessage('Invalid reason code'),
    body('reason_detail')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Reason detail must be between 5 and 500 characters'),
    body('adjustment_date')
        .optional()
        .isISO8601()
        .withMessage('Valid adjustment date required')
];

exports.itemValidator = [
    body('item_code')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Item code must be between 1 and 50 characters'),
    body('name')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Item name must be between 2 and 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description too long'),
    body('unit_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Unit price must be non-negative'),
    body('cost_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Cost price must be non-negative'),
    body('reorder_level')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Reorder level must be non-negative'),
    body('category')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Category too long')
];

exports.warehouseValidator = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Warehouse name must be between 2 and 100 characters'),
    body('code')
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage('Warehouse code must be between 1 and 20 characters'),
    body('location')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Location too long'),
    body('manager_id')
        .optional()
        .isMongoId()
        .withMessage('Valid manager ID required')
];

exports.stockTransferValidator = [
    body('from_warehouse_id')
        .isMongoId()
        .withMessage('Valid source warehouse ID required'),
    body('to_warehouse_id')
        .isMongoId()
        .withMessage('Valid destination warehouse ID required')
        .custom((val, { req }) => {
            if (val === req.body.from_warehouse_id) {
                throw new Error('Source and destination warehouses must be different');
            }
            return true;
        }),
    body('transfer_date')
        .isISO8601()
        .withMessage('Valid transfer date required'),
    body('items')
        .isArray({ min: 1 })
        .withMessage('At least one item required'),
    body('items.*.item_id')
        .isMongoId()
        .withMessage('Valid item ID required'),
    body('items.*.quantity')
        .isFloat({ min: 0.001 })
        .withMessage('Quantity must be positive'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notes too long')
];
