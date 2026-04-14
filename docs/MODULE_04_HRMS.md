# Module 4: Human Resources Management System (HRMS)

## Overview
Complete HR management including employee records, attendance, leaves, payroll, and organizational structure.

## Frontend Pages
- **Location**: `app/(admin)/admin/hr/`
- **Sub-modules**:
  - `team/` - Team management
  - `employees/` - Employee records
  - `attendance/` - Attendance tracking
  - `leaves/` - Leave management
  - `payroll/` - Payroll processing
  - `departments/` - Department management
  - `roles/` - HR roles
  - `salary-structures/` - Salary configuration
  - `documents/` - Employee documents

## Backend Routes
- **Location**: `backend/routes/hrms.js`
- **Endpoints**:
  - `GET /api/hrms/employees` - List employees
  - `POST /api/hrms/employees` - Create employee
  - `PUT /api/hrms/employees/:id` - Update employee
  - `GET /api/hrms/attendance` - List attendance
  - `POST /api/hrms/attendance` - Mark attendance
  - `GET /api/hrms/leaves` - List leaves
  - `POST /api/hrms/leaves` - Apply leave
  - `GET /api/hrms/payrolls` - List payrolls
  - `POST /api/hrms/payrolls` - Generate payroll
  - `GET /api/hrms/departments` - List departments
  - `POST /api/hrms/departments` - Create department

## Data Models

### Employee
```javascript
Employee {
  employee_id: String (unique)
  name: String
  email: String
  phone: String
  department_id: ObjectId → Department
  hr_role_id: ObjectId → HRRole
  employment_type: 'full-time' | 'contract' | 'part-time'
  joining_date: Date
  status: 'active' | 'inactive' | 'on-leave' | 'terminated'
  basic_salary: Number
  overtime_rate: Number
  bank_details: {
    account_name: String
    account_number: String
    bank_name: String
    iban: String
  }
  createdAt, updatedAt: Date
}
```

### Department
```javascript
Department {
  name: String
  code: String (unique)
  manager_id: ObjectId → Employee
  description: String
  is_active: Boolean
}
```

### HRRole
```javascript
HRRole {
  name: String
  description: String
  permissions: [String]
}
```

### Attendance
```javascript
Attendance {
  employee_id: ObjectId → Employee
  date: Date
  status: 'present' | 'absent' | 'leave' | 'holiday' | 'half-day'
  check_in: String (time)
  check_out: String (time)
  overtime_hours: Number
  project_id: String (optional, for project-based tracking)
  unique index: (employee_id, date)
}
```

### Leave
```javascript
Leave {
  employee_id: ObjectId → Employee
  leave_type: String
  from_date: Date
  to_date: Date
  days: Number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_by: String
  reason: String
}
```

### LeaveType
```javascript
LeaveType {
  name: String
  code: String (unique)
  annual_quota: Number
  is_paid: Boolean
  requires_approval: Boolean
}
```

### Payroll
```javascript
Payroll {
  month: String (YYYY-MM)
  status: 'draft' | 'processed' | 'posted' | 'paid'
  total_gross: Number
  total_deductions: Number
  total_net: Number
  lines: [{
    employee_id: ObjectId → Employee
    basic_pay: Number
    overtime_pay: Number
    allowances: Number
    deductions: Number
    net_pay: Number
  }]
  posted_to_finance: Boolean
  posted_date: Date
}
```

### SalaryStructure
```javascript
SalaryStructure {
  employee_id: ObjectId → Employee
  basic_salary: Number
  allowances: [{name, amount}]
  deductions: [{name, amount}]
  effective_from: Date
  effective_to: Date
}
```

## API Functions (lib/api.ts)
```typescript
// Employees
getEmployees() → Employee[]
createEmployee(data) → Employee | null
updateEmployee(id, data) → Employee | null

// Attendance
getAttendance(date?) → Attendance[]
markAttendance(data) → Attendance | null

// Departments
getDepartments() → Department[]
createDepartment(data) → Department | null

// Leaves
getLeaves() → Leave[]
applyLeave(data) → Leave | null
updateLeaveStatus(id, status) → boolean
getLeaveTypes() → LeaveType[]
createLeaveType(data) → LeaveType | null

// Payroll
getPayrolls() → Payroll[]
generatePayroll(month) → {message: string}
postPayrollToFinance(id) → {message: string}

// Salary Structures
getSalaryStructures(empId?) → SalaryStructure[]
createSalaryStructure(data) → SalaryStructure | null

// HR Roles
getHRRoles() → HRRole[]
createHRRole(data) → HRRole | null

// Holidays
getHolidays() → Holiday[]
createHoliday(data) → Holiday | null

// Employee Documents
getEmployeeDocuments(id?) → Document[]
createEmployeeDocument(data) → Document | null
```

## Connections to Other Modules

### ↔ Finance Module
- **Trigger**: Payroll processing (month-end)
- **Action**: Posts salary expenses to GL
- **Data Flow**:
  - Payroll generated for month
  - Salary expense GL account debited
  - Payable/Bank account credited
  - Journal entry created automatically
  - GL balances updated

### ↔ Projects Module
- **Trigger**: Employee allocation to project
- **Action**: Tracks project-based attendance and timesheets
- **Data Flow**:
  - Employee allocated to project
  - Attendance marked with project_id
  - Timesheet submitted for project
  - Project costs tracked per employee

### ↔ Operations Module
- **Trigger**: Resource planning
- **Action**: Provides employee availability and allocation
- **Data Flow**:
  - Employee status checked
  - Leave calendar consulted
  - Resource booking created
  - Availability updated

## Key Workflows

### Employee Onboarding
1. Create employee record
2. Assign department and role
3. Set salary structure
4. Link to user account (optional)
5. Mark as active
6. Employee can log in

### Attendance Marking
1. Daily attendance marked
2. Check-in/check-out recorded
3. Overtime calculated
4. Leave deducted if applicable
5. Holiday recognized
6. Half-day recorded

### Leave Application
1. Employee applies for leave
2. Specifies leave type and dates
3. System calculates days
4. Submitted for approval
5. Manager approves/rejects
6. Approved leaves deducted from quota
7. Attendance marked as 'leave'

### Payroll Processing
1. Month-end payroll generation
2. Fetch all active employees
3. Calculate: basic + overtime + allowances - deductions
4. Create payroll document (draft)
5. HR Manager reviews and approves
6. Finance posts to GL
7. Journal entry created:
   - Debit: Salary Expense GL
   - Credit: Payable/Bank GL
8. Payments processed
9. Payroll archived

### Salary Structure Management
1. Define salary components
2. Set basic salary
3. Add allowances (HRA, DA, etc.)
4. Add deductions (PF, Tax, etc.)
5. Set effective dates
6. Used in payroll calculation

## Module Access
- **Default**: Enabled for all business types
- **Role**: HR Manager, HR Supervisor, Employee
- **Setup**: HR setup stage must be completed

## Real-time Features
- Attendance tracking
- Leave quota management
- Payroll automation
- Department hierarchy
- Employee directory
- Salary structure versioning

## Integration Points
- Finance GL for payroll posting
- Projects for resource allocation
- Operations for resource planning
- Authentication for employee login
