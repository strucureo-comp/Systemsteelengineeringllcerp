const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { 
    Employee, HRDepartment, HRRole, Attendance, Leave, Payroll, SalaryStructure, LeaveType, Holiday,
    HREvent,
    JobOpening, Applicant, OfferLetter, LeaveBalance, DisciplinaryAction, EmployeeDocument, PayrollDeletionAudit,
    Shift, Roster, Separation, FinalSettlement,
    OvertimeLog, PaymentDetails, BiometricDevice, AttendanceLog
} = require('../models/HRMS');
const { JournalEntry, Account } = require('../models/Finance');
const { auth } = require('../middleware/auth');
const approvalEngine = require('../services/approvalEngine');

// Helper to transform MongoDB documents to include id field (alias for _id)
const transformDoc = (doc) => {
    if (!doc) return doc;
    const obj = doc.toObject ? doc.toObject() : doc;
    const transformed = { ...obj, id: obj._id };

    // Rename employee_id to employee if populated (for leaves, attendance, etc.)
    if (transformed.employee_id && typeof transformed.employee_id === 'object') {
        transformed.employee = transformed.employee_id;
        delete transformed.employee_id;
    }

    // Transform hr_role_id to role (title)
    if (transformed.hr_role_id && typeof transformed.hr_role_id === 'object') {
        transformed.role = transformed.hr_role_id.title;
    }

    // Transform department_id to dept and department (name)
    if (transformed.department_id && typeof transformed.department_id === 'object') {
        transformed.department = transformed.department_id.name;
        transformed.dept = transformed.department_id; // Keep full object as well
    }

    return transformed;
};

const transformArray = (arr) => arr.map(transformDoc);

async function ensureAccount(code, name, type) {
    let account = await Account.findOne({ code });
    if (!account) {
        account = await Account.create({ code, name, type });
    }
    return account;
}

function buildPayslipNumber(payroll, index) {
    const batchCode = String(payroll.month || '').replace('-', '');
    return `PS-${batchCode}-${String(index + 1).padStart(4, '0')}`;
}

