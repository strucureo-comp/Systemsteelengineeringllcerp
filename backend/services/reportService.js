/**
 * Report Service
 * Comprehensive reporting engine for all ERP modules
 */

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class ReportService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Generate comprehensive financial report
   */
  async generateFinancialReport(tenantId, startDate, endDate, options = {}) {
    const [pnl, balanceSheet, cashFlow, ratios] = await Promise.all([
      this.calculatePnL(tenantId, startDate, endDate),
      this.calculateBalanceSheet(tenantId, endDate),
      this.calculateCashFlow(tenantId, startDate, endDate),
      this.calculateFinancialRatios(tenantId, startDate, endDate)
    ]);

    return {
      period: { start: startDate, end: endDate },
      profitAndLoss: pnl,
      balanceSheet,
      cashFlow,
      financialRatios: ratios,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate Profit & Loss with detailed breakdown
   */
  async calculatePnL(tenantId, startDate, endDate) {
    const revenue = await this.calculateRevenue(tenantId, startDate, endDate);
    const cogs = await this.calculateCOGS(tenantId, startDate, endDate);
    const expenses = await this.calculateExpenses(tenantId, startDate, endDate);
    
    const grossProfit = revenue.total - cogs.total;
    const operatingProfit = grossProfit - expenses.operating;
    const netProfit = operatingProfit - expenses.other - expenses.interest + revenue.other;

    return {
      revenue,
      cogs,
      expenses,
      grossProfit,
      grossProfitMargin: revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0,
      operatingProfit,
      operatingMargin: revenue.total > 0 ? (operatingProfit / revenue.total) * 100 : 0,
      netProfit,
      netMargin: revenue.total > 0 ? (netProfit / revenue.total) * 100 : 0
    };
  }

  /**
   * Calculate revenue from invoices and sales
   */
  async calculateRevenue(tenantId, startDate, endDate) {
    try {
      // OPTIMIZATION: Use aggregation pipeline for heavy summation
      const [invoiceRevenue, salesRevenue] = await Promise.all([
        this.db.collection('invoices').aggregate([
          { $match: { 
            tenantId, 
            status: { $in: ['paid', 'sent', 'partial'] },
            issue_date: { $gte: startDate, $lte: endDate }
          }},
          { $group: { _id: null, total: { $sum: "$total" } } }
        ]).toArray(),
        this.db.collection('salesorders').aggregate([
          { $match: { 
            tenantId, 
            status: 'completed',
            order_date: { $gte: startDate, $lte: endDate },
            type: 'service'
          }},
          { $group: { _id: null, total: { $sum: "$total" } } }
        ]).toArray()
      ]);

      const productRevenue = invoiceRevenue[0]?.total || 0;
      const serviceRevenue = salesRevenue[0]?.total || 0;
      const otherRevenue = 0;

      return {
        product: productRevenue,
        service: serviceRevenue,
        other: otherRevenue,
        total: productRevenue + serviceRevenue + otherRevenue,
        breakdown: [
          { category: 'Product Sales', amount: productRevenue },
          { category: 'Service Revenue', amount: serviceRevenue },
          { category: 'Other Income', amount: otherRevenue }
        ]
      };
    } catch (error) {
      console.error('Calculate Revenue Error:', error);
      return { product: 0, service: 0, other: 0, total: 0, breakdown: [] };
    }
  }

  /**
   * Calculate Cost of Goods Sold
   */
  async calculateCOGS(tenantId, startDate, endDate) {
    try {
      // OPTIMIZATION: Use aggregation for COGS
      const result = await this.db.collection('productionorders').aggregate([
        { $match: { 
          tenantId, 
          status: 'completed',
          completionDate: { $gte: startDate, $lte: endDate }
        }},
        { $group: { 
          _id: null, 
          material: { $sum: "$materialCost" },
          labor: { $sum: "$laborCost" },
          overhead: { $sum: "$overheadCost" }
        }}
      ]).toArray();

      const data = result[0] || { material: 0, labor: 0, overhead: 0 };

      return {
        material: data.material,
        labor: data.labor,
        overhead: data.overhead,
        total: data.material + data.labor + data.overhead
      };
    } catch (error) {
      return { material: 0, labor: 0, overhead: 0, total: 0 };
    }
  }

  async calculateExpenses(tenantId, startDate, endDate) {
    try {
      // OPTIMIZATION: Use aggregation for expenses grouping
      const results = await this.db.collection('expenses').aggregate([
        { $match: { 
          tenantId, 
          date: { $gte: startDate, $lte: endDate },
          status: 'approved'
        }},
        { $group: { 
          _id: "$category", 
          total: { $sum: "$amount" } 
        }}
      ]).toArray();

      const mapped = results.reduce((acc, curr) => {
        acc[curr._id] = curr.total;
        return acc;
      }, {});

      const operating = mapped.operating || 0;
      const interest = mapped.interest || 0;
      const other = Object.entries(mapped)
        .filter(([k]) => !['operating', 'interest'].includes(k))
        .reduce((sum, [, v]) => sum + v, 0);

      return { operating, interest, other, total: operating + interest + other };
    } catch (error) {
      return { operating: 0, interest: 0, other: 0, total: 0 };
    }
  }

  async calculateBalanceSheet(tenantId, asOfDate) {
    const assets = await this.calculateAssets(tenantId, asOfDate);
    const liabilities = await this.calculateLiabilities(tenantId, asOfDate);
    const equity = await this.calculateEquity(tenantId, asOfDate);

    return { assets, liabilities, equity, balanced: assets.total === (liabilities.total + equity.total) };
  }

  async calculateAssets(tenantId, asOfDate) {
    try {
      const cash = await this.db.collection('bankaccounts').find({ tenantId }).toArray()
        .then(accounts => accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0));

      const receivables = await this.db.collection('receivables').find({ tenantId, status: { $ne: 'paid' } }).toArray()
        .then(recs => recs.reduce((sum, r) => sum + (r.amount || 0), 0));

      const inventory = await this.db.collection('inventory').find({ tenantId }).toArray()
        .then(items => items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitCost || 0)), 0));

      const fixedAssets = await this.db.collection('fixedassets').find({ tenantId, status: 'active' }).toArray()
        .then(assets => assets.reduce((sum, a) => sum + (a.currentValue || 0), 0));

      const currentAssets = cash + receivables + inventory;
      const total = currentAssets + fixedAssets;

      return {
        current: { cash, receivables, inventory, total: currentAssets },
        fixed: fixedAssets,
        total
      };
    } catch (error) {
      return { current: { cash: 0, receivables: 0, inventory: 0, total: 0 }, fixed: 0, total: 0 };
    }
  }

  async calculateLiabilities(tenantId, asOfDate) {
    try {
      const payables = await this.db.collection('payables').find({ tenantId, status: { $ne: 'paid' } }).toArray()
        .then(pays => pays.reduce((sum, p) => sum + (p.amount || 0), 0));

      const loans = await this.db.collection('loans').find({ tenantId, status: 'active' }).toArray()
        .then(loans => loans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0));

      return {
        current: payables,
        longTerm: loans,
        total: payables + loans
      };
    } catch (error) {
      return { current: 0, longTerm: 0, total: 0 };
    }
  }

  async calculateEquity(tenantId, asOfDate) {
    try {
      const company = await this.db.collection('companyprofile').findOne({ tenantId });
      const capital = company?.shareCapital || 0;
      const retained = company?.retainedEarnings || 0;

      return { capital, retained, total: capital + retained };
    } catch (error) {
      return { capital: 0, retained: 0, total: 0 };
    }
  }

  async calculateCashFlow(tenantId, startDate, endDate) {
    try {
      const transactions = await this.db.collection('banktransactions').find({
        tenantId,
        transaction_date: { $gte: startDate, $lte: endDate }
      }).toArray();

      const operating = transactions.filter(t => t.category === 'operating')
        .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);

      const investing = transactions.filter(t => t.category === 'investing')
        .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);

      const financing = transactions.filter(t => t.category === 'financing')
        .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);

      return {
        operating,
        investing,
        financing,
        netChange: operating + investing + financing
      };
    } catch (error) {
      return { operating: 0, investing: 0, financing: 0, netChange: 0 };
    }
  }

  async calculateFinancialRatios(tenantId, startDate, endDate) {
    const pnl = await this.calculatePnL(tenantId, startDate, endDate);
    const bs = await this.calculateBalanceSheet(tenantId, endDate);

    const currentRatio = bs.liabilities.current > 0 ? bs.assets.current.total / bs.liabilities.current : 0;
    const quickRatio = bs.liabilities.current > 0 ? (bs.assets.current.cash + bs.assets.current.receivables) / bs.liabilities.current : 0;
    const debtToEquity = bs.equity.total > 0 ? bs.liabilities.total / bs.equity.total : 0;
    const returnOnAssets = bs.assets.total > 0 ? (pnl.netProfit / bs.assets.total) * 100 : 0;
    const returnOnEquity = bs.equity.total > 0 ? (pnl.netProfit / bs.equity.total) * 100 : 0;

    return {
      liquidity: { currentRatio, quickRatio },
      leverage: { debtToEquity },
      profitability: { returnOnAssets, returnOnEquity, netMargin: pnl.netMargin }
    };
  }

  /**
   * Generate Manufacturing Reports
   */
  async generateManufacturingReport(tenantId, startDate, endDate) {
    const [production, quality, efficiency, scrap] = await Promise.all([
      this.calculateProductionMetrics(tenantId, startDate, endDate),
      this.calculateQualityMetrics(tenantId, startDate, endDate),
      this.calculateEfficiencyMetrics(tenantId, startDate, endDate),
      this.calculateScrapMetrics(tenantId, startDate, endDate)
    ]);

    return {
      period: { start: startDate, end: endDate },
      production,
      quality,
      efficiency,
      scrap,
      generatedAt: new Date().toISOString()
    };
  }

  async calculateProductionMetrics(tenantId, startDate, endDate) {
    try {
      const orders = await this.db.collection('productionorders').find({
        tenantId,
        startDate: { $gte: startDate, $lte: endDate }
      }).toArray();

      const completed = orders.filter(o => o.status === 'completed').length;
      const inProgress = orders.filter(o => o.status === 'in_progress').length;
      const planned = orders.filter(o => o.status === 'planned').length;

      const totalQuantity = orders.reduce((sum, o) => sum + (o.quantityProduced || 0), 0);
      const targetQuantity = orders.reduce((sum, o) => sum + (o.quantityPlanned || 0), 0);

      return {
        totalOrders: orders.length,
        completed,
        inProgress,
        planned,
        totalQuantity,
        targetQuantity,
        achievementRate: targetQuantity > 0 ? (totalQuantity / targetQuantity) * 100 : 0
      };
    } catch (error) {
      return { totalOrders: 0, completed: 0, inProgress: 0, planned: 0, totalQuantity: 0, targetQuantity: 0, achievementRate: 0 };
    }
  }

  async calculateQualityMetrics(tenantId, startDate, endDate) {
    try {
      const inspections = await this.db.collection('qualityinspections').find({
        tenantId,
        inspectionDate: { $gte: startDate, $lte: endDate }
      }).toArray();

      const passed = inspections.filter(i => i.result === 'passed').length;
      const failed = inspections.filter(i => i.result === 'failed').length;
      const total = inspections.length;

      return {
        totalInspections: total,
        passed,
        failed,
        passRate: total > 0 ? (passed / total) * 100 : 0
      };
    } catch (error) {
      return { totalInspections: 0, passed: 0, failed: 0, passRate: 0 };
    }
  }

  async calculateEfficiencyMetrics(tenantId, startDate, endDate) {
    try {
      const orders = await this.db.collection('productionorders').find({
        tenantId,
        status: 'completed',
        completionDate: { $gte: startDate, $lte: endDate }
      }).toArray();

      const totalPlannedTime = orders.reduce((sum, o) => sum + (o.plannedDuration || 0), 0);
      const totalActualTime = orders.reduce((sum, o) => sum + (o.actualDuration || 0), 0);

      return {
        totalOrders: orders.length,
        totalPlannedTime,
        totalActualTime,
        efficiency: totalPlannedTime > 0 ? (totalPlannedTime / totalActualTime) * 100 : 0
      };
    } catch (error) {
      return { totalOrders: 0, totalPlannedTime: 0, totalActualTime: 0, efficiency: 0 };
    }
  }

  async calculateScrapMetrics(tenantId, startDate, endDate) {
    try {
      const scrapRecords = await this.db.collection('scraprecords').find({
        tenantId,
        date: { $gte: startDate, $lte: endDate }
      }).toArray();

      const totalScrap = scrapRecords.reduce((sum, s) => sum + (s.quantity || 0), 0);
      const scrapValue = scrapRecords.reduce((sum, s) => sum + (s.value || 0), 0);

      return {
        totalRecords: scrapRecords.length,
        totalScrap,
        scrapValue,
        breakdown: scrapRecords.reduce((acc, s) => {
          const reason = s.reason || 'Unknown';
          if (!acc[reason]) acc[reason] = { quantity: 0, value: 0 };
          acc[reason].quantity += s.quantity || 0;
          acc[reason].value += s.value || 0;
          return acc;
        }, {})
      };
    } catch (error) {
      return { totalRecords: 0, totalScrap: 0, scrapValue: 0, breakdown: {} };
    }
  }

  /**
   * Generate HR Reports
   */
  async generateHRReport(tenantId, startDate, endDate) {
    const [payroll, attendance, workforce, turnover] = await Promise.all([
      this.calculatePayrollSummary(tenantId, startDate, endDate),
      this.calculateAttendanceSummary(tenantId, startDate, endDate),
      this.calculateWorkforceMetrics(tenantId),
      this.calculateTurnoverMetrics(tenantId, startDate, endDate)
    ]);

    return {
      period: { start: startDate, end: endDate },
      payroll,
      attendance,
      workforce,
      turnover,
      generatedAt: new Date().toISOString()
    };
  }

  async calculatePayrollSummary(tenantId, startDate, endDate) {
    try {
      const payrolls = await this.db.collection('payrolls').find({
        tenantId,
        period: { $gte: startDate, $lte: endDate },
        status: 'finalized'
      }).toArray();

      const totalGross = payrolls.reduce((sum, p) => sum + (p.grossPay || 0), 0);
      const totalNet = payrolls.reduce((sum, p) => sum + (p.netPay || 0), 0);
      const totalDeductions = payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
      const employeeCount = new Set(payrolls.map(p => p.employeeId)).size;

      return {
        totalGross,
        totalNet,
        totalDeductions,
        employeeCount,
        averageSalary: employeeCount > 0 ? totalNet / employeeCount : 0
      };
    } catch (error) {
      return { totalGross: 0, totalNet: 0, totalDeductions: 0, employeeCount: 0, averageSalary: 0 };
    }
  }

  async calculateAttendanceSummary(tenantId, startDate, endDate) {
    try {
      const attendance = await this.db.collection('attendance').find({
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
        total,
        attendanceRate: total > 0 ? (present / total) * 100 : 0
      };
    } catch (error) {
      return { present: 0, absent: 0, late: 0, leave: 0, total: 0, attendanceRate: 0 };
    }
  }

  async calculateWorkforceMetrics(tenantId) {
    try {
      const employees = await this.db.collection('employees').find({ tenantId }).toArray();
      const active = employees.filter(e => e.status === 'active');

      const departmentDistribution = active.reduce((acc, e) => {
        const dept = e.department || 'Unassigned';
        if (!acc[dept]) acc[dept] = 0;
        acc[dept]++;
        return acc;
      }, {});

      return {
        totalEmployees: employees.length,
        activeEmployees: active.length,
        departmentDistribution
      };
    } catch (error) {
      return { totalEmployees: 0, activeEmployees: 0, departmentDistribution: {} };
    }
  }

  async calculateTurnoverMetrics(tenantId, startDate, endDate) {
    try {
      const separations = await this.db.collection('separations').find({
        tenantId,
        separationDate: { $gte: startDate, $lte: endDate }
      }).toArray();

      const newHires = await this.db.collection('employees').find({
        tenantId,
        joinDate: { $gte: startDate, $lte: endDate }
      }).toArray();

      const totalEmployees = await this.db.collection('employees').countDocuments({ tenantId, status: 'active' });

      return {
        separations: separations.length,
        newHires: newHires.length,
        turnoverRate: totalEmployees > 0 ? (separations.length / totalEmployees) * 100 : 0
      };
    } catch (error) {
      return { separations: 0, newHires: 0, turnoverRate: 0 };
    }
  }

  /**
   * Export report to Excel
   */
  async exportToExcel(reportData, reportType) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportType);

    // Add headers and data based on report type
    if (reportType === 'financial') {
      this.addFinancialDataToExcel(worksheet, reportData);
    } else if (reportType === 'manufacturing') {
      this.addManufacturingDataToExcel(worksheet, reportData);
    } else if (reportType === 'hr') {
      this.addHRDataToExcel(worksheet, reportData);
    }

    return await workbook.xlsx.writeBuffer();
  }

  addFinancialDataToExcel(worksheet, data) {
    worksheet.columns = [
      { header: 'Category', key: 'category', width: 30 },
      { header: 'Amount', key: 'amount', width: 15 }
    ];

    worksheet.addRow({ category: 'REVENUE', amount: '' });
    worksheet.addRow({ category: 'Total Revenue', amount: data.profitAndLoss.revenue.total });
    worksheet.addRow({ category: '', amount: '' });
    worksheet.addRow({ category: 'EXPENSES', amount: '' });
    worksheet.addRow({ category: 'Operating Expenses', amount: data.profitAndLoss.expenses.operating });
    worksheet.addRow({ category: '', amount: '' });
    worksheet.addRow({ category: 'NET PROFIT', amount: data.profitAndLoss.netProfit });
  }

  addManufacturingDataToExcel(worksheet, data) {
    worksheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 15 }
    ];

    worksheet.addRow({ metric: 'Total Production Orders', value: data.production.totalOrders });
    worksheet.addRow({ metric: 'Completed Orders', value: data.production.completed });
    worksheet.addRow({ metric: 'Quality Pass Rate', value: `${data.quality.passRate.toFixed(2)}%` });
    worksheet.addRow({ metric: 'Production Efficiency', value: `${data.efficiency.efficiency.toFixed(2)}%` });
  }

  addHRDataToExcel(worksheet, data) {
    worksheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 15 }
    ];

    worksheet.addRow({ metric: 'Total Employees', value: data.workforce.totalEmployees });
    worksheet.addRow({ metric: 'Active Employees', value: data.workforce.activeEmployees });
    worksheet.addRow({ metric: 'Attendance Rate', value: `${data.attendance.attendanceRate.toFixed(2)}%` });
    worksheet.addRow({ metric: 'Turnover Rate', value: `${data.turnover.turnoverRate.toFixed(2)}%` });
  }

  /**
   * Export report to CSV
   */
  async exportToCSV(reportData, reportType) {
    let csv = '';

    if (reportType === 'financial') {
      csv = 'Category,Amount\n';
      csv += `Total Revenue,${reportData.profitAndLoss.revenue.total}\n`;
      csv += `Operating Expenses,${reportData.profitAndLoss.expenses.operating}\n`;
      csv += `Net Profit,${reportData.profitAndLoss.netProfit}\n`;
    } else if (reportType === 'manufacturing') {
      csv = 'Metric,Value\n';
      csv += `Total Orders,${reportData.production.totalOrders}\n`;
      csv += `Completed,${reportData.production.completed}\n`;
      csv += `Quality Pass Rate,${reportData.quality.passRate.toFixed(2)}%\n`;
    } else if (reportType === 'hr') {
      csv = 'Metric,Value\n';
      csv += `Total Employees,${reportData.workforce.totalEmployees}\n`;
      csv += `Attendance Rate,${reportData.attendance.attendanceRate.toFixed(2)}%\n`;
    }

    return Buffer.from(csv, 'utf-8');
  }
}

module.exports = ReportService;
