const { 
    ProductionOrder, 
    BOM, 
    WorkOrder, 
    QualityInspection, 
    MaterialIssue, 
    ProductionScrap 
} = require('../models/Manufacturing');
const { Item, StockBalance } = require('../models/Inventory_updated');

// ══════════════════════════════════════════════════════════════════════════════
// MATERIAL REQUIREMENTS PLANNING (MRP)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate material requirements for a production order
 * @param {string} bomId - BOM ID
 * @param {number} quantity - Production quantity
 * @param {string} warehouseId - Target warehouse
 * @param {string} tenantId - Tenant ID
 * @returns {Object} Material requirements and availability
 */
async function calculateMaterialRequirements(bomId, quantity, warehouseId, tenantId) {
    try {
        const bom = await BOM.findOne({ _id: bomId, tenant_id: tenantId }).populate('components.item_id');
        if (!bom) throw new Error('BOM not found');

        const requirements = [];
        let allAvailable = true;

        for (const component of bom.components) {
            const requiredQty = component.quantity * quantity;
            const wasteQty = requiredQty * (component.waste_factor / 100);
            const totalRequired = requiredQty + wasteQty;

            // Check stock availability
            const stockBalance = await StockBalance.findOne({
                tenant_id: tenantId,
                item_id: component.item_id._id,
                warehouse_id: warehouseId
            });

            const available = stockBalance?.available || 0;
            const shortage = Math.max(0, totalRequired - available);

            requirements.push({
                item_id: component.item_id._id,
                item_name: component.item_name,
                item_sku: component.item_sku,
                required_quantity: requiredQty,
                waste_quantity: wasteQty,
                total_required: totalRequired,
                available_quantity: available,
                shortage_quantity: shortage,
                unit_cost: component.unit_cost,
                total_cost: totalRequired * component.unit_cost,
                is_available: shortage === 0
            });

            if (shortage > 0) allAvailable = false;
        }

        return {
            bom_id: bomId,
            production_quantity: quantity,
            requirements,
            all_materials_available: allAvailable,
            total_material_cost: requirements.reduce((sum, r) => sum + r.total_cost, 0)
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Generate purchase requisitions for material shortages
 */
async function generatePurchaseRequisitions(materialRequirements, tenantId, userId) {
    const requisitions = [];

    for (const req of materialRequirements.requirements) {
        if (req.shortage_quantity > 0) {
            requisitions.push({
                tenant_id: tenantId,
                item_id: req.item_id,
                item_name: req.item_name,
                quantity: req.shortage_quantity,
                required_by: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                reason: 'Production requirement',
                requested_by: userId,
                status: 'pending'
            });
        }
    }

    return requisitions;
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTION ANALYTICS & OEE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Overall Equipment Effectiveness (OEE)
 * OEE = Availability × Performance × Quality
 */
async function calculateOEE(workCenterId, startDate, endDate, tenantId) {
    try {
        const workOrders = await WorkOrder.find({
            tenant_id: tenantId,
            work_center_id: workCenterId,
            actual_start: { $gte: startDate, $lte: endDate },
            status: { $in: ['completed', 'in_progress'] }
        });

        if (workOrders.length === 0) {
            return {
                availability: 0,
                performance: 0,
                quality: 0,
                oee: 0,
                message: 'No data available for the selected period'
            };
        }

        // Calculate Availability
        const totalPlannedTime = workOrders.reduce((sum, wo) => {
            if (wo.planned_start && wo.planned_end) {
                return sum + (new Date(wo.planned_end) - new Date(wo.planned_start));
            }
            return sum;
        }, 0);

        const totalActualTime = workOrders.reduce((sum, wo) => {
            if (wo.actual_start && wo.actual_end) {
                return sum + (new Date(wo.actual_end) - new Date(wo.actual_start));
            }
            return sum;
        }, 0);

        const availability = totalPlannedTime > 0 ? (totalActualTime / totalPlannedTime) : 0;

        // Calculate Performance
        const totalPlannedProduction = workOrders.reduce((sum, wo) => sum + wo.quantity_to_produce, 0);
        const totalActualProduction = workOrders.reduce((sum, wo) => sum + wo.quantity_completed, 0);
        const performance = totalPlannedProduction > 0 ? (totalActualProduction / totalPlannedProduction) : 0;

        // Calculate Quality
        const totalProduced = workOrders.reduce((sum, wo) => sum + wo.quantity_completed, 0);
        const totalRejected = workOrders.reduce((sum, wo) => sum + wo.quantity_rejected, 0);
        const quality = totalProduced > 0 ? ((totalProduced - totalRejected) / totalProduced) : 0;

        // Calculate OEE
        const oee = availability * performance * quality;

        return {
            availability: Math.round(availability * 100),
            performance: Math.round(performance * 100),
            quality: Math.round(quality * 100),
            oee: Math.round(oee * 100),
            total_planned_time_hours: Math.round(totalPlannedTime / (1000 * 60 * 60)),
            total_actual_time_hours: Math.round(totalActualTime / (1000 * 60 * 60)),
            total_planned_production: totalPlannedProduction,
            total_actual_production: totalActualProduction,
            total_rejected: totalRejected,
            work_orders_analyzed: workOrders.length
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Calculate production efficiency metrics
 */
async function calculateProductionEfficiency(tenantId, startDate, endDate) {
    try {
        const orders = await ProductionOrder.find({
            tenant_id: tenantId,
            actual_start_date: { $gte: startDate, $lte: endDate }
        });

        const totalOrders = orders.length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const onTimeOrders = orders.filter(o => {
            if (o.status === 'completed' && o.planned_end_date && o.actual_end_date) {
                return new Date(o.actual_end_date) <= new Date(o.planned_end_date);
            }
            return false;
        }).length;

        const totalPlanned = orders.reduce((sum, o) => sum + o.quantity, 0);
        const totalProduced = orders.reduce((sum, o) => sum + o.quantity_produced, 0);
        const totalScrapped = orders.reduce((sum, o) => sum + o.quantity_scrapped, 0);

        const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
        const onTimeRate = completedOrders > 0 ? (onTimeOrders / completedOrders) * 100 : 0;
        const yieldRate = totalPlanned > 0 ? ((totalProduced - totalScrapped) / totalPlanned) * 100 : 0;
        const scrapRate = totalProduced > 0 ? (totalScrapped / totalProduced) * 100 : 0;

        return {
            total_orders: totalOrders,
            completed_orders: completedOrders,
            on_time_orders: onTimeOrders,
            completion_rate: Math.round(completionRate * 10) / 10,
            on_time_delivery_rate: Math.round(onTimeRate * 10) / 10,
            total_planned_quantity: totalPlanned,
            total_produced_quantity: totalProduced,
            total_scrapped_quantity: totalScrapped,
            yield_rate: Math.round(yieldRate * 10) / 10,
            scrap_rate: Math.round(scrapRate * 10) / 10
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Calculate cost variance (Actual vs Standard)
 */
async function calculateCostVariance(productionOrderId, tenantId) {
    try {
        const order = await ProductionOrder.findOne({ _id: productionOrderId, tenant_id: tenantId }).populate('bom_id');
        if (!order) throw new Error('Production order not found');

        const bom = order.bom_id;
        const standardMaterialCost = bom.total_cost * order.quantity;
        const standardLaborCost = bom.labor_cost * order.quantity;
        const standardOverheadCost = bom.overhead_cost * order.quantity;
        const standardTotalCost = standardMaterialCost + standardLaborCost + standardOverheadCost;

        const actualMaterialCost = order.material_cost || 0;
        const actualLaborCost = order.labor_cost || 0;
        const actualOverheadCost = order.overhead_cost || 0;
        const actualTotalCost = order.total_cost || 0;

        const materialVariance = actualMaterialCost - standardMaterialCost;
        const laborVariance = actualLaborCost - standardLaborCost;
        const overheadVariance = actualOverheadCost - standardOverheadCost;
        const totalVariance = actualTotalCost - standardTotalCost;

        return {
            production_order: order.order_number,
            quantity: order.quantity,
            standard_costs: {
                material: standardMaterialCost,
                labor: standardLaborCost,
                overhead: standardOverheadCost,
                total: standardTotalCost
            },
            actual_costs: {
                material: actualMaterialCost,
                labor: actualLaborCost,
                overhead: actualOverheadCost,
                total: actualTotalCost
            },
            variances: {
                material: materialVariance,
                labor: laborVariance,
                overhead: overheadVariance,
                total: totalVariance
            },
            variance_percentages: {
                material: standardMaterialCost > 0 ? (materialVariance / standardMaterialCost) * 100 : 0,
                labor: standardLaborCost > 0 ? (laborVariance / standardLaborCost) * 100 : 0,
                overhead: standardOverheadCost > 0 ? (overheadVariance / standardOverheadCost) * 100 : 0,
                total: standardTotalCost > 0 ? (totalVariance / standardTotalCost) * 100 : 0
            }
        };
    } catch (error) {
        throw error;
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTION SCHEDULING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate production lead time based on BOM and routing
 */
async function calculateProductionLeadTime(bomId, quantity, tenantId) {
    try {
        const bom = await BOM.findOne({ _id: bomId, tenant_id: tenantId });
        if (!bom) throw new Error('BOM not found');

        // Base lead time calculation (simplified)
        // In real scenario, this would consider routing, work center capacity, etc.
        const baseLeadTimeDays = 1; // 1 day for material preparation
        const productionTimeDays = Math.ceil(quantity / 100); // Assume 100 units per day
        const qualityCheckDays = 1; // 1 day for quality inspection

        const totalLeadTimeDays = baseLeadTimeDays + productionTimeDays + qualityCheckDays;

        return {
            bom_id: bomId,
            quantity,
            material_prep_days: baseLeadTimeDays,
            production_days: productionTimeDays,
            quality_check_days: qualityCheckDays,
            total_lead_time_days: totalLeadTimeDays,
            estimated_completion_date: new Date(Date.now() + totalLeadTimeDays * 24 * 60 * 60 * 1000)
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Suggest production schedule based on priority and capacity
 */
async function suggestProductionSchedule(tenantId, startDate, endDate) {
    try {
        const orders = await ProductionOrder.find({
            tenant_id: tenantId,
            status: { $in: ['planned', 'released'] },
            planned_start_date: { $gte: startDate, $lte: endDate }
        }).sort({ priority: -1, planned_start_date: 1 });

        const schedule = [];
        let currentDate = new Date(startDate);

        for (const order of orders) {
            const leadTime = await calculateProductionLeadTime(order.bom_id, order.quantity, tenantId);
            
            schedule.push({
                production_order: order.order_number,
                product: order.product_name,
                quantity: order.quantity,
                priority: order.priority,
                suggested_start_date: new Date(currentDate),
                suggested_end_date: new Date(currentDate.getTime() + leadTime.total_lead_time_days * 24 * 60 * 60 * 1000),
                lead_time_days: leadTime.total_lead_time_days
            });

            // Move to next available slot
            currentDate = new Date(currentDate.getTime() + leadTime.total_lead_time_days * 24 * 60 * 60 * 1000);
        }

        return {
            schedule_period: { start: startDate, end: endDate },
            total_orders: orders.length,
            schedule
        };
    } catch (error) {
        throw error;
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// QUALITY ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate quality metrics
 */
async function calculateQualityMetrics(tenantId, startDate, endDate) {
    try {
        const inspections = await QualityInspection.find({
            tenant_id: tenantId,
            inspection_date: { $gte: startDate, $lte: endDate }
        });

        const totalInspections = inspections.length;
        const passedInspections = inspections.filter(i => i.status === 'passed').length;
        const failedInspections = inspections.filter(i => i.status === 'failed').length;

        const totalInspected = inspections.reduce((sum, i) => sum + i.quantity_inspected, 0);
        const totalAccepted = inspections.reduce((sum, i) => sum + i.quantity_accepted, 0);
        const totalRejected = inspections.reduce((sum, i) => sum + i.quantity_rejected, 0);

        const passRate = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;
        const acceptanceRate = totalInspected > 0 ? (totalAccepted / totalInspected) * 100 : 0;
        const rejectionRate = totalInspected > 0 ? (totalRejected / totalInspected) * 100 : 0;

        // Defect analysis
        const defectsByType = {};
        inspections.forEach(inspection => {
            if (inspection.defects) {
                inspection.defects.forEach(defect => {
                    if (!defectsByType[defect.defect_type]) {
                        defectsByType[defect.defect_type] = {
                            count: 0,
                            quantity: 0,
                            critical: 0,
                            major: 0,
                            minor: 0
                        };
                    }
                    defectsByType[defect.defect_type].count++;
                    defectsByType[defect.defect_type].quantity += defect.quantity;
                    defectsByType[defect.defect_type][defect.severity]++;
                });
            }
        });

        return {
            period: { start: startDate, end: endDate },
            total_inspections: totalInspections,
            passed_inspections: passedInspections,
            failed_inspections: failedInspections,
            pass_rate: Math.round(passRate * 10) / 10,
            total_inspected: totalInspected,
            total_accepted: totalAccepted,
            total_rejected: totalRejected,
            acceptance_rate: Math.round(acceptanceRate * 10) / 10,
            rejection_rate: Math.round(rejectionRate * 10) / 10,
            defects_by_type: defectsByType
        };
    } catch (error) {
        throw error;
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCRAP ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze scrap patterns
 */
async function analyzeScrap(tenantId, startDate, endDate) {
    try {
        const scrapRecords = await ProductionScrap.find({
            tenant_id: tenantId,
            scrap_date: { $gte: startDate, $lte: endDate }
        }).populate('item_id');

        const totalScrap = scrapRecords.reduce((sum, s) => sum + s.quantity, 0);
        const totalScrapValue = scrapRecords.reduce((sum, s) => sum + s.scrap_value, 0);
        const reworkableScrap = scrapRecords.filter(s => s.is_reworkable).reduce((sum, s) => sum + s.quantity, 0);

        // Scrap by reason
        const scrapByReason = {};
        scrapRecords.forEach(scrap => {
            if (!scrapByReason[scrap.reason]) {
                scrapByReason[scrap.reason] = {
                    count: 0,
                    quantity: 0,
                    value: 0
                };
            }
            scrapByReason[scrap.reason].count++;
            scrapByReason[scrap.reason].quantity += scrap.quantity;
            scrapByReason[scrap.reason].value += scrap.scrap_value;
        });

        // Top scrapped items
        const itemScrap = {};
        scrapRecords.forEach(scrap => {
            const itemId = scrap.item_id?._id?.toString();
            if (itemId) {
                if (!itemScrap[itemId]) {
                    itemScrap[itemId] = {
                        item_name: scrap.item_id?.name,
                        item_sku: scrap.item_id?.sku,
                        quantity: 0,
                        value: 0
                    };
                }
                itemScrap[itemId].quantity += scrap.quantity;
                itemScrap[itemId].value += scrap.scrap_value;
            }
        });

        const topScrapItems = Object.values(itemScrap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        return {
            period: { start: startDate, end: endDate },
            total_scrap_records: scrapRecords.length,
            total_scrap_quantity: totalScrap,
            total_scrap_value: totalScrapValue,
            reworkable_quantity: reworkableScrap,
            reworkable_percentage: totalScrap > 0 ? (reworkableScrap / totalScrap) * 100 : 0,
            scrap_by_reason: scrapByReason,
            top_scrap_items: topScrapItems
        };
    } catch (error) {
        throw error;
    }
}

module.exports = {
    calculateMaterialRequirements,
    generatePurchaseRequisitions,
    calculateOEE,
    calculateProductionEfficiency,
    calculateCostVariance,
    calculateProductionLeadTime,
    suggestProductionSchedule,
    calculateQualityMetrics,
    analyzeScrap
};