// ── EMPLOYEES ───────────────────────────────────────────────────────────────
router.get('/employees', auth, async (req, res) => {
    try {
        const employees = await Employee.find()
            .populate('department_id', 'name')
            .populate('hr_role_id', 'title')
            .sort({ employee_id: 1 });
        res.json(transformArray(employees));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

router.post('/employees', auth, async (req, res) => {
    try {
        const employeeData = { ...req.body };

        // If role is provided as string/title, find the corresponding HR Role
        if (employeeData.role && !employeeData.hr_role_id) {
            const roleDoc = await HRRole.findOne({
                $or: [{ title: employeeData.role }, { _id: employeeData.role }]
            });
            if (roleDoc) {
                employeeData.hr_role_id = roleDoc._id;
            }
        }

        // Clean up if role field exists (it's not a direct schema field)
        delete employeeData.role;

        const employee = new Employee(employeeData);
        await employee.save();

        // Populate references before sending response
        await employee.populate(['department_id', 'hr_role_id']);

        res.status(201).json(transformDoc(employee));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create employee', detail: err.message });
    }
});

router.put('/employees/:id', auth, async (req, res) => {
    try {
        const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('department_id', 'name code')
            .populate('hr_role_id', 'title level');
        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        res.json(transformDoc(employee));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update employee', detail: err.message });
    }
});

// ── DEPARTMENTS ─────────────────────────────────────────────────────────────
router.get('/departments', auth, async (req, res) => {
    try {
        const depts = await HRDepartment.find().sort({ name: 1 });
        res.json(transformArray(depts));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

router.post('/departments', auth, async (req, res) => {
    try {
        const dept = new HRDepartment({
            ...req.body,
            salary_policy: {
                contract_types_allowed: ['full-time', 'contract'],
                default_salary_template: req.body?.salary_policy?.default_salary_template || '',
                earning_components: req.body?.salary_policy?.earning_components || [
                    { component_id: 'base_salary', mandatory: true },
                    { component_id: 'housing', mandatory: false },
                    { component_id: 'transport', mandatory: false }
                ],
                deduction_components: req.body?.salary_policy?.deduction_components || [],
                gratuity_applicable: req.body?.salary_policy?.gratuity_applicable ?? true,
                overtime_policy: req.body?.salary_policy?.overtime_policy || '1.5x',
                probation_days: req.body?.salary_policy?.probation_days ?? 90
            }
        });
        await dept.save();
        res.status(201).json(transformDoc(dept));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create department' });
    }
});

router.put('/departments/:id', auth, async (req, res) => {
    try {
        const dept = await HRDepartment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!dept) return res.status(404).json({ error: 'Department not found' });
        res.json(transformDoc(dept));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update department' });
    }
});

router.patch('/departments/:id/salary-policy', auth, async (req, res) => {
    try {
        const dept = await HRDepartment.findByIdAndUpdate(
            req.params.id,
            { salary_policy: req.body },
            { new: true }
        );
        if (!dept) return res.status(404).json({ error: 'Department not found' });
        res.json(transformDoc(dept));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update department salary policy', detail: err.message });
    }
});

router.delete('/departments/:id', auth, async (req, res) => {
    try {
        await HRDepartment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Department deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

// ── ATTENDANCE ──────────────────────────────────────────────────────────────
router.get('/attendance', auth, async (req, res) => {
    try {
        const { date } = req.query;
        const query = date ? { date: new Date(date) } : {};
        const records = await Attendance.find(query).populate('employee_id', 'name employee_id');
        res.json(transformArray(records));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

router.post('/attendance', auth, async (req, res) => {
    try {
        const { employee_id, date, status, check_in, check_out, overtime_hours, project_id } = req.body;
        const record = await Attendance.findOneAndUpdate(
            { employee_id, date: new Date(date) },
            { status, check_in, check_out, overtime_hours, project_id },
            { upsert: true, new: true }
        );
        res.json(transformDoc(record));
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});

router.post('/attendance/bulk', auth, async (req, res) => {
    try {
        const { records } = req.body; // Array of { employee_id, date, status, check_in, check_out }
        
        if (!Array.isArray(records)) {
            return res.status(400).json({ error: 'Records must be an array' });
        }

        const operations = records.map(record => ({
            updateOne: {
                filter: { employee_id: record.employee_id, date: new Date(record.date) },
                update: {
                    status: record.status || 'present',
                    check_in: record.check_in,
                    check_out: record.check_out,
                    overtime_hours: record.overtime_hours || 0,
                    project_id: record.project_id
                },
                upsert: true
            }
        }));

        const result = await Attendance.bulkWrite(operations);
        
        res.json({ 
            success: true, 
            inserted: result.upsertedCount,
            modified: result.modifiedCount,
            total: records.length
        });
    } catch (err) {
        console.error("POST /attendance/bulk error", err);
        res.status(500).json({ error: 'Failed to upload bulk attendance' });
    }
});

// ── LEAVES ──────────────────────────────────────────────────────────────────
router.get('/leaves', auth, async (req, res) => {
    try {
        const leaves = await Leave.find()
            .populate('employee_id', 'name employee_id')
            .populate('leave_type', 'name code')
            .sort({ createdAt: -1 });
        res.json(transformArray(leaves));
    } catch (err) {
        console.error("GET /leaves error", err);
        res.status(500).json({ error: 'Failed to fetch leaves' });
    }
});

router.post('/leaves', auth, async (req, res) => {
    try {
        const { employee_id, leave_type, from_date, to_date } = req.body;

        if (!employee_id || !leave_type || !from_date || !to_date) {
            return res.status(400).json({ error: 'Missing required fields: employee_id, leave_type, from_date, to_date' });
        }

        if (!mongoose.Types.ObjectId.isValid(employee_id) || !mongoose.Types.ObjectId.isValid(leave_type)) {
            return res.status(400).json({ error: 'Invalid employee_id or leave_type' });
        }

        const leaveTypeDoc = await LeaveType.findById(leave_type);
        if (!leaveTypeDoc) {
            return res.status(400).json({ error: 'Invalid leave type', detail: 'Configured leave type not found' });
        }
        
        // Validate date range
        if (from_date && to_date) {
            const fromDate = new Date(from_date);
            const toDate = new Date(to_date);
            if (toDate < fromDate) {
                return res.status(400).json({ 
                    error: 'Invalid date range',
                    detail: 'End date cannot be before start date'
                });
            }
        }
        
        const overlapping = await Leave.findOne({
            employee_id,
            status: { $in: ['pending', 'approved'] },
            from_date: { $lte: new Date(to_date) },
            to_date: { $gte: new Date(from_date) }
        });

        if (overlapping) {
            return res.status(409).json({
                error: 'Overlapping leave exists',
                detail: 'An existing pending/approved leave overlaps with the selected date range',
                overlap_with: overlapping._id
            });
        }

        const leave = new Leave(req.body);
        await leave.save();
        
        // Re-populate employee_id and leave_type for response
        await leave.populate('employee_id', 'name employee_id');
        await leave.populate('leave_type', 'name code');
        
        res.status(201).json(transformDoc(leave));
    } catch (err) {
        console.error('[POST /leaves] error:', err.message);
        res.status(500).json({ error: 'Failed to apply for leave', detail: err.message });
    }
});

// Submit leave for approval
router.post('/leaves/:id/submit', auth, async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });

        if (leave.status !== 'draft') {
            return res.status(400).json({ 
                error: 'Only draft leaves can be submitted for approval',
                currentStatus: leave.status
            });
        }

        // Check leave balance before submission
        const leaveBalance = await LeaveBalance.findOne({
            employee_id: leave.employee_id,
            leave_type: leave.leave_type,
            year: new Date(leave.from_date).getFullYear()
        });

        if (leaveBalance && leaveBalance.available < leave.days) {
            return res.status(400).json({
                error: 'Insufficient leave balance',
                detail: `Available: ${leaveBalance.available} days, Requested: ${leave.days} days`
            });
        }

        // Submit for approval
        const tenant_id = req.user?.tenant_id || 'default';
        const approvalRequest = await approvalEngine.submitForApproval(
            'leave',
            leave._id,
            tenant_id,
            req.user._id
        );

        // Update leave status
        leave.status = 'pending_approval';
        leave.submitted_at = new Date();
        await leave.save();

        res.json({
            message: 'Leave submitted for approval',
            leave: transformDoc(leave),
            approvalRequest
        });
    } catch (err) {
        console.error('[POST /leaves/:id/submit] error:', err.message);
        res.status(500).json({ error: 'Failed to submit leave', detail: err.message });
    }
});

router.put('/leaves/:id', auth, async (req, res) => {
    try {
        const existing = await Leave.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Leave not found' });

        const nextEmployeeId = req.body.employee_id || existing.employee_id;
        const nextFromDate = req.body.from_date ? new Date(req.body.from_date) : new Date(existing.from_date);
        const nextToDate = req.body.to_date ? new Date(req.body.to_date) : new Date(existing.to_date);
        const nextStatus = req.body.status || existing.status;

        if (nextToDate < nextFromDate) {
            return res.status(400).json({
                error: 'Invalid date range',
                detail: 'End date cannot be before start date'
            });
        }

        if (['pending', 'approved'].includes(nextStatus)) {
            const overlapping = await Leave.findOne({
                _id: { $ne: req.params.id },
                employee_id: nextEmployeeId,
                status: { $in: ['pending', 'approved'] },
                from_date: { $lte: nextToDate },
                to_date: { $gte: nextFromDate }
            });

            if (overlapping) {
                return res.status(409).json({
                    error: 'Overlapping leave exists',
                    detail: 'Another pending/approved leave overlaps with this date range',
                    overlap_with: overlapping._id
                });
            }
        }

        const leave = await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!leave) return res.status(404).json({ error: 'Leave not found' });
        res.json(transformDoc(leave));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update leave status' });
    }
});

router.post('/leaves/bulk-assign-type', auth, async (req, res) => {
    try {
        const { leave_ids, leave_type } = req.body;

        if (!Array.isArray(leave_ids) || leave_ids.length === 0 || !leave_type) {
            return res.status(400).json({ error: 'leave_ids[] and leave_type are required' });
        }

        if (!mongoose.Types.ObjectId.isValid(leave_type)) {
            return res.status(400).json({ error: 'Invalid leave_type id' });
        }

        const leaveTypeDoc = await LeaveType.findById(leave_type);
        if (!leaveTypeDoc) {
            return res.status(404).json({ error: 'Leave type not found' });
        }

        const validIds = leave_ids.filter(id => mongoose.Types.ObjectId.isValid(id));
        const result = await Leave.updateMany(
            { _id: { $in: validIds } },
            { $set: { leave_type } }
        );

        res.json({
            message: 'Leave type assigned in bulk',
            matched: result.matchedCount || result.n,
            updated: result.modifiedCount || result.nModified
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to bulk assign leave type', detail: err.message });
    }
});

// ── PAYROLL ─────────────────────────────────────────────────────────────────
router.get('/payrolls', auth, async (req, res) => {
    try {
        const { includeDeleted } = req.query;
        const query = includeDeleted === 'true' ? {} : { deletedAt: null };

        const payrolls = await Payroll.find(query)
            .populate({
                path: 'lines.employee_id',
                select: 'name employee_id'
            })
            .sort({ month: -1 });

        // Transform payrolls to rename employee_id to employee in lines
        const seenRuns = {};
        const transformed = payrolls.map(p => {
            const payrollObj = transformDoc(p);
            if (payrollObj.lines) {
                payrollObj.lines = payrollObj.lines.map(line => ({
                    ...line,
                    employee: line.employee_id,
                    id: line._id
                }));
            }
            seenRuns[payrollObj.month] = (seenRuns[payrollObj.month] || 0) + 1;
            payrollObj.run_number = seenRuns[payrollObj.month];
            // Add computed posted_to_finance field based on status
            payrollObj.posted_to_finance = payrollObj.status === 'posted' || payrollObj.status === 'paid';
            // Use total_net for total_amount if needed
            payrollObj.total_amount = payrollObj.total_net;
            return payrollObj;
        });

        res.json(transformed);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch payrolls' });
    }
});

// Preview payroll before generation
router.post('/payrolls/preview', auth, async (req, res) => {
    try {
        const { month } = req.body;

        // Check if payroll already exists for this month
        const existing = await Payroll.findOne({ month });

        // Get all active salary structures
        const structures = await SalaryStructure.find({ is_current: true })
            .populate('employee_id', 'name employee_id status');

        // Filter active employees only
        const activeStructures = structures.filter(s => s.employee_id?.status === 'active');

        if (activeStructures.length === 0) {
            return res.status(400).json({
                error: 'No active employees with salary structures found',
                canGenerate: false
            });
        }

        const total_gross = activeStructures.reduce((sum, s) => sum + (s.basic + s.hra + s.da + s.ta + s.special_allowance), 0);
        const total_deductions = activeStructures.reduce((sum, s) => sum + (s.pf_employee + s.esi_employee + s.professional_tax + s.tds), 0);
        const total_net = activeStructures.reduce((sum, s) => sum + s.net_salary, 0);

        res.json({
            month,
            employeeCount: activeStructures.length,
            total_gross,
            total_deductions,
            total_net,
            exists: !!existing,
            canGenerate: true,
            employees: activeStructures.map(s => ({
                name: s.employee_id.name,
                net_pay: s.net_salary
            }))
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to preview payroll', detail: err.message });
    }
});

router.post('/payrolls/generate', auth, async (req, res) => {
    try {
        const { month } = req.body; // Format: YYYY-MM

        // Check if payroll already exists
        const existing = await Payroll.findOne({ month });
        if (existing) {
            return res.status(409).json({
                error: 'Payroll cycle already exists for this month',
                code: 'DUPLICATE_CYCLE',
                existingId: existing._id
            });
        }

        // Get all active salary structures
        const structures = await SalaryStructure.find({ is_current: true })
            .populate('employee_id', 'name employee_id status');

        // Filter active employees only
        const activeStructures = structures.filter(s => s.employee_id?.status === 'active');

        if (activeStructures.length === 0) {
            return res.status(400).json({
                error: 'No active employees with salary structures found'
            });
        }

        // Parse month to get date range for overtime query
        const [year, monthNum] = month.split('-').map(Number);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59);

        // Query overtime logs for approved overtime in this month
        const overtimeLogs = await OvertimeLog.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'approved'
        });

        // Group overtime by employee_id
        const overtimeByEmployee = {};
        overtimeLogs.forEach(log => {
            const empId = log.employee_id.toString();
            if (!overtimeByEmployee[empId]) {
                overtimeByEmployee[empId] = 0;
            }
            overtimeByEmployee[empId] += log.overtime_amount || 0;
        });

        // Create payroll lines
        const lines = activeStructures.map(s => {
            const empId = s.employee_id._id.toString();
            const overtimePay = overtimeByEmployee[empId] || 0;
            const basicPlusAllowances = s.basic + s.hra + s.da + s.ta + s.special_allowance;
            const totalDeductions = s.pf_employee + s.esi_employee + s.professional_tax + s.tds;
            const netPay = basicPlusAllowances + overtimePay - totalDeductions;

            return {
                employee_id: s.employee_id._id,
                basic_pay: s.basic,
                overtime_pay: overtimePay,
                allowances: s.hra + s.da + s.ta + s.special_allowance,
                deductions: totalDeductions,
                net_pay: netPay,
                status: 'pending'
            };
        });

        const total_gross = lines.reduce((sum, l) => sum + l.basic_pay + l.allowances + l.overtime_pay, 0);
        const total_deductions = lines.reduce((sum, l) => sum + l.deductions, 0);
        const total_net = lines.reduce((sum, l) => sum + l.net_pay, 0);

        const payroll = new Payroll({
            month,
            status: 'draft',
            total_gross,
            total_deductions,
            total_net,
            lines
        });

        await payroll.save();

        // Update overtime logs to mark them as included in payroll
        if (overtimeLogs.length > 0) {
            await OvertimeLog.updateMany(
                { _id: { $in: overtimeLogs.map(l => l._id) } },
                { $set: { status: 'paid', payroll_cycle_id: payroll._id } }
            );
        }

        res.status(201).json({ message: 'Payroll draft created successfully', data: transformDoc(payroll) });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                error: 'Payroll cycle already exists for this month',
                code: 'DUPLICATE_CYCLE'
            });
        }
        res.status(500).json({ error: 'Failed to generate payroll', detail: err.message });
    }
});

router.post('/payrolls/:id/post', auth, async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' });

        if (!['processed', 'finalized', 'approved'].includes(payroll.status)) {
            return res.status(400).json({
                error: 'Payroll must be approved or processed before posting to finance',
                currentStatus: payroll.status
            });
        }

        if (payroll.finance_journal_id) {
            const existingEntry = await JournalEntry.findById(payroll.finance_journal_id).lean();
            return res.json({
                message: 'Payroll was already posted to finance',
                data: transformDoc(payroll),
                journal_entry: existingEntry || { _id: payroll.finance_journal_id }
            });
        }

        const totalDeductions = Number(payroll.total_deductions || 0);
        const totalNet = Number(payroll.total_net || 0);
        const totalGross = Number(payroll.total_gross || totalNet + totalDeductions || 0);

        if (totalGross <= 0) {
            return res.status(400).json({ error: 'Payroll has no amount to post' });
        }

        await Promise.all([
            ensureAccount('5100', 'Salaries & Wages', 'expense'),
            ensureAccount('2200', 'Accrued Liabilities', 'liability'),
            ensureAccount('2210', 'Payroll Deductions Payable', 'liability')
        ]);

        const lineItems = [
            {
                account_code: '5100',
                debit: totalGross,
                credit: 0,
                description: `Payroll expense for ${payroll.month}`
            },
            {
                account_code: '2200',
                debit: 0,
                credit: totalNet,
                description: `Payroll payable for ${payroll.month}`
            }
        ];

        if (totalDeductions > 0) {
            lineItems.push({
                account_code: '2210',
                debit: 0,
                credit: totalDeductions,
                description: `Payroll deductions payable for ${payroll.month}`
            });
        }

        const postingAmount = lineItems.reduce((sum, line) => sum + Number(line.credit || 0), 0) || totalGross;
        lineItems[0].debit = postingAmount;

        const count = await JournalEntry.countDocuments();
        const entry = await JournalEntry.create({
            entry_number: `JE-PAY-${String(count + 1).padStart(6, '0')}`,
            date: new Date(),
            reference: payroll.month,
            description: `Payroll posting for ${payroll.month}`,
            lines: lineItems,
            status: 'posted',
            total_debit: postingAmount,
            total_credit: postingAmount,
            created_by: req.user?.full_name || req.user?.email || 'System'
        });

        payroll.status = 'posted';
        payroll.finance_journal_id = entry._id;
        payroll.posted_at = new Date();
        payroll.lines = (payroll.lines || []).map((line) => ({
            ...line.toObject(),
            status: 'posted',
        }));
        await payroll.save();

        res.json({
            message: 'Payroll posted to finance successfully',
            data: transformDoc(payroll),
            journal_entry: entry
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to post payroll', detail: err.message });
    }
});

router.patch('/payrolls/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['draft', 'pending_approval', 'approved', 'rejected', 'finalized', 'processed', 'posted', 'paid'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid payroll status', detail: `Status must be one of: ${validStatuses.join(', ')}` });
        }

        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' });

        payroll.status = status;
        await payroll.save();

        res.json({ message: `Payroll status updated to ${status}`, data: transformDoc(payroll) });
    } catch (err) {
        console.error('[PATCH /payrolls/:id/status] error:', err.message);
        res.status(500).json({ error: 'Failed to update payroll status', detail: err.message });
    }
});

