const express = require('express');
const router = express.Router();
const { Lead, Opportunity, CustomerAccount, Contact, Activity, SalesOrder, Quotation } = require('../models/CRM');
const { auth } = require('../middleware/auth');

// ── OPPORTUNITIES (includes Leads) ───────────────────────────────────────────
router.get('/opportunities', auth, async (req, res) => {
    try {
        const opps = await Opportunity.find()
            .populate('account_id', 'name')
            .populate('owner_id', 'full_name')
            .sort({ createdAt: -1 });
        res.json(opps);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
});

router.post('/opportunities', auth, async (req, res) => {
    try {
        const opp = new Opportunity({ ...req.body, owner_id: req.user.id });
        await opp.save();
        res.status(201).json(opp);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create opportunity' });
    }
});

router.put('/opportunities/:id', auth, async (req, res) => {
    try {
        const opp = await Opportunity.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
        res.json(opp);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update opportunity' });
    }
});

router.delete('/opportunities/:id', auth, async (req, res) => {
    try {
        await Opportunity.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete opportunity' });
    }
});

// ── CONVERT LEAD TO CUSTOMER ─────────────────────────────────────────────────
router.post('/opportunities/:id/convert-to-customer', auth, async (req, res) => {
    try {
        const opp = await Opportunity.findById(req.params.id);
        if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
        if (!opp.is_lead) return res.status(400).json({ error: 'Not a lead' });

        // Create customer account from lead data
        const customer = new CustomerAccount({
            name: opp.company || `${opp.first_name} ${opp.last_name}`,
            phone: opp.phone,
            email: opp.email,
            owner_id: opp.owner_id,
            status: 'prospect',
            notes: opp.notes
        });
        await customer.save();

        // Create primary contact
        if (opp.first_name && opp.last_name) {
            const contact = new Contact({
                account_id: customer._id,
                first_name: opp.first_name,
                last_name: opp.last_name,
                email: opp.email,
                phone: opp.phone,
                is_primary: true
            });
            await contact.save();
        }

        // Update opportunity to link to new customer
        opp.account_id = customer._id;
        opp.is_lead = false;
        opp.stage = 'qualified';
        await opp.save();

        const populated = await Opportunity.findById(opp._id)
            .populate('account_id', 'name')
            .populate('owner_id', 'full_name');

        res.json({ opportunity: populated, customer });
    } catch (err) {
        console.error('Convert error:', err);
        res.status(500).json({ error: 'Failed to convert lead to customer' });
    }
});

// ── LEGACY LEADS ENDPOINTS (for backward compatibility) ──────────────────────
router.get('/leads', auth, async (req, res) => {
    try {
        // Return opportunities where is_lead = true
        const leads = await Opportunity.find({ is_lead: true })
            .populate('owner_id', 'full_name')
            .sort({ createdAt: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

router.post('/leads', auth, async (req, res) => {
    try {
        // Create as opportunity with is_lead flag
        const lead = new Opportunity({ 
            ...req.body, 
            is_lead: true,
            name: req.body.name || `${req.body.first_name} ${req.body.last_name} - ${req.body.company || 'Lead'}`,
            owner_id: req.user.id 
        });
        await lead.save();
        res.status(201).json(lead);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create lead' });
    }
});

router.put('/leads/:id', auth, async (req, res) => {
    try {
        const lead = await Opportunity.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        res.json(lead);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update lead' });
    }
});

router.delete('/leads/:id', auth, async (req, res) => {
    try {
        await Opportunity.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

// ── CUSTOMERS (ACCOUNTS) ──────────────────────────────────────────────────────
router.get('/customers', auth, async (req, res) => {
    try {
        const customers = await CustomerAccount.find().populate('owner_id', 'full_name').sort({ name: 1 });
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

router.post('/customers', auth, async (req, res) => {
    try {
        const customer = new CustomerAccount({ ...req.body, owner_id: req.user.id });
        await customer.save();
        res.status(201).json(customer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

router.put('/customers/:id', auth, async (req, res) => {
    try {
        const customer = await CustomerAccount.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

router.delete('/customers/:id', auth, async (req, res) => {
    try {
        const result = await CustomerAccount.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Customer not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

// ── SALES ORDERS ─────────────────────────────────────────────────────────────
router.get('/sales-orders', auth, async (req, res) => {
    try {
        const orders = await SalesOrder.find().populate('customer_id', 'name').sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sales orders' });
    }
});

router.post('/sales-orders', auth, async (req, res) => {
    try {
        const count = await SalesOrder.countDocuments();
        const order = new SalesOrder({
            ...req.body,
            order_number: `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
            created_by: req.user.id
        });
        await order.save();
        res.status(201).json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create sales order' });
    }
});

// ── QUOTATIONS (Sales Proposals with Approval) ──────────────────────────────
router.get('/quotations', auth, async (req, res) => {
    try {
        const { status, customer_id } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (customer_id) filter.customer_id = customer_id;
        
        const quotations = await Quotation.find(filter)
            .populate('customer_id', 'name')
            .populate('created_by', 'full_name')
            .sort({ createdAt: -1 });
        res.json(quotations);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch quotations' });
    }
});

router.get('/quotations/:id', auth, async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id)
            .populate('customer_id', 'name email phone address')
            .populate('created_by', 'full_name email');
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        res.json(quotation);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch quotation' });
    }
});

router.post('/quotations', auth, async (req, res) => {
    try {
        const year = new Date().getFullYear();
        const count = await Quotation.countDocuments({
            quotation_number: new RegExp(`^QT-${year}-`)
        });
        
        const quotation = new Quotation({
            ...req.body,
            quotation_number: `QT-${year}-${String(count + 1).padStart(4, '0')}`,
            created_by: req.user.id,
            created_by_name: req.user.full_name || req.user.email
        });
        
        await quotation.save();
        res.status(201).json(quotation);
    } catch (err) {
        console.error('Quotation creation error:', err);
        res.status(500).json({ error: 'Failed to create quotation', detail: err.message });
    }
});

router.put('/quotations/:id', auth, async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        
        // Only allow editing in draft status
        if (quotation.status !== 'draft') {
            return res.status(400).json({ error: 'Can only edit draft quotations' });
        }
        
        Object.assign(quotation, req.body);
        await quotation.save();
        res.json(quotation);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update quotation' });
    }
});

router.delete('/quotations/:id', auth, async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        
        // Only allow deletion in draft status
        if (quotation.status !== 'draft') {
            return res.status(400).json({ error: 'Can only delete draft quotations' });
        }
        
        await Quotation.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete quotation' });
    }
});

// Submit quotation for approval
router.post('/quotations/:id/submit', auth, async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        
        if (quotation.status !== 'draft') {
            return res.status(400).json({ error: 'Can only submit draft quotations' });
        }
        
        quotation.status = 'submitted';
        quotation.submitted_at = new Date();
        
        // Initialize approval workflow if configured
        if (req.body.approval_config && req.body.approval_config.levels.length > 0) {
            quotation.approval_config = req.body.approval_config;
            quotation.status = 'pending_approval';
            quotation.current_approval_level = 1;
        } else {
            // No approval required, mark as approved
            quotation.status = 'approved';
            quotation.approved_at = new Date();
        }
        
        await quotation.save();
        res.json(quotation);
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit quotation' });
    }
});

// Approve quotation at current level
router.post('/quotations/:id/approve', auth, async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        
        if (quotation.status !== 'pending_approval') {
            return res.status(400).json({ error: 'Quotation is not pending approval' });
        }
        
        const { comments } = req.body;
        const currentLevel = quotation.current_approval_level;
        const levelIndex = quotation.approval_config.levels.findIndex(l => l.level === currentLevel);
        
        if (levelIndex === -1) {
            return res.status(400).json({ error: 'Invalid approval level' });
        }
        
        // Update current level approval
        quotation.approval_config.levels[levelIndex].status = 'approved';
        quotation.approval_config.levels[levelIndex].user_id = req.user.id;
        quotation.approval_config.levels[levelIndex].user_name = req.user.full_name || req.user.email;
        quotation.approval_config.levels[levelIndex].comments = comments;
        quotation.approval_config.levels[levelIndex].actioned_at = new Date();
        
        // Check if there are more levels
        const nextLevel = quotation.approval_config.levels.find(l => l.level === currentLevel + 1);
        if (nextLevel) {
            quotation.current_approval_level = currentLevel + 1;
        } else {
            // All levels approved
            quotation.status = 'approved';
            quotation.approved_at = new Date();
        }
        
        await quotation.save();
        res.json(quotation);
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve quotation' });
    }
});

// Reject quotation
router.post('/quotations/:id/reject', auth, async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        
        if (quotation.status !== 'pending_approval') {
            return res.status(400).json({ error: 'Quotation is not pending approval' });
        }
        
        const { reason, comments } = req.body;
        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }
        
        const currentLevel = quotation.current_approval_level;
        const levelIndex = quotation.approval_config.levels.findIndex(l => l.level === currentLevel);
        
        if (levelIndex !== -1) {
            quotation.approval_config.levels[levelIndex].status = 'rejected';
            quotation.approval_config.levels[levelIndex].user_id = req.user.id;
            quotation.approval_config.levels[levelIndex].user_name = req.user.full_name || req.user.email;
            quotation.approval_config.levels[levelIndex].comments = comments;
            quotation.approval_config.levels[levelIndex].actioned_at = new Date();
        }
        
        quotation.status = 'rejected';
        quotation.rejection_reason = reason;
        quotation.rejected_at = new Date();
        
        await quotation.save();
        res.json(quotation);
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject quotation' });
    }
});

// Update quotation status (e.g., sent, accepted, declined)
router.patch('/quotations/:id/status', auth, async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
        
        const { status } = req.body;
        const validStatusTransitions = {
            'approved': ['sent'],
            'sent': ['accepted', 'declined'],
        };
        
        const allowed = validStatusTransitions[quotation.status];
        if (!allowed || !allowed.includes(status)) {
            return res.status(400).json({ error: `Cannot transition from ${quotation.status} to ${status}` });
        }
        
        quotation.status = status;
        await quotation.save();
        res.json(quotation);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update quotation status' });
    }
});

module.exports = router;
