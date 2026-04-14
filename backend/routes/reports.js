const express = require('express');
const router = express.Router();
const ReportService = require('../services/reportService');

// In-memory storage for demo (would be MongoDB in production)
let reportCache = {
  lastGenerated: null,
  data: null
};

// Helper to calculate date ranges
const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date();
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date();
  }

  return { startDate, endDate };
};

// ==================== FINANCIAL REPORTS ====================

// Get Profit & Loss Statement
router.get('/financial/pnl', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // In production, these would query actual databases
    // For now, return calculated data based on stored transactions
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Revenue calculation
    const revenuePipeline = await calculateRevenue(db, tenantId, startStr, endStr);

    // Expenses calculation
    const expenses = await calculateExpenses(db, tenantId, startStr, endStr);

    // Calculate P&L
    const grossProfit = revenuePipeline.total - expenses.cogs;
    const netProfit = grossProfit - expenses.operating - expenses.other;

    res.json({
      period: { start: startStr, end: endStr, type: period },
      revenue: revenuePipeline,
      expenses: expenses,
      profit: {
        gross: grossProfit,
        operating: grossProfit - expenses.operating,
        net: netProfit,
        margin: revenuePipeline.total > 0 ? (netProfit / revenuePipeline.total) * 100 : 0
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('P&L Error:', error);
    res.status(500).json({ error: 'Failed to generate P&L report' });
  }
});

// Get Balance Sheet
router.get('/financial/balance-sheet', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    // Get current balances from various accounts
    const assets = await calculateAssets(db, tenantId);
    const liabilities = await calculateLiabilities(db, tenantId);
    const equity = await calculateEquity(db, tenantId);

    res.json({
      asOf: new Date().toISOString(),
      assets: {
        current: assets.current,
        fixed: assets.fixed,
        total: assets.current + assets.fixed
      },
      liabilities: {
        current: liabilities.current,
        longTerm: liabilities.longTerm,
        total: liabilities.current + liabilities.longTerm
      },
      equity: {
        capital: equity.capital,
        retained: equity.retained,
        total: equity.capital + equity.retained
      },
      balanced: (assets.current + assets.fixed) === (liabilities.current + liabilities.longTerm + equity.capital + equity.retained)
    });
  } catch (error) {
    console.error('Balance Sheet Error:', error);
    res.status(500).json({ error: 'Failed to generate balance sheet' });
  }
});

// Get Cash Flow Statement
router.get('/financial/cash-flow', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const cashFlow = await calculateCashFlow(db, tenantId, startStr, endStr);

    res.json({
      period: { start: startStr, end: endStr, type: period },
      operating: cashFlow.operating,
      investing: cashFlow.investing,
      financing: cashFlow.financing,
      netChange: cashFlow.operating + cashFlow.investing + cashFlow.financing,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cash Flow Error:', error);
    res.status(500).json({ error: 'Failed to generate cash flow report' });
  }
});

// ==================== SALES REPORTS ====================

// Get Sales Analytics
router.get('/sales/analytics', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const analytics = await calculateSalesAnalytics(db, tenantId, startStr, endStr);

    res.json({
      period: { start: startStr, end: endStr, type: period },
      ...analytics,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sales Analytics Error:', error);
    res.status(500).json({ error: 'Failed to generate sales analytics' });
  }
});

// Get Revenue Pipeline
router.get('/sales/pipeline', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const pipeline = await calculatePipeline(db, tenantId);

    res.json({
      stages: pipeline,
      total: pipeline.reduce((sum, s) => sum + s.value, 0),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pipeline Error:', error);
    res.status(500).json({ error: 'Failed to generate pipeline report' });
  }
});

// Get Customer Analytics
router.get('/sales/customers', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const customers = await calculateCustomerAnalytics(db, tenantId);

    res.json({
      customers,
      totalCustomers: customers.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Customer Analytics Error:', error);
    res.status(500).json({ error: 'Failed to generate customer analytics' });
  }
});

// ==================== HR REPORTS ====================

