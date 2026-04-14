# Module 7: Manufacturing

## Overview
Production management including Bill of Materials (BOM), production orders, and shop floor operations.

## Frontend Pages
- **Location**: `app/(admin)/admin/manufacturing/`
- **Sub-modules**:
  - `boms/` - Bill of Materials
  - `production/` - Production orders
  - `shop-floor/` - Shop floor operations

## Backend Routes
- **Location**: `backend/routes/manufacturing.js`
- **Endpoints**:
  - `GET /api/manufacturing/boms` - List BOMs
  - `POST /api/manufacturing/boms` - Create BOM
  - `GET /api/manufacturing/production-orders` - List production orders
  - `POST /api/manufacturing/production-orders` - Create production order
  - `PUT /api/manufacturing/production-orders/:id` - Update production order

## Data Models

### BOM (Bill of Materials)
```javascript
BOM {
  bom_number: String (unique)
  finished_good_sku: ObjectId → Item
  version: Number (default: 1)
  status: 'active' | 'inactive' | 'superseded'
  lines: [{
    component_sku: ObjectId → Item
    quantity: Number
    uom: String
    scrap_percentage: Number (default: 0)
    lead_time_days: Number
  }]
  total_cost: Number (calculated)
  effective_from: Date
  effective_to: Date (optional)
  createdAt, updatedAt: Date
}
```

### ProductionOrder
```javascript
ProductionOrder {
  po_number: String (unique)
  bom_id: ObjectId → BOM
  finished_good_sku: ObjectId → Item
  quantity_to_produce: Number
  quantity_produced: Number
  status: 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled'
  start_date: Date
  end_date: Date
  actual_end_date: Date (optional)
  warehouse_id: ObjectId → Warehouse
  notes: String
  createdAt, updatedAt: Date
}
```

## API Functions (lib/api.ts)
```typescript
// BOMs
getBOMs() → BOM[]
createBOM(data) → BOM | null

// Production Orders
getProductionOrders() → ProductionOrder[]
createProductionOrder(data) → ProductionOrder | null
updateProductionOrder(id, status) → boolean
```

## Connections to Other Modules

### ↔ Inventory Module
- **Trigger**: Production order execution
- **Action**: Consumes raw materials, produces finished goods
- **Data Flow**:
  - BOM defines material requirements
  - Production order issues materials from inventory
  - Cost layers consumed using FIFO
  - Finished goods received into inventory
  - Stock balance updated
  - COGS recognized

### ↔ Finance Module
- **Trigger**: Material consumption and production completion
- **Action**: Recognizes COGS and inventory value changes
- **Data Flow**:
  - Material issued → COGS GL account debited
  - Finished goods received → Inventory GL account debited
  - GL balances updated automatically
  - Production cost tracked

### ↔ Projects Module
- **Trigger**: Project-based production
- **Action**: Links production to project
- **Data Flow**:
  - Production order linked to project
  - Materials allocated to project
  - Production costs tracked per project
  - Project profitability calculated

## Key Workflows

### BOM Creation
1. Define finished good (SKU)
2. Add component materials
3. Specify quantities and UOM
4. Set scrap percentage
5. Calculate total cost
6. Set effective dates
7. Activate BOM

### Production Order
1. Create production order
2. Select BOM and finished good
3. Specify quantity to produce
4. Set start and end dates
5. Assign warehouse
6. Save as draft
7. Plan production
8. Start production
9. Issue materials from inventory
10. Produce goods
11. Receive finished goods into inventory
12. Complete production order

### Material Consumption
1. Production order started
2. Materials issued from inventory
3. Stock balance decremented
4. Cost layers consumed (FIFO)
5. COGS recognized in Finance
6. Inventory transaction recorded

### Finished Goods Receipt
1. Production completed
2. Finished goods received into inventory
3. Stock balance incremented
4. Cost calculated from BOM
5. Inventory transaction recorded
6. Production order marked complete

## Module Access
- **Default**: Enabled for Manufacturing business type
- **Role**: Production Manager, Shop Floor Supervisor
- **Setup**: BOM master setup required

## Real-time Features
- BOM versioning
- Production order tracking
- Material consumption tracking
- Finished goods receipt
- Production cost calculation
- Scrap tracking

## Integration Points
- Inventory for material consumption and finished goods receipt
- Finance for COGS recognition
- Projects for project-based production
- Operations for production scheduling
