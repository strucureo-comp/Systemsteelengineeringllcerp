# Module 12: Fixed Assets & Stock Journal

## Overview
Fixed asset management and stock journal entries for inventory adjustments.

---

## FIXED ASSETS

### Overview
Fixed asset tracking, depreciation, and asset lifecycle management.

### Backend Routes
- **Location**: `backend/routes/fixed-assets.js`
- **Endpoints**:
  - `GET /api/fixed-assets` - List fixed assets
  - `POST /api/fixed-assets` - Create fixed asset
  - `PUT /api/fixed-assets/:id` - Update fixed asset
  - `DELETE /api/fixed-assets/:id` - Delete fixed asset

### Data Models

#### FixedAsset
```javascript
FixedAsset {
  asset_id: String (unique)
  name: String
  description: String
  category: String (e.g., 'machinery', 'furniture', 'vehicles')
  acquisition_date: Date
  acquisition_cost: Number
  useful_life_years: Number
  depreciation_method: 'straight_line' | 'declining_balance' | 'units_of_production'
  accumulated_depreciation: Number
  book_value: Number (acquisition_cost - accumulated_depreciation)
  status: 'active' | 'inactive' | 'disposed'
  location: String
  asset_gl_account: String (links to Finance)
  depreciation_gl_account: String (links to Finance)
  createdAt, updatedAt: Date
}
```

### API Functions (lib/api.ts)
```typescript
// Fixed Assets
getFixedAssets() → FixedAsset[]
createFixedAsset(data) → FixedAsset | null
runDepreciation(date) → boolean
```

### Connections to Other Modules
- **Finance**: Depreciation posted to GL monthly/quarterly
- **Data Flow**:
  - Depreciation calculated
  - Depreciation expense GL account debited
  - Accumulated depreciation GL account credited
  - Asset book value updated

### Key Workflows

#### Asset Acquisition
1. Purchase fixed asset
2. Record acquisition cost
3. Set useful life
4. Choose depreciation method
5. Assign GL accounts
6. Activate asset

#### Depreciation Posting
1. Month/quarter-end
2. Calculate depreciation for all active assets
3. Create journal entries
4. Post to GL
5. Update accumulated depreciation
6. Update book value

#### Asset Disposal
1. Asset reaches end of life or sold
2. Record disposal date
3. Calculate gain/loss
4. Remove from active assets
5. Post disposal journal entry
6. Archive asset

---

## STOCK JOURNAL

### Overview
Stock journal entries for inventory adjustments, write-offs, and corrections.

### Backend Routes
- **Location**: `backend/routes/stock-journal.js`
- **Endpoints**:
  - `GET /api/stock-journal` - List stock journals
  - `POST /api/stock-journal` - Create stock journal
  - `PUT /api/stock-journal/:id` - Update stock journal
  - `DELETE /api/stock-journal/:id` - Delete stock journal
  - `PATCH /api/stock-journal/:id/post` - Post stock journal

### Data Models

#### StockJournal
```javascript
StockJournal {
  journal_id: String (unique)
  date: Date
  lines: [{
    item_id: ObjectId → Item
    warehouse_id: ObjectId → Warehouse
    quantity_change: Number (positive for increase, negative for decrease)
    reason: String (e.g., 'physical_count_variance', 'write_off', 'damage', 'theft')
    unit_cost: Number
    total_value: Number
  }]
  total_value: Number
  status: 'draft' | 'posted'
  posted_date: Date (optional)
  posted_by: String
  notes: String
  createdAt, updatedAt: Date
}
```

### API Functions (lib/api.ts)
```typescript
// Stock Journals
getStockJournals() → StockJournal[]
getStockJournal(id) → StockJournal | null
createStockJournal(data) → StockJournal | null
updateStockJournal(id, data) → boolean
deleteStockJournal(id) → boolean
postStockJournal(id) → boolean
```

### Connections to Other Modules

#### ↔ Inventory Module
- **Trigger**: Stock adjustment
- **Action**: Updates stock balance
- **Data Flow**:
  - Stock journal created
  - Stock balance updated
  - Inventory transaction recorded

#### ↔ Finance Module
- **Trigger**: Stock journal posting
- **Action**: Creates GL entries for variance
- **Data Flow**:
  - Stock journal posted
  - Inventory GL account updated
  - COGS GL account updated (if write-off)
  - Journal entry created

### Key Workflows

#### Physical Count Adjustment
1. Conduct physical inventory count
2. Compare with system balance
3. Create stock journal for variances
4. Specify reason (count variance, damage, etc.)
5. Post journal
6. Stock balance updated
7. GL impact recorded

#### Write-Off
1. Item damaged or obsolete
2. Create stock journal
3. Specify write-off reason
4. Post journal
5. Stock balance decremented
6. COGS GL account debited
7. Inventory GL account credited

#### Stock Transfer Correction
1. Transfer recorded incorrectly
2. Create stock journal to correct
3. Reverse incorrect transaction
4. Post corrected journal
5. Stock balances corrected

---

## MODULE ACCESS
- **Fixed Assets**: Finance Manager, Asset Manager
- **Stock Journal**: Warehouse Manager, Inventory Supervisor
- **Setup**: GL account mapping required

## Real-time Features
- Asset depreciation calculation
- Stock adjustment tracking
- Variance analysis
- GL impact recording
- Audit trail for adjustments

## Integration Points
- Finance for GL posting
- Inventory for stock balance updates
- All modules for asset and inventory tracking
