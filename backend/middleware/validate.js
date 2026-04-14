const { validationResult } = require('express-validator');

/**
 * Validation middleware wrapper
 * Runs all validators and returns formatted errors if validation fails
 */
const validate = (validations) => async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(v => v.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            errors: errors.array().map(e => ({
                field: e.path || e.param,
                message: e.msg,
                value: e.value
            }))
        });
    }

    next();
};

module.exports = validate;