// Submit payroll for approval (Finance Controller)
router.post('/payrolls/:id/submit', auth, async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' });

        if (payroll.status !== 'draft') {
            return res.status(400).json({ 
                error: 'Only draft payrolls can be submitted for approval',
                currentStatus: payroll.status
            });
        }

        // Submit for approval
        const tenant_id = req.user?.tenant_id || 'default';
        const approvalRequest = await approvalEngine.submitForApproval(
            'payroll',
            payroll._id,
            tenant_id,
            req.user._id
        );

        payroll.status = 'pending_approval';
        payroll.submitted_by = req.user._id;
        payroll.submitted_at = new Date();
        await payroll.save();

        res.json({ 
            message: 'Payroll submitted for approval successfully', 
            data: transformDoc(payroll),
            approvalRequest
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit payroll', detail: err.message });
    }
});

// Approve payroll (MD/CEO only)
router.post('/payrolls/:id/approve', auth, async (req, res) => {
    try {
        // Check user role (MD/CEO only)
        if (req.user.role !== 'MD' && req.user.role !== 'CEO') {
            return res.status(403).json({ 
                error: 'Only MD or CEO can approve payroll',
                userRole: req.user.role 
            });
        }

        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' });

        if (payroll.status !== 'pending_approval') {
            return res.status(400).json({ 
                error: 'Only payrolls with pending approval can be approved',
                currentStatus: payroll.status
            });
        }

        payroll.status = 'approved';
        payroll.approved_by = req.user._id;
        payroll.approved_at = new Date();
        await payroll.save();

        res.json({ 
            message: 'Payroll approved successfully. Payslips will be generated.', 
            data: transformDoc(payroll) 
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve payroll', detail: err.message });
    }
});

// Reject payroll (MD/CEO only)
router.post('/payrolls/:id/reject', auth, async (req, res) => {
    try {
        const { reason } = req.body;

        // Check user role (MD/CEO only)
        if (req.user.role !== 'MD' && req.user.role !== 'CEO') {
            return res.status(403).json({ 
                error: 'Only MD or CEO can reject payroll',
                userRole: req.user.role 
            });
        }

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' });

        if (payroll.status !== 'pending_approval') {
            return res.status(400).json({ 
                error: 'Only payrolls with pending approval can be rejected',
                currentStatus: payroll.status
            });
        }

        payroll.status = 'rejected';
        payroll.rejection_reason = reason;
        payroll.approved_by = req.user._id; // Track who rejected it
        payroll.approved_at = new Date();
        await payroll.save();

        res.json({ 
            message: 'Payroll rejected successfully', 
            data: transformDoc(payroll) 
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject payroll', detail: err.message });
    }
});

// Finalize approved payroll (generates payslips)
router.post('/payrolls/:id/finalize', auth, async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' });

        if (payroll.status !== 'approved') {
            return res.status(400).json({ 
                error: 'Only approved payrolls can be finalized',
                currentStatus: payroll.status
            });
        }

        payroll.status = 'processed';
        payroll.processed_at = new Date();
        payroll.lines = (payroll.lines || []).map((line, index) => ({
            ...line.toObject(),
            status: 'processed',
            payslip_number: line.payslip_number || buildPayslipNumber(payroll, index),
            payslip_generated_at: new Date(),
        }));
        await payroll.save();

        res.json({ 
            message: 'Payroll processed and payslips are now available', 
            data: transformDoc(payroll) 
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to finalize payroll', detail: err.message });
    }
});

// Get pending approvals (for MD/CEO dashboard)
router.get('/payrolls/pending', auth, async (req, res) => {
    try {
        const pendingPayrolls = await Payroll.find({ status: 'pending_approval' })
            .populate('submitted_by', 'name email')
            .populate({
                path: 'lines.employee_id',
                select: 'name employee_id'
            })
            .sort({ submitted_at: 1 });

        res.json(transformArray(pendingPayrolls));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch pending approvals', detail: err.message });
    }
});

// Soft-delete payroll cycle (soft delete with audit log)
router.delete('/payrolls/:id', auth, async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) {
            return res.status(404).json({ error: 'Payroll cycle not found' });
        }

        // Prevent deletion of finalized/processed/posted/paid payrolls
        if (['finalized', 'processed', 'posted', 'paid'].includes(payroll.status)) {
            return res.status(400).json({ error: 'Cannot delete a finalized/processed payroll cycle. Only draft or pending cycles can be deleted.' });
        }

        // Soft delete
        payroll.deletedAt = new Date();
        await payroll.save();

        // Log to audit
        await PayrollDeletionAudit.create({
            month: payroll.month,
            deletedBy: req.user?._id || 'unknown',
            reason: req.body.reason || 'Manual deletion',
            originalStatus: payroll.status
        });

        res.json({ message: 'Payroll cycle archived', payroll: transformDoc(payroll) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to archive payroll cycle', detail: err.message });
    }
});

// Restore deleted payroll cycle
router.post('/payrolls/restore/:id', auth, async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) {
            return res.status(404).json({ error: 'Payroll cycle not found' });
        }

        payroll.deletedAt = null;
        await payroll.save();

        res.json({ message: 'Payroll cycle restored', payroll: transformDoc(payroll) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to restore payroll cycle', detail: err.message });
    }
});

// Get deleted payroll cycles
router.get('/payrolls/deleted', auth, async (req, res) => {
    try {
        const deletedPayrolls = await Payroll.find({ deletedAt: { $ne: null } })
            .populate('lines.employee_id', 'name employee_id')
            .sort({ deletedAt: -1 });
        res.json(transformArray(deletedPayrolls));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch deleted payrolls', detail: err.message });
    }
});

// Soft-delete payroll cycle (mark as deleted instead of hard delete)
router.delete('/payrolls/:id', auth, async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) {
            return res.status(404).json({ error: 'Payroll cycle not found' });
        }

        // Prevent deletion of processed/paid payroll cycles
        if (payroll.status === 'processed' || payroll.status === 'posted' || payroll.status === 'paid') {
            return res.status(400).json({ error: 'Cannot delete a processed payroll cycle. Use archive instead.' });
        }

        const deletedAt = new Date();
        payroll.deletedAt = deletedAt;
        await payroll.save();

        // Log deletion for audit
        await PayrollDeletionAudit.create({
            month: payroll.month,
            deletedBy: req.user?.id || 'admin',
            deletedAt,
            reason: req.body.reason || 'Manual deletion'
        });

        res.json({ message: 'Payroll cycle archived', deletedAt });
    } catch (err) {
        res.status(500).json({ error: 'Failed to archive payroll cycle', detail: err.message });
    }
});

// Restore a soft-deleted payroll cycle
router.post('/payrolls/:id/restore', auth, async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) {
            return res.status(404).json({ error: 'Payroll cycle not found' });
        }

        payroll.deletedAt = null;
        await payroll.save();

        res.json({ message: 'Payroll cycle restored', payroll: transformDoc(payroll) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to restore payroll cycle', detail: err.message });
    }
});

// Get all payroll cycles including archived (soft-deleted)
router.get('/payrolls/archived', auth, async (req, res) => {
    try {
        const archivedPayrolls = await Payroll.find({ deletedAt: { $ne: null } })
            .populate({
                path: 'lines.employee_id',
                select: 'name employee_id'
            })
            .sort({ month: -1, deletedAt: -1 });

        const transformed = archivedPayrolls.map(p => {
            const obj = transformDoc(p);
            obj.deletedAt = p.deletedAt;
            return obj;
        });

        res.json(transformed);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch archived payrolls', detail: err.message });
    }
});