// Get Payroll Report
router.get('/hr/payroll', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const payroll = await calculatePayrollSummary(db, tenantId, startStr, endStr);

    res.json({
      period: { start: startStr, end: endStr, type: period },
      ...payroll,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Payroll Report Error:', error);
    res.status(500).json({ error: 'Failed to generate payroll report' });
  }
});

// Get Attendance Report
router.get('/hr/attendance', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const attendance = await calculateAttendanceSummary(db, tenantId, startStr, endStr);

    res.json({
      period: { start: startStr, end: endStr, type: period },
      ...attendance,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Attendance Report Error:', error);
    res.status(500).json({ error: 'Failed to generate attendance report' });
  }
});

// Get Workforce Analysis
router.get('/hr/workforce', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const workforce = await calculateWorkforceMetrics(db, tenantId);

    res.json({
      ...workforce,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Workforce Report Error:', error);
    res.status(500).json({ error: 'Failed to generate workforce report' });
  }
});

// ==================== INVENTORY REPORTS ====================

// Get Inventory Valuation
router.get('/inventory/valuation', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const valuation = await calculateInventoryValuation(db, tenantId);

    res.json({
      ...valuation,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Inventory Valuation Error:', error);
    res.status(500).json({ error: 'Failed to generate inventory valuation' });
  }
});

// Get Stock Movement Report
router.get('/inventory/movements', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const movements = await calculateStockMovements(db, tenantId, startStr, endStr);

    res.json({
      period: { start: startStr, end: endStr, type: period },
      ...movements,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stock Movement Error:', error);
    res.status(500).json({ error: 'Failed to generate stock movement report' });
  }
});

// ==================== TAX REPORTS ====================

