const Project = require('../models/Project');
const { JournalEntry } = require('../models/Finance');
const { InventoryTransaction } = require('../models/Inventory');
const { Employee } = require('../models/HRMS');

/**
 * Project Service - Enhanced integration with Finance, Inventory, and HRMS
 */

/**
 * Get project financial summary
 */
async function getProjectFinancials(projectId, tenant_id) {
    try {
        const project = await Project.findOne({ id: projectId });
        if (!project) {
            throw new Error('Project not found');
        }

        // Get all journal entries related to this project
        const journalEntries = await JournalEntry.find({
            tenant_id,
            'lines.project_id': projectId
        });

        // Calculate revenue and costs
        let totalRevenue = 0;
        let totalCosts = 0;

        journalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (line.project_id === projectId) {
                    // Revenue accounts (4000-4999)
                    if (line.account_code.startsWith('4')) {
                        totalRevenue += line.credit_base - line.debit_base;
                    }
                    // Cost/Expense accounts (5000-6999)
                    if (line.account_code.startsWith('5') || line.account_code.startsWith('6')) {
                        totalCosts += line.debit_base - line.credit_base;
                    }
                }
            });
        });

        // Get inventory costs for this project
        const inventoryTransactions = await InventoryTransaction.find({
            tenant_id,
            'metadata.project_id': projectId
        });

        let inventoryCosts = 0;
        inventoryTransactions.forEach(txn => {
            if (txn.type === 'issue_to_site' || txn.type === 'issue_to_production') {
                inventoryCosts += Math.abs(txn.total_value);
            }
        });

        // Get labor costs (from HRMS attendance/payroll linked to project)
        // This would require attendance records to have project_id
        let laborCosts = 0;

        const grossProfit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        return {
            project_id: projectId,
            project_name: project.title,
            total_revenue: totalRevenue,
            total_costs: totalCosts,
            inventory_costs: inventoryCosts,
            labor_costs: laborCosts,
            gross_profit: grossProfit,
            profit_margin: profitMargin.toFixed(2),
            status: project.status,
            progress: project.progress
        };
    } catch (error) {
        console.error('[Project Service] Error getting financials:', error);
        throw error;
    }
}

/**
 * Allocate costs to project
 */
async function allocateCostsToProject(projectId, tenant_id, costs) {
    try {
        const { material_costs, labor_costs, overhead_costs, description } = costs;

        // Create journal entry for cost allocation
        const entryNumber = `JE-PRJ-${Date.now()}`;
        
        const lines = [];

        // Material costs
        if (material_costs > 0) {
            lines.push({
                account_code: '5000', // Direct Project Costs
                account_name: 'Project Material Costs',
                debit: material_costs,
                credit: 0,
                debit_base: material_costs,
                credit_base: 0,
                description: `Material costs - ${description}`,
                project_id: projectId
            });
        }

        // Labor costs
        if (labor_costs > 0) {
            lines.push({
                account_code: '5100', // Labor Costs
                account_name: 'Project Labor Costs',
                debit: labor_costs,
                credit: 0,
                debit_base: labor_costs,
                credit_base: 0,
                description: `Labor costs - ${description}`,
                project_id: projectId
            });
        }

        // Overhead costs
        if (overhead_costs > 0) {
            lines.push({
                account_code: '5200', // Overhead
                account_name: 'Project Overhead',
                debit: overhead_costs,
                credit: 0,
                debit_base: overhead_costs,
                credit_base: 0,
                description: `Overhead - ${description}`,
                project_id: projectId
            });
        }

        // Credit WIP or Cash
        const totalCosts = material_costs + labor_costs + overhead_costs;
        lines.push({
            account_code: '1500', // WIP (Work in Progress)
            account_name: 'Work in Progress',
            debit: 0,
            credit: totalCosts,
            debit_base: 0,
            credit_base: totalCosts,
            description: `Cost allocation - ${description}`,
            project_id: projectId
        });

        const journalEntry = await JournalEntry.create({
            tenant_id,
            entry_number: entryNumber,
            date: new Date(),
            description: `Project cost allocation - ${projectId}`,
            lines,
            status: 'posted',
            total_debit: totalCosts,
            total_credit: totalCosts,
            posted_at: new Date()
        });

        return journalEntry;
    } catch (error) {
        console.error('[Project Service] Error allocating costs:', error);
        throw error;
    }
}

/**
 * Get project team members
 */
async function getProjectTeam(projectId, tenant_id) {
    try {
        // Get employees assigned to this project
        // This assumes attendance or timesheet records have project_id
        const { Attendance } = require('../models/HRMS');
        
        const attendanceRecords = await Attendance.find({
            project_id: projectId
        }).populate('employee_id');

        // Get unique employees
        const employeeMap = new Map();
        attendanceRecords.forEach(record => {
            if (record.employee_id) {
                const empId = record.employee_id._id.toString();
                if (!employeeMap.has(empId)) {
                    employeeMap.set(empId, {
                        employee_id: record.employee_id.employee_id,
                        name: record.employee_id.name,
                        department: record.employee_id.department_id,
                        total_hours: 0,
                        days_worked: 0
                    });
                }
                
                const emp = employeeMap.get(empId);
                emp.days_worked += 1;
                emp.total_hours += record.overtime_hours || 8; // Default 8 hours
            }
        });

        return Array.from(employeeMap.values());
    } catch (error) {
        console.error('[Project Service] Error getting team:', error);
        throw error;
    }
}

/**
 * Close project and finalize costs
 */
async function closeProject(projectId, tenant_id) {
    try {
        const project = await Project.findOne({ id: projectId });
        if (!project) {
            throw new Error('Project not found');
        }

        // Get final financials
        const financials = await getProjectFinancials(projectId, tenant_id);

        // Create final journal entry to close WIP to COGS
        const entryNumber = `JE-PRJ-CLOSE-${Date.now()}`;
        
        const journalEntry = await JournalEntry.create({
            tenant_id,
            entry_number: entryNumber,
            date: new Date(),
            description: `Project closure - ${projectId}`,
            lines: [
                {
                    account_code: '5000', // COGS
                    account_name: 'Cost of Goods Sold',
                    debit: financials.total_costs,
                    credit: 0,
                    debit_base: financials.total_costs,
                    credit_base: 0,
                    description: `Project ${projectId} - Final costs`,
                    project_id: projectId
                },
                {
                    account_code: '1500', // WIP
                    account_name: 'Work in Progress',
                    debit: 0,
                    credit: financials.total_costs,
                    debit_base: 0,
                    credit_base: financials.total_costs,
                    description: `Project ${projectId} - Close WIP`,
                    project_id: projectId
                }
            ],
            status: 'posted',
            total_debit: financials.total_costs,
            total_credit: financials.total_costs,
            posted_at: new Date()
        });

        // Update project status
        project.status = 'completed';
        project.progress = 100;
        await project.save();

        return {
            project,
            financials,
            closing_entry: journalEntry
        };
    } catch (error) {
        console.error('[Project Service] Error closing project:', error);
        throw error;
    }
}

module.exports = {
    getProjectFinancials,
    allocateCostsToProject,
    getProjectTeam,
    closeProject
};
