# Module 8: Projects Management

## Overview
Project management including project creation, resource allocation, timesheets, and project operations.

## Frontend Pages
- **Location**: `app/(admin)/admin/projects/`
- **Sub-modules**:
  - `[id]/` - Project detail page
  - `timesheets/` - Timesheet management
  - `resources/` - Resource allocation
  - `expenses/` - Project expenses

## Backend Routes
- **Location**: `backend/routes/projects.js`
- **Endpoints**:
  - `GET /api/projects` - List projects
  - `POST /api/projects` - Create project
  - `GET /api/projects/:id` - Get project detail
  - `PUT /api/projects/:id` - Update project

## Backend Routes (Project Operations)
- **Location**: `backend/routes/project-ops.js`
- **Endpoints**:
  - `GET /api/project-ops/timesheets` - List timesheets
  - `POST /api/project-ops/timesheets` - Submit timesheet
  - `GET /api/project-ops/resource-bookings` - List resource bookings
  - `POST /api/project-ops/resource-bookings` - Create resource booking

## Data Models

### Project
```javascript
Project {
  project_id: String (unique)
  name: String
  description: String
  client_id: ObjectId → Customer
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  start_date: Date
  end_date: Date
  budget: Number
  actual_cost: Number
  project_manager: String (user email)
  team_members: [String] (user emails)
  location: String (for construction projects)
  createdAt, updatedAt: Date
}
```

### Timesheet
```javascript
Timesheet {
  timesheet_id: String (unique)
  employee_id: ObjectId → Employee
  project_id: ObjectId → Project
  week_start: Date
  week_end: Date
  lines: [{
    date: Date
    hours: Number
    task_description: String
    billable: Boolean
  }]
  total_hours: Number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submitted_date: Date
  approved_by: String
  createdAt, updatedAt: Date
}
```

### ResourceBooking
```javascript
ResourceBooking {
  booking_id: String (unique)
  project_id: ObjectId → Project
  employee_id: ObjectId → Employee
  start_date: Date
  end_date: Date
  allocation_percentage: Number (0-100)
  role: String
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  createdAt, updatedAt: Date
}
```

### ProjectExpense
```javascript
ProjectExpense {
  expense_id: String (unique)
  project_id: ObjectId → Project
  category: String
  amount: Number
  date: Date
  description: String
  status: 'draft' | 'submitted' | 'approved' | 'paid'
  submitted_by: String
  approved_by: String
  createdAt, updatedAt: Date
}
```

## API Functions (lib/api.ts)
```typescript
// Projects
getProjects() → Project[]
getProject(id) → Project | null
createProject(data) → Project | null
updateProject(id, data) → boolean

// Timesheets
submitTimesheet(data) → boolean
approveTimesheet(id, status) → boolean

// Resource Bookings
getResourceBookings() → ResourceBooking[]
createResourceBooking(data) → boolean

// Expenses
submitExpense(data) → boolean
approveExpense(id, status) → boolean
```

## Connections to Other Modules

### ↔ HRMS Module
- **Trigger**: Employee allocation to project
- **Action**: Tracks project-based attendance and timesheets
- **Data Flow**:
  - Employee allocated to project
  - Attendance marked with project_id
  - Timesheet submitted for project
  - Project costs tracked per employee

### ↔ Inventory Module
- **Trigger**: Material allocation to project
- **Action**: Issues materials to project site
- **Data Flow**:
  - Project created
  - Materials allocated
  - Stock issued to project warehouse
  - Cost tracked per project

### ↔ Finance Module
- **Trigger**: Project expense and timesheet approval
- **Action**: Posts project costs to GL
- **Data Flow**:
  - Timesheet approved → Labor cost recorded
  - Expense approved → Project expense recorded
  - Project costs tracked
  - Project profitability calculated

### ↔ Operations Module
- **Trigger**: Resource planning
- **Action**: Provides resource availability and allocation
- **Data Flow**:
  - Resource booking created
  - Employee availability checked
  - Resource allocated to project
  - Availability updated

### ↔ Sales Module
- **Trigger**: Project-based sales
- **Action**: Links sales to project
- **Data Flow**:
  - Sales order linked to project
  - Revenue tracked per project
  - Project profitability calculated

## Key Workflows

### Project Creation
1. Create project record
2. Assign project manager
3. Set start and end dates
4. Define budget
5. Link to customer
6. Add team members
7. Activate project

### Resource Allocation
1. Identify resource needs
2. Check employee availability
3. Create resource booking
4. Specify allocation percentage
5. Set start and end dates
6. Confirm booking
7. Employee notified

### Timesheet Submission
1. Employee logs hours for week
2. Specifies tasks and descriptions
3. Marks billable/non-billable
4. Submits timesheet
5. Project manager reviews
6. Approves or rejects
7. Approved timesheets used for billing

### Project Expense Tracking
1. Employee incurs project expense
2. Submits expense with receipt
3. Specifies category and amount
4. Project manager reviews
5. Approves or rejects
6. Approved expenses added to project cost
7. Tracked for project profitability

### Project Completion
1. Project reaches end date
2. All timesheets and expenses finalized
3. Project marked as completed
4. Final cost calculated
5. Profitability analyzed
6. Project archived

## Module Access
- **Default**: Enabled for Construction, Service, Manufacturing business types
- **Role**: Project Manager, Resource Manager
- **Setup**: Project master setup recommended

## Real-time Features
- Project tracking
- Resource allocation
- Timesheet management
- Expense tracking
- Project profitability
- Resource utilization

## Integration Points
- HRMS for employee allocation and timesheets
- Inventory for material allocation
- Finance for cost tracking
- Operations for resource planning
- Sales for project-based sales