// Get VAT Report
router.get('/tax/vat', async (req, res) => {
  try {
    const { period = 'quarter' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const vat = await calculateVatReport(db, tenantId, startStr, endStr);

    res.json({
      period: { start: startStr, end: endStr, type: period },
      ...vat,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('VAT Report Error:', error);
    res.status(500).json({ error: 'Failed to generate VAT report' });
  }
});

// ==================== DASHBOARD SUMMARY ====================

// Get Dashboard Summary (all key metrics)
router.get('/dashboard/summary', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

    const [
      financeSummary,
      salesMetrics,
      hrMetrics,
      inventoryMetrics,
      taxSummary
    ] = await Promise.all([
      calculateFinanceSummary(db, tenantId, monthStart, monthEnd),
      calculateSalesAnalytics(db, tenantId, monthStart.toISOString().split('T')[0], monthEnd.toISOString().split('T')[0]),
      calculateHRMetrics(db, tenantId),
      calculateInventoryValuation(db, tenantId),
      calculateVatReport(db, tenantId, quarterStart.toISOString().split('T')[0], quarterEnd.toISOString().split('T')[0])
    ]);

    res.json({
      finance: financeSummary,
      sales: salesMetrics,
      hr: hrMetrics,
      inventory: inventoryMetrics,
      tax: taxSummary,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard Summary Error:', error);
    res.status(500).json({ error: 'Failed to generate dashboard summary' });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function calculateRevenue(db, tenantId, startDate, endDate) {
  try {
    if (!db) {
      // Return demo data if no database
      return {
        total: 1250000,
        breakdown: [
          { category: 'Product Sales', amount: 850000 },
          { category: 'Services', amount: 280000 },
          { category: 'Other Income', amount: 120000 }
        ]
      };
    }

    const invoices = await db.collection('invoices').aggregate([
      {
        $match: {
          tenantId: tenantId,
          status: { $in: ['paid', 'sent'] },
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]).toArray();

    return {
      total: invoices[0]?.total || 0,
      breakdown: []
    };
  } catch (error) {
    console.error('Calculate Revenue Error:', error);
    return { total: 0, breakdown: [] };
  }
}

async function calculateExpenses(db, tenantId, startDate, endDate) {
  try {
    if (!db) {
      return {
        cogs: 450000,
        operating: 320000,
        other: 80000,
        total: 850000
      };
    }

    const expenses = await db.collection('expenses').aggregate([
      {
        $match: {
          tenantId: tenantId,
          date: { $gte: startDate, $lte: endDate },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const expenseObj = {};
    expenses.forEach(e => { expenseObj[e._id] = e.total; });

    return {
      cogs: expenseObj['cogs'] || 0,
      operating: expenseObj['operating'] || 0,
      other: expenseObj['other'] || 0,
      total: Object.values(expenseObj).reduce((a, b) => a + b, 0)
    };
  } catch (error) {
    return { cogs: 0, operating: 0, other: 0, total: 0 };
  }
}

async function calculateAssets(db, tenantId) {
  try {
    if (!db) {
      return { current: 2500000, fixed: 1500000, total: 4000000 };
    }

    const bankAccounts = await db.collection('bankAccounts').find({ tenantId }).toArray();
    const inventory = await db.collection('inventory').find({ tenantId }).toArray();

    const current = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)
      + inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitCost || 0)), 0);

    const fixed = await db.collection('fixedAssets').find({ tenantId, status: 'active' })
      .toArray()
      .then(assets => assets.reduce((sum, a) => sum + (a.currentValue || 0), 0));

    return { current, fixed: fixed || 0, total: current + fixed };
  } catch (error) {
    return { current: 0, fixed: 0, total: 0 };
  }
}

async function calculateLiabilities(db, tenantId) {
  try {
    if (!db) {
      return { current: 850000, longTerm: 500000, total: 1350000 };
    }

    const payables = await db.collection('payables').find({ tenantId, status: { $ne: 'paid' } }).toArray();
    const current = payables.reduce((sum, p) => sum + (p.amount || 0), 0);

    const longTerm = await db.collection('loans').find({ tenantId, status: 'active' })
      .toArray()
      .then(loans => loans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0));

    return { current, longTerm: longTerm || 0, total: current + longTerm };
  } catch (error) {
    return { current: 0, longTerm: 0, total: 0 };
  }
}

async function calculateEquity(db, tenantId) {
  try {
    if (!db) {
      return { capital: 2000000, retained: 650000, total: 2650000 };
    }

    const company = await db.collection('companyProfile').findOne({ tenantId });
    const transactions = await db.collection('journalEntries').find({ tenantId }).sort({ date: -1 }).limit(1).toArray();

    return {
      capital: company?.shareCapital || 2000000,
      retained: transactions[0]?.retainedEarnings || 650000,
      total: (company?.shareCapital || 2000000) + (transactions[0]?.retainedEarnings || 650000)
    };
  } catch (error) {
    return { capital: 0, retained: 0, total: 0 };
  }
}

async function calculateCashFlow(db, tenantId, startDate, endDate) {
  try {
    if (!db) {
      return { operating: 180000, investing: -50000, financing: 0 };
    }

    const transactions = await db.collection('bankTransactions').find({
      tenantId,
      transaction_date: { $gte: startDate, $lte: endDate }
    }).toArray();

    const operating = transactions
      .filter(t => t.category === 'operating')
      .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);

    const investing = transactions
      .filter(t => t.category === 'investing')
      .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);

    const financing = transactions
      .filter(t => t.category === 'financing')
      .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);

    return { operating, investing, financing };
  } catch (error) {
    return { operating: 0, investing: 0, financing: 0 };
  }
}

async function calculateSalesAnalytics(db, tenantId, startDate, endDate) {
  try {
    if (!db) {
      return {
        totalSales: 1250000,
        totalOrders: 156,
        averageOrderValue: 8012,
        conversionRate: 32.5,
        topProducts: [
          { name: 'Product A', revenue: 320000, quantity: 450 },
          { name: 'Product B', revenue: 280000, quantity: 320 },
          { name: 'Product C', revenue: 195000, quantity: 280 }
        ],
        monthlyTrend: [
          { month: 'Jan', sales: 280000 },
          { month: 'Feb', sales: 320000 },
          { month: 'Mar', sales: 290000 },
          { month: 'Apr', sales: 360000 }
        ]
      };
    }

    const invoices = await db.collection('invoices').find({
      tenantId,
      date: { $gte: startDate, $lte: endDate }
    }).toArray();

    const totalSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalOrders = invoices.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      conversionRate: 32.5,
      topProducts: [],
      monthlyTrend: []
    };
  } catch (error) {
    return { totalSales: 0, totalOrders: 0, averageOrderValue: 0, conversionRate: 0 };
  }
}

async function calculatePipeline(db, tenantId) {
  try {
    if (!db) {
      return [
        { stage: 'Lead', value: 450000, count: 45 },
        { stage: 'Qualified', value: 320000, count: 28 },
        { stage: 'Proposal', value: 180000, count: 15 },
        { stage: 'Negotiation', value: 95000, count: 8 },
        { stage: 'Closed Won', value: 280000, count: 22 }
      ];
    }

    const opportunities = await db.collection('opportunities').find({ tenantId }).toArray();

    const pipeline = {};
    opportunities.forEach(opp => {
      const stage = opp.stage || 'Lead';
      if (!pipeline[stage]) pipeline[stage] = { value: 0, count: 0 };
      pipeline[stage].value += opp.value || 0;
      pipeline[stage].count += 1;
    });

    return Object.entries(pipeline).map(([stage, data]) => ({ stage, ...data }));
  } catch (error) {
    return [];
  }
}

async function calculateCustomerAnalytics(db, tenantId) {
  try {
    if (!db) {
      return [
        { name: 'Acme Corp', totalRevenue: 185000, orders: 24, lastOrder: '2026-02-15' },
        { name: 'Global Tech', totalRevenue: 156000, orders: 18, lastOrder: '2026-02-20' },
        { name: 'StartUp Inc', totalRevenue: 98000, orders: 12, lastOrder: '2026-02-18' }
      ];
    }

    const customers = await db.collection('customers').find({ tenantId }).toArray();
    const invoices = await db.collection('invoices').find({ tenantId }).toArray();

    return customers.map(customer => {
      const customerInvoices = invoices.filter(inv => inv.customerId === customer._id.toString());
      return {
        name: customer.name,
        totalRevenue: customerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        orders: customerInvoices.length,
        lastOrder: customerInvoices.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date || null
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  } catch (error) {
    return [];
  }
}

async function calculatePayrollSummary(db, tenantId, startDate, endDate) {
  try {
    if (!db) {
      return {
        totalPayroll: 185000,
        employeeCount: 42,
        averageSalary: 4400,
        departmentBreakdown: [
          { department: 'Engineering', amount: 85000, count: 15 },
          { department: 'Sales', amount: 45000, count: 12 },
          { department: 'Operations', amount: 35000, count: 10 },
          { department: 'Admin', amount: 20000, count: 5 }
        ]
      };
    }

    const payrolls = await db.collection('payrolls').find({
      tenantId,
      period: { $gte: startDate, $lte: endDate },
      status: 'finalized'
    }).toArray();

    const totalPayroll = payrolls.reduce((sum, p) => sum + (p.netPay || 0), 0);
    const employeeCount = new Set(payrolls.map(p => p.employeeId)).size;

    return {
      totalPayroll,
      employeeCount,
      averageSalary: employeeCount > 0 ? totalPayroll / employeeCount : 0,
      departmentBreakdown: []
    };
  } catch (error) {
    return { totalPayroll: 0, employeeCount: 0, averageSalary: 0 };
  }
}

async function calculateAttendanceSummary(db, tenantId, startDate, endDate) {
  try {
    if (!db) {
      return {
        present: 1180,
        absent: 45,
        late: 28,
        leave: 67,
        attendanceRate: 89.5
      };
    }

    const attendance = await db.collection('attendance').find({
      tenantId,
      date: { $gte: startDate, $lte: endDate }
    }).toArray();

    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const leave = attendance.filter(a => a.status === 'leave').length;
    const total = attendance.length;

    return {
      present,
      absent,
      late,
      leave,
      attendanceRate: total > 0 ? (present / total) * 100 : 0
    };
  } catch (error) {
    return { present: 0, absent: 0, late: 0, leave: 0, attendanceRate: 0 };
  }
}

async function calculateWorkforceMetrics(db, tenantId) {
  try {
    if (!db) {
      return {
        totalEmployees: 42,
        activeEmployees: 38,
        newHires: 5,
        departures: 2,
        turnoverRate: 4.8,
        departmentDistribution: [
          { department: 'Engineering', count: 15 },
          { department: 'Sales', count: 12 },
          { department: 'Operations', count: 10 },
          { department: 'Admin', count: 5 }
        ]
      };
    }

    const employees = await db.collection('employees').find({ tenantId }).toArray();
    const activeEmployees = employees.filter(e => e.status === 'active');

    return {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      newHires: employees.filter(e => e.joinDate >= new Date(new Date().setMonth(new Date().getMonth() - 12))).length,
      departures: 0,
      turnoverRate: employees.length > 0 ? (0 / employees.length) * 100 : 0,
      departmentDistribution: []
    };
  } catch (error) {
    return { totalEmployees: 0, activeEmployees: 0, newHires: 0, departures: 0 };
  }
}

async function calculateInventoryValuation(db, tenantId) {
  try {
    if (!db) {
      return {
        totalValue: 850000,
        totalItems: 1250,
        categoryBreakdown: [
          { category: 'Raw Materials', value: 320000, quantity: 450 },
          { category: 'Work in Progress', value: 180000, quantity: 200 },
          { category: 'Finished Goods', value: 350000, quantity: 600 }
        ],
        lowStockItems: 8,
        deadStockValue: 25000
      };
    }

    const inventory = await db.collection('inventory').find({ tenantId }).toArray();

    const totalValue = inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitCost || 0)), 0);
    const totalItems = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const lowStockItems = inventory.filter(item => (item.quantity || 0) < (item.reorderLevel || 10)).length;
    const deadStockValue = inventory.filter(item => (item.quantity || 0) > 0 && !item.isActive).reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitCost || 0)), 0);

    return { totalValue, totalItems, lowStockItems, deadStockValue, categoryBreakdown: [] };
  } catch (error) {
    return { totalValue: 0, totalItems: 0, lowStockItems: 0, deadStockValue: 0 };
  }
}

