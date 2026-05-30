const express = require('express');
const router = express.Router();
const { 
    BOM, 
    WorkCenter, 
    Routing, 
    ProductionOrder, 
    WorkOrder, 
    QualityInspection, 
    MaterialIssue, 
    ProductionScrap 
} = require('../models/Manufacturing');
const { Item } = require('../models/Inventory_updated');
const { auth } = require('../middleware/auth');
const Sequence = require('../models/Sequence');

// ══════════════════════════════════════════════════════════════════════════════
// WORK CENTERS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/work-centers', auth, async (req, res) => {
    try {
        const workCenters = await WorkCenter.find({ tenant_id: req.user.tenant_id }).sort({ code: 1 });
        res.json(workCenters);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch work centers', details: err.message });
    }
});

router.post('/work-centers', auth, async (req, res) => {
    try {
        const workCenter = new WorkCenter({
            ...req.body,
            tenant_id: req.user.tenant_id
        });
        await workCenter.save();
        res.status(201).json(workCenter);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create work center', details: err.message });
    }
});

router.put('/work-centers/:id', auth, async (req, res) => {
    try {
        const workCenter = await WorkCenter.findOneAndUpdate(
            { _id: req.params.id, tenant_id: req.user.tenant_id },
            req.body,
            { new: true }
        );
        if (!workCenter) return res.status(404).json({ error: 'Work center not found' });
        res.json(workCenter);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update work center', details: err.message });
    }
});

