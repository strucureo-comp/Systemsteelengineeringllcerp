# Module 5: Sales & CRM

## Overview
Customer relationship management with integrated leads and opportunities pipeline, customer management, and sales orders.

**Latest Update:** Leads module has been merged into Opportunities. The system now uses a unified pipeline where leads can be converted to customers.

## Module Structure

### Dashboard
Main sales overview with key metrics and quick actions.

### Opportunities & Leads (Pipeline)
Unified Kanban-style pipeline managing both leads and opportunities across stages:
- New Lead
- Contacted  
- Qualified
- Proposal Sent
- Negotiation
- Won
- Lost

**Key Features:**
- Create leads without customer accounts
- Convert leads to customer accounts
- Track follow-up activities
- Pipeline value analytics
- Weighted pipeline calculations

### Customers
Customer account management with contact tracking and relationship history.

### Quotations
Managed under Finance module (`/admin/finance/quotations`)

### Invoices
Managed under Finance module (`/admin/finance/invoices`)

### Reports
Sales analytics and pipeline reports

## Frontend Pages
- **Location**: `app/(admin)/admin/sales/`
- **Sub-modules**:
  - `page.tsx` - Main dashboard
  - `opportunities/` - Unified opportunities and leads pipeline (Kanban view)
  - `customers/` - Customer management
  - `enquiries/` - Customer enquiries
  - `partners/` - Partner management

## Backend Routes
- **Location**: `backend/routes/crm.js`
- **Endpoints**:
  - `GET /api/crm/opportunities` - List all opportunities (includes leads)
  - `POST /api/crm/opportunities` - Create opportunity or lead
  - `PUT /api/crm/opportunities/:id` - Update opportunity/lead
  - `DELETE /api/crm/opportunities/:id` - Delete opportunity/lead
  - `POST /api/crm/opportunities/:id/convert-to-customer` - Convert lead to customer
  - `GET /api/crm/leads` - Legacy endpoint (returns opportunities where is_lead=true)
  - `POST /api/crm/leads` - Legacy endpoint (creates opportunity with is_lead flag)
  - `GET /api/crm/customers` - List customers
  - `POST /api/crm/customers` - Create customer
  - `PUT /api/crm/customers/:id` - Update customer
  - `DELETE /api/crm/customers/:id` - Delete customer
  - `GET /api/crm/sales-orders` - List sales orders
  - `POST /api/crm/sales-orders` - Create sales order

## Data Models

### Opportunity (Unified with Leads)
```javascript
Opportunity {
  // Lead fields (for opportunities that started as leads)
  is_lead: Boolean (default: false)
  first_name: String
  last_name: String
  email: String
  phone: String
  company: String
  source: String
  
  // Opportunity fields
  account_id: ObjectId → CustomerAccount (optional until converted)
  name: String (required)
  amount: Number (default: 0)
  stage: 'new_lead' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiation' | 'won' | 'lost'
  probability: Number (0-100)
  close_date: Date
  owner_id: ObjectId → User
  notes: String
  
  // Activity tracking
  followUps: [{
    type: 'Call' | 'Email' | 'Meeting' | 'Site Visit'
    scheduledAt: Date
    status: 'Pending' | 'Completed' | 'Missed'
    notes: String
    priority: 'Low' | 'Medium' | 'High'
  }]
  
  createdAt, updatedAt: Date
}
```

### Customer Account
```javascript
CustomerAccount {
  account_id: String (unique)
  name: String (required)
  industry: String
  website: String
  phone: String
  address: String
  tax_id: String
  owner_id: ObjectId → User
  status: 'active' | 'inactive' | 'prospect'
  notes: String
  createdAt, updatedAt: Date
}
```

### Contact
```javascript
Contact {
  activity_id: String (unique)
  type: 'call' | 'email' | 'meeting' | 'task' | 'note'
  entity_type: 'lead' | 'opportunity' | 'customer'
  entity_id: ObjectId
  subject: String
  description: String
  due_date: Date
  assigned_to: String
  status: 'pending' | 'completed' | 'cancelled'
  createdAt, updatedAt: Date
}
```

