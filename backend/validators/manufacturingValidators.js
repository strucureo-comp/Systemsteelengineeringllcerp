const { body, param } = require('express-validator');

// ══════════════════════════════════════════════════════════════════════════════
// WORK CENTER VALIDATORS
// ══════════════════════════════════════════════════════════════════════════════

exports.createWorkCenterValidator = [
    body('code')
        .trim()
        .notEmpty().withMessage('Work center code is required')
        .isLength({ max: 50 }).withMessage('Code must be 50 characters or less'),
    body('name')
        .trim()
        .notEmpty().withMessage('Work center name is required')
        .isLength({ max: 200 }).withMessage('Name must be 200 characters or less'),
    body('type')
        .isIn(['assembly', 'machining', 'welding', 'painting', 'packaging', 'quality', 'other'])
        .withMessage('Invalid work center type'),
    body('capacity_per_hour')
        .optional()
        .isFloat({ min: 0 }).withMessage('Capacity must be a positive number'),
    body('cost_per_hour')
        .optional()
        .isFloat({ min: 0 }).withMessage('Cost must be a positive number')
];

// ══════════════════════════════════════════════════════════════════════════════
// BOM VALIDATORS
// ══════════════════════════════════════════════════════════════════════════════

exports.createBOMValidator = [
    body('code')
        .trim()
        .notEmpty().withMessage('BOM code is required')
        .isLength({ max: 50 }).withMessage('Code must be 50 characters or less'),
    body('product_id')
        .notEmpty().withMessage('Product is required')
        .isMongoId().withMessage('Invalid product ID'),
    body('components')
        .isArray({ min: 1 }).withMessage('At least one component is required'),
    body('components.*.item_id')
        .notEmpty().withMessage('Component item is required')
        .isMongoId().withMessage('Invalid item ID'),
    body('components.*.quantity')
        .isFloat({ min: 0.01 }).withMessage('Component quantity must be greater than 0'),
    body('components.*.waste_factor')
        .optional()
        .isFloat({ min: 0, max: 100 }).withMessage('Waste factor must be between 0 and 100'),
    body('labor_cost')
        .optional()
        .isFloat({ min: 0 }).withMessage('Labor cost must be a positive number'),
    body('overhead_cost')
        .optional()
        .isFloat({ min: 0 }).withMessage('Overhead cost must be a positive number')
];

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTION ORDER VALIDATORS
// ══════════════════════════════════════════════════════════════════════════════

exports.createProductionOrderValidator = [
    body('bom_id')
        .notEmpty().withMessage('BOM is required')
        .isMongoId().withMessage('Invalid BOM ID'),
    body('quantity')
        .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('planned_start_date')
        .optional()
        .isISO8601().withMessage('Invalid start date format'),
    body('planned_end_date')
        .optional()
        .isISO8601().withMessage('Invalid end date format')
        .custom((value, { req }) => {
            if (req.body.planned_start_date && value) {
                if (new Date(value) < new Date(req.body.planned_start_date)) {
                    throw new Error('End date must be after start date');
                }
            }
            return true;
        })
];

exports.updateProductionOrderValidator = [
    body('status')
        .optional()
        .isIn(['draft', 'planned', 'released', 'in_progress', 'quality_check', 'completed', 'cancelled'])
        .withMessage('Invalid status'),
    body('quantity_produced')
        .optional()
        .isInt({ min: 0 }).withMessage('Quantity produced must be a positive number'),
    body('quantity_scrapped')
        .optional()
        .isInt({ min: 0 }).withMessage('Quantity scrapped must be a positive number')
];

// ══════════════════════════════════════════════════════════════════════════════
// WORK ORDER VALIDATORS
// ══════════════════════════════════════════════════════════════════════════════

exports.createWorkOrderValidator = [
    body('production_order_id')
        .notEmpty().withMessage('Production order is required')
        .isMongoId().withMessage('Invalid production order ID'),
    body('operation_name')
        .trim()
        .notEmpty().withMessage('Operation name is required'),
    body('operation_sequence')
        .isInt({ min: 1 }).withMessage('Operation sequence must be at least 1'),
    body('quantity_to_produce')
        .isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

// ══════════════════════════════════════════════════════════════════════════════
// QUALITY INSPECTION VALIDATORS
// ══════════════════════════════════════════════════════════════════════════════

exports.createQualityInspectionValidator = [
    body('production_order_id')
        .notEmpty().withMessage('Production order is required')
        .isMongoId().withMessage('Invalid production order ID'),
    body('inspection_type')
        .isIn(['in_process', 'final', 'random']).withMessage('Invalid inspection type'),
    body('quantity_inspected')
        .isInt({ min: 1 }).withMessage('Quantity inspected must be at least 1'),
    body('quantity_accepted')
        .optional()
        .isInt({ min: 0 }).withMessage('Quantity accepted must be a positive number'),
    body('quantity_rejected')
        .optional()
        .isInt({ min: 0 }).withMessage('Quantity rejected must be a positive number')
];

// ══════════════════════════════════════════════════════════════════════════════
// MATERIAL ISSUE VALIDATORS
// ══════════════════════════════════════════════════════════════════════════════

exports.createMaterialIssueValidator = [
    body('production_order_id')
        .notEmpty().withMessage('Production order is required')
        .isMongoId().withMessage('Invalid production order ID'),
    body('items')
        .isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.item_id')
        .notEmpty().withMessage('Item is required')
        .isMongoId().withMessage('Invalid item ID'),
    body('items.*.issued_quantity')
        .isFloat({ min: 0.01 }).withMessage('Issued quantity must be greater than 0')
];

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTION SCRAP VALIDATORS
// ══════════════════════════════════════════════════════════════════════════════

exports.createProductionScrapValidator = [
    body('production_order_id')
        .notEmpty().withMessage('Production order is required')
        .isMongoId().withMessage('Invalid production order ID'),
    body('quantity')
        .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('reason')
        .isIn(['material_defect', 'machine_error', 'operator_error', 'design_issue', 'other'])
        .withMessage('Invalid scrap reason'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Description must be 500 characters or less')
];

// ══════════════════════════════════════════════════════════════════════════════
// COMMON VALIDATORS
// ══════════════════════════════════════════════════════════════════════════════

exports.idValidator = [
    param('id').isMongoId().withMessage('Invalid ID format')
];