async function calculateStockMovements(db, tenantId, startDate, endDate) {
  try {
    if (!db) {
      return {
        receipts: 450000,
        issues: 380000,
        adjustments: 15000,
        netMovement: 85000,
        topMovements: [
          { item: 'Product A', receipts: 120000, issues: 95000 },
          { item: 'Product B', receipts: 85000, issues: 78000 }
        ]
      };
    }

    const movements = await db.collection('inventoryTransactions').find({
      tenantId,
      date: { $gte: startDate, $lte: endDate }
    }).toArray();

    const receipts = movements.filter(m => m.type === 'receipt').reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);
    const issues = movements.filter(m => m.type === 'issue').reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);
    const adjustments = movements.filter(m => m.type === 'adjustment').reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);

    return { receipts, issues, adjustments, netMovement: receipts - issues, topMovements: [] };
  } catch (error) {
    return { receipts: 0, issues: 0, adjustments: 0, netMovement: 0 };
  }
}

async function calculateVatReport(db, tenantId, startDate, endDate) {
  try {
    if (!db) {
      return {
        outputVAT: 125000,
        inputVAT: 85000,
        netVAT: 40000,
        totalSales: 1250000,
        totalPurchases: 850000,
        filingDue: '2026-04-20'
      };
    }

    const invoices = await db.collection('invoices').find({
      tenantId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['paid', 'sent'] }
    }).toArray();

    const purchaseInvoices = await db.collection('vendorBills').find({
      tenantId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['paid', 'approved'] }
    }).toArray();

    const totalSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPurchases = purchaseInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const outputVAT = totalSales * 0.05; // 5% VAT
    const inputVAT = totalPurchases * 0.05;

    return {
      outputVAT,
      inputVAT,
      netVAT: outputVAT - inputVAT,
      totalSales,
      totalPurchases,
      filingDue: new Date(new Date().setDate(new Date().getDate() + 28)).toISOString().split('T')[0]
    };
  } catch (error) {
    return { outputVAT: 0, inputVAT: 0, netVAT: 0, totalSales: 0, totalPurchases: 0 };
  }
}

