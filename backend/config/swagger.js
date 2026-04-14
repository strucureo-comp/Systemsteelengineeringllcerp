const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BridgeBreak ERP API Documentation',
            version: '1.0.0',
            description: 'Comprehensive ERP system API documentation covering all modules',
            contact: {
                name: 'API Support',
                email: 'support@bridgebreak.com'
            },
            license: {
                name: 'Proprietary',
                url: 'https://bridgebreak.com/license'
            }
        },
        servers: [
            {
                url: 'http://localhost:4000/api',
                description: 'Development server'
            },
            {
                url: 'https://api.bridgebreak.com/api',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message'
                        },
                        code: {
                            type: 'string',
                            description: 'Error code'
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        tenant_id: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        full_name: { type: 'string' },
                        role: { type: 'string' },
                        is_active: { type: 'boolean' },
                        status: { type: 'string', enum: ['active', 'pending', 'disabled'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Invoice: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        tenant_id: { type: 'string' },
                        invoice_number: { type: 'string' },
                        customer_name: { type: 'string' },
                        status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partial'] },
                        issue_date: { type: 'string', format: 'date' },
                        due_date: { type: 'string', format: 'date' },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    description: { type: 'string' },
                                    quantity: { type: 'number' },
                                    unit_price: { type: 'number' },
                                    tax_rate: { type: 'number' },
                                    amount: { type: 'number' }
                                }
                            }
                        },
                        subtotal: { type: 'number' },
                        tax_amount: { type: 'number' },
                        total: { type: 'number' },
                        amount_paid: { type: 'number' },
                        currency: { type: 'string', default: 'AED' }
                    }
                },
                Employee: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        employee_id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        phone: { type: 'string' },
                        department_id: { type: 'string' },
                        hr_role_id: { type: 'string' },
                        employment_type: { type: 'string', enum: ['full-time', 'contract', 'part-time'] },
                        joining_date: { type: 'string', format: 'date' },
                        status: { type: 'string', enum: ['active', 'inactive', 'on-leave', 'terminated', 'resigned', 'separated'] },
                        basic_salary: { type: 'number' }
                    }
                },
                PurchaseOrder: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        tenant_id: { type: 'string' },
                        po_number: { type: 'string' },
                        vendor_id: { type: 'string' },
                        total_amount: { type: 'number' },
                        status: { type: 'string', enum: ['pending', 'approved', 'issued', 'partially_received', 'received', 'closed', 'cancelled'] },
                        lines: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    description: { type: 'string' },
                                    quantity: { type: 'number' },
                                    unit_price: { type: 'number' },
                                    amount: { type: 'number' }
                                }
                            }
                        }
                    }
                },
                ProductionOrder: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        tenant_id: { type: 'string' },
                        order_number: { type: 'string' },
                        bom_id: { type: 'string' },
                        product_name: { type: 'string' },
                        quantity: { type: 'number' },
                        quantity_produced: { type: 'number' },
                        status: { type: 'string', enum: ['draft', 'planned', 'released', 'in_progress', 'quality_check', 'completed', 'cancelled'] },
                        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ],
        tags: [
            { name: 'Authentication', description: 'User authentication and authorization' },
            { name: 'Finance', description: 'Finance and accounting operations' },
            { name: 'Receivables', description: 'Accounts receivable management' },
            { name: 'Payables', description: 'Accounts payable management' },
            { name: 'Inventory', description: 'Inventory management' },
            { name: 'Procurement', description: 'Procurement and purchasing' },
            { name: 'Manufacturing', description: 'Manufacturing and production' },
            { name: 'HRMS', description: 'Human resource management' },
            { name: 'CRM', description: 'Customer relationship management' },
            { name: 'Projects', description: 'Project management' },
            { name: 'Tax', description: 'Tax management and compliance' },
            { name: 'Reports', description: 'Reporting and analytics' },
            { name: 'Settings', description: 'System configuration' }
        ]
    },
    apis: ['./routes/*.js', './models/*.js'] // Path to API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
