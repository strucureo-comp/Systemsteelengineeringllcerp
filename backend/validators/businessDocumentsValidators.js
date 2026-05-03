const { body } = require('express-validator');

const lineValidator = [
  body('items').optional().isArray().withMessage('items must be an array'),
  body('items.*.description').optional().trim().notEmpty().withMessage('Item description is required'),
  body('items.*.quantity').optional().isFloat({ gt: 0 }).withMessage('Item quantity must be greater than 0'),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }).withMessage('Item unit price must be 0 or greater'),
];

const salesBaseValidator = [
  body('customerName').trim().notEmpty().withMessage('customerName is required'),
  body('date').optional().isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('taxRate must be between 0 and 100'),
  ...lineValidator,
];

const proformaValidator = [
  ...salesBaseValidator,
  body('status').optional().isIn(['draft', 'sent', 'partial', 'paid', 'converted', 'pending_approval', 'approved', 'rejected', 'completed'])
    .withMessage('Invalid proforma status'),
];

const salesInvoiceValidator = [
  ...salesBaseValidator,
  body('status').optional().isIn(['draft', 'pending_approval', 'approved', 'rejected', 'completed'])
    .withMessage('Invalid invoice status'),
];

const salesQuotationValidator = [
  ...salesBaseValidator,
  body('status').optional().isIn(['draft', 'pending_approval', 'approved', 'rejected', 'completed'])
    .withMessage('Invalid quotation status'),
];

const deliveryNoteValidator = [
  body('customerName').trim().notEmpty().withMessage('customerName is required'),
  body('date').optional().isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)'),
  body('items').optional().isArray().withMessage('items must be an array'),
  body('items.*.description').optional().trim().notEmpty().withMessage('Item description is required'),
  body('items.*.quantity').optional().isFloat({ gt: 0 }).withMessage('Item quantity must be greater than 0'),
];

const paymentRecordValidator = [
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
];

const emailValidator = [
  body('to').trim().isEmail().withMessage('Valid recipient email is required'),
];

module.exports = {
  proformaValidator,
  salesInvoiceValidator,
  salesQuotationValidator,
  deliveryNoteValidator,
  paymentRecordValidator,
  emailValidator,
};