async function calculateFinanceSummary(db, tenantId, monthStart, monthEnd) {
  try {
    if (!db) {
      return {
        revenue: 420000,
        expenses: 285000,
        netIncome: 135000,
        cashPosition: 850000,
        receivables: 320000,
        payables: 180000
      };
    }

    const startStr = monthStart.toISOString().split('T')[0];
    const endStr = monthEnd.toISOString().split('T')[0];

    const revenue = await calculateRevenue(db, tenantId, startStr, endStr);
    const expenses = await calculateExpenses(db, tenantId, startStr, endStr);
    const assets = await calculateAssets(db, tenantId);
    const liabilities = await calculateLiabilities(db, tenantId);

    return {
      revenue: revenue.total,
      expenses: expenses.total,
      netIncome: revenue.total - expenses.total,
      cashPosition: assets.current,
      receivables: liabilities.current * 0.5,
      payables: liabilities.current
    };
  } catch (error) {
    return { revenue: 0, expenses: 0, netIncome: 0, cashPosition: 0, receivables: 0, payables: 0 };
  }
}

async function calculateHRMetrics(db, tenantId) {
  try {
    if (!db) {
      return {
        totalEmployees: 42,
        payrollThisMonth: 185000,
        attendanceRate: 89.5,
        leaveBalance: 156
      };
    }

    const employees = await db.collection('employees').find({ tenantId, status: 'active' }).toArray();

    return {
      totalEmployees: employees.length,
      payrollThisMonth: employees.length * 4400,
      attendanceRate: 89.5,
      leaveBalance: employees.length * 3
    };
  } catch (error) {
    return { totalEmployees: 0, payrollThisMonth: 0, attendanceRate: 0, leaveBalance: 0 };
  }
}