### SalesOrder
```javascript
SalesOrder {
  order_number: String (unique)
  customer_id: ObjectId → Customer
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  items: [{sku, quantity, unit_price, tax_rate, amount}]
  subtotal: Number
  tax_amount: Number
  total: Number
  delivery_date: Date
  notes: String
  createdAt, updatedAt: Date
}
```

## API Functions (lib/api.ts)
```typescript
// Leads
getLeads() → Lead[]
createLead(data) → Lead | null
updateLead(id, data) → boolean
deleteLead(id) → boolean

// Opportunities
getOpportunities() → Opportunity[]
createOpportunity(data) → Opportunity | null
updateOpportunity(id, data) → boolean
deleteOpportunity(id) → boolean
getOpportunity(id) → Opportunity | null

// Customers
getCustomers() → Customer[]
createCustomer(data) → Customer | null
updateCustomer(id, data) → boolean
deleteCustomer(id) → boolean

// Activities
getActivities() → Activity[]
createActivity(data) → Activity | null
getActivitiesByEntity(type, id) → Activity[]

// Sales Orders
getSalesOrders() → SalesOrder[]
createSalesOrder(data) → SalesOrder | null

// Quotations
getQuotations() → Quotation[]
createQuotation(data) → Quotation | null
updateQuotation(id, data) → boolean
deleteQuotation(id) → boolean
getQuotation(id) → Quotation | null
```

## Connections to Other Modules

### ↔ Finance Module
- **Trigger**: Sales order confirmation
- **Action**: Creates invoice and AR record
- **Data Flow**:
  - Sales order confirmed
  - Invoice generated
  - AR account updated
  - Revenue recognized
  - Customer payment tracked

### ↔ Inventory Module
- **Trigger**: Sales order fulfillment
- **Action**: Issues goods to customer
- **Data Flow**:
  - Sales order created
  - Stock allocated
  - Goods issued (stock balance decremented)
  - COGS recognized in Finance
  - Revenue recognized

### ↔ Receivables Module
- **Trigger**: Invoice creation from sales order
- **Action**: Tracks customer payments
- **Data Flow**:
  - Sales order → Invoice
  - Invoice posted to AR
  - Customer payment recorded
  - AR reconciliation

### ↔ Projects Module
- **Trigger**: Project-based sales
- **Action**: Links sales to project
- **Data Flow**:
  - Sales order linked to project
  - Revenue tracked per project
  - Project profitability calculated

## Key Workflows

### Lead Management
1. Lead created (new prospect)
2. Assigned to sales representative
3. Contact attempts recorded
4. Lead qualified or lost
5. Converted to opportunity or archived

### Opportunity Pipeline
1. Lead converted to opportunity
2. Moved through sales stages
3. Probability and value updated
4. Expected close date tracked
5. Won or lost
6. Won opportunities converted to customer

### Customer Onboarding
1. Opportunity won
2. Customer record created
3. Credit limit set
4. Payment terms configured
5. Billing/shipping addresses stored
6. Customer activated

### Sales Order Processing
1. Customer places order
2. Sales order created
3. Items and quantities specified
4. Pricing and tax calculated
5. Order confirmed
6. Inventory allocated
7. Goods shipped
8. Invoice generated
9. Payment tracked

### Activity Tracking
1. Activities logged (calls, emails, meetings)
2. Linked to leads/opportunities/customers
3. Due dates set
4. Assigned to team members
5. Status tracked
6. Completed or cancelled

## Module Access
- **Default**: Enabled for all business types
- **Role**: Sales Manager, Sales Representative
- **Setup**: Customer master setup recommended

## Real-time Features
- Lead scoring
- Opportunity pipeline tracking
- Activity management
- Customer communication history
- Sales forecasting
- Activity reminders

## Integration Points
- Finance for invoice generation
- Inventory for stock allocation
- Receivables for payment tracking
- Projects for project-based sales
- Operations for resource allocation
