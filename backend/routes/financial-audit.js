const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { Account, JournalEntry, Invoice, Expense } = require('../models/Finance');
const { InvoiceAR } = require('../models/Receivables');
const { Bill } = require('../models/Payables');
const { FinancialAuditReport } = require('../models/BusinessDocuments');

router.use(auth);

function safeNum(value) {
    return Number(value || 0);
}

function monthKey(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function evaluateHealth(anomalyCount, ledgerIntegrity) {
    if (!ledgerIntegrity) return 'poor';
    if (anomalyCount === 0) return 'excellent';
    if (anomalyCount <= 2) return 'good';
    if (anomalyCount <= 5) return 'fair';
    return 'poor';
}

function tenantScopedFilter(tenantId, filter = {}) {
    if (tenantId === 'default') {
        return {
            ...filter,
            $or: [
                { tenant_id: tenantId },
                { tenant_id: { $exists: false } },
            ],
        };
    }

    return {
        ...filter,
        tenant_id: tenantId,
    };
}

router.get('/report', async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const toDate = req.query.to ? new Date(req.query.to) : new Date();
        const fromDate = req.query.from ? new Date(req.query.from) : new Date(toDate.getFullYear(), toDate.getMonth(), 1);

        const [accounts, journals, invoices, expenses, arInvoices, bills] = await Promise.all([
            Account.find(tenantScopedFilter(tenant_id)).lean(),
            JournalEntry.find(tenantScopedFilter(tenant_id, { date: { $gte: fromDate, $lte: toDate } })).lean(),
            Invoice.find(tenantScopedFilter(tenant_id, { issue_date: { $gte: fromDate, $lte: toDate } })).lean(),
            Expense.find(tenantScopedFilter(tenant_id, { date: { $gte: fromDate, $lte: toDate } })).lean(),
            InvoiceAR.find(tenantScopedFilter(tenant_id, { invoice_date: { $gte: fromDate, $lte: toDate } })).lean(),
            Bill.find(tenantScopedFilter(tenant_id, { bill_date: { $gte: fromDate, $lte: toDate } })).lean()
        ]);

        const brokenJournals = journals.filter(j => Math.abs(safeNum(j.total_debit) - safeNum(j.total_credit)) > 0.01);
        const ledgerIntegrity = brokenJournals.length === 0;

        const revenue = invoices.reduce((sum, i) => sum + safeNum(i.total), 0) + arInvoices.reduce((sum, i) => sum + safeNum(i.total_amount), 0);
        const expenseTotal = expenses.reduce((sum, e) => sum + safeNum(e.total), 0) + bills.reduce((sum, b) => sum + safeNum(b.total_amount), 0);

        const assets = accounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + safeNum(a.balance), 0);
        const liabilities = accounts.filter(a => a.type === 'liability').reduce((sum, a) => sum + safeNum(a.balance), 0);
        const equity = accounts.filter(a => a.type === 'equity').reduce((sum, a) => sum + safeNum(a.balance), 0);

        const anomalies = [];
        if (!ledgerIntegrity) {
            anomalies.push({
                category: 'error',
                description: `${brokenJournals.length} journal entries are unbalanced (debit != credit).`,
                severity: 'high'
            });
        }

        if (assets > 0 && liabilities + equity !== 0 && Math.abs(assets - (liabilities + equity)) > 0.01) {
            anomalies.push({
                category: 'warning',
                description: 'Accounting equation mismatch detected: assets do not equal liabilities + equity.',
                severity: 'medium'
            });
        }

        if (expenseTotal > revenue) {
            anomalies.push({
                category: 'observation',
                description: 'Net loss period detected (expenses exceed revenue).',
                severity: 'low'
            });
        }

        const monthlyMap = new Map();
        invoices.forEach(i => {
            const key = monthKey(i.issue_date || i.createdAt);
            const curr = monthlyMap.get(key) || { month: key, revenue: 0, expenses: 0 };
            curr.revenue += safeNum(i.total);
            monthlyMap.set(key, curr);
        });
        arInvoices.forEach(i => {
            const key = monthKey(i.invoice_date || i.createdAt);
            const curr = monthlyMap.get(key) || { month: key, revenue: 0, expenses: 0 };
            curr.revenue += safeNum(i.total_amount);
            monthlyMap.set(key, curr);
        });
        expenses.forEach(e => {
            const key = monthKey(e.date || e.createdAt);
            const curr = monthlyMap.get(key) || { month: key, revenue: 0, expenses: 0 };
            curr.expenses += safeNum(e.total);
            monthlyMap.set(key, curr);
        });
        bills.forEach(b => {
            const key = monthKey(b.bill_date || b.createdAt);
            const curr = monthlyMap.get(key) || { month: key, revenue: 0, expenses: 0 };
            curr.expenses += safeNum(b.total_amount);
            monthlyMap.set(key, curr);
        });

        const chartData = {
            monthly_revenue: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({ month: m.month, amount: m.revenue })),
            monthly_expenses: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({ month: m.month, amount: m.expenses }))
        };

        const report = {
            generated_at: new Date().toISOString(),
            period: {
                from: fromDate.toISOString().split('T')[0],
                to: toDate.toISOString().split('T')[0]
            },
            executive_summary: {
                overall_health: evaluateHealth(anomalies.length, ledgerIntegrity),
                ledger_integrity: ledgerIntegrity,
                total_transactions: journals.length + invoices.length + expenses.length + arInvoices.length + bills.length,
                total_accounts: accounts.length
            },
            financial_summary: {
                total_assets: assets,
                total_liabilities: liabilities,
                total_equity: equity,
                total_revenue: revenue,
                total_expenses: expenseTotal,
                net_profit: revenue - expenseTotal
            },
            anomalies_detected: anomalies,
            chart_data: chartData
        };

        await FinancialAuditReport.create({
            tenant_id,
            ...report
        });

        res.json(report);
    } catch (error) {
        console.error('[Financial Audit] Error:', error);
        res.status(500).json({ error: 'Failed to generate financial audit report' });
    }
});

router.get('/history', async (req, res) => {
    try {
        const tenant_id = req.user?.tenant_id || 'default';
        const reports = await FinancialAuditReport.find({ tenant_id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch financial audit report history' });
    }
});

module.exports = router;