// Restore a payroll cycle by month
router.post('/payrolls/restore-by-month', auth, async (req, res) => {
    try {
        const { month } = req.body;
        if (!month) {
            return res.status(400).json({ error: 'Month is required' });
        }

        const payroll = await Payroll.findOne({ month });
        if (!payroll) {
            // Try to find in deleted
            const deleted = await Payroll.findOne({ month, deletedAt: { $ne: null } });
            if (!deleted) {
                return res.status(404).json({ error: 'No payroll cycle found for this month' });
            }
            deleted.deletedAt = null;
            await deleted.save();
            return res.json({ message: 'Payroll cycle restored', payroll: transformDoc(deleted) });
        }

        if (!payroll.deletedAt) {
            return res.json({ message: 'Payroll cycle already exists and is active', payroll: transformDoc(payroll) });
        }

        payroll.deletedAt = null;
        await payroll.save();

        res.json({ message: 'Payroll cycle restored', payroll: transformDoc(payroll) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to restore payroll cycle', detail: err.message });
    }
});

// ── SALARY STRUCTURES ───────────────────────────────────────────────────────
router.get('/salary-structures', auth, async (req, res) => {
    try {
        const structures = await SalaryStructure.find()
            .populate('employee_id', 'name employee_id')
            .sort({ effective_from: -1 });
        res.json(transformArray(structures));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch salary structures' });
    }
});

router.post('/salary-structures', auth, async (req, res) => {
    try {
        // Mark all previous structures for this employee as not current
        await SalaryStructure.updateMany(
            { employee_id: req.body.employee_id },
            { is_current: false }
        );

        // Create new structure
        const structure = new SalaryStructure(req.body);
        await structure.save();

        res.status(201).json(transformDoc(structure));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create salary structure', detail: err.message });
    }
});

// ── HR ROLES ─────────────────────────────────────────────────────────────────
router.get('/roles', auth, async (req, res) => {
    try {
        const { department_id } = req.query;
        const query = department_id ? { department_id } : {};
        const roles = await HRRole.find(query).populate('department_id', 'name code').sort({ title: 1 });
        res.json(transformArray(roles));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

router.post('/roles', auth, async (req, res) => {
    try {
        const role = new HRRole(req.body);
        await role.save();
        await role.populate('department_id', 'name code');
        res.status(201).json(transformDoc(role));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create role', detail: err.message });
    }
});

router.put('/roles/:id', auth, async (req, res) => {
    try {
        const role = await HRRole.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('department_id', 'name code');
        if (!role) return res.status(404).json({ error: 'Role not found' });
        res.json(transformDoc(role));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update role' });
    }
});

router.post('/leaves/fix-invalid-range', auth, async (req, res) => {
    try {
        const { employee_id, from_date, to_date } = req.body;
        const query = {
            days: { $lt: 0 }
        };
        if (employee_id) query.employee_id = employee_id;
        if (from_date) query.from_date = new Date(from_date);
        if (to_date) query.to_date = new Date(to_date);

        const invalid = await Leave.find(query).sort({ createdAt: -1 });
        if (!invalid.length) {
            return res.json({ message: 'No invalid leave records found', updated: 0 });
        }

        let updated = 0;
        for (const leave of invalid) {
            const correctedTo = new Date(leave.to_date);
            const fromDate = new Date(leave.from_date);

            // Correct common year typo (e.g., 2024 instead of 2026) while preserving month/day.
            correctedTo.setFullYear(fromDate.getFullYear());
            if (correctedTo < fromDate) {
                correctedTo.setDate(fromDate.getDate() + 4);
                correctedTo.setMonth(fromDate.getMonth());
                correctedTo.setFullYear(fromDate.getFullYear());
            }

            leave.to_date = correctedTo;
            leave.days = Math.ceil((new Date(leave.to_date).getTime() - new Date(leave.from_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
            await leave.save();
            updated += 1;
        }

        res.json({ message: 'Invalid leave ranges corrected', updated });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fix invalid leave records', detail: err.message });
    }
});

router.get('/payrolls/audit/feb-2026', auth, async (req, res) => {
    try {
        const febCycle = await Payroll.findOne({ month: '2026-02' });
        const deletions = await PayrollDeletionAudit.find({ month: '2026-02' }).sort({ createdAt: -1 }).limit(20);
        res.json({ exists: !!febCycle, cycle: febCycle ? transformDoc(febCycle) : null, deletions: transformArray(deletions) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to audit February cycle', detail: err.message });
    }
});

router.delete('/roles/:id', auth, async (req, res) => {
    try {
        await HRRole.findByIdAndDelete(req.params.id);
        res.json({ message: 'Role deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

// ── LEAVE TYPES ──────────────────────────────────────────────────────────────
router.get('/leave-types', auth, async (req, res) => {
    try {
        const leaveTypes = await LeaveType.find().sort({ name: 1 });
        const normalized = transformArray(leaveTypes).map((lt) => ({
            ...lt,
            days_per_year: Number(lt.days_per_year ?? lt.max_days ?? 0),
            max_days: Number(lt.max_days ?? lt.days_per_year ?? 0),
            is_paid: lt.is_paid ?? true,
            carry_forward: lt.carry_forward ?? false,
            max_carry: Number(lt.max_carry ?? 0),
            requires_approval: lt.requires_approval ?? true,
        }));
        res.json(normalized);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leave types' });
    }
});

router.post('/leave-types', auth, async (req, res) => {
    try {
        const parsedDays = Number(req.body.days_per_year ?? req.body.max_days ?? 0);
        const leaveType = new LeaveType({
            ...req.body,
            days_per_year: parsedDays,
            max_days: parsedDays,
            is_paid: req.body.is_paid ?? true,
            carry_forward: req.body.carry_forward ?? false,
            max_carry: Number(req.body.max_carry ?? 0),
            requires_approval: req.body.requires_approval ?? true,
        });
        await leaveType.save();
        const doc = transformDoc(leaveType);
        res.status(201).json({
            ...doc,
            days_per_year: Number(doc.days_per_year ?? doc.max_days ?? 0),
            max_days: Number(doc.max_days ?? doc.days_per_year ?? 0),
            is_paid: doc.is_paid ?? true,
            carry_forward: doc.carry_forward ?? false,
            max_carry: Number(doc.max_carry ?? 0),
            requires_approval: doc.requires_approval ?? true,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create leave type', detail: err.message });
    }
});

router.delete('/leave-types/:id', auth, async (req, res) => {
    try {
        await LeaveType.findByIdAndDelete(req.params.id);
        res.json({ message: 'Leave type deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete leave type' });
    }
});

// ── HOLIDAYS ─────────────────────────────────────────────────────────────────
router.get('/holidays', auth, async (req, res) => {
    try {
        const holidays = await Holiday.find({ is_active: true }).sort({ date: 1 });
        res.json(transformArray(holidays));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
});

router.post('/holidays', auth, async (req, res) => {
    try {
        const holiday = new Holiday(req.body);
        await holiday.save();
        res.status(201).json(transformDoc(holiday));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create holiday', detail: err.message });
    }
});

router.delete('/holidays/:id', auth, async (req, res) => {
    try {
        await Holiday.findByIdAndDelete(req.params.id);
        res.json({ message: 'Holiday deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete holiday' });
    }
});

// ── HR EVENTS ───────────────────────────────────────────────────────────────
router.get('/events', auth, async (req, res) => {
    try {
        const { employee_id, type } = req.query;
        const query = {};
        if (employee_id) query.employee_id = employee_id;
        if (type) query.type = type;

        const events = await HREvent.find(query)
            .populate('employee_id', 'name employee_id')
            .sort({ event_date: -1 });
        res.json(transformArray(events));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch HR events' });
    }
});

router.post('/events', auth, async (req, res) => {
    try {
        const event = new HREvent({
            ...req.body,
            created_by: req.user?._id || req.body.created_by
        });
        await event.save();
        await event.populate('employee_id', 'name employee_id');
        res.status(201).json(transformDoc(event));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create HR event', detail: err.message });
    }
});

// ── JOB OPENINGS ─────────────────────────────────────────────────────────────
router.get('/job-openings', auth, async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const openings = await JobOpening.find(query)
            .populate('department_id', 'name')
            .populate('hr_role_id', 'title')
            .sort({ posted_date: -1 });
        res.json(transformArray(openings));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch job openings' });
    }
});

router.post('/job-openings', auth, async (req, res) => {
    try {
        const opening = new JobOpening(req.body);
        await opening.save();
        await opening.populate(['department_id', 'hr_role_id']);
        res.status(201).json(transformDoc(opening));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create job opening', detail: err.message });
    }
});

router.put('/job-openings/:id', auth, async (req, res) => {
    try {
        const opening = await JobOpening.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('department_id', 'name')
            .populate('hr_role_id', 'title');
        if (!opening) return res.status(404).json({ error: 'Job opening not found' });
        res.json(transformDoc(opening));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update job opening' });
    }
});

router.patch('/job-openings/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['open', 'closed', 'on-hold', 'filled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const opening = await JobOpening.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        )
            .populate('department_id', 'name')
            .populate('hr_role_id', 'title');
        if (!opening) return res.status(404).json({ error: 'Job opening not found' });
        res.json(transformDoc(opening));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update job opening status' });
    }
});

router.delete('/job-openings/:id', auth, async (req, res) => {
    try {
        await JobOpening.findByIdAndDelete(req.params.id);
        res.json({ message: 'Job opening deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete job opening' });
    }
});

// ── APPLICANTS ───────────────────────────────────────────────────────────────
router.get('/applicants', auth, async (req, res) => {
    try {
        const { job_opening_id, status } = req.query;
        const query = {};
        if (job_opening_id) query.job_opening_id = job_opening_id;
        if (status) query.status = status;
        
        const applicants = await Applicant.find(query)
            .populate('job_opening_id', 'job_title')
            .sort({ applied_date: -1 });
        res.json(transformArray(applicants));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch applicants' });
    }
});

router.post('/applicants', auth, async (req, res) => {
    try {
        const applicant = new Applicant(req.body);
        await applicant.save();
        await applicant.populate('job_opening_id', 'job_title');
        res.status(201).json(transformDoc(applicant));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create applicant', detail: err.message });
    }
});

router.put('/applicants/:id', auth, async (req, res) => {
    try {
        const applicant = await Applicant.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('job_opening_id', 'job_title');
        if (!applicant) return res.status(404).json({ error: 'Applicant not found' });
        res.json(transformDoc(applicant));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update applicant' });
    }
});

// Convert applicant to employee
router.post('/applicants/:id/convert-to-employee', auth, async (req, res) => {
    try {
        const applicant = await Applicant.findById(req.params.id)
            .populate('job_opening_id');
        
        if (!applicant) return res.status(404).json({ error: 'Applicant not found' });
        if (applicant.status === 'rejected') {
            return res.status(400).json({ error: 'Rejected applicants cannot be converted to employees' });
        }

        // Get offer letter for salary details
        const offerLetter = await OfferLetter.findOne({ applicant_id: applicant._id, status: 'accepted' });
        
        // Create employee record
        const employeeData = {
            employee_id: req.body.employee_id || `EMP${Date.now()}`, // Generate unique ID
            name: applicant.applicant_name,
            email: applicant.email,
            phone: applicant.phone,
            department_id: offerLetter?.department_id || applicant.job_opening_id.department_id,
            hr_role_id: applicant.job_opening_id.hr_role_id,
            employment_type: applicant.job_opening_id.employment_type,
            joining_date: offerLetter?.joining_date || new Date(),
            basic_salary: offerLetter?.basic_salary || 0,
            status: 'active',
            lifecycle_status: 'probation'
        };

        const employee = new Employee(employeeData);
        await employee.save();

        // Update applicant status if needed
        applicant.status = 'hired';
        await applicant.save();

        res.status(201).json({ 
            message: 'Applicant converted to employee successfully',
            employee: transformDoc(employee) 
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to convert applicant', detail: err.message });
    }
});

// ── OFFER LETTERS ────────────────────────────────────────────────────────────
router.get('/offer-letters', auth, async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const offers = await OfferLetter.find(query)
            .populate('applicant_id', 'applicant_name email')
            .populate('job_opening_id', 'job_title')
            .populate('department_id', 'name')
            .sort({ offer_date: -1 });
        res.json(transformArray(offers));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch offer letters' });
    }
});

router.post('/offer-letters', auth, async (req, res) => {
    try {
        const offerLetter = new OfferLetter(req.body);
        
        // Calculate gross salary if not provided
        if (!offerLetter.gross_salary) {
            offerLetter.gross_salary = offerLetter.basic_salary + 
                (offerLetter.allowances?.hra || 0) +
                (offerLetter.allowances?.transport || 0) +
                (offerLetter.allowances?.special || 0);
        }
        
        await offerLetter.save();
        await offerLetter.populate(['applicant_id', 'job_opening_id', 'department_id']);
        res.status(201).json(transformDoc(offerLetter));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create offer letter', detail: err.message });
    }
});

router.put('/offer-letters/:id', auth, async (req, res) => {
    try {
        const offerLetter = await OfferLetter.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate(['applicant_id', 'job_opening_id', 'department_id']);
        if (!offerLetter) return res.status(404).json({ error: 'Offer letter not found' });
        res.json(transformDoc(offerLetter));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update offer letter' });
    }
});

// Accept offer letter and create employee
router.patch('/offer-letters/:id/accept', auth, async (req, res) => {
    try {
        const offerLetter = await OfferLetter.findById(req.params.id)
            .populate('applicant_id')
            .populate('job_opening_id')
            .populate('department_id');
        
        if (!offerLetter) return res.status(404).json({ error: 'Offer letter not found' });
        if (offerLetter.status === 'accepted') {
            return res.status(400).json({ error: 'Offer letter already accepted' });
        }

        // Update offer letter status
        offerLetter.status = 'accepted';
        offerLetter.accepted_date = new Date();
        await offerLetter.save();

        // Update applicant status to hired
        if (offerLetter.applicant_id) {
            await Applicant.findByIdAndUpdate(offerLetter.applicant_id._id, { status: 'hired' });
        }

        // Generate employee ID (simple approach - can be customized)
        const lastEmployee = await Employee.findOne().sort({ employee_id: -1 });
        let newEmployeeId = 'EMP001';
        if (lastEmployee && lastEmployee.employee_id) {
            const lastNum = parseInt(lastEmployee.employee_id.replace(/\D/g, '')) || 0;
            newEmployeeId = `EMP${String(lastNum + 1).padStart(3, '0')}`;
        }

        // Create employee from offer letter data
        const employeeData = {
            employee_id: newEmployeeId,
            name: offerLetter.applicant_id?.applicant_name || 'New Employee',
            email: offerLetter.applicant_id?.email,
            phone: offerLetter.applicant_id?.phone,
            department_id: offerLetter.department_id?._id,
            hr_role_id: offerLetter.job_opening_id?.role_id,
            employment_type: offerLetter.employment_type || 'full-time',
            joining_date: offerLetter.joining_date || new Date(),
            status: 'active',
            basic_salary: offerLetter.basic_salary || 0,
            lifecycle_status: offerLetter.probation_period ? 'probation' : 'confirmed'
        };

        const employee = new Employee(employeeData);
        await employee.save();
        await employee.populate(['department_id', 'hr_role_id']);

        res.json({ 
            message: 'Offer accepted and employee created successfully',
            offerLetter: transformDoc(offerLetter),
            employee: transformDoc(employee)
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to accept offer letter', detail: err.message });
    }
});

// ── LEAVE BALANCE ────────────────────────────────────────────────────────────
router.get('/leave-balance', auth, async (req, res) => {
    try {
        const { employee_id, year } = req.query;
        const query = {};
        if (employee_id) query.employee_id = employee_id;
        if (year) query.year = parseInt(year);
        
        const balances = await LeaveBalance.find(query)
            .populate('employee_id', 'name employee_id')
            .populate('leave_type', 'name code');
        res.json(transformArray(balances));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leave balances' });
    }
});

router.post('/leave-balance', auth, async (req, res) => {
    try {
        const balance = new LeaveBalance(req.body);
        await balance.save();
        await balance.populate(['employee_id', 'leave_type']);
        res.status(201).json(transformDoc(balance));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create leave balance', detail: err.message });
    }
});

router.put('/leave-balance/:id', auth, async (req, res) => {
    try {
        const balance = await LeaveBalance.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate(['employee_id', 'leave_type']);
        if (!balance) return res.status(404).json({ error: 'Leave balance not found' });
        res.json(transformDoc(balance));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update leave balance' });
    }
});

// Initialize leave balances for all employees
router.post('/leave-balance/initialize', auth, async (req, res) => {
    try {
        const { year } = req.body;
        const employees = await Employee.find({ status: 'active' });
        const leaveTypes = await LeaveType.find({ is_active: true });
        
        const balances = [];
        for (const emp of employees) {
            for (const leaveType of leaveTypes) {
                const existing = await LeaveBalance.findOne({
                    employee_id: emp._id,
                    leave_type: leaveType._id,
                    year
                });
                
                if (!existing) {
                    balances.push({
                        employee_id: emp._id,
                        leave_type: leaveType._id,
                        year,
                        total_allocated: leaveType.max_days,
                        used: 0,
                        pending: 0,
                        available: leaveType.max_days
                    });
                }
            }
        }
        
        if (balances.length > 0) {
            await LeaveBalance.insertMany(balances);
        }
        
        res.json({ message: `Initialized ${balances.length} leave balances`, count: balances.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to initialize leave balances', detail: err.message });
    }
});

// Update leave balance when leave is approved/rejected
router.post('/leaves/:id/approve', auth, async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });
        
        if (leave.status !== 'pending') {
            return res.status(400).json({ error: 'Only pending leaves can be approved' });
        }
        
        // Update leave balance
        const year = new Date(leave.from_date).getFullYear();
        const balance = await LeaveBalance.findOne({
            employee_id: leave.employee_id,
            leave_type: leave.leave_type,
            year
        });
        
        if (balance) {
            balance.pending -= leave.days;
            balance.used += leave.days;
            await balance.save();
        }
        
        leave.status = 'approved';
        leave.approved_by = req.user?.name || req.body.approved_by;
        leave.remarks = req.body.remarks;
        await leave.save();
        
        res.json(transformDoc(leave));
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve leave', detail: err.message });
    }
});

router.post('/leaves/:id/reject', auth, async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });
        
        if (leave.status !== 'pending') {
            return res.status(400).json({ error: 'Only pending leaves can be rejected' });
        }
        
        // Update leave balance (remove from pending)
        const year = new Date(leave.from_date).getFullYear();
        const balance = await LeaveBalance.findOne({
            employee_id: leave.employee_id,
            leave_type: leave.leave_type,
            year
        });
        
        if (balance) {
            balance.pending -= leave.days;
            await balance.save();
        }
        
        leave.status = 'rejected';
        leave.approved_by = req.user?.name || req.body.approved_by;
        leave.remarks = req.body.remarks;
        await leave.save();
        
        res.json(transformDoc(leave));
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject leave', detail: err.message });
    }
});

// ── DISCIPLINARY ACTIONS ─────────────────────────────────────────────────────
router.get('/disciplinary-actions', auth, async (req, res) => {
    try {
        const { employee_id, status } = req.query;
        const query = {};
        if (employee_id) query.employee_id = employee_id;
        if (status) query.resolution_status = status;
        
        const actions = await DisciplinaryAction.find(query)
            .populate('employee_id', 'name employee_id')
            .populate('reported_by', 'name')
            .sort({ incident_date: -1 });
        res.json(transformArray(actions));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch disciplinary actions' });
    }
});

router.post('/disciplinary-actions', auth, async (req, res) => {
    try {
        const action = new DisciplinaryAction(req.body);
        await action.save();
        await action.populate(['employee_id', 'reported_by']);
        res.status(201).json(transformDoc(action));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create disciplinary action', detail: err.message });
    }
});

router.put('/disciplinary-actions/:id', auth, async (req, res) => {
    try {
        const action = await DisciplinaryAction.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate(['employee_id', 'reported_by']);
        if (!action) return res.status(404).json({ error: 'Disciplinary action not found' });
        res.json(transformDoc(action));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update disciplinary action' });
    }
});

// ── EMPLOYEE DOCUMENTS ───────────────────────────────────────────────────────
router.get('/employee-documents', auth, async (req, res) => {
    try {
        const { employee_id, document_type, expiring_soon } = req.query;
        const query = {};
        if (employee_id) query.employee_id = employee_id;
        if (document_type) query.document_type = document_type;
        
        let documents = await EmployeeDocument.find(query)
            .populate('employee_id', 'name employee_id')
            .sort({ expiry_date: 1 });
        
        // Filter expiring soon (within 30 days)
        if (expiring_soon === 'true') {
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + 30);
            
            documents = documents.filter(doc => {
                if (doc.has_expiry && doc.expiry_date) {
                    const expiryDate = new Date(doc.expiry_date);
                    return expiryDate >= today && expiryDate <= futureDate;
                }
                return false;
            });
        }
        
        res.json(transformArray(documents));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch employee documents' });
    }
});

router.post('/employee-documents', auth, async (req, res) => {
    try {
        const document = new EmployeeDocument(req.body);
        await document.save();
        await document.populate('employee_id', 'name employee_id');
        res.status(201).json(transformDoc(document));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create employee document', detail: err.message });
    }
});

router.put('/employee-documents/:id', auth, async (req, res) => {
    try {
        const document = await EmployeeDocument.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('employee_id', 'name employee_id');
        if (!document) return res.status(404).json({ error: 'Employee document not found' });
        res.json(transformDoc(document));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update employee document' });
    }
});

router.delete('/employee-documents/:id', auth, async (req, res) => {
    try {
        await EmployeeDocument.findByIdAndDelete(req.params.id);
        res.json({ message: 'Employee document deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete employee document' });
    }
});

// ── SHIFTS ───────────────────────────────────────────────────────────────────
router.get('/shifts', auth, async (req, res) => {
    try {
        const shifts = await Shift.find({ is_active: true }).sort({ shift_name: 1 });
        res.json(transformArray(shifts));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch shifts' });
    }
});

router.post('/shifts', auth, async (req, res) => {
    try {
        const shift = new Shift(req.body);
        await shift.save();
        res.status(201).json(transformDoc(shift));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create shift', detail: err.message });
    }
});

router.put('/shifts/:id', auth, async (req, res) => {
    try {
        const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!shift) return res.status(404).json({ error: 'Shift not found' });
        res.json(transformDoc(shift));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update shift' });
    }
});

// ── ROSTERS ──────────────────────────────────────────────────────────────────
router.get('/rosters', auth, async (req, res) => {
    try {
        const { employee_id, date, from_date, to_date } = req.query;
        const query = {};
        
        if (employee_id) query.employee_id = employee_id;
        if (date) query.date = new Date(date);
        if (from_date && to_date) {
            query.date = { $gte: new Date(from_date), $lte: new Date(to_date) };
        }
        
        const rosters = await Roster.find(query)
            .populate('employee_id', 'name employee_id')
            .populate('shift_id', 'shift_name start_time end_time')
            .sort({ date: 1 });
        res.json(transformArray(rosters));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch rosters' });
    }
});

router.post('/rosters', auth, async (req, res) => {
    try {
        const roster = new Roster(req.body);
        await roster.save();
        await roster.populate(['employee_id', 'shift_id']);
        res.status(201).json(transformDoc(roster));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create roster', detail: err.message });
    }
});

router.put('/rosters/:id', auth, async (req, res) => {
    try {
        const roster = await Roster.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate(['employee_id', 'shift_id']);
        if (!roster) return res.status(404).json({ error: 'Roster not found' });
        res.json(transformDoc(roster));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update roster' });
    }
});

// Bulk roster creation
router.post('/rosters/bulk', auth, async (req, res) => {
    try {
        const { rosters } = req.body; // Array of roster objects
        
        if (!Array.isArray(rosters)) {
            return res.status(400).json({ error: 'Rosters must be an array' });
        }

        const operations = rosters.map(roster => ({
            updateOne: {
                filter: { employee_id: roster.employee_id, date: new Date(roster.date) },
                update: {
                    shift_id: roster.shift_id,
                    site_name: roster.site_name,
                    project_id: roster.project_id,
                    status: roster.status || 'scheduled',
                    notes: roster.notes
                },
                upsert: true
            }
        }));

        const result = await Roster.bulkWrite(operations);
        
        res.json({ 
            success: true, 
            inserted: result.upsertedCount,
            modified: result.modifiedCount,
            total: rosters.length
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to bulk create rosters', detail: err.message });
    }
});

// ── SEPARATIONS ──────────────────────────────────────────────────────────────
router.get('/separations', auth, async (req, res) => {
    try {
        const { employee_id, status } = req.query;
        const query = {};
        if (employee_id) query.employee_id = employee_id;
        if (status) query.status = status;
        
        const separations = await Separation.find(query)
            .populate('employee_id', 'name employee_id status')
            .sort({ resignation_date: -1 });
        res.json(transformArray(separations));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch separations' });
    }
});

router.post('/separations', auth, async (req, res) => {
    try {
        const separation = new Separation(req.body);
        await separation.save();
        
        // Update employee status
        await Employee.findByIdAndUpdate(separation.employee_id, { status: 'inactive' });
        
        await separation.populate('employee_id', 'name employee_id');
        res.status(201).json(transformDoc(separation));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create separation', detail: err.message });
    }
});

router.put('/separations/:id', auth, async (req, res) => {
    try {
        const separation = await Separation.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('employee_id', 'name employee_id');
        if (!separation) return res.status(404).json({ error: 'Separation not found' });
        res.json(transformDoc(separation));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update separation' });
    }
});

// Update separation status and sync employee status
router.patch('/separations/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !['initiated', 'in-progress', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const separation = await Separation.findById(req.params.id);
        if (!separation) return res.status(404).json({ error: 'Separation not found' });

        // Update separation status
        separation.status = status;
        await separation.save();

        // Sync employee status based on separation status
        let employeeStatus;
        switch (status) {
            case 'initiated':
                employeeStatus = 'on-leave'; // Employee is in notice period
                break;
            case 'in-progress':
                employeeStatus = 'on-leave'; // Still in clearance process
                break;
            case 'completed':
                // Check separation type to determine final status
                if (separation.separation_type === 'resignation') {
                    employeeStatus = 'resigned';
                } else if (separation.separation_type === 'termination') {
                    employeeStatus = 'terminated';
                } else {
                    employeeStatus = 'separated';
                }
                break;
            case 'cancelled':
                employeeStatus = 'active'; // Separation cancelled, employee stays
                separation.clearance_status = 'completed';
                separation.final_settlement_status = 'approved';
                break;
            default:
                employeeStatus = 'inactive';
        }

        // Update employee status
        await Employee.findByIdAndUpdate(separation.employee_id, { status: employeeStatus });

        await separation.populate('employee_id', 'name employee_id status');
        res.json({ 
            message: 'Separation status updated and employee status synced',
            separation: transformDoc(separation),
            employeeStatus
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update separation status', detail: err.message });
    }
});

// ── FINAL SETTLEMENTS ────────────────────────────────────────────────────────
router.get('/final-settlements', auth, async (req, res) => {
    try {
        const { employee_id, payment_status } = req.query;
        const query = {};
        if (employee_id) query.employee_id = employee_id;
        if (payment_status) query.payment_status = payment_status;
        
        const settlements = await FinalSettlement.find(query)
            .populate('employee_id', 'name employee_id status')
            .populate('separation_id')
            .sort({ calculation_date: -1 });
        res.json(transformArray(settlements));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch final settlements' });
    }
});

router.post('/final-settlements', auth, async (req, res) => {
    try {
        const settlement = new FinalSettlement(req.body);
        await settlement.save();
        
        // Update separation's final settlement status
        await Separation.findByIdAndUpdate(settlement.separation_id, { 
            final_settlement_status: 'calculated' 
        });
        
        await settlement.populate(['employee_id', 'separation_id']);
        res.status(201).json(transformDoc(settlement));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create final settlement', detail: err.message });
    }
});

router.put('/final-settlements/:id', auth, async (req, res) => {
    try {
        const settlement = await FinalSettlement.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate(['employee_id', 'separation_id']);
        if (!settlement) return res.status(404).json({ error: 'Final settlement not found' });
        res.json(transformDoc(settlement));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update final settlement' });
    }
});

// Approve final settlement
router.post('/final-settlements/:id/approve', auth, async (req, res) => {
    try {
        const settlement = await FinalSettlement.findById(req.params.id);
        if (!settlement) return res.status(404).json({ error: 'Final settlement not found' });
        
        settlement.payment_status = 'approved';
        settlement.approved_by = req.user._id;
        settlement.approved_date = new Date();
        await settlement.save();
        
        // Update separation status
        await Separation.findByIdAndUpdate(settlement.separation_id, { 
            final_settlement_status: 'approved' 
        });
        
        res.json(transformDoc(settlement));
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve final settlement', detail: err.message });
    }
});

// ── OVERTIME TRACKING ────────────────────────────────────────────────────────

// Get overtime logs (with filters)
router.get('/overtime', auth, async (req, res) => {
    try {
        const { employee_id, month, year, status } = req.query;
        const query = {};
        
        if (employee_id) query.employee_id = employee_id;
        if (status) query.status = status;
        
        // Filter by month/year if provided
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query.date = { $gte: startDate, $lte: endDate };
        }
        
        const { OvertimeLog } = require('../models/HRMS');
        const logs = await OvertimeLog.find(query)
            .populate('employee_id', 'name employee_id')
            .sort({ date: -1 });
            
        res.json(transformArray(logs));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch overtime logs', detail: err.message });
    }
});

// Create overtime entry
router.post('/overtime', auth, async (req, res) => {
    try {
        const { OvertimeLog } = require('../models/HRMS');
        
        // Calculate overtime amount if not provided
        if (!req.body.overtime_amount && req.body.overtime_hours) {
            const employee = await Employee.findById(req.body.employee_id);
            if (employee && employee.basic_salary) {
                const hourlyRate = employee.basic_salary / 208; // Assuming 26 days × 8 hours
                req.body.overtime_amount = hourlyRate * req.body.overtime_hours * (req.body.rate_multiplier || 1.5);
            }
        }
        
        const overtimeLog = new OvertimeLog(req.body);
        await overtimeLog.save();
        await overtimeLog.populate('employee_id', 'name employee_id');
        
        res.status(201).json(transformDoc(overtimeLog));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create overtime log', detail: err.message });
    }
});

// Get overtime summary per employee
router.get('/overtime/summary', auth, async (req, res) => {
    try {
        const { month, year } = req.query;
        const { OvertimeLog } = require('../models/HRMS');
        
        const matchStage = {};
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            matchStage.date = { $gte: startDate, $lte: endDate };
        }
        
        const summary = await OvertimeLog.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$employee_id',
                    total_overtime_hours: { $sum: '$overtime_hours' },
                    total_overtime_amount: { $sum: '$overtime_amount' },
                    entries: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'employee'
                }
            },
            { $unwind: '$employee' },
            {
                $project: {
                    employee_id: '$employee.employee_id',
                    employee_name: '$employee.name',
                    total_overtime_hours: 1,
                    total_overtime_amount: 1,
                    entries: 1
                }
            }
        ]);
        
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch overtime summary', detail: err.message });
    }
});

// Approve/reject overtime
router.patch('/overtime/:id/status', auth, async (req, res) => {
    try {
        const { status, rejection_reason } = req.body;
        const { OvertimeLog } = require('../models/HRMS');
        
        const updateData = { status };
        if (status === 'approved') {
            updateData.approved_by = req.user._id;
            updateData.approved_at = new Date();
        } else if (status === 'rejected') {
            updateData.rejection_reason = rejection_reason;
        }
        
        const log = await OvertimeLog.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('employee_id', 'name employee_id');
            
        if (!log) return res.status(404).json({ error: 'Overtime log not found' });
        
        res.json(transformDoc(log));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update overtime status', detail: err.message });
    }
});

// ── TIMESHEET ENTRIES ─────────────────────────────────────────────────────────

// Get timesheet entries
router.get('/timesheets', auth, async (req, res) => {
    try {
        const { employee_id, month, year, status, project_id } = req.query;
        const query = {};

        if (employee_id) query.employee_id = employee_id;
        if (status) query.status = status;
        if (project_id) query.project_id = project_id;

        // Filter by month/year if provided
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const { TimesheetEntry } = require('../models/HRMS');
        const entries = await TimesheetEntry.find(query)
            .populate('employee_id', 'name employee_id')
            .populate('project_id', 'name')
            .sort({ date: -1 });

        res.json(transformArray(entries));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch timesheet entries', detail: err.message });
    }
});

// Get timesheet entry by ID
router.get('/timesheets/:id', auth, async (req, res) => {
    try {
        const { TimesheetEntry } = require('../models/HRMS');
        const entry = await TimesheetEntry.findById(req.params.id)
            .populate('employee_id', 'name employee_id')
            .populate('project_id', 'name');

        if (!entry) return res.status(404).json({ error: 'Timesheet entry not found' });

        res.json(transformDoc(entry));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch timesheet entry', detail: err.message });
    }
});

// Create timesheet entry
router.post('/timesheets', auth, async (req, res) => {
    try {
        const { TimesheetEntry } = require('../models/HRMS');

        // Check for duplicate entry on same date
        const existing = await TimesheetEntry.findOne({
            employee_id: req.body.employee_id,
            date: new Date(req.body.date).toISOString().split('T')[0]
        });

        if (existing) {
            return res.status(400).json({ error: 'Timesheet entry already exists for this date' });
        }

        const entry = new TimesheetEntry(req.body);
        await entry.save();
        await entry.populate('employee_id', 'name employee_id');

        res.status(201).json(transformDoc(entry));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create timesheet entry', detail: err.message });
    }
});

// Bulk create timesheet entries (for importing or batch entry)
router.post('/timesheets/bulk', auth, async (req, res) => {
    try {
        const { TimesheetEntry } = require('../models/HRMS');
        const { entries } = req.body;

        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: 'No entries provided' });
        }

        const created = [];
        const errors = [];

        for (const entryData of entries) {
            try {
                const existing = await TimesheetEntry.findOne({
                    employee_id: entryData.employee_id,
                    date: new Date(entryData.date).toISOString().split('T')[0]
                });

                if (existing) {
                    errors.push({ date: entryData.date, error: 'Entry already exists' });
                    continue;
                }

                const entry = new TimesheetEntry(entryData);
                await entry.save();
                created.push(entry);
            } catch (e) {
                errors.push({ date: entryData.date, error: e.message });
            }
        }

        await Promise.all(created.map(e => e.populate('employee_id', 'name employee_id')));

        res.status(201).json({
            created: transformArray(created),
            errors
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create bulk timesheet entries', detail: err.message });
    }
});

// Update timesheet entry
router.put('/timesheets/:id', auth, async (req, res) => {
    try {
        const { TimesheetEntry } = require('../models/HRMS');
        const entry = await TimesheetEntry.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate('employee_id', 'name employee_id');

        if (!entry) return res.status(404).json({ error: 'Timesheet entry not found' });

        res.json(transformDoc(entry));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update timesheet entry', detail: err.message });
    }
});

// Submit timesheet for approval
router.patch('/timesheets/:id/submit', auth, async (req, res) => {
    try {
        const { TimesheetEntry } = require('../models/HRMS');
        const entry = await TimesheetEntry.findByIdAndUpdate(
            req.params.id,
            {
                status: 'submitted',
                submitted_by: req.user._id,
                submitted_at: new Date()
            },
            { new: true }
        ).populate('employee_id', 'name employee_id');

        if (!entry) return res.status(404).json({ error: 'Timesheet entry not found' });

        res.json(transformDoc(entry));
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit timesheet entry', detail: err.message });
    }
});

// Approve/reject timesheet entry
router.patch('/timesheets/:id/status', auth, async (req, res) => {
    try {
        const { status, rejection_reason, adjustment_notes } = req.body;
        const { TimesheetEntry } = require('../models/HRMS');

        const updateData = { status };

        if (status === 'approved') {
            updateData.approved_by = req.user._id;
            updateData.approved_at = new Date();
        } else if (status === 'rejected') {
            updateData.rejection_reason = rejection_reason;
        } else if (status === 'adjusted') {
            updateData.adjustment_notes = adjustment_notes;
            updateData.approved_by = req.user._id;
            updateData.approved_at = new Date();
        }

        const entry = await TimesheetEntry.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('employee_id', 'name employee_id');

        if (!entry) return res.status(404).json({ error: 'Timesheet entry not found' });

        res.json(transformDoc(entry));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update timesheet status', detail: err.message });
    }
});

// Delete timesheet entry
router.delete('/timesheets/:id', auth, async (req, res) => {
    try {
        const { TimesheetEntry } = require('../models/HRMS');
        const entry = await TimesheetEntry.findByIdAndDelete(req.params.id);

        if (!entry) return res.status(404).json({ error: 'Timesheet entry not found' });

        res.json({ message: 'Timesheet entry deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete timesheet entry', detail: err.message });
    }
});

// Get timesheet summary (by employee or by project)
router.get('/timesheets/summary', auth, async (req, res) => {
    try {
        const { employee_id, project_id, month, year, group_by } = req.query;
        const match = {};

        if (employee_id) match.employee_id = employee_id;
        if (project_id) match.project_id = project_id;

        if (month && year) {
            const startDate = new Date(String(year), parseInt(String(month), 10) - 1, 1);
            const endDate = new Date(String(year), parseInt(String(month), 10), 0);
            match.date = { $gte: startDate, $lte: endDate };
        }

        const { TimesheetEntry } = require('../models/HRMS');

        let groupStage;
        if (group_by === 'project') {
            groupStage = {
                _id: '$project_id',
                total_hours: { $sum: '$hours_worked' },
                regular_hours: { $sum: { $cond: [{ $eq: ['$work_type', 'regular'] }, '$hours_worked', 0] } },
                overtime_hours: { $sum: { $cond: [{ $eq: ['$work_type', 'overtime'] }, '$hours_worked', 0] } },
                entries: { $sum: 1 }
            };
        } else {
            // Default: group by employee
            groupStage = {
                _id: '$employee_id',
                total_hours: { $sum: '$hours_worked' },
                regular_hours: { $sum: { $cond: [{ $eq: ['$work_type', 'regular'] }, '$hours_worked', 0] } },
                overtime_hours: { $sum: { $cond: [{ $eq: ['$work_type', 'overtime'] }, '$hours_worked', 0] } },
                entries: { $sum: 1 }
            };
        }

        const summary = await TimesheetEntry.aggregate([
            { $match: match },
            { $group: groupStage },
            { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' } },
            { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    name: { $ifNull: ['$employee.name', 'Unknown'] },
                    employee_id: { $ifNull: ['$employee.employee_id', ''] },
                    total_hours: 1,
                    regular_hours: 1,
                    overtime_hours: 1,
                    entries: 1
                }
            }
        ]);

        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch timesheet summary', detail: err.message });
    }
});

// ── PAYMENT DETAILS ──────────────────────────────────────────────────────────

// Get employee payment details
router.get('/payment-details/:employee_id', auth, async (req, res) => {
    try {
        const { PaymentDetails } = require('../models/HRMS');
        const details = await PaymentDetails.findOne({ employee_id: req.params.employee_id })
            .populate('employee_id', 'name employee_id');
            
        if (!details) {
            return res.status(404).json({ error: 'Payment details not found' });
        }
        
        res.json(transformDoc(details));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch payment details', detail: err.message });
    }
});

// Create or update payment details
router.post('/payment-details', auth, async (req, res) => {
    try {
        const { PaymentDetails } = require('../models/HRMS');
        
        // Check if payment details already exist
        let details = await PaymentDetails.findOne({ employee_id: req.body.employee_id });
        
        if (details) {
            // Update existing
            Object.assign(details, req.body);
            await details.save();
        } else {
            // Create new
            details = new PaymentDetails(req.body);
            await details.save();
        }
        
        await details.populate('employee_id', 'name employee_id');
        res.status(details.isNew ? 201 : 200).json(transformDoc(details));
    } catch (err) {
        res.status(500).json({ error: 'Failed to save payment details', detail: err.message });
    }
});

// Verify payment details
router.patch('/payment-details/:id/verify', auth, async (req, res) => {
    try {
        const { PaymentDetails } = require('../models/HRMS');
        const details = await PaymentDetails.findByIdAndUpdate(
            req.params.id,
            {
                verified: true,
                verification_date: new Date(),
                verified_by: req.user._id
            },
            { new: true }
        ).populate('employee_id', 'name employee_id');
        
        if (!details) return res.status(404).json({ error: 'Payment details not found' });
        
        res.json(transformDoc(details));
    } catch (err) {
        res.status(500).json({ error: 'Failed to verify payment details', detail: err.message });
    }
});

// ── ATTENDANCE CHECK-IN/CHECK-OUT ────────────────────────────────────────────

// Check-in endpoint
router.post('/attendance/check-in', async (req, res) => {
    try {
        const { AttendanceLog } = require('../models/HRMS');
        const { 
            employee_code, 
            employee_id, 
            check_in_time, 
            device_id, 
            device_type, 
            location,
            latitude, 
            longitude, 
            check_in_method, 
            notes 
        } = req.body;
        
        // Find employee
        let empId = employee_id;
        if (!empId && employee_code) {
            const emp = await Employee.findOne({ employee_id: employee_code, status: 'active' });
            if (!emp) {
                return res.status(400).json({
                    success: false,
                    error: 'employee_not_found',
                    message: `Employee with code ${employee_code} not found or is inactive`
                });
            }
            empId = emp._id;
        }
        
        const attendanceDate = new Date(check_in_time || new Date());
        attendanceDate.setHours(0, 0, 0, 0);
        
        // Check if already checked in today
        const existing = await AttendanceLog.findOne({
            employee_id: empId,
            attendance_date: attendanceDate
        });
        
        if (existing && existing.check_in_time) {
            return res.status(400).json({
                success: false,
                error: 'already_checked_in',
                message: 'Employee has already checked in today'
            });
        }
        
        // Create or update attendance log
        const log = existing || new AttendanceLog({
            employee_id: empId,
            attendance_date: attendanceDate
        });
        
        log.check_in_time = check_in_time || new Date();
        log.check_in_device_id = device_id;
        log.check_in_device_type = device_type;
        log.check_in_location = location;
log.check_in_latitude = latitude;
        log.check_in_longitude = longitude;
        log.check_in_method = check_in_method;
        log.notes = notes;
        log.created_by = device_id;
        
        await log.save();
        await log.populate('employee_id', 'name employee_id');
        
        res.status(201).json({
            success: true,
            message: 'Check-in recorded successfully',
            data: {
                attendance_log_id: log._id,
                employee_id: log.employee_id._id,
                employee_code: log.employee_id.employee_id,
                employee_name: log.employee_id.name,
                check_in_time: log.check_in_time,
                check_in_status: 'success',
                attendance_date: log.attendance_date,
                created_at: log.createdAt,
                next_action: 'awaiting_check_out'
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: 'server_error',
            message: 'Failed to record check-in', 
            detail: err.message 
        });
    }
});

// Check-out endpoint
router.post('/attendance/check-out', async (req, res) => {
    try {
        const { AttendanceLog } = require('../models/HRMS');
        const { 
            employee_code, 
            employee_id, 
            check_out_time, 
            device_id, 
            device_type, 
            location,
            latitude, 
            longitude, 
            check_out_method, 
            notes 
        } = req.body;
        
        // Find employee
        let empId = employee_id;
        if (!empId && employee_code) {
            const emp = await Employee.findOne({ employee_id: employee_code, status: 'active' });
            if (!emp) {
                return res.status(400).json({
                    success: false,
                    error: 'employee_not_found',
                    message: `Employee with code ${employee_code} not found or is inactive`
                });
            }
            empId = emp._id;
        }
        
        const attendanceDate = new Date(check_out_time || new Date());
        attendanceDate.setHours(0, 0, 0, 0);
        
        // Find today's attendance log
        const log = await AttendanceLog.findOne({
            employee_id: empId,
            attendance_date: attendanceDate
        }).populate('employee_id', 'name employee_id');
        
        if (!log || !log.check_in_time) {
            return res.status(400).json({
                success: false,
                error: 'no_check_in',
                message: 'No check-in found for today. Please check-in first.'
            });
        }
        
        if (log.check_out_time) {
            return res.status(400).json({
                success: false,
                error: 'already_checked_out',
                message: 'Employee has already checked out today'
            });
        }
        
        log.check_out_time = check_out_time || new Date();
        log.check_out_device_id = device_id;
        log.check_out_device_type = device_type;
        log.check_out_location = location;
        log.check_out_latitude = latitude;
        log.check_out_longitude = longitude;
        log.check_out_method = check_out_method;
        if (notes) log.notes = (log.notes || '') + ' | ' + notes;
        
        await log.save();
        
        // Calculate overtime if applicable
        const standardHours = 8;
        const overtimeHours = Math.max(0, (log.total_hours_worked || 0) - standardHours);
        
        res.status(200).json({
            success: true,
            message: 'Check-out recorded successfully',
            data: {
                attendance_log_id: log._id,
                employee_id: log.employee_id._id,
                employee_code: log.employee_id.employee_id,
                employee_name: log.employee_id.name,
                attendance_date: log.attendance_date,
                check_in_time: log.check_in_time,
                check_out_time: log.check_out_time,
                total_hours_worked: log.total_hours_worked,
                overtime_hours: overtimeHours,
                attendance_status: 'present',
                check_out_status: 'success',
                created_at: log.createdAt
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: 'server_error',
            message: 'Failed to record check-out', 
            detail: err.message 
        });
    }
});

// Get attendance logs with filters
router.get('/attendance-logs', auth, async (req, res) => {
    try {
        const { AttendanceLog } = require('../models/HRMS');
        const { employee_id, from_date, to_date, status } = req.query;
        
        const query = {};
        if (employee_id) query.employee_id = employee_id;
        if (status) query.status = status;
        if (from_date && to_date) {
            query.attendance_date = { 
                $gte: new Date(from_date), 
                $lte: new Date(to_date) 
            };
        }
        
        const logs = await AttendanceLog.find(query)
            .populate('employee_id', 'name employee_id')
            .sort({ attendance_date: -1, check_in_time: -1 });
            
        res.json(transformArray(logs));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch attendance logs', detail: err.message });
    }
});

// ── ENHANCED APPLICANT MANAGEMENT ────────────────────────────────────────────

// Create applicant (external API endpoint)
router.post('/recruitment/applicants', async (req, res) => {
    try {
        const {
            job_opening_id,
            first_name,
            last_name,
            email,
            phone,
            experience_years,
            current_company,
            current_designation,
            education,
            resume_url,
            resume_file,
            cover_letter,
            applied_date,
            source,
            source_reference,
            status,
            metadata
        } = req.body;
        
        // Validate job opening exists and is open
        const jobOpening = await JobOpening.findById(job_opening_id);
        if (!jobOpening) {
            return res.status(400).json({
                success: false,
                errors: [{ field: 'job_opening_id', message: 'Job opening not found' }]
            });
        }
        
        if (jobOpening.status !== 'open') {
            return res.status(400).json({
                success: false,
                errors: [{ field: 'job_opening_id', message: 'Job opening is closed' }]
            });
        }
        
        // Check for duplicate application
        const existingApp = await Applicant.findOne({ job_opening_id, email });
        if (existingApp) {
            return res.status(400).json({
                success: false,
                errors: [{ field: 'email', message: 'Applicant has already applied for this position' }]
            });
        }
        
        // Create applicant
        const applicant = new Applicant({
            job_opening_id,
            applicant_name: `${first_name} ${last_name}`,
            email,
            phone,
            total_experience: experience_years,
            current_company,
            current_designation,
            resume_url: resume_url || (resume_file ? `data:application/pdf;base64,${resume_file}` : null),
            cover_letter,
            applied_date: applied_date || new Date(),
            status: status || 'applied',
            notes: JSON.stringify({ education, source, source_reference, metadata })
        });
        
        await applicant.save();
        
        res.status(201).json({
            success: true,
            message: 'Applicant created successfully',
            data: {
                applicant_id: applicant._id,
                job_opening_id: applicant.job_opening_id,
                name: applicant.applicant_name,
                email: applicant.email,
                phone: applicant.phone,
                experience_years: applicant.total_experience,
                status: applicant.status,
                applied_date: applicant.applied_date,
                created_at: applicant.createdAt
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            errors: [{ field: 'server', message: err.message }]
        });
    }
});

// Get applicant details
router.get('/recruitment/applicants/:id', async (req, res) => {
    try {
        const applicant = await Applicant.findById(req.params.id)
            .populate('job_opening_id', 'job_title department_id')
            .populate({
                path: 'job_opening_id',
                populate: { path: 'department_id', select: 'name' }
            });
            
        if (!applicant) {
            return res.status(404).json({
                success: false,
                error: 'Applicant not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                applicant_id: applicant._id,
                job_opening_id: applicant.job_opening_id._id,
                job_title: applicant.job_opening_id.job_title,
                department: applicant.job_opening_id.department_id?.name,
                full_name: applicant.applicant_name,
                email: applicant.email,
                phone: applicant.phone,
                experience_years: applicant.total_experience,
                current_company: applicant.current_company,
                current_designation: applicant.current_designation,
                resume_url: applicant.resume_url,
                cover_letter: applicant.cover_letter,
                status: applicant.status,
                applied_date: applicant.applied_date,
                created_at: applicant.createdAt,
                updated_at: applicant.updatedAt
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch applicant',
            detail: err.message 
        });
    }
});

// List applicants for job opening
router.get('/recruitment/job-openings/:job_opening_id/applicants', async (req, res) => {
    try {
        const { page = 1, limit = 20, status, sort_by = 'applied_date', sort_order = 'desc', search } = req.query;
        
        const query = { job_opening_id: req.params.job_opening_id };
        if (status) query.status = { $in: status.split(',') };
        if (search) {
            query.$or = [
                { applicant_name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        const sortObj = {};
        sortObj[sort_by] = sort_order === 'asc' ? 1 : -1;
        
        const total_count = await Applicant.countDocuments(query);
        const applicants = await Applicant.find(query)
            .sort(sortObj)
            .skip((page - 1) * limit)
            .limit(Number(limit));
            
        res.json({
            success: true,
            data: {
                total_count,
                page: Number(page),
                limit: Number(limit),
                total_pages: Math.ceil(total_count / limit),
                applicants: applicants.map(a => ({
                    applicant_id: a._id,
                    name: a.applicant_name,
                    email: a.email,
                    phone: a.phone,
                    experience_years: a.total_experience,
                    status: a.status,
                    applied_date: a.applied_date,
                    source: a.notes ? JSON.parse(a.notes).source : null
                }))
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch applicants',
            detail: err.message 
        });
    }
});

// Update applicant status
router.patch('/recruitment/applicants/:id/status', async (req, res) => {
    try {
        const { status, interview_date, interview_notes, next_step } = req.body;
        
        const applicant = await Applicant.findByIdAndUpdate(
            req.params.id,
            { 
                status,
                $push: {
                    interviews: interview_date ? {
                        date: interview_date,
                        feedback: interview_notes,
                        result: 'pending'
                    } : null
                }
            },
            { new: true }
        );
        
        if (!applicant) {
            return res.status(404).json({
                success: false,
                error: 'Applicant not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Applicant status updated successfully',
            data: {
                applicant_id: applicant._id,
                previous_status: req.body.previous_status,
                current_status: applicant.status,
                updated_at: applicant.updatedAt
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: 'Failed to update applicant status',
            detail: err.message 
        });
    }
});

module.exports = router;
