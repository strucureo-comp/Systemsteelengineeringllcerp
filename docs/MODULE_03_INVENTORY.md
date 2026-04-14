# Module 3: Inventory Management

## Overview
Real-time inventory tracking with FIFO costing, warehouse management, and stock movements.

## Frontend Pages
- **Location**: `app/(admin)/admin/inventory/`
- **Sub-modules**:
  - `items/` - SKU master data
  - `warehouses/` - Warehouse management
  - `movements/` - Stock movements
  - `summary/` - Inventory summary

## Backend Routes
- **Location**: `backend/routes/inventory.js`
- **Endpoints**:
  - `GET /api/inventory/items` - List SKUs
  - `POST /api/inventory/items` - Create SKU
  - `PUT /api/inventory/items/:id` - Update SKU
  - `GET /api/inventory/warehouses` - List warehouses
  - `POST /api/inventory/warehouses` - Create warehouse
  - `POST /api/inventory/move` - Record stock movement
  - `GET /api/inventory/summary` - Inventory summary

## Data Models

### Item (SKU Master)
```javascript
Item {
  sku: String (unique)
  name: String
  description: String
  category: String
  status: 'active' | 'discontinued' | 'planning'
  uom_base: String (default: 'pcs')
  valuation_method: 'FIFO' | 'WAC' | 'Standard'
  standard_cost: Number
  last_purchase_price: Number
  reorder_level: Number
  safety_stock: Number
  lead_time_days: Number
  is_serial_tracked: Boolean
  is_batch_tracked: Boolean
  inventory_gl_account: String (links to Finance)
  cogs_gl_account: String (links to Finance)
  revenue_gl_account: String (links to Finance)
}
```

### Warehouse
```javascript
Warehouse {
  code: String (unique)
  name: String
  type: 'central' | 'site' | 'transit' | 'vendor'
  locations: [{label, zone, capacity}]
  is_active: Boolean
}
```

### StockBalance (Real-time Snapshot)
```javascript
StockBalance {
  item_id: ObjectId → Item
  warehouse_id: ObjectId → Warehouse
  on_hand: Number (physical quantity)
  allocated: Number (reserved for orders)
  available: Number (on_hand - allocated)
  reserved: Number
  wac_cost: Number (weighted average cost)
  last_updated: Date
}
```

### InventoryTransaction (Ledger)
```javascript
InventoryTransaction {
  transaction_id: String (unique)
  type: 'GRN' | 'issue_to_site' | 'issue_to_production' | 'transfer' | 'adjustment' | 'waste' | 'sale' | 'return_to_vendor' | 'return_from_customer'
  item_id: ObjectId → Item
  source_warehouse: ObjectId → Warehouse
  destination_warehouse: ObjectId → Warehouse
  quantity: Number (positive for inflow, negative for outflow)
  unit_cost: Number
  total_value: Number
  is_cogs_recognized: Boolean
  journal_entry_id: String (links to Finance)
  posted_by: String
  posted_at: Date
}
```

### CostLayer (FIFO Tracking)
```javascript
CostLayer {
  item_id: ObjectId → Item
  warehouse_id: ObjectId → Warehouse
  original_qty: Number
  remaining_qty: Number
  unit_cost: Number
  received_date: Date
  transaction_id: ObjectId → InventoryTransaction
  is_exhausted: Boolean
}
```

## API Functions (lib/api.ts)
```typescript
// Items
getInventoryItems() → Item[]
createInventoryItem(data) → Item | null
updateInventoryItem(id, data) → Item | null
getProducts() → Item[] (alias)
createProduct(data) → Item | null

// Warehouses
getWarehouses() → Warehouse[]
createWarehouse(data) → Warehouse | null

// Movements
getInventoryTransactions() → InventoryTransaction[]
createInventoryTransaction(data) → InventoryTransaction | null
recordStockMovement(data) → InventoryTransaction | null

// Summary
getInventorySummary() → {total_skus, recent_transactions, total_value}
```

## Connections to Other Modules

### ↔ Finance Module
- **Trigger**: Stock movements (GRN, Issue, Sale, Waste)
- **Action**: Creates automatic journal entries
- **Data Flow**:
  - GRN received → Inventory GL account debited
  - Stock issued → COGS GL account debited
  - GL balances updated automatically
  - Cost layers consumed using FIFO

### ↔ Procurement Module
- **Trigger**: GRN (Goods Receipt Note) creation
- **Action**: Updates stock balance and creates cost layer
- **Data Flow**:
  - PO created → Inventory expectation
  - GRN received → Stock balance updated
  - Cost layer created for FIFO tracking
  - Vendor bill matched to GRN (3-way match)

### ↔ Manufacturing Module
- **Trigger**: Production order execution
- **Action**: Consumes raw materials, produces finished goods
- **Data Flow**:
  - BOM defines material requirements
  - Production order issues materials
  - Cost layers consumed
  - Finished goods received into inventory
  - COGS recognized

### ↔ Sales Module
- **Trigger**: Sales order fulfillment
- **Action**: Issues goods to customer
- **Data Flow**:
  - Sales order created
  - Stock allocated
  - Goods issued (stock balance decremented)
  - COGS recognized in Finance
  - Revenue recognized

### ↔ Projects Module
- **Trigger**: Material allocation to project
- **Action**: Issues materials to project site
- **Data Flow**:
  - Project created
  - Materials allocated
  - Stock issued to project warehouse
  - Cost tracked per project

## Key Workflows

### Stock Receipt (GRN)
1. PO received from Procurement
2. Goods arrive at warehouse
3. Create GRN with items and quantities
4. System creates FIFO cost layer
5. Updates stock balance (on_hand)
6. Creates inventory transaction
7. Triggers COGS journal entry in Finance

### Stock Issue
1. Production/Site requests materials
2. Create issue transaction
3. Select source warehouse
4. Specify quantity and destination
5. System updates balances
6. FIFO layer consumed
7. COGS recognized in Finance

### Stock Transfer
1. Transfer between warehouses
2. Source warehouse decremented
3. Destination warehouse incremented
4. Cost layer transferred
5. No COGS impact (internal movement)

### Stock Adjustment
1. Physical count vs system
2. Create adjustment transaction
3. Variance recorded
4. GL impact if significant

## Valuation Methods
- **FIFO**: First In First Out (default)
- **WAC**: Weighted Average Cost
- **Standard**: Fixed standard cost

## Module Access
- **Default**: Enabled for Manufacturing, Retail, Trading, Construction
- **Role**: Warehouse Manager, Inventory Supervisor
- **Setup**: Warehouse and item master setup required

## Real-time Features
- Stock balance updated immediately on transaction
- FIFO layers consumed in order
- GL accounts updated automatically
- Multi-warehouse support
- Serial/Batch tracking capability