module.exports = router;

// ==================== COMPREHENSIVE REPORTS ====================

// Get comprehensive financial report
router.get('/comprehensive/financial', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const reportService = new ReportService(db);
    const report = await reportService.generateFinancialReport(
      tenantId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    res.json(report);
  } catch (error) {
    console.error('Comprehensive Financial Report Error:', error);
    res.status(500).json({ error: 'Failed to generate comprehensive financial report' });
  }
});

// Get comprehensive manufacturing report
router.get('/comprehensive/manufacturing', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const reportService = new ReportService(db);
    const report = await reportService.generateManufacturingReport(
      tenantId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    res.json(report);
  } catch (error) {
    console.error('Comprehensive Manufacturing Report Error:', error);
    res.status(500).json({ error: 'Failed to generate comprehensive manufacturing report' });
  }
});

// Get comprehensive HR report
router.get('/comprehensive/hr', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const reportService = new ReportService(db);
    const report = await reportService.generateHRReport(
      tenantId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    res.json(report);
  } catch (error) {
    console.error('Comprehensive HR Report Error:', error);
    res.status(500).json({ error: 'Failed to generate comprehensive HR report' });
  }
});

// ==================== EXPORT ENDPOINTS ====================

// Export financial report to Excel
router.get('/export/financial/excel', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const reportService = new ReportService(db);
    const report = await reportService.generateFinancialReport(
      tenantId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const buffer = await reportService.exportToExcel(report, 'financial');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=financial_report_${endDate.toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export Financial Excel Error:', error);
    res.status(500).json({ error: 'Failed to export financial report to Excel' });
  }
});

// Export manufacturing report to Excel
router.get('/export/manufacturing/excel', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const reportService = new ReportService(db);
    const report = await reportService.generateManufacturingReport(
      tenantId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const buffer = await reportService.exportToExcel(report, 'manufacturing');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=manufacturing_report_${endDate.toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export Manufacturing Excel Error:', error);
    res.status(500).json({ error: 'Failed to export manufacturing report to Excel' });
  }
});

// Export HR report to Excel
router.get('/export/hr/excel', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const reportService = new ReportService(db);
    const report = await reportService.generateHRReport(
      tenantId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const buffer = await reportService.exportToExcel(report, 'hr');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=hr_report_${endDate.toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export HR Excel Error:', error);
    res.status(500).json({ error: 'Failed to export HR report to Excel' });
  }
});

