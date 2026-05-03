const { body } = require('express-validator');

const purchaseOrderValidator = [
  body('vendor_id').notEmpty().withMessage('vendor_id is required'),
  body('total_amount').isFloat({ gt: 0 }).withMessage('total_amount must be greater than 0'),
  body('status').optional().isIn(['draft', 'pending_approval', 'approved', 'issued', 'partially_received', 'received', 'closed', 'cancelled'])
    .withMessage('Invalid purchase order status'),
  body('lines').optional().isArray().withMessage('lines must be an array'),
];

const billValidator = [
  body('vendor_id').notEmpty().withMessage('vendor_id is required'),
  body('lines').isArray({ min: 1 }).withMessage('lines must contain at least one item'),
  body('lines.*.description').trim().notEmpty().withMessage('Line description is required'),
  body('lines.*.amount').isFloat({ gt: 0 }).withMessage('Line amount must be greater than 0'),
  body('status').optional().isIn(['draft', 'pending_approval', 'approved', 'partial', 'paid', 'overdue', 'cancelled'])
    .withMessage('Invalid bill status'),
];

const voucherValidator = [
  body('date').optional().isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('currency must be a 3-letter code'),
  body('lines').isArray({ min: 1 }).withMessage('lines must contain at least one item'),
  body('lines.*.description').trim().notEmpty().withMessage('Line description is required'),
  body('lines.*.accountCode').trim().notEmpty().withMessage('Line accountCode is required'),
  body('lines.*.amount').isFloat({ gt: 0 }).withMessage('Line amount must be greater than 0'),
];

module.exports = {
  purchaseOrderValidator,
  billValidator,
  voucherValidator,
};