router.delete('/work-centers/:id', auth, async (req, res) => {
    try {
        const workCenter = await WorkCenter.findOneAndDelete({ 
            _id: req.params.id, 
            tenant_id: req.user.tenant_id 
        });
        if (!workCenter) return res.status(404).json({ error: 'Work center not found' });
        res.json({ message: 'Work center deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete work center', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// BILL OF MATERIALS (BOM)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/boms', auth, async (req, res) => {
    try {
        const boms = await BOM.find({ tenant_id: req.user.tenant_id })
            .populate('product_id', 'name sku')
            .populate('components.item_id', 'name sku')
            .sort({ code: 1 });
        res.json(boms);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch BOMs', details: err.message });
    }
});

router.get('/boms/:id', auth, async (req, res) => {
    try {
        const bom = await BOM.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
            .populate('product_id')
            .populate('components.item_id');
        if (!bom) return res.status(404).json({ error: 'BOM not found' });
        res.json(bom);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch BOM', details: err.message });
    }
});

router.post('/boms', auth, async (req, res) => {
    try {
        const tenant_id = req.user.tenant_id;
        // Fetch product details
        const product = await Item.findOne({ _id: req.body.product_id, tenant_id });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        // Calculate component costs
        let totalCost = 0;
        const components = await Promise.all(req.body.components.map(async (comp) => {
            const item = await Item.findOne({ _id: comp.item_id, tenant_id });
            const unitCost = item?.standard_cost || 0;
            const quantity = Number(comp.quantity || 0);
            const wasteFactor = Number(comp.waste_factor || 0);
            
            const wasteQty = quantity * (wasteFactor / 100);
            const totalQty = quantity + wasteQty;
            const compTotalCost = totalQty * unitCost;
            totalCost += compTotalCost;

            return {
                ...comp,
                quantity,
                waste_factor: wasteFactor,
                item_name: item?.name,
                item_sku: item?.sku,
                unit_cost: unitCost,
                total_cost: compTotalCost
            };
        }));

        const bom = new BOM({
            ...req.body,
            tenant_id: req.user.tenant_id,
            product_name: product.name,
            product_sku: product.sku,
            components,
            total_cost: totalCost,
            total_manufacturing_cost: totalCost + (req.body.labor_cost || 0) + (req.body.overhead_cost || 0),
            created_by: req.user._id
        });

        await bom.save();
        res.status(201).json(bom);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create BOM', details: err.message });
    }
});

router.put('/boms/:id', auth, async (req, res) => {
    try {
        const bom = await BOM.findOneAndUpdate(
            { _id: req.params.id, tenant_id: req.user.tenant_id },
            { ...req.body, updated_by: req.user._id },
            { new: true }
        );
        if (!bom) return res.status(404).json({ error: 'BOM not found' });
        res.json(bom);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update BOM', details: err.message });
    }
});

router.delete('/boms/:id', auth, async (req, res) => {
    try {
        const bom = await BOM.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id });
        if (!bom) return res.status(404).json({ error: 'BOM not found' });
        res.json({ message: 'BOM deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete BOM', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTINGS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/routings', auth, async (req, res) => {
    try {
        const routings = await Routing.find({ tenant_id: req.user.tenant_id })
            .populate('bom_id')
            .populate('operations.work_center_id')
            .sort({ code: 1 });
        res.json(routings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch routings', details: err.message });
    }
});

router.post('/routings', auth, async (req, res) => {
    try {
        const routing = new Routing({
            ...req.body,
            tenant_id: req.user.tenant_id
        });
        await routing.save();
        res.status(201).json(routing);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create routing', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTION ORDERS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/production-orders', auth, async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { tenant_id: req.user.tenant_id };
        if (status) filter.status = status;

        const orders = await ProductionOrder.find(filter)
            .populate('bom_id')
            .populate('issued_by', 'full_name')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch production orders', details: err.message });
    }
});

router.get('/production-orders/:id', auth, async (req, res) => {
    try {
        const order = await ProductionOrder.findOne({ 
            _id: req.params.id, 
            tenant_id: req.user.tenant_id 
        })
            .populate('bom_id')
            .populate('issued_by', 'full_name')
            .populate('completed_by', 'full_name');
        
        if (!order) return res.status(404).json({ error: 'Production order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch production order', details: err.message });
    }
});

router.post('/production-orders', auth, async (req, res) => {
    try {
        const bom = await BOM.findOne({ _id: req.body.bom_id, tenant_id: req.user.tenant_id }).populate('product_id');
        if (!bom) return res.status(404).json({ error: 'BOM not found' });

        const seq = await Sequence.getNext('production_order', req.user.tenant_id);
        const order = new ProductionOrder({
            ...req.body,
            tenant_id: req.user.tenant_id,
            order_number: `MO-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`,
            product_name: bom.product_id?.name,
            product_sku: bom.product_id?.sku,
            material_cost: bom.total_cost * req.body.quantity,
            issued_by: req.user._id
        });

        await order.save();
        res.status(201).json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create production order', details: err.message });
    }
});

router.put('/production-orders/:id', auth, async (req, res) => {
    try {
        const order = await ProductionOrder.findOneAndUpdate(
            { _id: req.params.id, tenant_id: req.user.tenant_id },
            req.body,
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Production order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update production order', details: err.message });
    }
});

router.post('/production-orders/:id/start', auth, async (req, res) => {
    try {
        const order = await ProductionOrder.findOneAndUpdate(
            { _id: req.params.id, tenant_id: req.user.tenant_id },
            { 
                status: 'in_progress', 
                actual_start_date: new Date() 
            },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Production order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to start production order', details: err.message });
    }
});

router.post('/production-orders/:id/complete', auth, async (req, res) => {
    try {
        const order = await ProductionOrder.findOneAndUpdate(
            { _id: req.params.id, tenant_id: req.user.tenant_id },
            { 
                status: 'completed', 
                actual_end_date: new Date(),
                completed_by: req.user._id,
                quantity_produced: req.body.quantity_produced || order.quantity
            },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Production order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to complete production order', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// WORK ORDERS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/work-orders', auth, async (req, res) => {
    try {
        const workOrders = await WorkOrder.find({ tenant_id: req.user.tenant_id })
            .populate('production_order_id')
            .populate('work_center_id')
            .populate('assigned_to')
            .sort({ createdAt: -1 });
        res.json(workOrders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch work orders', details: err.message });
    }
});

router.post('/work-orders', auth, async (req, res) => {
    try {
        const seq = await Sequence.getNext('work_order', req.user.tenant_id);
        const workOrder = new WorkOrder({
            ...req.body,
            tenant_id: req.user.tenant_id,
            work_order_number: `WO-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`
        });
        await workOrder.save();
        res.status(201).json(workOrder);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create work order', details: err.message });
    }
});

router.post('/work-orders/:id/log-time', auth, async (req, res) => {
    try {
        const { employee_id, start_time, end_time, notes } = req.body;
        const duration = (new Date(end_time) - new Date(start_time)) / (1000 * 60);

        const workOrder = await WorkOrder.findOneAndUpdate(
            { _id: req.params.id, tenant_id: req.user.tenant_id },
            {
                $push: {
                    time_logs: {
                        employee_id,
                        start_time,
                        end_time,
                        duration_minutes: duration,
                        notes
                    }
                }
            },
            { new: true }
        );

        if (!workOrder) return res.status(404).json({ error: 'Work order not found' });
        res.json(workOrder);
    } catch (err) {
        res.status(500).json({ error: 'Failed to log time', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// QUALITY INSPECTIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/quality-inspections', auth, async (req, res) => {
    try {
        const inspections = await QualityInspection.find({ tenant_id: req.user.tenant_id })
            .populate('production_order_id')
            .populate('inspector_id')
            .sort({ createdAt: -1 });
        res.json(inspections);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch inspections', details: err.message });
    }
});

router.post('/quality-inspections', auth, async (req, res) => {
    try {
        const seq = await Sequence.getNext('quality_inspection', req.user.tenant_id);
        const inspection = new QualityInspection({
            ...req.body,
            tenant_id: req.user.tenant_id,
            inspection_number: `QI-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`
        });
        await inspection.save();
        res.status(201).json(inspection);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create inspection', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// MATERIAL ISSUES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/material-issues', auth, async (req, res) => {
    try {
        const issues = await MaterialIssue.find({ tenant_id: req.user.tenant_id })
            .populate('production_order_id')
            .sort({ createdAt: -1 });
        res.json(issues);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch material issues', details: err.message });
    }
});

router.post('/material-issues', auth, async (req, res) => {
    try {
        const seq = await Sequence.getNext('material_issue', req.user.tenant_id);
        const issue = new MaterialIssue({
            ...req.body,
            tenant_id: req.user.tenant_id,
            issue_number: `MI-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`,
            issued_by: req.user._id
        });
        await issue.save();
        res.status(201).json(issue);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create material issue', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTION SCRAP
// ══════════════════════════════════════════════════════════════════════════════

router.get('/scrap', auth, async (req, res) => {
    try {
        const scrap = await ProductionScrap.find({ tenant_id: req.user.tenant_id })
            .populate('production_order_id')
            .populate('item_id')
            .sort({ createdAt: -1 });
        res.json(scrap);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch scrap records', details: err.message });
    }
});

router.post('/scrap', auth, async (req, res) => {
    try {
        const seq = await Sequence.getNext('production_scrap', req.user.tenant_id);
        const scrap = new ProductionScrap({
            ...req.body,
            tenant_id: req.user.tenant_id,
            scrap_number: `SCR-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`,
            reported_by: req.user._id
        });
        await scrap.save();
        res.status(201).json(scrap);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create scrap record', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD & ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', auth, async (req, res) => {
    try {
        const [
            totalOrders,
            activeOrders,
            completedOrders,
            qualityIssues,
            recentOrders
        ] = await Promise.all([
            ProductionOrder.countDocuments({ tenant_id: req.user.tenant_id }),
            ProductionOrder.countDocuments({ tenant_id: req.user.tenant_id, status: 'in_progress' }),
            ProductionOrder.countDocuments({ tenant_id: req.user.tenant_id, status: 'completed' }),
            QualityInspection.countDocuments({ tenant_id: req.user.tenant_id, status: 'failed' }),
            ProductionOrder.find({ tenant_id: req.user.tenant_id })
                .populate('bom_id')
                .sort({ createdAt: -1 })
                .limit(5)
        ]);

        res.json({
            totalOrders,
            activeOrders,
            completedOrders,
            qualityIssues,
            recentOrders
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch dashboard data', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADVANCED ANALYTICS & REPORTING
// ══════════════════════════════════════════════════════════════════════════════

const manufacturingService = require('../services/manufacturingService');

// Material Requirements Planning
router.post('/mrp/calculate', auth, async (req, res) => {
    try {
        const { bom_id, quantity, warehouse_id } = req.body;
        const requirements = await manufacturingService.calculateMaterialRequirements(
            bom_id,
            quantity,
            warehouse_id,
            req.user.tenant_id
        );
        res.json(requirements);
    } catch (err) {
        res.status(500).json({ error: 'Failed to calculate material requirements', details: err.message });
    }
});

router.post('/mrp/generate-requisitions', auth, async (req, res) => {
    try {
        const { material_requirements } = req.body;
        const requisitions = await manufacturingService.generatePurchaseRequisitions(
            material_requirements,
            req.user.tenant_id,
            req.user._id
        );
        res.json({ requisitions, count: requisitions.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate requisitions', details: err.message });
    }
});

// OEE (Overall Equipment Effectiveness)
router.get('/analytics/oee', auth, async (req, res) => {
    try {
        const { work_center_id, start_date, end_date } = req.query;
        
        if (!work_center_id || !start_date || !end_date) {
            return res.status(400).json({ error: 'work_center_id, start_date, and end_date are required' });
        }

        const oee = await manufacturingService.calculateOEE(
            work_center_id,
            new Date(start_date),
            new Date(end_date),
            req.user.tenant_id
        );
        res.json(oee);
    } catch (err) {
        res.status(500).json({ error: 'Failed to calculate OEE', details: err.message });
    }
});

// Production Efficiency
router.get('/analytics/efficiency', auth, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }

        const efficiency = await manufacturingService.calculateProductionEfficiency(
            req.user.tenant_id,
            new Date(start_date),
            new Date(end_date)
        );
        res.json(efficiency);
    } catch (err) {
        res.status(500).json({ error: 'Failed to calculate efficiency', details: err.message });
    }
});

// Cost Variance Analysis
router.get('/analytics/cost-variance/:id', auth, async (req, res) => {
    try {
        const variance = await manufacturingService.calculateCostVariance(req.params.id, req.user.tenant_id);
        res.json(variance);
    } catch (err) {
        res.status(500).json({ error: 'Failed to calculate cost variance', details: err.message });
    }
});

// Production Lead Time
router.post('/analytics/lead-time', auth, async (req, res) => {
    try {
        const { bom_id, quantity } = req.body;
        const leadTime = await manufacturingService.calculateProductionLeadTime(bom_id, quantity, req.user.tenant_id);
        res.json(leadTime);
    } catch (err) {
        res.status(500).json({ error: 'Failed to calculate lead time', details: err.message });
    }
});

// Production Schedule Suggestion
router.get('/analytics/schedule-suggestion', auth, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }

        const schedule = await manufacturingService.suggestProductionSchedule(
            req.user.tenant_id,
            new Date(start_date),
            new Date(end_date)
        );
        res.json(schedule);
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate schedule', details: err.message });
    }
});

// Quality Metrics
router.get('/analytics/quality', auth, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }

        const quality = await manufacturingService.calculateQualityMetrics(
            req.user.tenant_id,
            new Date(start_date),
            new Date(end_date)
        );
        res.json(quality);
    } catch (err) {
        res.status(500).json({ error: 'Failed to calculate quality metrics', details: err.message });
    }
});

// Scrap Analysis
router.get('/analytics/scrap', auth, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }

        const scrap = await manufacturingService.analyzeScrap(
            req.user.tenant_id,
            new Date(start_date),
            new Date(end_date)
        );
        res.json(scrap);
    } catch (err) {
        res.status(500).json({ error: 'Failed to analyze scrap', details: err.message });
    }
});

module.exports = router;