// Export financial report to CSV
router.get('/export/financial/csv', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const reportService = new ReportService(db);
    const report = await reportService.generateFinancialReport(
      tenantId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const buffer = await reportService.exportToCSV(report, 'financial');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=financial_report_${endDate.toISOString().split('T')[0]}.csv`);
    res.send(buffer);
  } catch (error) {
    console.error('Export Financial CSV Error:', error);
    res.status(500).json({ error: 'Failed to export financial report to CSV' });
  }
});

// ==================== SCHEDULED REPORTS ====================

// Get scheduled reports
router.get('/scheduled', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const scheduledReports = await db.collection('scheduledreports').find({ tenantId }).toArray();
    res.json(scheduledReports);
  } catch (error) {
    console.error('Get Scheduled Reports Error:', error);
    res.status(500).json({ error: 'Failed to get scheduled reports' });
  }
});

// Create scheduled report
router.post('/scheduled', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const scheduledReport = {
      ...req.body,
      tenantId,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    const result = await db.collection('scheduledreports').insertOne(scheduledReport);
    res.status(201).json({ id: result.insertedId, ...scheduledReport });
  } catch (error) {
    console.error('Create Scheduled Report Error:', error);
    res.status(500).json({ error: 'Failed to create scheduled report' });
  }
});

// Update scheduled report
router.put('/scheduled/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const { id } = req.params;

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const result = await db.collection('scheduledreports').updateOne(
      { _id: require('mongodb').ObjectId(id), tenantId },
      { $set: { ...req.body, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Scheduled report not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update Scheduled Report Error:', error);
    res.status(500).json({ error: 'Failed to update scheduled report' });
  }
});

// Delete scheduled report
router.delete('/scheduled/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const { id } = req.params;

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const result = await db.collection('scheduledreports').deleteOne({
      _id: require('mongodb').ObjectId(id),
      tenantId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Scheduled report not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete Scheduled Report Error:', error);
    res.status(500).json({ error: 'Failed to delete scheduled report' });
  }
});

// ==================== REPORT TEMPLATES ====================

// Get report templates
router.get('/templates', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    if (!db) {
      // Return default templates if no database
      return res.json([
        {
          id: 'financial-monthly',
          name: 'Monthly Financial Report',
          type: 'financial',
          description: 'Comprehensive monthly financial statements including P&L, Balance Sheet, and Cash Flow',
          frequency: 'monthly',
          format: 'pdf'
        },
        {
          id: 'manufacturing-weekly',
          name: 'Weekly Manufacturing Report',
          type: 'manufacturing',
          description: 'Weekly production metrics, quality, and efficiency analysis',
          frequency: 'weekly',
          format: 'excel'
        },
        {
          id: 'hr-monthly',
          name: 'Monthly HR Report',
          type: 'hr',
          description: 'Monthly payroll, attendance, and workforce analytics',
          frequency: 'monthly',
          format: 'pdf'
        },
        {
          id: 'sales-quarterly',
          name: 'Quarterly Sales Report',
          type: 'sales',
          description: 'Quarterly sales performance, pipeline, and customer analytics',
          frequency: 'quarterly',
          format: 'excel'
        },
        {
          id: 'inventory-monthly',
          name: 'Monthly Inventory Report',
          type: 'inventory',
          description: 'Monthly inventory valuation and stock movement analysis',
          frequency: 'monthly',
          format: 'excel'
        }
      ]);
    }

    const templates = await db.collection('reporttemplates').find({ tenantId }).toArray();
    res.json(templates);
  } catch (error) {
    console.error('Get Report Templates Error:', error);
    res.status(500).json({ error: 'Failed to get report templates' });
  }
});

// Create report template
router.post('/templates', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const template = {
      ...req.body,
      tenantId,
      createdAt: new Date().toISOString()
    };

    const result = await db.collection('reporttemplates').insertOne(template);
    res.status(201).json({ id: result.insertedId, ...template });
  } catch (error) {
    console.error('Create Report Template Error:', error);
    res.status(500).json({ error: 'Failed to create report template' });
  }
});

